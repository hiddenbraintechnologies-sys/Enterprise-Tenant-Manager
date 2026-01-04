/**
 * SSO Service
 * 
 * Handles OAuth 2.0/OIDC authentication flows for multiple identity providers.
 */

import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import {
  ssoProviderConfigs,
  ssoUserIdentities,
  ssoAuthSessions,
  ssoDomainMappings,
  ssoAuditLog,
  SSO_PROVIDER_DEFAULTS,
  SsoProviderConfig,
  SsoUserIdentity,
  SsoProviderType,
} from '../../shared/models/sso';
import {
  encryptToken,
  decryptToken,
  generateState,
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
  parseIdTokenClaims,
  extractUserFromClaims,
  isTokenExpired,
} from './token-handler';

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

interface AuthorizationUrlParams {
  tenantId: string;
  providerId: string;
  redirectUri: string;
  returnUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TokenExchangeParams {
  state: string;
  code: string;
  redirectUri: string;
}

export class SsoService {
  /**
   * Create a new SSO provider configuration for a tenant
   */
  async createProviderConfig(
    tenantId: string,
    config: {
      providerType: SsoProviderType;
      providerName: string;
      displayName?: string;
      clientId: string;
      clientSecret: string;
      issuerUrl?: string;
      scopes?: string[];
      allowedDomains?: string[];
      autoCreateUsers?: boolean;
      createdBy?: string;
    }
  ): Promise<SsoProviderConfig> {
    // Get default endpoints for provider type
    const defaults = SSO_PROVIDER_DEFAULTS[config.providerType] || {};

    const [provider] = await db.insert(ssoProviderConfigs).values({
      tenantId,
      providerType: config.providerType,
      providerName: config.providerName,
      displayName: config.displayName || config.providerName,
      clientId: config.clientId,
      clientSecretEncrypted: encryptToken(config.clientSecret),
      issuerUrl: config.issuerUrl || (defaults.issuerUrl as string),
      authorizationUrl: defaults.authorizationUrl as string,
      tokenUrl: defaults.tokenUrl as string,
      userInfoUrl: defaults.userInfoUrl as string,
      jwksUrl: defaults.jwksUrl as string,
      scopes: config.scopes || defaults.scopes || ['openid', 'profile', 'email'],
      allowedDomains: config.allowedDomains || [],
      autoCreateUsers: config.autoCreateUsers ?? true,
      status: 'inactive',
      createdBy: config.createdBy,
    }).returning();

    await this.logAuditEvent({
      tenantId,
      action: 'sso.provider.created',
      status: 'success',
      metadata: { providerId: provider.id, providerType: config.providerType },
    });

    return provider;
  }

  /**
   * Get all SSO providers for a tenant
   */
  async getTenantProviders(tenantId: string): Promise<SsoProviderConfig[]> {
    return db.select()
      .from(ssoProviderConfigs)
      .where(eq(ssoProviderConfigs.tenantId, tenantId))
      .orderBy(desc(ssoProviderConfigs.isDefault));
  }

  /**
   * Get provider by ID
   */
  async getProviderById(providerId: string): Promise<SsoProviderConfig | null> {
    const [provider] = await db.select()
      .from(ssoProviderConfigs)
      .where(eq(ssoProviderConfigs.id, providerId));
    return provider || null;
  }

  /**
   * Find provider by email domain (for Home Realm Discovery)
   */
  async findProviderByDomain(tenantId: string, email: string): Promise<SsoProviderConfig | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const [mapping] = await db.select()
      .from(ssoDomainMappings)
      .where(and(
        eq(ssoDomainMappings.tenantId, tenantId),
        eq(ssoDomainMappings.domain, domain),
        eq(ssoDomainMappings.isVerified, true)
      ));

    if (!mapping) return null;

    return this.getProviderById(mapping.providerId);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async generateAuthorizationUrl(params: AuthorizationUrlParams): Promise<string> {
    const provider = await this.getProviderById(params.providerId);
    if (!provider) {
      throw new Error('SSO provider not found');
    }

    if (provider.status !== 'active') {
      throw new Error('SSO provider is not active');
    }

    // Generate security parameters
    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Calculate session expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store auth session
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
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: 'pending',
      expiresAt,
    });

    // Build authorization URL
    const authUrl = new URL(provider.authorizationUrl!);
    const scopes = provider.scopes as string[] || ['openid', 'profile', 'email'];

    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    
    // Add PKCE parameters
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Provider-specific parameters
    if (provider.providerType === 'google') {
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
    } else if (provider.providerType === 'microsoft') {
      authUrl.searchParams.set('response_mode', 'query');
    }

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(params: TokenExchangeParams): Promise<{
    user: any;
    tokens: OAuthTokenResponse;
    session: any;
    provider: SsoProviderConfig;
  }> {
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

    const provider = await this.getProviderById(authSession.providerId!);
    if (!provider) {
      throw new Error('SSO provider not found');
    }

    // Exchange code for tokens
    const tokenResponse = await this.fetchTokens({
      provider,
      code: params.code,
      redirectUri: params.redirectUri,
      codeVerifier: authSession.codeVerifier!,
    });

    // Parse ID token to get user info
    let userInfo: any;
    if (tokenResponse.id_token) {
      const claims = parseIdTokenClaims(tokenResponse.id_token);
      if (claims) {
        const claimMappings = provider.claimMappings as Record<string, string> || {};
        userInfo = extractUserFromClaims(claims, claimMappings);
      }
    }

    // If no ID token or missing info, fetch from userinfo endpoint
    if (!userInfo?.email && provider.userInfoUrl && tokenResponse.access_token) {
      userInfo = await this.fetchUserInfo(provider.userInfoUrl, tokenResponse.access_token);
    }

    // Update auth session as completed
    await db.update(ssoAuthSessions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(ssoAuthSessions.id, authSession.id));

    // Update provider last used timestamp
    await db.update(ssoProviderConfigs)
      .set({ lastUsedAt: new Date() })
      .where(eq(ssoProviderConfigs.id, provider.id));

    // Log successful authentication
    await this.logAuditEvent({
      tenantId: authSession.tenantId!,
      providerId: provider.id,
      action: 'sso.authentication.success',
      status: 'success',
      email: userInfo?.email,
      providerUserId: userInfo?.providerUserId,
      ipAddress: authSession.ipAddress || undefined,
      userAgent: authSession.userAgent || undefined,
    });

    return {
      user: userInfo,
      tokens: tokenResponse,
      session: authSession,
      provider,
    };
  }

  /**
   * Fetch tokens from provider's token endpoint
   */
  private async fetchTokens(params: {
    provider: SsoProviderConfig;
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<OAuthTokenResponse> {
    const { provider, code, redirectUri, codeVerifier } = params;

    const clientSecret = decryptToken(provider.clientSecretEncrypted);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(provider.tokenUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch user info from provider's userinfo endpoint
   */
  private async fetchUserInfo(userInfoUrl: string, accessToken: string): Promise<any> {
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const data = await response.json();
    
    return {
      email: data.email,
      firstName: data.given_name || data.name?.split(' ')[0],
      lastName: data.family_name || data.name?.split(' ').slice(1).join(' '),
      profileImage: data.picture || data.avatar_url,
      providerUserId: data.sub || data.id,
    };
  }

  /**
   * Link SSO identity to user
   */
  async linkUserIdentity(params: {
    userId: string;
    tenantId: string;
    providerId: string;
    providerUserId: string;
    providerEmail?: string;
    providerProfile?: any;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }): Promise<SsoUserIdentity> {
    const [identity] = await db.insert(ssoUserIdentities).values({
      userId: params.userId,
      tenantId: params.tenantId,
      providerId: params.providerId,
      providerUserId: params.providerUserId,
      providerEmail: params.providerEmail,
      providerProfile: params.providerProfile || {},
      accessTokenEncrypted: params.accessToken ? encryptToken(params.accessToken) : null,
      refreshTokenEncrypted: params.refreshToken ? encryptToken(params.refreshToken) : null,
      tokenExpiresAt: params.tokenExpiresAt,
      lastLoginAt: new Date(),
      loginCount: '1',
    }).returning();

    return identity;
  }

  /**
   * Find existing SSO identity
   */
  async findUserIdentity(providerId: string, providerUserId: string): Promise<SsoUserIdentity | null> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, providerId),
        eq(ssoUserIdentities.providerUserId, providerUserId)
      ));
    return identity || null;
  }

  /**
   * Update SSO identity on login
   */
  async updateIdentityOnLogin(identityId: string, tokens: OAuthTokenResponse): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await db.update(ssoUserIdentities)
      .set({
        accessTokenEncrypted: encryptToken(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
        tokenExpiresAt: expiresAt,
        lastLoginAt: new Date(),
        loginCount: String(parseInt('1') + 1), // Will need to fetch current count
        updatedAt: new Date(),
      })
      .where(eq(ssoUserIdentities.id, identityId));
  }

  /**
   * Log SSO audit event
   */
  private async logAuditEvent(params: {
    tenantId?: string;
    userId?: string;
    providerId?: string;
    action: string;
    status: 'success' | 'failure';
    providerUserId?: string;
    email?: string;
    errorCode?: string;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    await db.insert(ssoAuditLog).values({
      tenantId: params.tenantId,
      userId: params.userId,
      providerId: params.providerId,
      action: params.action,
      status: params.status,
      providerUserId: params.providerUserId,
      email: params.email,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
    });
  }

  /**
   * Activate a provider after verification
   */
  async activateProvider(providerId: string): Promise<void> {
    await db.update(ssoProviderConfigs)
      .set({
        status: 'active',
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ssoProviderConfigs.id, providerId));
  }

  /**
   * Deactivate a provider
   */
  async deactivateProvider(providerId: string): Promise<void> {
    await db.update(ssoProviderConfigs)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(ssoProviderConfigs.id, providerId));
  }

  /**
   * Test provider connection by validating configuration
   */
  async testProviderConnection(providerId: string): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    const provider = await this.getProviderById(providerId);
    if (!provider) {
      return { success: false, message: 'Provider not found' };
    }

    const allowedHosts = [
      'accounts.google.com',
      'login.microsoftonline.com',
      '.okta.com',
      '.oktapreview.com',
    ];

    const fetchWithTimeout = async (url: string, timeoutMs = 5000): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        return response;
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      switch (provider.providerType) {
        case 'google': {
          const discoveryUrl = 'https://accounts.google.com/.well-known/openid-configuration';
          const response = await fetchWithTimeout(discoveryUrl);
          if (!response.ok) {
            return { success: false, message: 'Failed to reach Google OIDC discovery endpoint' };
          }
          const config = await response.json();
          return { 
            success: true, 
            message: 'Successfully connected to Google OAuth',
            details: { issuer: config.issuer, authorizationEndpoint: config.authorization_endpoint }
          };
        }

        case 'microsoft': {
          const tenantId = (provider as any).metadata?.tenantId || 'common';
          if (!/^[a-zA-Z0-9-]+$/.test(tenantId)) {
            return { success: false, message: 'Invalid tenant ID format' };
          }
          const discoveryUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
          const response = await fetchWithTimeout(discoveryUrl);
          if (!response.ok) {
            return { success: false, message: 'Failed to reach Microsoft OIDC discovery endpoint' };
          }
          const config = await response.json();
          return { 
            success: true, 
            message: 'Successfully connected to Microsoft Entra ID',
            details: { issuer: config.issuer, tenant: tenantId }
          };
        }

        case 'okta': {
          const oktaDomain = provider.issuerUrl?.replace('https://', '').replace(/\/$/, '') || '';
          if (!oktaDomain) {
            return { success: false, message: 'Okta domain not configured' };
          }
          if (!oktaDomain.endsWith('.okta.com') && !oktaDomain.endsWith('.oktapreview.com')) {
            return { success: false, message: 'Invalid Okta domain' };
          }
          const discoveryUrl = `https://${oktaDomain}/.well-known/openid-configuration`;
          const response = await fetchWithTimeout(discoveryUrl);
          if (!response.ok) {
            return { success: false, message: 'Failed to reach Okta OIDC discovery endpoint' };
          }
          const config = await response.json();
          return { 
            success: true, 
            message: 'Successfully connected to Okta',
            details: { issuer: config.issuer, domain: oktaDomain }
          };
        }

        case 'saml': {
          const ssoUrl = (provider as any).ssoUrl || (provider as any).metadata?.ssoUrl;
          if (!ssoUrl) {
            return { success: false, message: 'SAML SSO URL not configured' };
          }
          const url = new URL(ssoUrl);
          if (!url.protocol.startsWith('https')) {
            return { success: false, message: 'SAML SSO URL must use HTTPS' };
          }
          return { 
            success: true, 
            message: 'SAML configuration validated',
            details: { 
              ssoUrl: ssoUrl,
              entityId: (provider as any).entityId || (provider as any).metadata?.entityId,
              host: url.host
            }
          };
        }

        default:
          return { success: false, message: `Unknown provider type: ${provider.providerType}` };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, message: 'Connection timed out' };
      }
      return { 
        success: false, 
        message: 'Connection test failed',
        details: { error: 'Request error' }
      };
    }
  }

  /**
   * Delete a provider and its associated user identities
   */
  async deleteProvider(providerId: string): Promise<void> {
    await db.delete(ssoUserIdentities)
      .where(eq(ssoUserIdentities.providerId, providerId));
    
    await db.delete(ssoProviderConfigs)
      .where(eq(ssoProviderConfigs.id, providerId));
  }
}

export const ssoService = new SsoService();
