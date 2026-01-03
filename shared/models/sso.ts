/**
 * SSO (Single Sign-On) Schema
 * 
 * Supports multiple identity providers per tenant with OAuth 2.0/OIDC.
 */

import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb, index, uniqueIndex, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Reference tenants from main schema
import { tenants } from "../schema";

// ============================================
// ENUMS
// ============================================

export const ssoProviderTypeEnum = pgEnum("sso_provider_type", [
  "google",
  "microsoft",
  "github",
  "okta",
  "auth0",
  "saml",
  "oidc_generic",
]);

export const ssoProviderStatusEnum = pgEnum("sso_provider_status", [
  "active",
  "inactive",
  "pending_verification",
]);

// ============================================
// SSO PROVIDER CONFIGURATIONS
// ============================================

/**
 * Tenant-specific SSO provider configurations
 * Each tenant can have multiple identity providers configured
 */
export const ssoProviderConfigs = pgTable("sso_provider_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Provider identification
  providerType: ssoProviderTypeEnum("provider_type").notNull(),
  providerName: varchar("provider_name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 200 }),
  
  // OAuth 2.0 / OIDC Configuration
  clientId: varchar("client_id", { length: 500 }).notNull(),
  clientSecretEncrypted: text("client_secret_encrypted").notNull(),
  
  // Provider endpoints (for generic OIDC/SAML)
  issuerUrl: text("issuer_url"),
  authorizationUrl: text("authorization_url"),
  tokenUrl: text("token_url"),
  userInfoUrl: text("user_info_url"),
  jwksUrl: text("jwks_url"),
  logoutUrl: text("logout_url"),
  
  // SAML-specific configuration
  samlMetadataUrl: text("saml_metadata_url"),
  samlEntityId: text("saml_entity_id"),
  samlCertificate: text("saml_certificate"),
  samlSigningKey: text("saml_signing_key"),
  
  // OAuth scopes and claims
  scopes: jsonb("scopes").default(["openid", "profile", "email"]),
  claimMappings: jsonb("claim_mappings").default({
    email: "email",
    firstName: "given_name",
    lastName: "family_name",
    profileImage: "picture",
  }),
  
  // Domain restrictions (only allow users from specific email domains)
  allowedDomains: jsonb("allowed_domains").default([]),
  
  // Behavior settings
  isDefault: boolean("is_default").default(false),
  autoCreateUsers: boolean("auto_create_users").default(true),
  autoLinkUsers: boolean("auto_link_users").default(true),
  enforceForDomains: boolean("enforce_for_domains").default(false),
  
  // Status and metadata
  status: ssoProviderStatusEnum("status").default("inactive"),
  verifiedAt: timestamp("verified_at"),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
}, (table) => [
  index("idx_sso_configs_tenant").on(table.tenantId),
  index("idx_sso_configs_type").on(table.providerType),
  uniqueIndex("idx_sso_configs_tenant_provider").on(table.tenantId, table.providerName),
]);

// ============================================
// SSO USER IDENTITIES
// ============================================

/**
 * Links users to their SSO identities
 * A user can have multiple SSO identities from different providers
 */
export const ssoUserIdentities = pgTable("sso_user_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => ssoProviderConfigs.id, { onDelete: "cascade" }),
  
  // Provider-specific user identifier
  providerUserId: varchar("provider_user_id", { length: 500 }).notNull(),
  providerEmail: varchar("provider_email", { length: 255 }),
  
  // Cached profile data from provider
  providerProfile: jsonb("provider_profile").default({}),
  
  // Token storage (encrypted)
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Metadata
  lastLoginAt: timestamp("last_login_at"),
  loginCount: varchar("login_count", { length: 20 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sso_identities_user").on(table.userId),
  index("idx_sso_identities_tenant").on(table.tenantId),
  index("idx_sso_identities_provider").on(table.providerId),
  uniqueIndex("idx_sso_identities_unique").on(table.providerId, table.providerUserId),
]);

// ============================================
// SSO AUTH SESSIONS
// ============================================

/**
 * SSO authentication session tracking
 * Tracks OAuth state and PKCE for security
 */
export const ssoAuthSessions = pgTable("sso_auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").references(() => ssoProviderConfigs.id, { onDelete: "cascade" }),
  
  // OAuth state parameter (for CSRF protection)
  state: varchar("state", { length: 255 }).notNull().unique(),
  
  // PKCE challenge (for public clients)
  codeVerifier: text("code_verifier"),
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: varchar("code_challenge_method", { length: 10 }).default("S256"),
  
  // Nonce for OIDC (replay attack protection)
  nonce: varchar("nonce", { length: 255 }),
  
  // Return URL after authentication
  redirectUri: text("redirect_uri"),
  returnUrl: text("return_url"),
  
  // Session metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Status tracking
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, expired, failed
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_sso_auth_sessions_state").on(table.state),
  index("idx_sso_auth_sessions_tenant").on(table.tenantId),
  index("idx_sso_auth_sessions_expires").on(table.expiresAt),
]);

// ============================================
// SSO DOMAIN MAPPINGS
// ============================================

/**
 * Maps email domains to SSO providers for Home Realm Discovery (HRD)
 */
export const ssoDomainMappings = pgTable("sso_domain_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => ssoProviderConfigs.id, { onDelete: "cascade" }),
  
  domain: varchar("domain", { length: 255 }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  
  verificationToken: varchar("verification_token", { length: 255 }),
  verifiedAt: timestamp("verified_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sso_domains_tenant").on(table.tenantId),
  uniqueIndex("idx_sso_domains_unique").on(table.tenantId, table.domain),
]);

// ============================================
// SSO AUDIT LOG
// ============================================

/**
 * Audit log for SSO-related events
 */
export const ssoAuditLog = pgTable("sso_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: varchar("user_id"),
  providerId: varchar("provider_id").references(() => ssoProviderConfigs.id, { onDelete: "set null" }),
  
  action: varchar("action", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // success, failure
  
  // Event details
  providerUserId: varchar("provider_user_id", { length: 500 }),
  email: varchar("email", { length: 255 }),
  
  // Error information
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  
  // Request metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Additional context
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sso_audit_tenant").on(table.tenantId),
  index("idx_sso_audit_user").on(table.userId),
  index("idx_sso_audit_provider").on(table.providerId),
  index("idx_sso_audit_action").on(table.action),
  index("idx_sso_audit_time").on(table.createdAt),
]);

// ============================================
// TYPES AND SCHEMAS
// ============================================

export type SsoProviderConfig = typeof ssoProviderConfigs.$inferSelect;
export type InsertSsoProviderConfig = typeof ssoProviderConfigs.$inferInsert;

export type SsoUserIdentity = typeof ssoUserIdentities.$inferSelect;
export type InsertSsoUserIdentity = typeof ssoUserIdentities.$inferInsert;

export type SsoAuthSession = typeof ssoAuthSessions.$inferSelect;
export type InsertSsoAuthSession = typeof ssoAuthSessions.$inferInsert;

export type SsoDomainMapping = typeof ssoDomainMappings.$inferSelect;
export type SsoAuditLogEntry = typeof ssoAuditLog.$inferSelect;

// Zod schemas for API validation
export const insertSsoProviderConfigSchema = createInsertSchema(ssoProviderConfigs).omit({
  id: true,
  clientSecretEncrypted: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  lastUsedAt: true,
}).extend({
  clientSecret: z.string().min(1, "Client secret is required"),
});

export const ssoProviderTypeValues = ["google", "microsoft", "github", "okta", "auth0", "saml", "oidc_generic"] as const;
export type SsoProviderType = typeof ssoProviderTypeValues[number];

// Provider-specific endpoint configurations
export const SSO_PROVIDER_DEFAULTS: Record<string, Partial<SsoProviderConfig>> = {
  google: {
    issuerUrl: "https://accounts.google.com",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    scopes: ["openid", "profile", "email"],
  },
  microsoft: {
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
    jwksUrl: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    scopes: ["openid", "profile", "email", "User.Read"],
  },
  github: {
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["user:email", "read:user"],
  },
  okta: {
    scopes: ["openid", "profile", "email"],
  },
  auth0: {
    scopes: ["openid", "profile", "email"],
  },
};
