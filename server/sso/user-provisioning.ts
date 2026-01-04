/**
 * SSO User Provisioning Service
 * Handles auto-creation, role mapping, and deprovisioning of SSO users
 */

import { db } from '../db';
import { users, userTenants, roles } from '@shared/schema';
import { ssoUserIdentities, ssoAuditLog, ssoAuthSessions, SsoProviderConfig } from '@shared/models/sso';
import { eq, and, desc } from 'drizzle-orm';
import { encryptToken, decryptToken } from './token-handler';

interface SsoGroupRoleMapping {
  idpGroup: string;
  platformRole: string;
  priority?: number;
}

interface ExtendedProviderConfig {
  id: string;
  tenantId: string;
  providerType: string;
  clientId: string;
  clientSecret?: string;
  autoCreateUsers?: boolean | null;
  claimMappings?: Record<string, string> | null;
  metadata?: {
    groupRoleMappings?: SsoGroupRoleMapping[];
    defaultRole?: string;
    roleMapping?: { groupMap?: Record<string, string> };
    oktaConfig?: { domain: string; authorizationServerId?: string };
  } | null;
}

interface SsoUserProfile {
  providerUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profileImageUrl?: string;
  groups?: string[];
  attributes?: Record<string, any>;
}

interface ProvisioningResult {
  user: typeof users.$inferSelect;
  isNewUser: boolean;
  assignedRole?: string;
  tenantMembership: typeof userTenants.$inferSelect;
}

interface TokenData {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

function toExtendedConfig(provider: SsoProviderConfig): ExtendedProviderConfig {
  const metadata = (provider as any).metadata || {};
  return {
    id: provider.id,
    tenantId: provider.tenantId,
    providerType: provider.providerType,
    clientId: provider.clientId,
    clientSecret: provider.clientSecretEncrypted,
    autoCreateUsers: provider.autoCreateUsers,
    claimMappings: provider.claimMappings as Record<string, string> | null,
    metadata: {
      groupRoleMappings: metadata.groupRoleMappings || [],
      defaultRole: metadata.defaultRole || 'member',
      roleMapping: metadata.roleMapping || {},
      oktaConfig: metadata.oktaConfig,
    },
  };
}

export class SsoUserProvisioningService {
  
  /**
   * Provision user from SSO login
   * Handles auto-creation, linking, and role assignment
   */
  async provisionUser(params: {
    provider: SsoProviderConfig;
    profile: SsoUserProfile;
    tokens?: TokenData;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ProvisioningResult> {
    const { provider: rawProvider, profile, tokens, ipAddress, userAgent } = params;
    const provider = toExtendedConfig(rawProvider);

    const existingIdentity = await this.findIdentityByProviderId(
      provider.id,
      profile.providerUserId
    );

    if (existingIdentity) {
      return this.handleExistingIdentity({
        identity: existingIdentity,
        provider,
        profile,
        tokens,
        ipAddress,
        userAgent,
      });
    }

    const existingUser = await this.findUserByEmail(profile.email);

    if (existingUser) {
      return this.linkExistingUser({
        user: existingUser,
        provider,
        profile,
        tokens,
        ipAddress,
        userAgent,
      });
    }

    if (!provider.autoCreateUsers) {
      throw new Error('User not found and auto-creation is disabled for this provider');
    }

    return this.createNewUser({
      provider,
      profile,
      tokens,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Find SSO identity by provider and provider user ID
   */
  private async findIdentityByProviderId(
    providerId: string,
    providerUserId: string
  ): Promise<typeof ssoUserIdentities.$inferSelect | null> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, providerId),
        eq(ssoUserIdentities.providerUserId, providerUserId)
      ));
    return identity || null;
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<typeof users.$inferSelect | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email));
    return user || null;
  }

  /**
   * Handle login for existing SSO identity
   */
  private async handleExistingIdentity(params: {
    identity: typeof ssoUserIdentities.$inferSelect;
    provider: ExtendedProviderConfig;
    profile: SsoUserProfile;
    tokens?: TokenData;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ProvisioningResult> {
    const { identity, provider, profile, tokens, ipAddress, userAgent } = params;

    await db.update(ssoUserIdentities)
      .set({
        accessTokenEncrypted: tokens?.accessToken ? encryptToken(tokens.accessToken) : undefined,
        refreshTokenEncrypted: tokens?.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
        tokenExpiresAt: tokens?.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined,
        lastLoginAt: new Date(),
        loginCount: String(parseInt(identity.loginCount || '0') + 1),
        providerProfile: {
          ...identity.providerProfile as object,
          displayName: profile.displayName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          groups: profile.groups,
          attributes: profile.attributes,
        },
        updatedAt: new Date(),
      })
      .where(eq(ssoUserIdentities.id, identity.id));

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, identity.userId));

    if (!user) {
      throw new Error('User not found for existing identity');
    }

    const assignedRole = await this.syncUserRole({
      userId: user.id,
      tenantId: provider.tenantId,
      provider,
      groups: profile.groups,
    });

    const tenantMembership = await this.ensureTenantMembership({
      userId: user.id,
      tenantId: provider.tenantId,
      role: assignedRole,
    });

    await this.logAuditEvent({
      tenantId: provider.tenantId,
      providerId: provider.id,
      userId: user.id,
      action: 'sso_login',
      details: {
        providerType: provider.providerType,
        groups: profile.groups,
        assignedRole,
        ipAddress,
        userAgent,
      },
    });

    return {
      user,
      isNewUser: false,
      assignedRole,
      tenantMembership,
    };
  }

  /**
   * Link existing user to SSO identity
   */
  private async linkExistingUser(params: {
    user: typeof users.$inferSelect;
    provider: ExtendedProviderConfig;
    profile: SsoUserProfile;
    tokens?: TokenData;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ProvisioningResult> {
    const { user, provider, profile, tokens, ipAddress, userAgent } = params;

    await db.insert(ssoUserIdentities).values({
      userId: user.id,
      tenantId: provider.tenantId,
      providerId: provider.id,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
      providerProfile: {
        displayName: profile.displayName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        groups: profile.groups,
        attributes: profile.attributes,
      },
      accessTokenEncrypted: tokens?.accessToken ? encryptToken(tokens.accessToken) : null,
      refreshTokenEncrypted: tokens?.refreshToken ? encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt: tokens?.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
      lastLoginAt: new Date(),
      loginCount: '1',
    });

    const assignedRole = await this.syncUserRole({
      userId: user.id,
      tenantId: provider.tenantId,
      provider,
      groups: profile.groups,
    });

    const tenantMembership = await this.ensureTenantMembership({
      userId: user.id,
      tenantId: provider.tenantId,
      role: assignedRole,
    });

    await this.logAuditEvent({
      tenantId: provider.tenantId,
      providerId: provider.id,
      userId: user.id,
      action: 'sso_link',
      details: {
        providerType: provider.providerType,
        groups: profile.groups,
        assignedRole,
        ipAddress,
        userAgent,
      },
    });

    return {
      user,
      isNewUser: false,
      assignedRole,
      tenantMembership,
    };
  }

  /**
   * Create new user from SSO profile
   */
  private async createNewUser(params: {
    provider: ExtendedProviderConfig;
    profile: SsoUserProfile;
    tokens?: TokenData;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ProvisioningResult> {
    const { provider, profile, tokens, ipAddress, userAgent } = params;

    const firstName = profile.firstName || profile.displayName?.split(' ')[0] || null;
    const lastName = profile.lastName || profile.displayName?.split(' ').slice(1).join(' ') || null;

    const [newUser] = await db.insert(users).values({
      email: profile.email,
      firstName,
      lastName,
      profileImageUrl: profile.profileImageUrl || null,
    }).returning();

    await db.insert(ssoUserIdentities).values({
      userId: newUser.id,
      tenantId: provider.tenantId,
      providerId: provider.id,
      providerUserId: profile.providerUserId,
      providerEmail: profile.email,
      providerProfile: {
        displayName: profile.displayName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        groups: profile.groups,
        attributes: profile.attributes,
      },
      accessTokenEncrypted: tokens?.accessToken ? encryptToken(tokens.accessToken) : null,
      refreshTokenEncrypted: tokens?.refreshToken ? encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt: tokens?.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
      lastLoginAt: new Date(),
      loginCount: '1',
    });

    const assignedRole = await this.syncUserRole({
      userId: newUser.id,
      tenantId: provider.tenantId,
      provider,
      groups: profile.groups,
    });

    const tenantMembership = await this.ensureTenantMembership({
      userId: newUser.id,
      tenantId: provider.tenantId,
      role: assignedRole,
    });

    await this.logAuditEvent({
      tenantId: provider.tenantId,
      providerId: provider.id,
      userId: newUser.id,
      action: 'sso_provision',
      details: {
        providerType: provider.providerType,
        groups: profile.groups,
        assignedRole,
        autoCreated: true,
        ipAddress,
        userAgent,
      },
    });

    return {
      user: newUser,
      isNewUser: true,
      assignedRole,
      tenantMembership,
    };
  }

  /**
   * Sync user role based on IdP groups
   */
  private async syncUserRole(params: {
    userId: string;
    tenantId: string;
    provider: ExtendedProviderConfig;
    groups?: string[];
  }): Promise<string | undefined> {
    const { userId, tenantId, provider, groups } = params;
    const defaultRole = provider.metadata?.defaultRole;

    if (!groups || groups.length === 0) {
      return defaultRole || undefined;
    }

    const groupMappings = this.getGroupRoleMappings(provider);
    if (groupMappings.length === 0) {
      return defaultRole || undefined;
    }

    const assignedRole = this.resolveRoleFromGroups(groups, groupMappings);
    
    if (assignedRole) {
      await this.updateUserTenantRole(userId, tenantId, assignedRole);
    }

    return assignedRole || defaultRole || undefined;
  }

  /**
   * Extract group role mappings from provider config
   */
  private getGroupRoleMappings(provider: ExtendedProviderConfig): SsoGroupRoleMapping[] {
    const metadata = provider.metadata;
    
    if (metadata?.groupRoleMappings && metadata.groupRoleMappings.length > 0) {
      return metadata.groupRoleMappings;
    }

    if (metadata?.roleMapping?.groupMap) {
      return Object.entries(metadata.roleMapping.groupMap).map(([idpGroup, platformRole], index) => ({
        idpGroup,
        platformRole,
        priority: index,
      }));
    }

    return [];
  }

  /**
   * Resolve highest priority role from user's groups
   */
  private resolveRoleFromGroups(
    userGroups: string[],
    mappings: SsoGroupRoleMapping[]
  ): string | null {
    const sortedMappings = [...mappings].sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const mapping of sortedMappings) {
      if (userGroups.includes(mapping.idpGroup)) {
        return mapping.platformRole;
      }
    }

    return null;
  }

  /**
   * Update user's role in tenant
   */
  private async updateUserTenantRole(
    userId: string,
    tenantId: string,
    roleName: string
  ): Promise<void> {
    const roleId = await this.getRoleIdByName(tenantId, roleName);
    if (!roleId) {
      console.warn(`Role ${roleName} not found for tenant ${tenantId}`);
      return;
    }
    
    await db.update(userTenants)
      .set({ roleId })
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }
  
  /**
   * Get role ID by name for a tenant
   */
  private async getRoleIdByName(tenantId: string, roleName: string): Promise<string | null> {
    const [role] = await db.select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, roleName)
      ));
    return role?.id || null;
  }
  
  /**
   * Get default role ID for a tenant
   */
  private async getDefaultRoleId(tenantId: string): Promise<string> {
    const [role] = await db.select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, 'member')
      ));
    
    if (role) {
      return role.id;
    }
    
    const [anyRole] = await db.select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));
    
    if (anyRole) {
      return anyRole.id;
    }
    
    throw new Error(`No roles found for tenant ${tenantId}`);
  }

  /**
   * Ensure user has tenant membership
   */
  private async ensureTenantMembership(params: {
    userId: string;
    tenantId: string;
    role?: string;
  }): Promise<typeof userTenants.$inferSelect> {
    const { userId, tenantId, role } = params;

    const [existing] = await db.select()
      .from(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));

    if (existing) {
      const roleId = role ? await this.getRoleIdByName(tenantId, role) : null;
      
      if (roleId && existing.roleId !== roleId) {
        const [updated] = await db.update(userTenants)
          .set({ 
            roleId,
            isActive: true,
          })
          .where(eq(userTenants.id, existing.id))
          .returning();
        return updated;
      }
      
      if (!existing.isActive) {
        const [reactivated] = await db.update(userTenants)
          .set({ isActive: true })
          .where(eq(userTenants.id, existing.id))
          .returning();
        return reactivated;
      }
      
      return existing;
    }

    const roleId = role 
      ? await this.getRoleIdByName(tenantId, role) || await this.getDefaultRoleId(tenantId)
      : await this.getDefaultRoleId(tenantId);

    const [newMembership] = await db.insert(userTenants).values({
      userId,
      tenantId,
      roleId,
      isActive: true,
    }).returning();

    return newMembership;
  }

  /**
   * Deprovision user when IdP access is revoked
   */
  async deprovisionUser(params: {
    providerId: string;
    providerUserId: string;
    reason: 'token_revoked' | 'admin_action' | 'webhook_notification' | 'scim_delete';
    revokedBy?: string;
  }): Promise<void> {
    const { providerId, providerUserId, reason, revokedBy } = params;

    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, providerId),
        eq(ssoUserIdentities.providerUserId, providerUserId)
      ));

    if (!identity) {
      return;
    }

    const { ssoProviderConfigs } = await import('@shared/models/sso');
    const [provider] = await db.select()
      .from(ssoProviderConfigs)
      .where(eq(ssoProviderConfigs.id, providerId));

    await db.update(ssoUserIdentities)
      .set({
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        providerProfile: {
          ...(identity.providerProfile as object || {}),
          revoked: true,
          revokedAt: new Date().toISOString(),
        },
      })
      .where(eq(ssoUserIdentities.id, identity.id));

    await db.update(userTenants)
      .set({ isActive: false })
      .where(and(
        eq(userTenants.userId, identity.userId),
        eq(userTenants.tenantId, identity.tenantId)
      ));

    await db.delete(ssoAuthSessions)
      .where(eq(ssoAuthSessions.state, identity.userId));

    await this.logAuditEvent({
      tenantId: identity.tenantId,
      providerId,
      userId: identity.userId,
      action: 'sso_deprovision',
      details: {
        reason,
        revokedBy,
        providerType: provider?.providerType,
      },
    });
  }

  /**
   * Check and revoke expired/invalid tokens
   */
  async checkTokenValidity(identityId: string): Promise<boolean> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(eq(ssoUserIdentities.id, identityId));

    if (!identity) {
      return false;
    }

    const profile = identity.providerProfile as { revoked?: boolean } || {};
    if (profile.revoked) {
      return false;
    }

    if (identity.tokenExpiresAt && new Date() > identity.tokenExpiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Introspect OAuth token with provider
   */
  async introspectToken(params: {
    provider: SsoProviderConfig | ExtendedProviderConfig;
    accessToken: string;
  }): Promise<{ active: boolean; exp?: number }> {
    const { provider: rawProvider, accessToken } = params;
    const provider = 'metadata' in rawProvider ? rawProvider : toExtendedConfig(rawProvider as SsoProviderConfig);

    if (provider.providerType === 'okta' && provider.metadata?.oktaConfig) {
      return this.introspectOktaToken(provider, accessToken);
    }

    return { active: true };
  }

  /**
   * Introspect Okta token
   */
  private async introspectOktaToken(
    provider: ExtendedProviderConfig,
    accessToken: string
  ): Promise<{ active: boolean; exp?: number }> {
    const oktaConfig = provider.metadata?.oktaConfig;
    if (!oktaConfig) {
      return { active: true };
    }

    const introspectUrl = `https://${oktaConfig.domain}/oauth2/${oktaConfig.authorizationServerId || 'default'}/v1/introspect`;

    try {
      const response = await fetch(introspectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret || ''}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }).toString(),
      });

      if (!response.ok) {
        return { active: false };
      }

      const result = await response.json();
      return {
        active: result.active === true,
        exp: result.exp,
      };
    } catch (error) {
      console.error('Okta token introspection error:', error);
      return { active: false };
    }
  }

  /**
   * Process SCIM deprovisioning event
   */
  async processScimDeprovision(params: {
    providerId: string;
    scimUserId: string;
    action: 'delete' | 'deactivate';
  }): Promise<void> {
    const { providerId, scimUserId, action } = params;

    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(and(
        eq(ssoUserIdentities.providerId, providerId),
        eq(ssoUserIdentities.providerUserId, scimUserId)
      ));

    if (!identity) {
      console.log(`SCIM ${action}: No identity found for ${scimUserId}`);
      return;
    }

    await this.deprovisionUser({
      providerId,
      providerUserId: scimUserId,
      reason: 'scim_delete',
    });
  }

  /**
   * Log SSO audit event
   */
  private async logAuditEvent(params: {
    tenantId: string;
    providerId: string;
    userId: string;
    action: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      await db.insert(ssoAuditLog).values({
        tenantId: params.tenantId,
        providerId: params.providerId,
        userId: params.userId,
        action: params.action,
        status: 'success',
        metadata: params.details,
      });
    } catch (error) {
      console.error('Failed to log SSO audit event:', error);
    }
  }

  /**
   * Get user's SSO identities
   */
  async getUserIdentities(userId: string): Promise<(typeof ssoUserIdentities.$inferSelect)[]> {
    return db.select()
      .from(ssoUserIdentities)
      .where(eq(ssoUserIdentities.userId, userId))
      .orderBy(desc(ssoUserIdentities.lastLoginAt));
  }

  /**
   * Unlink SSO identity from user
   */
  async unlinkIdentity(identityId: string, revokedBy?: string): Promise<void> {
    const [identity] = await db.select()
      .from(ssoUserIdentities)
      .where(eq(ssoUserIdentities.id, identityId));

    if (!identity) {
      throw new Error('Identity not found');
    }

    await db.delete(ssoUserIdentities)
      .where(eq(ssoUserIdentities.id, identityId));

    await this.logAuditEvent({
      tenantId: identity.tenantId,
      providerId: identity.providerId,
      userId: identity.userId,
      action: 'sso_unlink',
      details: {
        revokedBy,
      },
    });
  }
}

export const ssoUserProvisioningService = new SsoUserProvisioningService();
