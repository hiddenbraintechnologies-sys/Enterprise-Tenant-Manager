import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for SSO Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for SSO Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  lastTenantId: varchar("last_tenant_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Platform Admin roles enum
// SUPER_ADMIN: Full access to everything
// PLATFORM_ADMIN: Full access to assigned countries
// TECH_SUPPORT_MANAGER: Full technical monitoring, API management, system health
// MANAGER: View and manage operations for assigned countries
// SUPPORT_TEAM: View and handle support tickets for assigned countries
export const platformAdminRoleEnum = pgEnum("platform_admin_role", ["SUPER_ADMIN", "PLATFORM_ADMIN", "TECH_SUPPORT_MANAGER", "MANAGER", "SUPPORT_TEAM"]);

// Platform Admin table - NOT tied to any tenant
export const platformAdmins = pgTable("platform_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: platformAdminRoleEnum("role").notNull().default("PLATFORM_ADMIN"),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  twoFactorRequired: boolean("two_factor_required").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
});

export const insertPlatformAdminSchema = createInsertSchema(platformAdmins).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type InsertPlatformAdmin = z.infer<typeof insertPlatformAdminSchema>;
export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type PlatformAdminRole = "SUPER_ADMIN" | "PLATFORM_ADMIN" | "TECH_SUPPORT_MANAGER" | "MANAGER" | "SUPPORT_TEAM";

// Platform Admin Permissions - defines available permissions
export const platformAdminPermissions = pgTable("platform_admin_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: varchar("description", { length: 500 }),
  category: varchar("category", { length: 100 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table: Platform Admin -> Permissions
export const platformAdminPermissionAssignments = pgTable("platform_admin_permission_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => platformAdmins.id, { onDelete: "cascade" }),
  permissionCode: varchar("permission_code", { length: 100 }).notNull().references(() => platformAdminPermissions.code, { onDelete: "cascade" }),
  grantedAt: timestamp("granted_at").defaultNow(),
  grantedBy: varchar("granted_by"),
}, (table) => [
  index("idx_platform_admin_perm_admin").on(table.adminId),
]);

export type PlatformAdminPermission = typeof platformAdminPermissions.$inferSelect;
export type PlatformAdminPermissionAssignment = typeof platformAdminPermissionAssignments.$inferSelect;

// Platform Admin Country Assignments - restricts data access by country
export const platformAdminCountryAssignments = pgTable("platform_admin_country_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => platformAdmins.id, { onDelete: "cascade" }),
  countryCode: varchar("country_code", { length: 5 }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by"),
}, (table) => [
  index("idx_platform_admin_country_admin").on(table.adminId),
  index("idx_platform_admin_country_code").on(table.countryCode),
]);

export const insertPlatformAdminCountryAssignmentSchema = createInsertSchema(platformAdminCountryAssignments).omit({
  id: true,
  assignedAt: true,
});

export type PlatformAdminCountryAssignment = typeof platformAdminCountryAssignments.$inferSelect;
export type InsertPlatformAdminCountryAssignment = z.infer<typeof insertPlatformAdminCountryAssignmentSchema>;

// Default platform admin permissions
export const PLATFORM_ADMIN_PERMISSIONS = {
  READ_TENANTS: "read_tenants",
  MANAGE_TENANTS: "manage_tenants",
  READ_USERS: "read_users",
  MANAGE_USERS: "manage_users",
  RESET_PASSWORDS: "reset_passwords",
  VIEW_LOGS: "view_logs",
  MANAGE_LOGS: "manage_logs",
  READ_ADMINS: "read_admins",
  MANAGE_ADMINS: "manage_admins",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_FEATURES: "manage_features",
  VIEW_BILLING: "view_billing",
  MANAGE_BILLING: "manage_billing",
  // Technical Support Manager permissions
  VIEW_SYSTEM_HEALTH: "view_system_health",
  VIEW_API_METRICS: "view_api_metrics",
  MANAGE_APIS: "manage_apis",
  VIEW_ERROR_LOGS: "view_error_logs",
  MANAGE_ALERTS: "manage_alerts",
  VIEW_PERFORMANCE: "view_performance",
  // Super Admin data management permissions
  WIPE_TENANTS: "wipe_tenants",
  DELETE_USERS: "delete_users",
  VIEW_DELETE_JOBS: "view_delete_jobs",
} as const;

export type PlatformAdminPermissionCode = typeof PLATFORM_ADMIN_PERMISSIONS[keyof typeof PLATFORM_ADMIN_PERMISSIONS];

// ============================================
// ADMIN SECURITY: Login Attempts Tracking
// ============================================

export const adminLoginAttempts = pgTable("admin_login_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  success: boolean("success").notNull().default(false),
  failureReason: varchar("failure_reason", { length: 100 }),
  attemptedAt: timestamp("attempted_at").defaultNow(),
}, (table) => [
  index("idx_admin_login_attempts_email").on(table.email),
  index("idx_admin_login_attempts_ip").on(table.ipAddress),
  index("idx_admin_login_attempts_time").on(table.attemptedAt),
]);

export type AdminLoginAttempt = typeof adminLoginAttempts.$inferSelect;

// ============================================
// ADMIN SECURITY: Account Lockouts
// ============================================

export const adminAccountLockouts = pgTable("admin_account_lockouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => platformAdmins.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  lockoutType: varchar("lockout_type", { length: 50 }).notNull(), // 'ip', 'account', 'email'
  reason: varchar("reason", { length: 255 }).notNull(),
  failedAttempts: varchar("failed_attempts", { length: 10 }).notNull().default("0"),
  lockedAt: timestamp("locked_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  unlockedAt: timestamp("unlocked_at"),
  unlockedBy: varchar("unlocked_by"),
}, (table) => [
  index("idx_admin_lockouts_email").on(table.email),
  index("idx_admin_lockouts_ip").on(table.ipAddress),
  index("idx_admin_lockouts_expires").on(table.expiresAt),
]);

export type AdminAccountLockout = typeof adminAccountLockouts.$inferSelect;

// ============================================
// ADMIN SECURITY: IP Whitelist/Blacklist
// ============================================

export const adminIpRules = pgTable("admin_ip_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipPattern: varchar("ip_pattern", { length: 100 }).notNull(), // Supports CIDR notation
  ruleType: varchar("rule_type", { length: 20 }).notNull(), // 'whitelist' or 'blacklist'
  description: varchar("description", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => platformAdmins.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("idx_admin_ip_rules_type").on(table.ruleType),
]);

export type AdminIpRule = typeof adminIpRules.$inferSelect;

// ============================================
// ADMIN SECURITY: 2FA Configuration
// ============================================

export const adminTwoFactorAuth = pgTable("admin_two_factor_auth", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => platformAdmins.id, { onDelete: "cascade" }).unique(),
  method: varchar("method", { length: 20 }).notNull().default("totp"), // 'totp', 'sms', 'email'
  secretKey: varchar("secret_key", { length: 255 }), // Encrypted TOTP secret
  phoneNumber: varchar("phone_number", { length: 20 }), // For SMS-based 2FA
  backupCodes: jsonb("backup_codes").default([]), // Hashed backup codes
  isEnabled: boolean("is_enabled").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_admin_2fa_admin").on(table.adminId),
]);

export type AdminTwoFactorAuth = typeof adminTwoFactorAuth.$inferSelect;

// ============================================
// ADMIN SECURITY: Admin Sessions
// ============================================

export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => platformAdmins.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: varchar("user_agent", { length: 500 }),
  deviceInfo: jsonb("device_info").default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  terminatedAt: timestamp("terminated_at"),
  terminationReason: varchar("termination_reason", { length: 100 }),
}, (table) => [
  index("idx_admin_sessions_admin").on(table.adminId),
  index("idx_admin_sessions_token").on(table.tokenHash),
  index("idx_admin_sessions_expires").on(table.expiresAt),
]);

export type AdminSession = typeof adminSessions.$inferSelect;

// ============================================
// ADMIN SECURITY: Admin Audit Log (Enhanced)
// ============================================

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => platformAdmins.id, { onDelete: "set null" }),
  adminEmail: varchar("admin_email", { length: 255 }),
  adminRole: varchar("admin_role", { length: 50 }),
  sessionId: varchar("session_id").references(() => adminSessions.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'auth', 'tenant', 'user', 'config', 'security'
  resource: varchar("resource", { length: 100 }),
  resourceId: varchar("resource_id", { length: 100 }),
  targetTenantId: varchar("target_tenant_id"),
  targetUserId: varchar("target_user_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  geoLocation: jsonb("geo_location").default({}), // { country, region, city }
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // 'low', 'medium', 'high', 'critical'
  reason: varchar("reason", { length: 500 }), // Required for certain actions
  correlationId: varchar("correlation_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_admin_audit_admin").on(table.adminId),
  index("idx_admin_audit_action").on(table.action),
  index("idx_admin_audit_category").on(table.category),
  index("idx_admin_audit_resource").on(table.resource, table.resourceId),
  index("idx_admin_audit_target_tenant").on(table.targetTenantId),
  index("idx_admin_audit_time").on(table.createdAt),
  index("idx_admin_audit_risk").on(table.riskLevel),
]);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

// ============================================
// ADMIN SECURITY: Security Configuration
// ============================================

export const adminSecurityConfig = pgTable("admin_security_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: jsonb("config_value").notNull(),
  description: varchar("description", { length: 255 }),
  updatedBy: varchar("updated_by").references(() => platformAdmins.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AdminSecurityConfig = typeof adminSecurityConfig.$inferSelect;

// Default security configuration values
export const DEFAULT_ADMIN_SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 60,
  sessionAbsoluteTimeoutHours: 24,
  requireIpWhitelist: false,
  require2FA: false,
  require2FAForSuperAdmin: true,
  passwordExpiryDays: 90,
  minPasswordLength: 12,
  auditLogRetentionDays: 365,
  highRiskActions: [
    "admin.create", "admin.delete", "admin.role_change",
    "tenant.delete", "user.delete", "config.security_change",
    "2fa.disable", "session.terminate_all"
  ],
} as const;
