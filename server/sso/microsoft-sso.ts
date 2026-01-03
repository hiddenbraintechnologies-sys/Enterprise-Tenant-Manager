/**
 * Microsoft Azure AD SSO Integration
 * 
 * Handles Microsoft OAuth 2.0/OpenID Connect authentication with
 * enterprise account support and role mapping based on claims.
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

// Microsoft OAuth endpoints (common for multi-tenant apps)
const MS_AUTH_URL_TEMPLATE = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize';
const MS_TOKEN_URL_TEMPLATE = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token';
const MS_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';
const MS_LOGOUT_URL_TEMPLATE = 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout';

// Default tenant for multi-tenant apps
const MS_COMMON_TENANT = 'common';
const MS_ORGANIZATIONS_TENANT = 'organizations'; // Only work/school accounts

interface MicrosoftUserInfo {
  id: string;                    // Microsoft user ID (OID)
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName: string;     // UPN (email-like identifier)
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  businessPhones?: string[];
  mobilePhone?: string;
}

interface MicrosoftIdTokenClaims {
  aud: string;                   // Audience (client ID)
  iss: string;                   // Issuer
  iat: number;                   // Issued at
  nbf: number;                   // Not before
  exp: number;                   // Expiration
  sub: string;                   // Subject (user ID)
  oid: string;                   // Object ID (user's unique ID in Azure AD)
  preferred_username?: string;   // UPN or email
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  tid?: string;                  // Tenant ID
  roles?: string[];              // App roles assigned to user
  groups?: string[];             // Group IDs user belongs to
  wids?: string[];               // Well-known directory roles
  hasgroups?: boolean;           // True if user has more groups than can fit in token
}

interface MicrosoftAuthResult {
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
    idToken?: string;
    expiresAt?: Date;
  };
  claims: {
    azureTenantId?: string;
    roles?: string[];
    groups?: string[];
    jobTitle?: string;
    department?: string;
  };
}

// Role mapping configuration
interface RoleMappingConfig {
  // Map Azure AD roles to platform roles
  roleMap?: Record<string, string>;
  // Map Azure AD groups to platform roles
  groupMap?: Record<string, string>;
  // Default role if no mapping matches
  defaultRole?: string;
}

export class MicrosoftSsoService {
  /**
   * Setup Microsoft SSO provider for a tenant
   */
  async setupMicrosoftProvider(
    tenantId: string,
    config: {
      clientId: string;
      clientSecret: string;
      azureTenantId?: string;      // Azure AD tenant ID (use 'common' for multi-tenant)
      allowedDomains?: string[];
      autoCreateUsers?: boolean;
      roleMapping?: RoleMappingConfig;
      requireEnterpriseAccounts?: boolean;
    }
  ): Promise<SsoProviderConfig> {
    const azureTenant = config.requireEnterpriseAccounts 
      ? MS_ORGANIZATIONS_TENANT 
      : (config.azureTenantId || MS_COMMON_TENANT);

    // Check if provider already exists
    const existing = await db.select()
      .from(ssoProviderConfigs)
      .where(and(
        eq(ssoProviderConfigs.tenantId, tenantId),
        eq(ssoProviderConfigs.providerType, 'microsoft')
      ));

    const providerConfig = {
      clientId: config.clientId,
      clientSecretEncrypted: encryptToken(config.clientSecret),
      issuerUrl: `https://login.microsoftonline.com/${azureTenant}/v2.0`,
      authorizationUrl: MS_AUTH_URL_TEMPLATE.replace('{tenant}', azureTenant),
      tokenUrl: MS_TOKEN_URL_TEMPLATE.replace('{tenant}', azureTenant),
      userInfoUrl: MS_GRAPH_URL,
      logoutUrl: MS_LOGOUT_URL_TEMPLATE.replace('{tenant}', azureTenant),
      allowedDomains: config.allowedDomains || [],
      autoCreateUsers: config.autoCreateUsers ?? true,
      claimMappings: {
        email: 'mail',
        firstName: 'givenName',
        lastName: 'surname',
        roleMapping: config.roleMapping || {},
        azureTenantId: azureTenant,
        requireEnterpriseAccounts: config.requireEnterpriseAccounts || false,
      },
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const [updated] = await db.update(ssoProviderConfigs)
        .set(providerConfig)
        .where(eq(ssoProviderConfigs.id, existing[0].id))
        .returning();
      return updated;
    }

    // Create new provider
    return ssoService.createProviderConfig(tenantId, {
      providerType: 'microsoft',
      providerName: 'microsoft',
      displayName: 'Sign in with Microsoft',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      issuerUrl: `https://login.microsoftonline.com/${azureTenant}/v2.0`,
      allowedDomains: config.allowedDomains,
      autoCreateUsers: config.autoCreateUsers,
    });
  }

  /**
   * Generate Microsoft authorization URL
   */
  async getAuthorizationUrl(params: {
    tenantId: string;
    providerId: string;
    redirectUri: string;
    returnUrl?: string;
    loginHint?: string;
    domainHint?: string;
    prompt?: 'login' | 'consent' | 'select_account' | 'none';
  }): Promise<string> {
    const provider = await ssoService.getProviderById(params.providerId);
    if (!provider || provider.providerType !== 'microsoft') {
      throw new Error('Invalid Microsoft SSO provider');
    }

    if (provider.status !== 'active') {
      throw new Error('Microsoft SSO is not active for this tenant');
    }

    // Get Azure tenant from configuration
    const claimMappings = provider.claimMappings as any || {};
    const azureTenant = claimMappings.azureTenantId || MS_COMMON_TENANT;

    // Generate security parameters
    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store auth session
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { ssoAuthSessions } = require('../../shared/models/sso');
    await db.insert(ssoAuthSessions).values({
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

    // Build Microsoft authorization URL
    const authUrl = new URL(MS_AUTH_URL_TEMPLATE.replace('{tenant}', azureTenant));
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('response_mode', 'query');
    
    // Request scopes including offline_access for refresh tokens
    authUrl.searchParams.set('scope', 'openid profile email offline_access User.Read');
    
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Optional: prompt behavior
    if (params.prompt) {
      authUrl.searchParams.set('prompt', params.prompt);
    }

    // Optional: pre-fill email
    if (params.loginHint) {
      authUrl.searchParams.set('login_hint', params.loginHint);
    }

    // Optional: domain hint for Azure AD
    if (params.domainHint) {
      authUrl.searchParams.set('domain_hint', params.domainHint);
    }

    return authUrl.toString();
  }

  /**
   * Handle Microsoft OAuth callback
   */
  async handleCallback(params: {
    code: string;
    state: string;
    redirectUri: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<MicrosoftAuthResult> {
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

    const claimMappings = provider.claimMappings as any || {};
    const azureTenant = claimMappings.azureTenantId || MS_COMMON_TENANT;

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens({
      code: params.code,
      redirectUri: params.redirectUri,
      clientId: provider.clientId,
      clientSecret: decryptToken(provider.clientSecretEncrypted),
      codeVerifier: authSession.codeVerifier!,
      azureTenant,
    });

    // Parse ID token claims
    const idTokenClaims = this.parseIdToken(tokens.id_token);

    // Get user info from Microsoft Graph
    const msUser = await this.fetchUserInfo(tokens.access_token);

    // Validate domain restrictions
    const allowedDomains = provider.allowedDomains as string[] || [];
    const userDomain = this.extractDomain(msUser.mail || msUser.userPrincipalName);
    
    if (allowedDomains.length > 0 && userDomain) {
      if (!allowedDomains.includes(userDomain)) {
        await this.logAuditEvent({
          tenantId: authSession.tenantId!,
          providerId: provider.id,
          action: 'microsoft.login.domain_rejected',
          status: 'failure',
          email: msUser.mail || msUser.userPrincipalName,
          errorMessage: `Domain ${userDomain} not in allowed list`,
          ipAddress: params.ipAddress,
        });
        throw new Error(`Email domain ${userDomain} is not allowed for this organization`);
      }
    }

    // Validate enterprise account requirement
    if (claimMappings.requireEnterpriseAccounts) {
      if (!idTokenClaims?.tid || idTokenClaims.tid === '9188040d-6c67-4c5b-b112-36a304b66dad') {
        // This is a personal Microsoft account tenant ID
        throw new Error('Enterprise accounts are required. Personal Microsoft accounts are not allowed.');
      }
    }

    // Update auth session as completed
    await db.update(ssoAuthSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(ssoAuthSessions.id, authSession.id));

    // Find or create user with role mapping
    const { user, isNewUser, mappedRole } = await this.findOrCreateUser({
      tenantId: authSession.tenantId!,
      provider,
      msUser,
      idTokenClaims,
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
      action: isNewUser ? 'microsoft.user.created' : 'microsoft.login.success',
      status: 'success',
      email: msUser.mail || msUser.userPrincipalName,
      providerUserId: msUser.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        azureTenantId: idTokenClaims?.tid,
        roles: idTokenClaims?.roles,
        mappedRole,
      },
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
        idToken: tokens.id_token,
        expiresAt: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined,
      },
      claims: {
        azureTenantId: idTokenClaims?.tid,
        roles: idTokenClaims?.roles,
        groups: idTokenClaims?.groups,
        jobTitle: msUser.jobTitle,
        department: msUser.department,
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
    azureTenant: string;
  }): Promise<{
    access_token: string;
    refresh_token?: string;
    id_token: string;
    token_type: string;
    expires_in?: number;
  }> {
    const tokenUrl = MS_TOKEN_URL_TEMPLATE.replace('{tenant}', params.azureTenant);
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    });

    const response = await fetch(tokenUrl, {
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
   * Parse ID token to extract claims
   */
  private parseIdToken(idToken: string): MicrosoftIdTokenClaims | null {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) return null;
      
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  /**
   * Fetch user info from Microsoft Graph
   */
  private async fetchUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    const response = await fetch(MS_GRAPH_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft user info');
    }

    return response.json();
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string | null {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Find or create user from Microsoft login with role mapping
   */
  private async findOrCreateUser(params: {
    tenantId: string;
    provider: SsoProviderConfig;
    msUser: MicrosoftUserInfo;
    idTokenClaims: MicrosoftIdTokenClaims | null;
    tokens: any;
  }): Promise<{ user: typeof users.$inferSelect; isNewUser: boolean; mappedRole?: string }> {
    const { tenantId, provider, msUser, idTokenClaims, tokens } = params;
    const email = msUser.mail || msUser.userPrincipalName;

    // Check if SSO identity already exists
    const [existingIdentity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, provider.id),
        eq(ssoUserIdentities.providerUserId, msUser.id)
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
          providerProfile: {
            displayName: msUser.displayName,
            jobTitle: msUser.jobTitle,
            department: msUser.department,
            azureTenantId: idTokenClaims?.tid,
            roles: idTokenClaims?.roles,
            groups: idTokenClaims?.groups,
          },
          updatedAt: new Date(),
        })
        .where(eq(ssoUserIdentities.id, existingIdentity.id));

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, existingIdentity.userId));
      
      // Update role if claims changed
      const mappedRole = await this.updateUserRole(existingIdentity.userId, tenantId, provider, idTokenClaims);
      
      return { user, isNewUser: false, mappedRole };
    }

    // Check if user exists by email
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      // Link existing user to Microsoft identity
      await this.linkUserToMicrosoft({
        userId: existingUser.id,
        tenantId,
        providerId: provider.id,
        msUser,
        idTokenClaims,
        tokens,
      });

      // Ensure user is linked to tenant
      const mappedRole = await this.ensureUserTenantLink(existingUser.id, tenantId, provider, idTokenClaims);

      return { user: existingUser, isNewUser: false, mappedRole };
    }

    // Auto-create user if enabled
    if (!provider.autoCreateUsers) {
      throw new Error('User not found and auto-creation is disabled');
    }

    // Create new user
    const [newUser] = await db.insert(users).values({
      email,
      firstName: msUser.givenName || msUser.displayName?.split(' ')[0] || null,
      lastName: msUser.surname || msUser.displayName?.split(' ').slice(1).join(' ') || null,
      profileImageUrl: null, // Microsoft Graph requires separate call for photo
    }).returning();

    // Link to Microsoft identity
    await this.linkUserToMicrosoft({
      userId: newUser.id,
      tenantId,
      providerId: provider.id,
      msUser,
      idTokenClaims,
      tokens,
    });

    // Link to tenant with mapped role
    const mappedRole = await this.ensureUserTenantLink(newUser.id, tenantId, provider, idTokenClaims);

    return { user: newUser, isNewUser: true, mappedRole };
  }

  /**
   * Link user to Microsoft SSO identity
   */
  private async linkUserToMicrosoft(params: {
    userId: string;
    tenantId: string;
    providerId: string;
    msUser: MicrosoftUserInfo;
    idTokenClaims: MicrosoftIdTokenClaims | null;
    tokens: any;
  }): Promise<void> {
    await db.insert(ssoUserIdentities).values({
      userId: params.userId,
      tenantId: params.tenantId,
      providerId: params.providerId,
      providerUserId: params.msUser.id,
      providerEmail: params.msUser.mail || params.msUser.userPrincipalName,
      providerProfile: {
        displayName: params.msUser.displayName,
        jobTitle: params.msUser.jobTitle,
        department: params.msUser.department,
        officeLocation: params.msUser.officeLocation,
        azureTenantId: params.idTokenClaims?.tid,
        roles: params.idTokenClaims?.roles,
        groups: params.idTokenClaims?.groups,
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
   * Map Azure AD roles/groups to platform role
   */
  private async mapRoleFromClaims(
    provider: SsoProviderConfig,
    claims: MicrosoftIdTokenClaims | null
  ): Promise<string> {
    if (!claims) return 'Staff';

    const claimMappings = provider.claimMappings as any || {};
    const roleMapping = claimMappings.roleMapping as RoleMappingConfig || {};

    // Check role mapping first
    if (claims.roles && roleMapping.roleMap) {
      for (const azureRole of claims.roles) {
        if (roleMapping.roleMap[azureRole]) {
          return roleMapping.roleMap[azureRole];
        }
      }
    }

    // Check group mapping
    if (claims.groups && roleMapping.groupMap) {
      for (const groupId of claims.groups) {
        if (roleMapping.groupMap[groupId]) {
          return roleMapping.groupMap[groupId];
        }
      }
    }

    // Check well-known directory roles (for global admin, etc.)
    if (claims.wids) {
      // Global Administrator role
      if (claims.wids.includes('62e90394-69f5-4237-9190-012177145e10')) {
        return 'Admin';
      }
      // User Administrator role
      if (claims.wids.includes('fe930be7-5e62-47db-91af-98c3a49a38b1')) {
        return 'Manager';
      }
    }

    return roleMapping.defaultRole || 'Staff';
  }

  /**
   * Ensure user is linked to tenant with appropriate role
   */
  private async ensureUserTenantLink(
    userId: string,
    tenantId: string,
    provider: SsoProviderConfig,
    claims: MicrosoftIdTokenClaims | null
  ): Promise<string> {
    // Map role from claims
    const mappedRoleName = await this.mapRoleFromClaims(provider, claims);

    // Check if link exists
    const [existing] = await db.select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));

    // Get or create the mapped role
    let [role] = await db.select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, mappedRoleName)
      ));

    if (!role) {
      // Create role if it doesn't exist
      [role] = await db.insert(roles).values({
        tenantId,
        name: mappedRoleName,
        description: `Auto-created role from Microsoft SSO mapping`,
      }).returning();
    }

    if (existing) {
      // Update role if it changed
      if (existing.roleId !== role.id) {
        await db.update(userTenants)
          .set({ roleId: role.id })
          .where(eq(userTenants.id, existing.id));
      }
      return mappedRoleName;
    }

    // Link user to tenant with mapped role
    await db.insert(userTenants).values({
      userId,
      tenantId,
      roleId: role.id,
      isActive: true,
    });

    return mappedRoleName;
  }

  /**
   * Update user role based on latest claims
   */
  private async updateUserRole(
    userId: string,
    tenantId: string,
    provider: SsoProviderConfig,
    claims: MicrosoftIdTokenClaims | null
  ): Promise<string | undefined> {
    const mappedRoleName = await this.mapRoleFromClaims(provider, claims);

    const [userTenant] = await db.select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));

    if (!userTenant) return undefined;

    // Get mapped role
    let [role] = await db.select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, mappedRoleName)
      ));

    if (!role) {
      [role] = await db.insert(roles).values({
        tenantId,
        name: mappedRoleName,
        description: `Auto-created role from Microsoft SSO mapping`,
      }).returning();
    }

    if (userTenant.roleId !== role.id) {
      await db.update(userTenants)
        .set({ roleId: role.id })
        .where(eq(userTenants.id, userTenant.id));
      return mappedRoleName;
    }

    return undefined;
  }

  /**
   * Revoke Microsoft access token
   */
  async revokeAccess(userId: string, providerId: string): Promise<void> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.userId, userId),
        eq(ssoUserIdentities.providerId, providerId)
      ));

    if (!identity) return;

    // Note: Microsoft doesn't have a token revocation endpoint
    // Just remove the identity record
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
    metadata?: Record<string, any>;
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
      metadata: params.metadata || {},
    });
  }

  /**
   * Get Microsoft provider for tenant
   */
  async getMicrosoftProvider(tenantId: string): Promise<SsoProviderConfig | null> {
    const [provider] = await db.select()
      .from(ssoProviderConfigs)
      .where(and(
        eq(ssoProviderConfigs.tenantId, tenantId),
        eq(ssoProviderConfigs.providerType, 'microsoft'),
        eq(ssoProviderConfigs.status, 'active')
      ));
    return provider || null;
  }
}

export const microsoftSsoService = new MicrosoftSsoService();
