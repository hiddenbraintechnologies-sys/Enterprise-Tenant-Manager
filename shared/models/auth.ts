import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
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
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Platform Admin roles enum
export const platformAdminRoleEnum = pgEnum("platform_admin_role", ["SUPER_ADMIN", "PLATFORM_ADMIN"]);

// Platform Admin table - NOT tied to any tenant
export const platformAdmins = pgTable("platform_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  role: platformAdminRoleEnum("role").notNull().default("PLATFORM_ADMIN"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
export type PlatformAdminRole = "SUPER_ADMIN" | "PLATFORM_ADMIN";

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
} as const;

export type PlatformAdminPermissionCode = typeof PLATFORM_ADMIN_PERMISSIONS[keyof typeof PLATFORM_ADMIN_PERMISSIONS];
