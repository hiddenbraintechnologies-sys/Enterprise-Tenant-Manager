/**
 * Google SSO Integration
 * 
 * Handles Google OAuth 2.0 authentication with user auto-creation
 * and tenant mapping.
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { users, userTenants, roles, tenants } from '@shared/schema';
import {
  ssoProviderConfigs,
  ssoUserIdentities,
  ssoAuditLog,
  SsoProviderConfig,
} from '../../shared/models/sso';
import {
  encryptToken,
  decryptToken,
  generateState,
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
} from './token-handler';
import { ssoService } from './sso-service';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

interface GoogleUserInfo {
  sub: string;           // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string;           // Hosted domain (for Google Workspace)
}

interface GoogleAuthResult {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    isNewUser: boolean;
  };
  tenant: {
    id: string;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
}

export class GoogleSsoService {
  /**
   * Create or get Google SSO provider for a tenant
   */
  async setupGoogleProvider(
    tenantId: string,
    config: {
      clientId: string;
      clientSecret: string;
      allowedDomains?: string[];
      autoCreateUsers?: boolean;
      enforceForDomains?: boolean;
    }
  ): Promise<SsoProviderConfig> {
    // Check if provider already exists
    const existing = await db.select()
      .from(ssoProviderConfigs)
      .where(and(
        eq(ssoProviderConfigs.tenantId, tenantId),
        eq(ssoProviderConfigs.providerType, 'google')
      ));

    if (existing.length > 0) {
      // Update existing provider
      const [updated] = await db.update(ssoProviderConfigs)
        .set({
          clientId: config.clientId,
          clientSecretEncrypted: encryptToken(config.clientSecret),
          allowedDomains: config.allowedDomains || [],
          autoCreateUsers: config.autoCreateUsers ?? true,
          enforceForDomains: config.enforceForDomains ?? false,
          updatedAt: new Date(),
        })
        .where(eq(ssoProviderConfigs.id, existing[0].id))
        .returning();
      return updated;
    }

    // Create new provider
    return ssoService.createProviderConfig(tenantId, {
      providerType: 'google',
      providerName: 'google',
      displayName: 'Sign in with Google',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      allowedDomains: config.allowedDomains,
      autoCreateUsers: config.autoCreateUsers,
    });
  }

  /**
   * Generate Google authorization URL
   */
  async getAuthorizationUrl(params: {
    tenantId: string;
    providerId: string;
    redirectUri: string;
    returnUrl?: string;
    loginHint?: string;
    hostedDomain?: string;
  }): Promise<string> {
    const provider = await ssoService.getProviderById(params.providerId);
    if (!provider || provider.providerType !== 'google') {
      throw new Error('Invalid Google SSO provider');
    }

    if (provider.status !== 'active') {
      throw new Error('Google SSO is not active for this tenant');
    }

    // Generate security parameters
    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store auth session
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(require('../../shared/models/sso').ssoAuthSessions).values({
      tenantId: params.tenantId,
      providerId: params.providerId,
      state,
      nonce,
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri: params.redirectUri,
      returnUrl: params.returnUrl,
      status: 'pending',
      expiresAt,
    });

    // Build Google authorization URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Optional: restrict to specific Google Workspace domain
    if (params.hostedDomain) {
      authUrl.searchParams.set('hd', params.hostedDomain);
    }

    // Optional: pre-fill email
    if (params.loginHint) {
      authUrl.searchParams.set('login_hint', params.loginHint);
    }

    return authUrl.toString();
  }

  /**
   * Handle Google OAuth callback
   */
  async handleCallback(params: {
    code: string;
    state: string;
    redirectUri: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<GoogleAuthResult> {
    const { ssoAuthSessions } = require('../../shared/models/sso');

    // Find and validate auth session
    const [authSession] = await db.select()
      .from(ssoAuthSessions)
      .where(and(
        eq(ssoAuthSessions.state, params.state),
        eq(ssoAuthSessions.status, 'pending')
      ));

    if (!authSession) {
      throw new Error('Invalid or expired SSO session');
    }

    if (new Date() > authSession.expiresAt) {
      await db.update(ssoAuthSessions)
        .set({ status: 'expired' })
        .where(eq(ssoAuthSessions.id, authSession.id));
      throw new Error('SSO session has expired');
    }

    const provider = await ssoService.getProviderById(authSession.providerId!);
    if (!provider) {
      throw new Error('SSO provider not found');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens({
      code: params.code,
      redirectUri: params.redirectUri,
      clientId: provider.clientId,
      clientSecret: decryptToken(provider.clientSecretEncrypted),
      codeVerifier: authSession.codeVerifier!,
    });

    // Get user info from Google
    const googleUser = await this.fetchUserInfo(tokens.access_token);

    // Validate domain restrictions
    const allowedDomains = provider.allowedDomains as string[] || [];
    if (allowedDomains.length > 0 && googleUser.hd) {
      if (!allowedDomains.includes(googleUser.hd)) {
        await this.logAuditEvent({
          tenantId: authSession.tenantId!,
          providerId: provider.id,
          action: 'google.login.domain_rejected',
          status: 'failure',
          email: googleUser.email,
          errorMessage: `Domain ${googleUser.hd} not in allowed list`,
          ipAddress: params.ipAddress,
        });
        throw new Error(`Email domain ${googleUser.hd} is not allowed for this organization`);
      }
    }

    // Update auth session as completed
    await db.update(ssoAuthSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(ssoAuthSessions.id, authSession.id));

    // Find or create user
    const { user, isNewUser } = await this.findOrCreateUser({
      tenantId: authSession.tenantId!,
      provider,
      googleUser,
      tokens,
    });

    // Get tenant info
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, authSession.tenantId!));

    // Log successful login
    await this.logAuditEvent({
      tenantId: authSession.tenantId!,
      userId: user.id,
      providerId: provider.id,
      action: isNewUser ? 'google.user.created' : 'google.login.success',
      status: 'success',
      email: googleUser.email,
      providerUserId: googleUser.sub,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email!,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        isNewUser,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
      },
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(params: {
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret: string;
    codeVerifier: string;
  }): Promise<{
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
  }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * Fetch user info from Google
   */
  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    return response.json();
  }

  /**
   * Find or create user from Google login
   */
  private async findOrCreateUser(params: {
    tenantId: string;
    provider: SsoProviderConfig;
    googleUser: GoogleUserInfo;
    tokens: any;
  }): Promise<{ user: typeof users.$inferSelect; isNewUser: boolean }> {
    const { tenantId, provider, googleUser, tokens } = params;

    // Check if SSO identity already exists
    const [existingIdentity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, provider.id),
        eq(ssoUserIdentities.providerUserId, googleUser.sub)
      ));

    if (existingIdentity) {
      // Update identity tokens
      await db.update(ssoUserIdentities)
        .set({
          accessTokenEncrypted: encryptToken(tokens.access_token),
          refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
          tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
          lastLoginAt: new Date(),
          loginCount: String(parseInt(existingIdentity.loginCount || '0') + 1),
          updatedAt: new Date(),
        })
        .where(eq(ssoUserIdentities.id, existingIdentity.id));

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, existingIdentity.userId));
      return { user, isNewUser: false };
    }

    // Check if user exists by email
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.email, googleUser.email));

    if (existingUser) {
      // Link existing user to Google identity
      await this.linkUserToGoogle({
        userId: existingUser.id,
        tenantId,
        providerId: provider.id,
        googleUser,
        tokens,
      });

      // Ensure user is linked to tenant
      await this.ensureUserTenantLink(existingUser.id, tenantId);

      return { user: existingUser, isNewUser: false };
    }

    // Auto-create user if enabled
    if (!provider.autoCreateUsers) {
      throw new Error('User not found and auto-creation is disabled');
    }

    // Create new user
    const [newUser] = await db.insert(users).values({
      email: googleUser.email,
      firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || null,
      lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || null,
      profileImageUrl: googleUser.picture || null,
    }).returning();

    // Link to Google identity
    await this.linkUserToGoogle({
      userId: newUser.id,
      tenantId,
      providerId: provider.id,
      googleUser,
      tokens,
    });

    // Link to tenant with default role
    await this.ensureUserTenantLink(newUser.id, tenantId);

    return { user: newUser, isNewUser: true };
  }

  /**
   * Link user to Google SSO identity
   */
  private async linkUserToGoogle(params: {
    userId: string;
    tenantId: string;
    providerId: string;
    googleUser: GoogleUserInfo;
    tokens: any;
  }): Promise<void> {
    await db.insert(ssoUserIdentities).values({
      userId: params.userId,
      tenantId: params.tenantId,
      providerId: params.providerId,
      providerUserId: params.googleUser.sub,
      providerEmail: params.googleUser.email,
      providerProfile: {
        name: params.googleUser.name,
        picture: params.googleUser.picture,
        locale: params.googleUser.locale,
        hostedDomain: params.googleUser.hd,
        emailVerified: params.googleUser.email_verified,
      },
      accessTokenEncrypted: encryptToken(params.tokens.access_token),
      refreshTokenEncrypted: params.tokens.refresh_token 
        ? encryptToken(params.tokens.refresh_token) 
        : null,
      tokenExpiresAt: params.tokens.expires_in 
        ? new Date(Date.now() + params.tokens.expires_in * 1000) 
        : null,
      lastLoginAt: new Date(),
      loginCount: '1',
    });
  }

  /**
   * Ensure user is linked to tenant
   */
  private async ensureUserTenantLink(userId: string, tenantId: string): Promise<void> {
    // Check if link exists
    const [existing] = await db.select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));

    if (existing) return;

    // Get or create default role
    let [staffRole] = await db.select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, 'Staff')
      ));

    if (!staffRole) {
      // Create staff role if it doesn't exist
      [staffRole] = await db.insert(roles).values({
        tenantId,
        name: 'Staff',
        description: 'Default role for SSO users',
      }).returning();
    }

    // Link user to tenant
    await db.insert(userTenants).values({
      userId,
      tenantId,
      roleId: staffRole.id,
      isActive: true,
    });
  }

  /**
   * Revoke Google access token
   */
  async revokeAccess(userId: string, providerId: string): Promise<void> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.userId, userId),
        eq(ssoUserIdentities.providerId, providerId)
      ));

    if (!identity || !identity.accessTokenEncrypted) return;

    const accessToken = decryptToken(identity.accessTokenEncrypted);

    // Revoke token with Google
    await fetch(`${GOOGLE_REVOKE_URL}?token=${accessToken}`, {
      method: 'POST',
    });

    // Remove identity record
    await db.delete(ssoUserIdentities)
      .where(eq(ssoUserIdentities.id, identity.id));
  }

  /**
   * Log SSO audit event
   */
  private async logAuditEvent(params: {
    tenantId: string;
    userId?: string;
    providerId?: string;
    action: string;
    status: 'success' | 'failure';
    email?: string;
    providerUserId?: string;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(ssoAuditLog).values({
      tenantId: params.tenantId,
      userId: params.userId,
      providerId: params.providerId,
      action: params.action,
      status: params.status,
      email: params.email,
      providerUserId: params.providerUserId,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {},
    });
  }

  /**
   * Get Google provider for tenant
   */
  async getGoogleProvider(tenantId: string): Promise<SsoProviderConfig | null> {
    const [provider] = await db.select()
      .from(ssoProviderConfigs)
      .where(and(
        eq(ssoProviderConfigs.tenantId, tenantId),
        eq(ssoProviderConfigs.providerType, 'google'),
        eq(ssoProviderConfigs.status, 'active')
      ));
    return provider || null;
  }
}

export const googleSsoService = new GoogleSsoService();
