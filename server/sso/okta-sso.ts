/**
 * Okta SSO Integration
 * 
 * Handles Okta OAuth 2.0/OpenID Connect authentication with
 * enterprise features like group claims and custom attributes.
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { users, userTenants, roles, tenants } from '@shared/schema';
import {
  ssoProviderConfigs,
  ssoUserIdentities,
  ssoAuthSessions,
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

interface OktaUserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  locale?: string;
  zoneinfo?: string;
  groups?: string[];
}

interface OktaIdTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  iat: number;
  exp: number;
  auth_time?: number;
  nonce?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  amr?: string[];
}

interface OktaAuthResult {
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
    groups?: string[];
    amr?: string[];
  };
}

interface RoleMappingConfig {
  groupMap?: Record<string, string>;
  defaultRole?: string;
}

export class OktaSsoService {
  /**
   * Setup Okta SSO provider for a tenant
   */
  async setupOktaProvider(
    tenantId: string,
    config: {
      clientId: string;
      clientSecret: string;
      oktaDomain: string;
      authServerId?: string;
      allowedDomains?: string[];
      autoCreateUsers?: boolean;
      roleMapping?: RoleMappingConfig;
      scopes?: string[];
    }
  ): Promise<SsoProviderConfig> {
    const authServerId = config.authServerId || 'default';
    const baseUrl = `https://${config.oktaDomain}`;
    const issuerUrl = `${baseUrl}/oauth2/${authServerId}`;

    const [provider] = await db.insert(ssoProviderConfigs).values({
      tenantId,
      providerType: 'okta',
      providerName: 'okta',
      displayName: 'Okta',
      clientId: config.clientId,
      clientSecretEncrypted: encryptToken(config.clientSecret),
      issuerUrl,
      authorizationUrl: `${issuerUrl}/v1/authorize`,
      tokenUrl: `${issuerUrl}/v1/token`,
      userInfoUrl: `${issuerUrl}/v1/userinfo`,
      jwksUrl: `${issuerUrl}/v1/keys`,
      logoutUrl: `${issuerUrl}/v1/logout`,
      scopes: config.scopes || ['openid', 'profile', 'email', 'groups'],
      allowedDomains: config.allowedDomains || [],
      autoCreateUsers: config.autoCreateUsers ?? true,
      claimMappings: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        profileImage: 'picture',
        groups: 'groups',
      },
      status: 'inactive',
    }).returning();

    await this.logAuditEvent(tenantId, 'okta.provider.created', {
      providerId: provider.id,
    });

    return provider;
  }

  /**
   * Generate Okta authorization URL
   */
  async generateAuthUrl(
    tenantId: string,
    providerId: string,
    redirectUri: string,
    returnUrl?: string
  ): Promise<string> {
    const provider = await ssoService.getProviderById(providerId);
    if (!provider || provider.providerType !== 'okta') {
      throw new Error('Invalid Okta provider');
    }

    if (provider.status !== 'active') {
      throw new Error('Okta provider is not active');
    }

    const state = generateState();
    const nonce = generateNonce();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(ssoAuthSessions).values({
      tenantId,
      providerId,
      state,
      nonce,
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri,
      returnUrl,
      status: 'pending',
      expiresAt,
    });

    const authUrl = new URL(provider.authorizationUrl!);
    const scopes = (provider.scopes as string[]) || ['openid', 'profile', 'email'];

    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'login');

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    provider: SsoProviderConfig,
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn?: number;
  }> {
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
      throw new Error(`Okta token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user info from Okta
   */
  async getUserInfo(provider: SsoProviderConfig, accessToken: string): Promise<OktaUserInfo> {
    const response = await fetch(provider.userInfoUrl!, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Okta user info');
    }

    return response.json();
  }

  /**
   * Map Okta groups to platform role
   */
  mapGroupsToRole(groups: string[], roleMapping: RoleMappingConfig): string {
    if (!groups || groups.length === 0) {
      return roleMapping.defaultRole || 'staff';
    }

    const groupMap = roleMapping.groupMap || {};
    for (const group of groups) {
      if (groupMap[group]) {
        return groupMap[group];
      }
      const lowerGroup = group.toLowerCase();
      if (lowerGroup.includes('admin')) return 'admin';
      if (lowerGroup.includes('manager')) return 'manager';
    }

    return roleMapping.defaultRole || 'staff';
  }

  /**
   * Validate Okta domain ownership
   */
  async validateDomain(oktaDomain: string): Promise<boolean> {
    try {
      const wellKnownUrl = `https://${oktaDomain}/.well-known/openid-configuration`;
      const response = await fetch(wellKnownUrl, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Introspect access token
   */
  async introspectToken(
    provider: SsoProviderConfig,
    token: string
  ): Promise<{ active: boolean; exp?: number; sub?: string }> {
    const clientSecret = decryptToken(provider.clientSecretEncrypted);
    const introspectUrl = provider.issuerUrl + '/v1/introspect';

    const body = new URLSearchParams({
      token,
      token_type_hint: 'access_token',
      client_id: provider.clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(introspectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return { active: false };
    }

    return response.json();
  }

  /**
   * Revoke tokens on logout
   */
  async revokeTokens(
    provider: SsoProviderConfig,
    tokens: { accessToken?: string; refreshToken?: string }
  ): Promise<void> {
    const clientSecret = decryptToken(provider.clientSecretEncrypted);
    const revokeUrl = provider.issuerUrl + '/v1/revoke';

    const revoke = async (token: string, hint: string) => {
      const body = new URLSearchParams({
        token,
        token_type_hint: hint,
        client_id: provider.clientId,
        client_secret: clientSecret,
      });

      await fetch(revokeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    };

    if (tokens.accessToken) {
      await revoke(tokens.accessToken, 'access_token');
    }
    if (tokens.refreshToken) {
      await revoke(tokens.refreshToken, 'refresh_token');
    }
  }

  /**
   * Handle Okta callback - exchange code and get user info
   */
  async handleCallback(params: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<{
    user: OktaUserInfo;
    tokens: { accessToken: string; refreshToken?: string; idToken?: string };
    session: any;
    provider: SsoProviderConfig;
    groups: string[];
  }> {
    const [session] = await db.select()
      .from(ssoAuthSessions)
      .where(and(
        eq(ssoAuthSessions.state, params.state),
        eq(ssoAuthSessions.status, 'pending')
      ));

    if (!session) {
      throw new Error('Invalid or expired Okta session');
    }

    if (new Date() > session.expiresAt) {
      await db.update(ssoAuthSessions)
        .set({ status: 'expired' })
        .where(eq(ssoAuthSessions.id, session.id));
      throw new Error('Okta session has expired');
    }

    const provider = await ssoService.getProviderById(session.providerId!);
    if (!provider) {
      throw new Error('Okta provider not found');
    }

    const tokens = await this.exchangeCode(
      provider,
      params.code,
      params.redirectUri,
      session.codeVerifier!
    );

    const userInfo = await this.getUserInfo(provider, tokens.accessToken);

    await db.update(ssoAuthSessions)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(ssoAuthSessions.id, session.id));

    await db.update(ssoProviderConfigs)
      .set({ lastUsedAt: new Date() })
      .where(eq(ssoProviderConfigs.id, provider.id));

    await this.logAuditEvent(session.tenantId!, 'okta.authentication.success', {
      providerId: provider.id,
      email: userInfo.email,
    });

    return {
      user: userInfo,
      tokens,
      session,
      provider,
      groups: userInfo.groups || [],
    };
  }

  private async logAuditEvent(
    tenantId: string,
    action: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await db.insert(ssoAuditLog).values({
      tenantId,
      action,
      status: 'success',
      metadata,
      createdAt: new Date(),
    });
  }
}

export const oktaSsoService = new OktaSsoService();
