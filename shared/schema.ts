import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, time, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";
import { users } from "./models/auth";

// Re-export SSO models
export * from "./models/sso";

// Re-export HRMS models
export * from "./models/hrms";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "manager", "staff", "customer"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "partial", "paid", "refunded"]);
export const businessTypeEnum = pgEnum("business_type", [
  "clinic", 
  "salon", 
  "pg", 
  "coworking", 
  "service",
  "real_estate",
  "tourism",
  "education",
  "logistics",
  "legal",
  "furniture_manufacturing",
  "software_services",
  "consulting"
]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "login", "logout", "access"]);
export const tenantCountryEnum = pgEnum("tenant_country", ["india", "uae", "uk", "malaysia", "singapore", "other"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "cancelled", "deleted"]);
export const tenantRegionEnum = pgEnum("tenant_region", ["asia_pacific", "middle_east", "europe", "americas", "africa"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "sms", "whatsapp", "push"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "delivered", "failed", "retrying"]);
export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "invoice_created",
  "invoice_issued",
  "payment_reminder",
  "payment_received",
  "payment_partial",
  "invoice_overdue",
  "invoice_cancelled",
  "custom"
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "pending", "paid", "partial", "overdue", "cancelled", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "upi", "netbanking", "wallet", "other"]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "expired", "suspended", "cancelled"]);
export const appointmentTypeEnum = pgEnum("appointment_type", ["walk_in", "online", "phone"]);
export const patientGenderEnum = pgEnum("patient_gender", ["male", "female", "other"]);

// Reseller/White-label enums
export const tenantTypeEnum = pgEnum("tenant_type", ["platform", "reseller", "direct"]);
export const resellerStatusEnum = pgEnum("reseller_status", ["active", "suspended", "pending_approval", "terminated"]);
export const revenueShareTypeEnum = pgEnum("revenue_share_type", ["percentage", "fixed", "tiered"]);
export const billingCadenceEnum = pgEnum("billing_cadence", ["monthly", "quarterly", "annually"]);

// ============================================
// CORE: TENANTS & MULTI-TENANCY
// ============================================

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  businessType: businessTypeEnum("business_type").default("service"),
  country: tenantCountryEnum("country").default("india"),
  region: tenantRegionEnum("region").default("asia_pacific"),
  status: tenantStatusEnum("status").default("active"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#1E40AF"),
  timezone: text("timezone").default("Asia/Kolkata"),
  currency: text("currency").default("INR"),
  isActive: boolean("is_active").default(true),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  maxUsers: integer("max_users").default(5),
  maxCustomers: integer("max_customers").default(100),
  statusChangedAt: timestamp("status_changed_at"),
  statusChangedBy: varchar("status_changed_by"),
  statusChangeReason: text("status_change_reason"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  businessTypeLocked: boolean("business_type_locked").default(false),
  // Reseller hierarchy fields
  tenantType: tenantTypeEnum("tenant_type").default("direct"),
  parentResellerId: varchar("parent_reseller_id"),
  // Version pinning - null means use latest published version
  pinnedVersionId: varchar("pinned_version_id"),
  // Protection flag - prevents accidental deletion by Super Admin
  isProtected: boolean("is_protected").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_tenants_country").on(table.country),
  index("idx_tenants_region").on(table.region),
  index("idx_tenants_status").on(table.status),
  index("idx_tenants_type").on(table.tenantType),
  index("idx_tenants_parent_reseller").on(table.parentResellerId),
]);

// Onboarding status enum
export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "not_started",
  "in_progress",
  "completed",
  "skipped",
]);

// Onboarding flows table
export const onboardingFlows = pgTable("onboarding_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessType: varchar("business_type", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_flows_business_type").on(table.businessType),
]);

// Onboarding steps table
export const onboardingSteps = pgTable("onboarding_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flowId: varchar("flow_id").notNull().references(() => onboardingFlows.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  stepKey: varchar("step_key", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  component: varchar("component", { length: 255 }).notNull(),
  isRequired: boolean("is_required").default(true),
  isSkippable: boolean("is_skippable").default(false),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_steps_flow_id").on(table.flowId),
  uniqueIndex("idx_onboarding_steps_flow_order").on(table.flowId, table.stepOrder),
]);

// Onboarding progress table
export const onboardingProgress = pgTable("onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  flowId: varchar("flow_id").notNull().references(() => onboardingFlows.id, { onDelete: "cascade" }),
  currentStepIndex: integer("current_step_index").default(0),
  status: onboardingStatusEnum("status").default("not_started"),
  stepData: jsonb("step_data").default({}),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_progress_tenant_id").on(table.tenantId),
  index("idx_onboarding_progress_status").on(table.status),
  uniqueIndex("idx_onboarding_progress_tenant_flow").on(table.tenantId, table.flowId),
]);

// Onboarding types
export type OnboardingFlow = typeof onboardingFlows.$inferSelect;
export type InsertOnboardingFlow = typeof onboardingFlows.$inferInsert;
export type OnboardingStep = typeof onboardingSteps.$inferSelect;
export type InsertOnboardingStep = typeof onboardingSteps.$inferInsert;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

export const insertOnboardingFlowSchema = createInsertSchema(onboardingFlows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({ id: true, createdAt: true });
export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================
// BUSINESS TYPE REGISTRY
// ============================================

// Central registry for all business types - SuperAdmin managed only
export const businessTypeRegistry = pgTable("business_type_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true),
  defaultModules: jsonb("default_modules").default([]),
  defaultFeatures: jsonb("default_features").default([]),
  onboardingFlowId: varchar("onboarding_flow_id").references(() => onboardingFlows.id, { onDelete: "set null" }),
  compliancePacks: text("compliance_packs").array().default([]),
  displayOrder: integer("display_order").default(0),
  icon: varchar("icon", { length: 100 }),
  // Version management - null means no versioning yet (use legacy mapping tables)
  activeVersionId: varchar("active_version_id"),
  latestVersionNumber: integer("latest_version_number").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_business_type_registry_code").on(table.code),
  index("idx_business_type_registry_enabled").on(table.enabled),
]);

// Business type registry types
export type BusinessTypeRegistry = typeof businessTypeRegistry.$inferSelect;
export type InsertBusinessTypeRegistry = typeof businessTypeRegistry.$inferInsert;

export const insertBusinessTypeRegistrySchema = createInsertSchema(businessTypeRegistry).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ============================================
// MODULE REGISTRY
// ============================================

// Module category enum
export const moduleCategoryEnum = pgEnum("module_category", ["core", "optional"]);

// Central registry for all modules - SuperAdmin managed only
export const moduleRegistry = pgTable("module_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: moduleCategoryEnum("category").default("optional"),
  requiresAi: boolean("requires_ai").default(false),
  enabled: boolean("enabled").default(true),
  displayOrder: integer("display_order").default(0),
  icon: varchar("icon", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_module_registry_code").on(table.code),
  index("idx_module_registry_category").on(table.category),
  index("idx_module_registry_enabled").on(table.enabled),
]);

// Module registry types
export type ModuleRegistry = typeof moduleRegistry.$inferSelect;
export type InsertModuleRegistry = typeof moduleRegistry.$inferInsert;

export const insertModuleRegistrySchema = createInsertSchema(moduleRegistry).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// ============================================
// FEATURE REGISTRY & FEATURE FLAGS
// ============================================

// Feature scope enum
export const featureScopeEnum = pgEnum("feature_scope", ["global", "business", "tenant"]);

// Central registry for all features - SuperAdmin managed only
export const featureRegistry = pgTable("feature_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  scope: featureScopeEnum("scope").notNull().default("tenant"),
  defaultEnabled: boolean("default_enabled").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feature_registry_code").on(table.code),
  index("idx_feature_registry_scope").on(table.scope),
  index("idx_feature_registry_enabled").on(table.enabled),
]);

// Feature flag overrides for tenant/business-level control
export const featureFlagOverrides = pgTable("feature_flag_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  featureId: varchar("feature_id").notNull().references(() => featureRegistry.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  businessType: varchar("business_type", { length: 50 }),
  enabled: boolean("enabled").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
}, (table) => [
  index("idx_feature_flag_overrides_feature").on(table.featureId),
  index("idx_feature_flag_overrides_tenant").on(table.tenantId),
  index("idx_feature_flag_overrides_business").on(table.businessType),
  uniqueIndex("idx_feature_flag_overrides_unique").on(table.featureId, table.tenantId, table.businessType),
]);

// Feature registry types
export type FeatureRegistry = typeof featureRegistry.$inferSelect;
export type InsertFeatureRegistry = typeof featureRegistry.$inferInsert;
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
export type InsertFeatureFlagOverride = typeof featureFlagOverrides.$inferInsert;

export const insertFeatureRegistrySchema = createInsertSchema(featureRegistry).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertFeatureFlagOverrideSchema = createInsertSchema(featureFlagOverrides).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateFeatureRegistrySchema = insertFeatureRegistrySchema.omit({ code: true }).partial();

// Business-Module Mapping - defines which modules a business type can use
export const businessModuleMap = pgTable("business_module_map", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessTypeId: varchar("business_type_id").notNull().references(() => businessTypeRegistry.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => moduleRegistry.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").notNull().default(false),
  defaultEnabled: boolean("default_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_business_module_unique").on(table.businessTypeId, table.moduleId),
  index("idx_business_module_business").on(table.businessTypeId),
  index("idx_business_module_module").on(table.moduleId),
]);

// Business-Feature Mapping - defines which features a business type can use
export const businessFeatureMap = pgTable("business_feature_map", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessTypeId: varchar("business_type_id").notNull().references(() => businessTypeRegistry.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id").notNull().references(() => featureRegistry.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").notNull().default(false),
  defaultEnabled: boolean("default_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_business_feature_unique").on(table.businessTypeId, table.featureId),
  index("idx_business_feature_business").on(table.businessTypeId),
  index("idx_business_feature_feature").on(table.featureId),
]);

// Tenant Feature Override - tenant-specific feature settings (scoped to what business allows)
export const tenantFeatureOverride = pgTable("tenant_feature_override", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id").notNull().references(() => featureRegistry.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull(),
  reason: text("reason"),
  requestedBy: varchar("requested_by"),
  approvedBy: varchar("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_tenant_feature_unique").on(table.tenantId, table.featureId),
  index("idx_tenant_feature_tenant").on(table.tenantId),
  index("idx_tenant_feature_feature").on(table.featureId),
]);

// Mapping table types
export type BusinessModuleMap = typeof businessModuleMap.$inferSelect;
export type InsertBusinessModuleMap = typeof businessModuleMap.$inferInsert;
export type BusinessFeatureMap = typeof businessFeatureMap.$inferSelect;
export type InsertBusinessFeatureMap = typeof businessFeatureMap.$inferInsert;
export type TenantFeatureOverride = typeof tenantFeatureOverride.$inferSelect;
export type InsertTenantFeatureOverride = typeof tenantFeatureOverride.$inferInsert;

export const insertBusinessModuleMapSchema = createInsertSchema(businessModuleMap).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessFeatureMapSchema = createInsertSchema(businessFeatureMap).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantFeatureOverrideSchema = createInsertSchema(tenantFeatureOverride).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// BUSINESS TYPE VERSIONING
// ============================================

// Version status enum
export const versionStatusEnum = pgEnum("version_status", ["draft", "published", "retired"]);

// Business Type Versions - stores immutable configuration snapshots
export const businessTypeVersions = pgTable("business_type_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessTypeId: varchar("business_type_id").notNull().references(() => businessTypeRegistry.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  status: versionStatusEnum("status").notNull().default("draft"),
  name: text("name").notNull(),
  description: text("description"),
  effectiveAt: timestamp("effective_at"),
  retiredAt: timestamp("retired_at"),
  createdBy: varchar("created_by"),
  publishedBy: varchar("published_by"),
  publishedAt: timestamp("published_at"),
  moduleSnapshot: jsonb("module_snapshot").default([]),
  featureSnapshot: jsonb("feature_snapshot").default([]),
  migrationNotes: text("migration_notes"),
  isBackwardCompatible: boolean("is_backward_compatible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_business_version_unique").on(table.businessTypeId, table.versionNumber),
  index("idx_business_version_status").on(table.status),
  index("idx_business_version_business").on(table.businessTypeId),
]);

// Versioned Module Mappings - stores module configuration per version
export const versionedModuleMap = pgTable("versioned_module_map", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id").notNull().references(() => businessTypeVersions.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => moduleRegistry.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").notNull().default(false),
  defaultEnabled: boolean("default_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_versioned_module_unique").on(table.versionId, table.moduleId),
  index("idx_versioned_module_version").on(table.versionId),
]);

// Versioned Feature Mappings - stores feature configuration per version  
export const versionedFeatureMap = pgTable("versioned_feature_map", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  versionId: varchar("version_id").notNull().references(() => businessTypeVersions.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id").notNull().references(() => featureRegistry.id, { onDelete: "cascade" }),
  isRequired: boolean("is_required").notNull().default(false),
  defaultEnabled: boolean("default_enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_versioned_feature_unique").on(table.versionId, table.featureId),
  index("idx_versioned_feature_version").on(table.versionId),
]);

// Tenant Business Type History - audit trail for version transitions
export const tenantBusinessTypeHistory = pgTable("tenant_business_type_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fromVersionId: varchar("from_version_id").references(() => businessTypeVersions.id, { onDelete: "set null" }),
  toVersionId: varchar("to_version_id").references(() => businessTypeVersions.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(),
  reason: text("reason"),
  performedBy: varchar("performed_by"),
  rollbackData: jsonb("rollback_data").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tenant_version_history_tenant").on(table.tenantId),
  index("idx_tenant_version_history_action").on(table.action),
]);

// Versioning types
export type BusinessTypeVersion = typeof businessTypeVersions.$inferSelect;
export type InsertBusinessTypeVersion = typeof businessTypeVersions.$inferInsert;
export type VersionedModuleMap = typeof versionedModuleMap.$inferSelect;
export type InsertVersionedModuleMap = typeof versionedModuleMap.$inferInsert;
export type VersionedFeatureMap = typeof versionedFeatureMap.$inferSelect;
export type InsertVersionedFeatureMap = typeof versionedFeatureMap.$inferInsert;
export type TenantBusinessTypeHistory = typeof tenantBusinessTypeHistory.$inferSelect;
export type InsertTenantBusinessTypeHistory = typeof tenantBusinessTypeHistory.$inferInsert;

export const insertBusinessTypeVersionSchema = createInsertSchema(businessTypeVersions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVersionedModuleMapSchema = createInsertSchema(versionedModuleMap).omit({
  id: true,
  createdAt: true,
});

export const insertVersionedFeatureMapSchema = createInsertSchema(versionedFeatureMap).omit({
  id: true,
  createdAt: true,
});

// Domain verification status enum
export const domainVerificationStatusEnum = pgEnum("domain_verification_status", [
  "pending",
  "verifying",
  "verified",
  "failed",
  "revoked",
]);

export const tenantDomains = pgTable("tenant_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  
  // Verification status and tracking
  verificationStatus: domainVerificationStatusEnum("verification_status").default("pending"),
  verificationToken: varchar("verification_token", { length: 100 }),
  verificationTokenHash: varchar("verification_token_hash", { length: 255 }),
  verificationMethod: varchar("verification_method", { length: 20 }).default("dns_txt"),
  verificationRequestedAt: timestamp("verification_requested_at"),
  verificationCheckedAt: timestamp("verification_checked_at"),
  verificationAttempts: integer("verification_attempts").default(0),
  verificationError: text("verification_error"),
  verifiedAt: timestamp("verified_at"),
  
  // SSL/TLS certificate status
  certificateStatus: varchar("certificate_status", { length: 50 }).default("pending"),
  certificateExpiresAt: timestamp("certificate_expires_at"),
  
  // Redirect configuration
  redirectToSlug: varchar("redirect_to_slug", { length: 100 }),
  enforceHttps: boolean("enforce_https").default(true),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_domains_tenant").on(table.tenantId),
  index("idx_tenant_domains_verified").on(table.isVerified),
  index("idx_tenant_domains_status").on(table.verificationStatus),
]);

export const tenantSettings = pgTable("tenant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  language: varchar("language", { length: 10 }).default("en"),
  businessHours: jsonb("business_hours").default({}),
  bookingRules: jsonb("booking_rules").default({}),
  notificationSettings: jsonb("notification_settings").default({}),
  paymentSettings: jsonb("payment_settings").default({}),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// CORE: TENANT BRANDING & THEMING
// ============================================

export const tenantBranding = pgTable("tenant_branding", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  
  // Logo Assets
  logoUrl: text("logo_url"),
  logoAltUrl: text("logo_alt_url"),
  faviconUrl: text("favicon_url"),
  
  // Color Palette
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#1E40AF"),
  accentColor: text("accent_color").default("#10B981"),
  backgroundColor: text("background_color").default("#FFFFFF"),
  foregroundColor: text("foreground_color").default("#111827"),
  mutedColor: text("muted_color").default("#6B7280"),
  borderColor: text("border_color").default("#E5E7EB"),
  
  // Typography
  fontFamily: text("font_family").default("Inter"),
  fontFamilyHeading: text("font_family_heading"),
  fontFamilyMono: text("font_family_mono").default("JetBrains Mono"),
  
  // Extended Theme Tokens (CSS variables, spacing, radii, etc.)
  themeTokens: jsonb("theme_tokens").default({}),
  
  // Email Branding
  emailFromName: text("email_from_name"),
  emailFromAddress: text("email_from_address"),
  emailReplyTo: text("email_reply_to"),
  emailSignature: text("email_signature"),
  emailHeaderHtml: text("email_header_html"),
  emailFooterHtml: text("email_footer_html"),
  
  // Legal/Support Links
  termsOfServiceUrl: text("terms_of_service_url"),
  privacyPolicyUrl: text("privacy_policy_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  supportUrl: text("support_url"),
  
  // Social Links
  socialLinks: jsonb("social_links").default({}),
  
  // Custom CSS
  customCss: text("custom_css"),
  
  // Metadata
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_branding_tenant").on(table.tenantId),
]);

// Email Template Types
export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "welcome",
  "password_reset",
  "email_verification",
  "booking_confirmation",
  "booking_reminder",
  "booking_cancellation",
  "invoice",
  "payment_receipt",
  "membership_welcome",
  "membership_renewal",
  "appointment_reminder",
  "notification",
  "custom",
]);

export const tenantEmailTemplates = pgTable("tenant_email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Template identification
  templateType: emailTemplateTypeEnum("template_type").notNull(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  
  // Template content
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  
  // Template variables (available placeholders)
  availableVariables: jsonb("available_variables").default([]),
  
  // Status
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  // Versioning
  version: integer("version").default(1),
  
  // Metadata
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_templates_tenant").on(table.tenantId),
  index("idx_email_templates_type").on(table.templateType),
  uniqueIndex("idx_email_templates_unique").on(table.tenantId, table.templateType, table.templateName),
]);

// ============================================
// CORE: FEATURE FLAGS
// ============================================

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  isGlobal: boolean("is_global").default(false),
  defaultEnabled: boolean("default_enabled").default(false),
  requiredTier: varchar("required_tier", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenantFeatures = pgTable("tenant_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  featureCode: varchar("feature_code", { length: 100 }).notNull().references(() => featureFlags.code, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(true),
  config: jsonb("config").default({}),
  enabledAt: timestamp("enabled_at").defaultNow(),
  enabledBy: varchar("enabled_by").references(() => users.id),
}, (table) => [
  uniqueIndex("idx_tenant_features_unique").on(table.tenantId, table.featureCode),
]);

// ============================================
// CORE: ROLES & PERMISSIONS (RBAC)
// ============================================

export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_roles_tenant_name").on(table.tenantId, table.name),
]);

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  resource: varchar("resource", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_role_permissions_unique").on(table.roleId, table.permissionId),
]);

// ============================================
// CORE: USER-TENANT RELATIONSHIPS
// ============================================

export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  invitedBy: varchar("invited_by").references(() => users.id),
}, (table) => [
  uniqueIndex("idx_user_tenants_unique").on(table.userId, table.tenantId),
  index("idx_user_tenants_user").on(table.userId),
  index("idx_user_tenants_tenant").on(table.tenantId),
]);

// ============================================
// CORE: AUDIT LOGGING
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: auditActionEnum("action").notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  correlationId: varchar("correlation_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_logs_tenant").on(table.tenantId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_resource").on(table.resource, table.resourceId),
  index("idx_audit_logs_created").on(table.createdAt),
]);

// ============================================
// CORE: API TOKENS (JWT)
// ============================================

export const apiTokens = pgTable("api_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  scopes: jsonb("scopes").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_api_tokens_user").on(table.userId),
  index("idx_api_tokens_tenant").on(table.tenantId),
]);

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  deviceInfo: jsonb("device_info").default({}),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_refresh_tokens_user").on(table.userId),
  index("idx_refresh_tokens_hash").on(table.tokenHash),
]);

// ============================================
// BUSINESS: STAFF MEMBERS
// ============================================

export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  skills: jsonb("skills").default([]),
  availability: jsonb("availability").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_staff_tenant").on(table.tenantId),
]);

// ============================================
// BUSINESS: CUSTOMERS
// ============================================

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  tags: jsonb("tags").default([]),
  customFields: jsonb("custom_fields").default({}),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0"),
  visitCount: integer("visit_count").default(0),
  lastVisitAt: timestamp("last_visit_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_customers_tenant").on(table.tenantId),
  index("idx_customers_email").on(table.tenantId, table.email),
  index("idx_customers_phone").on(table.tenantId, table.phone),
]);

// ============================================
// BUSINESS: SERVICES
// ============================================

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull().default(60),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  requiresStaff: boolean("requires_staff").default(true),
  maxCapacity: integer("max_capacity").default(1),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_services_tenant").on(table.tenantId),
  index("idx_services_category").on(table.tenantId, table.category),
]);

// ============================================
// BUSINESS: BOOKINGS
// ============================================

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  serviceId: varchar("service_id").notNull().references(() => services.id),
  staffId: varchar("staff_id").references(() => staff.id),
  bookingDate: date("booking_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: bookingStatusEnum("status").default("pending"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  cancelReason: text("cancel_reason"),
}, (table) => [
  index("idx_bookings_tenant").on(table.tenantId),
  index("idx_bookings_customer").on(table.customerId),
  index("idx_bookings_date").on(table.tenantId, table.bookingDate),
  index("idx_bookings_status").on(table.tenantId, table.status),
]);

// ============================================
// NOTIFICATIONS ENGINE
// ============================================

export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 100 }).notNull(),
  name: text("name").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  language: varchar("language", { length: 10 }).default("en"),
  subject: text("subject"),
  body: text("body").notNull(),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_notification_templates_unique").on(table.tenantId, table.code, table.channel, table.language),
]);

export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => notificationTemplates.id),
  channel: notificationChannelEnum("channel").notNull(),
  eventType: notificationEventTypeEnum("event_type").default("custom"),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: notificationStatusEnum("status").default("pending"),
  externalMessageId: varchar("external_message_id", { length: 255 }),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  invoiceId: varchar("invoice_id"),
  userId: varchar("user_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notification_logs_tenant").on(table.tenantId),
  index("idx_notification_logs_status").on(table.status),
  index("idx_notification_logs_created").on(table.createdAt),
  index("idx_notification_logs_retry").on(table.status, table.nextRetryAt),
  index("idx_notification_logs_invoice").on(table.invoiceId),
]);

export const tenantNotificationSettings = pgTable("tenant_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  providerName: varchar("provider_name", { length: 50 }),
  config: jsonb("config").default({}),
  defaultLanguage: varchar("default_language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_tenant_notification_settings_unique").on(table.tenantId, table.channel),
]);

// ============================================
// BILLING & PAYMENTS
// ============================================

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  status: invoiceStatusEnum("status").default("draft"),
  currency: varchar("currency", { length: 5 }).default("INR").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  baseCurrency: varchar("base_currency", { length: 5 }).default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }).default("1.000000"),
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_invoices_tenant").on(table.tenantId),
  index("idx_invoices_customer").on(table.customerId),
  index("idx_invoices_status").on(table.tenantId, table.status),
  index("idx_invoices_currency").on(table.tenantId, table.currency),
  uniqueIndex("idx_invoices_number").on(table.tenantId, table.invoiceNumber),
]);

export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: varchar("service_id").references(() => services.id),
  description: text("description").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoice_items_invoice").on(table.invoiceId),
]);

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  currency: varchar("currency", { length: 5 }).default("INR").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  baseCurrency: varchar("base_currency", { length: 5 }).default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }).default("1.000000"),
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  transactionId: varchar("transaction_id", { length: 255 }),
  gatewayResponse: jsonb("gateway_response").default({}),
  notes: text("notes"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_payments_tenant").on(table.tenantId),
  index("idx_payments_invoice").on(table.invoiceId),
  index("idx_payments_customer").on(table.customerId),
  index("idx_payments_status").on(table.status),
  index("idx_payments_currency").on(table.tenantId, table.currency),
]);

// ============================================
// INVENTORY MANAGEMENT
// ============================================

export const inventoryCategories = pgTable("inventory_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_inventory_categories_tenant").on(table.tenantId),
]);

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => inventoryCategories.id),
  sku: varchar("sku", { length: 100 }),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  currentStock: integer("current_stock").default(0),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock"),
  unit: varchar("unit", { length: 50 }).default("pcs"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_inventory_items_tenant").on(table.tenantId),
  index("idx_inventory_items_category").on(table.categoryId),
  uniqueIndex("idx_inventory_items_sku").on(table.tenantId, table.sku),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => inventoryItems.id),
  type: varchar("type", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: varchar("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_inventory_transactions_item").on(table.itemId),
  index("idx_inventory_transactions_created").on(table.createdAt),
]);

// ============================================
// MEMBERSHIPS & SUBSCRIPTIONS
// ============================================

export const membershipPlans = pgTable("membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  features: jsonb("features").default([]),
  maxBookings: integer("max_bookings"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_membership_plans_tenant").on(table.tenantId),
]);

export const customerMemberships = pgTable("customer_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  planId: varchar("plan_id").notNull().references(() => membershipPlans.id),
  status: membershipStatusEnum("status").default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  bookingsUsed: integer("bookings_used").default(0),
  autoRenew: boolean("auto_renew").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customer_memberships_tenant").on(table.tenantId),
  index("idx_customer_memberships_customer").on(table.customerId),
  index("idx_customer_memberships_status").on(table.status),
]);

// ============================================
// COWORKING MODULE
// ============================================

export const deskTypeEnum = pgEnum("desk_type", ["hot", "dedicated"]);
export const deskStatusEnum = pgEnum("desk_status", ["available", "occupied", "reserved", "maintenance"]);

export const spaces = pgTable("spaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location"),
  description: text("description"),
  capacity: integer("capacity"),
  amenities: jsonb("amenities").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spaces_tenant").on(table.tenantId),
]);

export const desks = pgTable("desks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  spaceId: varchar("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }),
  type: deskTypeEnum("type").notNull(),
  status: deskStatusEnum("status").default("available"),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("price_per_month", { precision: 10, scale: 2 }),
  assignedTo: varchar("assigned_to").references(() => customers.id),
  features: jsonb("features").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_desks_tenant").on(table.tenantId),
  index("idx_desks_space").on(table.spaceId),
  index("idx_desks_status").on(table.status),
]);

export const deskBookings = pgTable("desk_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  deskId: varchar("desk_id").notNull().references(() => desks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: bookingStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_desk_bookings_tenant").on(table.tenantId),
  index("idx_desk_bookings_desk").on(table.deskId),
  index("idx_desk_bookings_user").on(table.userId),
  index("idx_desk_bookings_time").on(table.startTime, table.endTime),
]);

// ============================================
// HEALTHCARE MODULE (OPTIONAL)
// ============================================

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  patientId: varchar("patient_id", { length: 50 }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  gender: patientGenderEnum("gender"),
  bloodGroup: varchar("blood_group", { length: 10 }),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  emergencyContact: jsonb("emergency_contact").default({}),
  allergies: jsonb("allergies").default([]),
  chronicConditions: jsonb("chronic_conditions").default([]),
  insuranceInfo: jsonb("insurance_info").default({}),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_patients_tenant").on(table.tenantId),
  uniqueIndex("idx_patients_patient_id").on(table.tenantId, table.patientId),
]);

export const doctors = pgTable("doctors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: varchar("staff_id").references(() => staff.id),
  registrationNumber: varchar("registration_number", { length: 100 }),
  specialization: text("specialization"),
  qualifications: jsonb("qualifications").default([]),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  followUpFee: decimal("follow_up_fee", { precision: 10, scale: 2 }),
  availability: jsonb("availability").default({}),
  isAcceptingNew: boolean("is_accepting_new").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_doctors_tenant").on(table.tenantId),
]);

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  doctorId: varchar("doctor_id").notNull().references(() => doctors.id),
  appointmentDate: date("appointment_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  tokenNumber: integer("token_number"),
  type: appointmentTypeEnum("type").default("online"),
  status: bookingStatusEnum("status").default("pending"),
  reason: text("reason"),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_appointments_tenant").on(table.tenantId),
  index("idx_appointments_patient").on(table.patientId),
  index("idx_appointments_doctor").on(table.doctorId),
  index("idx_appointments_date").on(table.tenantId, table.appointmentDate),
]);

export const medicalRecords = pgTable("medical_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  doctorId: varchar("doctor_id").references(() => doctors.id),
  visitDate: date("visit_date").notNull(),
  chiefComplaint: text("chief_complaint"),
  diagnosis: jsonb("diagnosis").default([]),
  prescriptions: jsonb("prescriptions").default([]),
  labTests: jsonb("lab_tests").default([]),
  vitalSigns: jsonb("vital_signs").default({}),
  notes: text("notes"),
  followUpDate: date("follow_up_date"),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_medical_records_tenant").on(table.tenantId),
  index("idx_medical_records_patient").on(table.patientId),
  index("idx_medical_records_visit").on(table.visitDate),
]);

// ============================================
// RELATIONS
// ============================================

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  staff: many(staff),
  customers: many(customers),
  services: many(services),
  bookings: many(bookings),
  domains: many(tenantDomains),
  settings: one(tenantSettings),
  features: many(tenantFeatures),
  userTenants: many(userTenants),
  roles: many(roles),
  auditLogs: many(auditLogs),
}));

export const tenantDomainsRelations = relations(tenantDomains, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantDomains.tenantId], references: [tenants.id] }),
}));

export const tenantSettingsRelations = relations(tenantSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantSettings.tenantId], references: [tenants.id] }),
}));

export const tenantBrandingRelations = relations(tenantBranding, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantBranding.tenantId], references: [tenants.id] }),
}));

export const tenantEmailTemplatesRelations = relations(tenantEmailTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantEmailTemplates.tenantId], references: [tenants.id] }),
}));

export const featureFlagsRelations = relations(featureFlags, ({ many }) => ({
  tenantFeatures: many(tenantFeatures),
}));

export const tenantFeaturesRelations = relations(tenantFeatures, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantFeatures.tenantId], references: [tenants.id] }),
  feature: one(featureFlags, { fields: [tenantFeatures.featureCode], references: [featureFlags.code] }),
  enabledByUser: one(users, { fields: [tenantFeatures.enabledBy], references: [users.id] }),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePermissions: many(rolePermissions),
  userTenants: many(userTenants),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, { fields: [userTenants.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [userTenants.tenantId], references: [tenants.id] }),
  role: one(roles, { fields: [userTenants.roleId], references: [roles.id] }),
  invitedByUser: one(users, { fields: [userTenants.invitedBy], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [auditLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, { fields: [apiTokens.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [apiTokens.tenantId], references: [tenants.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [refreshTokens.tenantId], references: [tenants.id] }),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, { fields: [staff.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  bookings: many(bookings),
  createdByUser: one(users, { fields: [staff.createdBy], references: [users.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
  createdByUser: one(users, { fields: [customers.createdBy], references: [users.id] }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
  createdByUser: one(users, { fields: [services.createdBy], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  staff: one(staff, { fields: [bookings.staffId], references: [staff.id] }),
  createdByUser: one(users, { fields: [bookings.createdBy], references: [users.id] }),
  cancelledByUser: one(users, { fields: [bookings.cancelledBy], references: [users.id] }),
}));

// ============================================
// PLATFORM: SUPPORT TICKETS
// ============================================

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "waiting", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "critical"]);

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default("open"),
  priority: ticketPriorityEnum("priority").default("medium"),
  category: varchar("category", { length: 100 }),
  assignedTo: varchar("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_tenant").on(table.tenantId),
  index("idx_support_tickets_status").on(table.status),
  index("idx_support_tickets_created").on(table.createdAt),
]);

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id"),
  senderType: varchar("sender_type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ticket_messages_ticket").on(table.ticketId),
]);

// ============================================
// PLATFORM: ERROR LOGS
// ============================================

export const errorSeverityEnum = pgEnum("error_severity", ["debug", "info", "warning", "error", "critical"]);

export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  severity: errorSeverityEnum("severity").default("error"),
  source: varchar("source", { length: 100 }).notNull(),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  metadata: jsonb("metadata").default({}),
  requestPath: varchar("request_path", { length: 500 }),
  requestMethod: varchar("request_method", { length: 10 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_error_logs_tenant").on(table.tenantId),
  index("idx_error_logs_severity").on(table.severity),
  index("idx_error_logs_source").on(table.source),
  index("idx_error_logs_created").on(table.createdAt),
]);

// ============================================
// PLATFORM: USAGE METRICS
// ============================================

export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  metricType: varchar("metric_type", { length: 50 }).notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_usage_metrics_tenant").on(table.tenantId),
  index("idx_usage_metrics_type").on(table.metricType),
  index("idx_usage_metrics_period").on(table.periodStart, table.periodEnd),
]);

// ============================================
// GLOBAL BILLING & SUBSCRIPTION MANAGEMENT
// ============================================

export const paymentGatewayEnum = pgEnum("payment_gateway", ["stripe", "razorpay", "paytabs", "billplz"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "suspended", "cancelled", "trialing", "pending_payment", "downgrading"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "quarterly", "half_yearly", "yearly"]);
export const currencyEnum = pgEnum("currency_code", ["INR", "AED", "GBP", "MYR", "SGD", "USD", "EUR", "AUD", "CAD", "JPY", "CNY", "SAR", "ZAR", "NGN", "BRL"]);

// Offer type enum for billing offers
export const offerTypeEnum = pgEnum("offer_type", ["PERCENT", "FLAT"]);

// Global pricing plans (platform-level)
export const globalPricingPlans = pgTable("global_pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  tier: varchar("tier", { length: 20 }).notNull(), // free, starter, basic, pro, enterprise
  countryCode: varchar("country_code", { length: 5 }),
  currencyCode: varchar("currency_code", { length: 5 }),
  billingCycle: billingCycleEnum("billing_cycle").default("monthly"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  // Billing cycles with per-cycle pricing: { monthly: { price: 99, enabled: true }, yearly: { price: 999, enabled: true, badge: "2 months free" } }
  billingCycles: jsonb("billing_cycles").notNull().default({}),
  maxUsers: integer("max_users").default(5),
  maxCustomers: integer("max_customers").default(100),
  features: jsonb("features").default([]),
  featureFlags: jsonb("feature_flags").default({}),
  limits: jsonb("limits").default({}),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  isRecommended: boolean("is_recommended").default(false),
  sortOrder: integer("sort_order").default(100),
  version: integer("version").default(1),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_global_pricing_plans_tier").on(table.tier),
  index("idx_global_pricing_plans_active").on(table.isActive),
  index("idx_global_pricing_plans_country").on(table.countryCode),
]);

// Billing offers for discounts and coupons
export const billingOffers = pgTable("billing_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  countryCode: varchar("country_code", { length: 5 }),
  planCode: varchar("plan_code", { length: 50 }),
  offerType: offerTypeEnum("offer_type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  billingCycle: billingCycleEnum("billing_cycle"),
  couponCode: varchar("coupon_code", { length: 50 }),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  maxRedemptions: integer("max_redemptions"),
  perTenantLimit: integer("per_tenant_limit").default(1),
  redemptionCount: integer("redemption_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_offers_country_plan").on(table.countryCode, table.planCode),
  index("idx_billing_offers_coupon").on(table.couponCode),
  index("idx_billing_offers_active").on(table.isActive),
  index("idx_billing_offers_validity").on(table.validFrom, table.validTo),
]);

// Track offer redemptions per tenant
export const offerRedemptions = pgTable("offer_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => billingOffers.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id"),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
}, (table) => [
  index("idx_offer_redemptions_offer").on(table.offerId),
  index("idx_offer_redemptions_tenant").on(table.tenantId),
]);

// Country-specific pricing and tax configuration
export const countryPricingConfigs = pgTable("country_pricing_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: tenantCountryEnum("country").notNull(),
  currency: currencyEnum("currency").notNull(),
  taxName: varchar("tax_name", { length: 20 }).notNull(), // GST, VAT, SST
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(), // e.g., 18.00 for 18%
  primaryGateway: paymentGatewayEnum("primary_gateway").notNull(),
  fallbackGateway: paymentGatewayEnum("fallback_gateway"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).default("1.0000"), // to USD
  exchangeRateUpdatedAt: timestamp("exchange_rate_updated_at").defaultNow(),
  gatewayConfig: jsonb("gateway_config").default({}), // gateway-specific settings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_country_pricing_country").on(table.country),
]);

// Exchange rates for multi-currency support
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromCurrency: varchar("from_currency", { length: 5 }).notNull(),
  toCurrency: varchar("to_currency", { length: 5 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  inverseRate: decimal("inverse_rate", { precision: 18, scale: 8 }).notNull(),
  source: varchar("source", { length: 50 }).default("manual"),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_exchange_rates_pair").on(table.fromCurrency, table.toCurrency),
  index("idx_exchange_rates_active").on(table.isActive, table.validFrom),
  uniqueIndex("idx_exchange_rates_active_pair").on(table.fromCurrency, table.toCurrency, table.isActive),
]);

// Plan prices per country (local currency)
export const planLocalPrices = pgTable("plan_local_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => globalPricingPlans.id, { onDelete: "cascade" }),
  country: tenantCountryEnum("country").notNull(),
  localPrice: decimal("local_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_plan_local_prices_unique").on(table.planId, table.country),
]);

// Tenant subscriptions
export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => globalPricingPlans.id),
  currentBillingCycle: billingCycleEnum("current_billing_cycle").default("monthly"),
  pendingPlanId: varchar("pending_plan_id").references(() => globalPricingPlans.id),
  pendingBillingCycle: billingCycleEnum("pending_billing_cycle"),
  pendingPaymentId: varchar("pending_payment_id"),
  pendingQuoteAmount: decimal("pending_quote_amount", { precision: 10, scale: 2 }),
  downgradePlanId: varchar("downgrade_plan_id").references(() => globalPricingPlans.id),
  downgradeBillingCycle: billingCycleEnum("downgrade_billing_cycle"),
  downgradeEffectiveAt: timestamp("downgrade_effective_at"),
  status: subscriptionStatusEnum("status").default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialEndsAt: timestamp("trial_ends_at"),
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }),
  gateway: paymentGatewayEnum("gateway"),
  paymentFailureCount: integer("payment_failure_count").default(0),
  lastPaymentAt: timestamp("last_payment_at"),
  nextPaymentAt: timestamp("next_payment_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_tenant_subscriptions_tenant").on(table.tenantId),
  index("idx_tenant_subscriptions_status").on(table.status),
  index("idx_tenant_subscriptions_plan").on(table.planId),
]);

// Subscription invoices (global billing invoices for tenants)
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => tenantSubscriptions.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  status: invoiceStatusEnum("status").default("pending"),
  country: tenantCountryEnum("country").notNull(),
  currency: currencyEnum("currency").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxName: varchar("tax_name", { length: 20 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0"),
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  gatewayInvoiceId: varchar("gateway_invoice_id", { length: 255 }),
  gateway: paymentGatewayEnum("gateway"),
  lineItems: jsonb("line_items").default([]),
  billingDetails: jsonb("billing_details").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_subscription_invoices_number").on(table.invoiceNumber),
  index("idx_subscription_invoices_tenant").on(table.tenantId),
  index("idx_subscription_invoices_status").on(table.status),
  index("idx_subscription_invoices_country").on(table.country),
]);

// Invoice Templates for customizable invoice design
export const invoiceTemplates = pgTable("invoice_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Company/Header Settings
  companyName: varchar("company_name", { length: 200 }).default("BizFlow"),
  companyTagline: varchar("company_tagline", { length: 200 }),
  companyAddress: text("company_address"),
  companyPhone: varchar("company_phone", { length: 50 }),
  companyEmail: varchar("company_email", { length: 100 }),
  companyWebsite: varchar("company_website", { length: 200 }),
  logoUrl: text("logo_url"),
  logoPosition: varchar("logo_position", { length: 20 }).default("left"), // left, center, right
  
  // Color Theme
  primaryColor: varchar("primary_color", { length: 20 }).default("#3B82F6"),
  secondaryColor: varchar("secondary_color", { length: 20 }).default("#1E293B"),
  accentColor: varchar("accent_color", { length: 20 }).default("#10B981"),
  headerBgColor: varchar("header_bg_color", { length: 20 }).default("#F8FAFC"),
  tableBgColor: varchar("table_bg_color", { length: 20 }).default("#FFFFFF"),
  tableHeaderBgColor: varchar("table_header_bg_color", { length: 20 }).default("#F1F5F9"),
  
  // Typography
  fontFamily: varchar("font_family", { length: 100 }).default("Arial, sans-serif"),
  headerFontSize: varchar("header_font_size", { length: 10 }).default("24px"),
  bodyFontSize: varchar("body_font_size", { length: 10 }).default("14px"),
  
  // Section Visibility
  showLogo: boolean("show_logo").default(true),
  showCompanyAddress: boolean("show_company_address").default(true),
  showCompanyPhone: boolean("show_company_phone").default(true),
  showBillingPeriod: boolean("show_billing_period").default(true),
  showPaymentInfo: boolean("show_payment_info").default(true),
  showNotes: boolean("show_notes").default(true),
  showFooter: boolean("show_footer").default(true),
  showTaxBreakdown: boolean("show_tax_breakdown").default(true),
  
  // Custom Content
  headerText: text("header_text"),
  footerText: text("footer_text").default("Thank you for your business!"),
  paymentTerms: text("payment_terms"),
  bankDetails: text("bank_details"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Invoice Number Format
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).default("INV"),
  invoiceNumberFormat: varchar("invoice_number_format", { length: 50 }).default("{PREFIX}-{YEAR}{MONTH}-{NUMBER}"),
  
  // Custom CSS (for advanced customization)
  customCss: text("custom_css"),
  
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoice_templates_default").on(table.isDefault),
  index("idx_invoice_templates_active").on(table.isActive),
]);

// Transaction logs for all payment gateway transactions
export const transactionLogs = pgTable("transaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  subscriptionId: varchar("subscription_id").references(() => tenantSubscriptions.id),
  invoiceId: varchar("invoice_id").references(() => subscriptionInvoices.id),
  gateway: paymentGatewayEnum("gateway").notNull(),
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(), // payment, refund, chargeback
  country: tenantCountryEnum("country").notNull(),
  currency: currencyEnum("currency").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, success, failed, cancelled
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  gatewayResponse: jsonb("gateway_response").default({}),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_transaction_logs_tenant").on(table.tenantId),
  index("idx_transaction_logs_gateway").on(table.gateway),
  index("idx_transaction_logs_country").on(table.country),
  index("idx_transaction_logs_status").on(table.status),
  index("idx_transaction_logs_created").on(table.createdAt),
]);

// Webhook events for idempotency and auditing
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: paymentGatewayEnum("gateway").notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(), // gateway's event ID
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processed, failed
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_webhook_events_gateway_event").on(table.gateway, table.eventId),
  index("idx_webhook_events_status").on(table.status),
  index("idx_webhook_events_created").on(table.createdAt),
]);

// Payment attempts for retry tracking
export const paymentAttempts = pgTable("payment_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").references(() => subscriptionInvoices.id),
  gateway: paymentGatewayEnum("gateway").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, success, failed
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  attemptNumber: integer("attempt_number").default(1),
  nextRetryAt: timestamp("next_retry_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_attempts_tenant").on(table.tenantId),
  index("idx_payment_attempts_invoice").on(table.invoiceId),
  index("idx_payment_attempts_status").on(table.status),
]);

// Billing payment status enum for checkout flow
export const billingPaymentStatusEnum = pgEnum("billing_payment_status", ["created", "processing", "paid", "failed", "cancelled", "refunded"]);

// Billing payments for subscription checkout
export const billingPayments = pgTable("billing_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  subscriptionId: varchar("subscription_id").references(() => tenantSubscriptions.id, { onDelete: "set null" }),
  planId: varchar("plan_id").notNull().references(() => globalPricingPlans.id),
  provider: varchar("provider", { length: 50 }).notNull().default("mock"), // mock, razorpay, stripe
  status: billingPaymentStatusEnum("status").notNull().default("created"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).notNull().default("INR"),
  providerOrderId: varchar("provider_order_id", { length: 255 }),
  providerPaymentId: varchar("provider_payment_id", { length: 255 }),
  providerSignature: varchar("provider_signature", { length: 500 }),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_payments_tenant").on(table.tenantId),
  index("idx_billing_payments_subscription").on(table.subscriptionId),
  index("idx_billing_payments_status").on(table.status),
  index("idx_billing_payments_provider_order").on(table.providerOrderId),
]);

// ============================================
// USAGE-BASED BILLING
// ============================================

export const usageTypeEnum = pgEnum("usage_type", [
  "whatsapp_messages",
  "bookings",
  "leads",
  "properties",
  "listings",
  "tour_packages",
  "tour_bookings",
  "travelers",
  "site_visits",
  "api_calls",
  "students",
  "courses",
  "exams",
  "vehicles",
  "trips",
  "shipments",
  "cases",
  "clients",
  "documents"
]);

export const planUsageLimits = pgTable("plan_usage_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => globalPricingPlans.id, { onDelete: "cascade" }),
  businessType: businessTypeEnum("business_type").notNull(),
  usageType: usageTypeEnum("usage_type").notNull(),
  includedUnits: integer("included_units").default(0),
  overageRate: decimal("overage_rate", { precision: 10, scale: 4 }),
  hardLimit: integer("hard_limit"),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_plan_usage_limits_unique").on(table.planId, table.businessType, table.usageType),
  index("idx_plan_usage_limits_plan").on(table.planId),
  index("idx_plan_usage_limits_business_type").on(table.businessType),
]);

export const tenantUsageTracking = pgTable("tenant_usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  usageType: usageTypeEnum("usage_type").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  usedUnits: integer("used_units").default(0),
  includedUnits: integer("included_units").default(0),
  overageUnits: integer("overage_units").default(0),
  overageCost: decimal("overage_cost", { precision: 10, scale: 2 }).default("0"),
  isBilled: boolean("is_billed").default(false),
  billedAt: timestamp("billed_at"),
  invoiceId: varchar("invoice_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_tenant_usage_period").on(table.tenantId, table.usageType, table.periodStart),
  index("idx_tenant_usage_tenant").on(table.tenantId),
  index("idx_tenant_usage_type").on(table.usageType),
  index("idx_tenant_usage_billed").on(table.isBilled),
]);

export const usageEvents = pgTable("usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  usageType: usageTypeEnum("usage_type").notNull(),
  quantity: integer("quantity").default(1),
  unitCost: decimal("unit_cost", { precision: 10, scale: 4 }),
  resourceId: varchar("resource_id"),
  resourceType: varchar("resource_type", { length: 50 }),
  description: text("description"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_usage_events_tenant").on(table.tenantId),
  index("idx_usage_events_type").on(table.usageType),
  index("idx_usage_events_created").on(table.createdAt),
]);

// ============================================
// GLOBAL WHATSAPP INTEGRATION
// ============================================

export const whatsappProviderEnum = pgEnum("whatsapp_provider", ["gupshup", "meta", "twilio"]);
export const whatsappTemplateStatusEnum = pgEnum("whatsapp_template_status", ["pending", "approved", "rejected"]);
export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", ["pending", "sent", "delivered", "read", "failed"]);
export const whatsappMessageTypeEnum = pgEnum("whatsapp_message_type", ["template", "text", "media", "interactive"]);

// Country-wise provider configuration
export const whatsappProviderConfigs = pgTable("whatsapp_provider_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: tenantCountryEnum("country").notNull(),
  primaryProvider: whatsappProviderEnum("primary_provider").notNull(),
  fallbackProvider: whatsappProviderEnum("fallback_provider"),
  businessPhoneNumber: varchar("business_phone_number", { length: 20 }),
  businessPhoneNumberId: varchar("business_phone_number_id", { length: 100 }),
  providerConfig: jsonb("provider_config").default({}), // provider-specific settings
  monthlyQuota: integer("monthly_quota").default(10000),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_whatsapp_provider_country").on(table.country),
]);

// Global WhatsApp templates (platform-managed)
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // marketing, utility, authentication
  language: varchar("language", { length: 10 }).notNull().default("en"),
  provider: whatsappProviderEnum("provider").notNull(),
  providerTemplateId: varchar("provider_template_id", { length: 255 }),
  headerType: varchar("header_type", { length: 20 }), // text, image, video, document
  headerContent: text("header_content"),
  bodyText: text("body_text").notNull(),
  footerText: varchar("footer_text", { length: 60 }),
  buttons: jsonb("buttons").default([]), // array of button configs
  placeholders: jsonb("placeholders").default([]), // list of placeholder variables
  status: whatsappTemplateStatusEnum("status").default("pending"),
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at"),
  isGlobal: boolean("is_global").default(true), // platform-wide template
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // null for global
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_whatsapp_templates_provider").on(table.provider),
  index("idx_whatsapp_templates_status").on(table.status),
  index("idx_whatsapp_templates_tenant").on(table.tenantId),
  uniqueIndex("idx_whatsapp_templates_name_provider").on(table.name, table.provider, table.language),
]);

// Tenant opt-in tracking
export const whatsappOptIns = pgTable("whatsapp_opt_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  countryCode: varchar("country_code", { length: 5 }).notNull(),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  optInSource: varchar("opt_in_source", { length: 50 }).notNull(), // web_form, sms, qr_code, manual
  optInAt: timestamp("opt_in_at").defaultNow(),
  optOutAt: timestamp("opt_out_at"),
  isActive: boolean("is_active").default(true),
  consentText: text("consent_text"),
  consentIpAddress: varchar("consent_ip_address", { length: 45 }),
  lastMessageAt: timestamp("last_message_at"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_whatsapp_optins_tenant_phone").on(table.tenantId, table.phoneNumber),
  index("idx_whatsapp_optins_customer").on(table.customerId),
  index("idx_whatsapp_optins_active").on(table.isActive),
]);

// Message logs for tracking
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  provider: whatsappProviderEnum("provider").notNull(),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  templateId: varchar("template_id").references(() => whatsappTemplates.id),
  toPhoneNumber: varchar("to_phone_number", { length: 20 }).notNull(),
  fromPhoneNumber: varchar("from_phone_number", { length: 20 }),
  messageType: whatsappMessageTypeEnum("message_type").notNull(),
  content: text("content"),
  templateParams: jsonb("template_params").default({}),
  mediaUrl: varchar("media_url", { length: 500 }),
  status: whatsappMessageStatusEnum("status").default("pending"),
  statusUpdatedAt: timestamp("status_updated_at"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  country: tenantCountryEnum("country"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_whatsapp_messages_tenant").on(table.tenantId),
  index("idx_whatsapp_messages_provider").on(table.provider),
  index("idx_whatsapp_messages_status").on(table.status),
  index("idx_whatsapp_messages_created").on(table.createdAt),
  index("idx_whatsapp_messages_provider_id").on(table.providerMessageId),
]);

// Monthly usage tracking per tenant
export const whatsappUsage = pgTable("whatsapp_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  country: tenantCountryEnum("country").notNull(),
  provider: whatsappProviderEnum("provider").notNull(),
  yearMonth: varchar("year_month", { length: 7 }).notNull(), // YYYY-MM format
  messagesSent: integer("messages_sent").default(0),
  messagesDelivered: integer("messages_delivered").default(0),
  messagesRead: integer("messages_read").default(0),
  messagesFailed: integer("messages_failed").default(0),
  templateMessages: integer("template_messages").default(0),
  sessionMessages: integer("session_messages").default(0),
  totalCost: decimal("total_cost", { precision: 12, scale: 4 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  quotaUsed: integer("quota_used").default(0),
  quotaLimit: integer("quota_limit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_whatsapp_usage_tenant_month").on(table.tenantId, table.yearMonth),
  index("idx_whatsapp_usage_country").on(table.country),
  index("idx_whatsapp_usage_year_month").on(table.yearMonth),
]);

// Provider health monitoring
export const whatsappProviderHealth = pgTable("whatsapp_provider_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: whatsappProviderEnum("provider").notNull(),
  country: tenantCountryEnum("country"),
  status: varchar("status", { length: 20 }).notNull().default("healthy"), // healthy, degraded, down
  lastCheckAt: timestamp("last_check_at").defaultNow(),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  consecutiveFailures: integer("consecutive_failures").default(0),
  averageLatencyMs: integer("average_latency_ms"),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_whatsapp_health_provider_country").on(table.provider, table.country),
  index("idx_whatsapp_health_status").on(table.status),
]);

// Webhook events from WhatsApp providers
export const whatsappWebhookEvents = pgTable("whatsapp_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: whatsappProviderEnum("provider").notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  messageId: varchar("message_id").references(() => whatsappMessages.id),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processed, failed
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_whatsapp_webhook_provider_event").on(table.provider, table.eventId),
  index("idx_whatsapp_webhook_status").on(table.status),
  index("idx_whatsapp_webhook_message").on(table.messageId),
]);

// ============================================
// AI SERVICE LAYER
// ============================================

export const aiProviderEnum = pgEnum("ai_provider", ["openai", "anthropic", "local", "custom"]);
export const aiRiskTierEnum = pgEnum("ai_risk_tier", ["low", "medium", "high"]);

// Tenant AI settings and consent
export const tenantAiSettings = pgTable("tenant_ai_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  aiEnabled: boolean("ai_enabled").default(false),
  consentGiven: boolean("consent_given").default(false),
  consentGivenAt: timestamp("consent_given_at"),
  consentGivenBy: varchar("consent_given_by"),
  consentVersion: varchar("consent_version", { length: 20 }).default("1.0"),
  preferredProvider: aiProviderEnum("preferred_provider").default("openai"),
  monthlyTokenLimit: integer("monthly_token_limit").default(100000),
  tokensUsedThisMonth: integer("tokens_used_this_month").default(0),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(10),
  rateLimitPerHour: integer("rate_limit_per_hour").default(100),
  allowedFeatures: jsonb("allowed_features").default([]), // ["student_risk", "chat", etc]
  customProviderConfig: jsonb("custom_provider_config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_ai_settings_tenant").on(table.tenantId),
  index("idx_tenant_ai_settings_enabled").on(table.aiEnabled),
]);

// AI usage logs for tracking and billing
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  provider: aiProviderEnum("provider").notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  feature: varchar("feature", { length: 100 }).notNull(), // student_risk, chat, etc
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }).default("0"),
  latencyMs: integer("latency_ms"),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  requestMetadata: jsonb("request_metadata").default({}),
  responseMetadata: jsonb("response_metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_usage_tenant").on(table.tenantId),
  index("idx_ai_usage_feature").on(table.feature),
  index("idx_ai_usage_created").on(table.createdAt),
  index("idx_ai_usage_provider").on(table.provider),
]);

// Student risk predictions (Education module)
export const studentRiskPredictions = pgTable("student_risk_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  
  // Input snapshot
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
  feeDelayDays: integer("fee_delay_days").default(0),
  averageExamScore: decimal("average_exam_score", { precision: 5, scale: 2 }),
  engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }),
  
  // Rule-based scores (0-1)
  attendanceRiskScore: decimal("attendance_risk_score", { precision: 4, scale: 3 }).default("0"),
  feeRiskScore: decimal("fee_risk_score", { precision: 4, scale: 3 }).default("0"),
  examRiskScore: decimal("exam_risk_score", { precision: 4, scale: 3 }).default("0"),
  engagementRiskScore: decimal("engagement_risk_score", { precision: 4, scale: 3 }).default("0"),
  
  // Composite scores
  overallRiskScore: decimal("overall_risk_score", { precision: 4, scale: 3 }).default("0"),
  riskTier: aiRiskTierEnum("risk_tier").notNull(),
  
  // Explainability
  factorWeights: jsonb("factor_weights").default({}), // { attendance: 0.3, fee: 0.2, exam: 0.35, engagement: 0.15 }
  explanation: text("explanation"), // Natural language explanation
  suggestedActions: jsonb("suggested_actions").default([]), // Array of action strings
  
  // AI metadata
  aiGenerated: boolean("ai_generated").default(false),
  aiProvider: aiProviderEnum("ai_provider"),
  aiModel: varchar("ai_model", { length: 100 }),
  aiUsageLogId: varchar("ai_usage_log_id").references(() => aiUsageLogs.id),
  
  // Consent tracking
  consentVersion: varchar("consent_version", { length: 20 }),
  
  // Advisory flag (no automated enforcement)
  isAdvisoryOnly: boolean("is_advisory_only").default(true),
  
  // Prediction metadata
  predictedAt: timestamp("predicted_at").defaultNow(),
  validUntil: timestamp("valid_until"),
  supersededById: varchar("superseded_by_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_student_risk_tenant").on(table.tenantId),
  index("idx_student_risk_student").on(table.studentId),
  index("idx_student_risk_tier").on(table.riskTier),
  index("idx_student_risk_predicted").on(table.predictedAt),
]);

// ============================================
// AI ROLE-BASED PERMISSIONS
// ============================================

export const aiUsageResetWindowEnum = pgEnum("ai_usage_reset_window", ["daily", "weekly", "monthly"]);

// Global AI feature catalog
export const aiFeatures = pgTable("ai_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
  defaultEnabled: boolean("default_enabled").default(false),
  defaultUsageLimit: integer("default_usage_limit"),
  defaultResetWindow: aiUsageResetWindowEnum("default_reset_window").default("monthly"),
  riskLevel: aiRiskTierEnum("risk_level").default("low"),
  requiredTier: varchar("required_tier", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ai_features_code").on(table.code),
  index("idx_ai_features_category").on(table.category),
  index("idx_ai_features_active").on(table.isActive),
]);

// Role-level AI settings (per tenant role)
export const aiRoleSettings = pgTable("ai_role_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id").notNull().references(() => aiFeatures.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(true),
  usageLimit: integer("usage_limit"),
  resetWindow: aiUsageResetWindowEnum("reset_window").default("monthly"),
  customConfig: jsonb("custom_config").default({}),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_ai_role_settings_unique").on(table.tenantId, table.roleId, table.featureId),
  index("idx_ai_role_settings_tenant").on(table.tenantId),
  index("idx_ai_role_settings_role").on(table.roleId),
  index("idx_ai_role_settings_feature").on(table.featureId),
]);

// Usage counters for tracking per role/feature
export const aiUsageCounters = pgTable("ai_usage_counters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  featureId: varchar("feature_id").notNull().references(() => aiFeatures.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_ai_usage_counters_unique").on(table.tenantId, table.roleId, table.featureId, table.periodStart),
  index("idx_ai_usage_counters_tenant").on(table.tenantId),
  index("idx_ai_usage_counters_period").on(table.periodStart, table.periodEnd),
]);

// AI audit action enum
export const aiAuditActionEnum = pgEnum("ai_audit_action", [
  "invoke",
  "complete",
  "error",
  "denied",
  "rate_limited"
]);

// AI audit logs for compliance-safe tracking
export const aiAuditLogs = pgTable("ai_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  roleId: varchar("role_id"),
  featureCode: varchar("feature_code", { length: 100 }).notNull(),
  action: aiAuditActionEnum("action").notNull().default("invoke"),
  // Input metadata - sanitized, no sensitive data
  inputMetadata: jsonb("input_metadata").default({}).$type<{
    inputType?: string;
    inputLength?: number;
    inputTokenCount?: number;
    modelRequested?: string;
    contextType?: string;
    hasAttachments?: boolean;
    requestSource?: string;
  }>(),
  // Output reference - pointer only, no actual content
  outputReference: jsonb("output_reference").default({}).$type<{
    outputType?: string;
    outputLength?: number;
    outputTokenCount?: number;
    modelUsed?: string;
    processingTimeMs?: number;
    cached?: boolean;
    storageKey?: string;
  }>(),
  // Request context for compliance
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  // Error tracking (sanitized)
  errorCode: varchar("error_code", { length: 100 }),
  errorCategory: varchar("error_category", { length: 100 }),
  // Compliance fields
  consentRecorded: boolean("consent_recorded").default(false),
  dataRetentionDays: integer("data_retention_days").default(90),
  complianceFlags: text("compliance_flags").array(),
  // Timestamps
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ai_audit_logs_tenant").on(table.tenantId),
  index("idx_ai_audit_logs_user").on(table.userId),
  index("idx_ai_audit_logs_feature").on(table.featureCode),
  index("idx_ai_audit_logs_action").on(table.action),
  index("idx_ai_audit_logs_triggered").on(table.triggeredAt),
  index("idx_ai_audit_logs_tenant_time").on(table.tenantId, table.triggeredAt),
]);

// ============================================
// INSERT SCHEMAS
// ============================================

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantDomainSchema = createInsertSchema(tenantDomains).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantBrandingSchema = createInsertSchema(tenantBranding).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantEmailTemplateSchema = createInsertSchema(tenantEmailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true });
export const insertTenantFeatureSchema = createInsertSchema(tenantFeatures).omit({ id: true, enabledAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true, createdAt: true });
export const insertUserTenantSchema = createInsertSchema(userTenants).omit({ id: true, joinedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({ id: true, createdAt: true });
export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({ id: true, createdAt: true });
export const insertTenantNotificationSettingsSchema = createInsertSchema(tenantNotificationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({ id: true, createdAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactions).omit({ id: true, createdAt: true });
export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerMembershipSchema = createInsertSchema(customerMemberships).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSpaceSchema = createInsertSchema(spaces).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeskSchema = createInsertSchema(desks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeskBookingSchema = createInsertSchema(deskBookings).omit({ id: true, createdAt: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({ id: true, createdAt: true });
export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({ id: true, createdAt: true });
export const insertUsageMetricSchema = createInsertSchema(usageMetrics).omit({ id: true, createdAt: true });

// Global billing insert schemas
export const insertGlobalPricingPlanSchema = createInsertSchema(globalPricingPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCountryPricingConfigSchema = createInsertSchema(countryPricingConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanLocalPriceSchema = createInsertSchema(planLocalPrices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBillingOfferSchema = createInsertSchema(billingOffers).omit({ id: true, createdAt: true, updatedAt: true, redemptionCount: true });
export const insertOfferRedemptionSchema = createInsertSchema(offerRedemptions).omit({ id: true, redeemedAt: true });
export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });
export const insertPaymentAttemptSchema = createInsertSchema(paymentAttempts).omit({ id: true, createdAt: true });
export const insertBillingPaymentSchema = createInsertSchema(billingPayments).omit({ id: true, createdAt: true, updatedAt: true });

// Usage-based billing insert schemas
export const insertPlanUsageLimitsSchema = createInsertSchema(planUsageLimits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantUsageTrackingSchema = createInsertSchema(tenantUsageTracking).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({ id: true, createdAt: true });

// WhatsApp insert schemas
export const insertWhatsappProviderConfigSchema = createInsertSchema(whatsappProviderConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappOptInSchema = createInsertSchema(whatsappOptIns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export const insertWhatsappUsageSchema = createInsertSchema(whatsappUsage).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappProviderHealthSchema = createInsertSchema(whatsappProviderHealth).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWhatsappWebhookEventSchema = createInsertSchema(whatsappWebhookEvents).omit({ id: true, createdAt: true });

// AI service schemas
export const insertTenantAiSettingsSchema = createInsertSchema(tenantAiSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ id: true, createdAt: true });
export const insertStudentRiskPredictionSchema = createInsertSchema(studentRiskPredictions).omit({ id: true, createdAt: true, updatedAt: true });

// AI role-based permissions schemas
export const insertAiFeatureSchema = createInsertSchema(aiFeatures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiRoleSettingSchema = createInsertSchema(aiRoleSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiUsageCounterSchema = createInsertSchema(aiUsageCounters).omit({ id: true, createdAt: true, updatedAt: true });

// AI audit log schemas
export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs).omit({ id: true, createdAt: true });

// ============================================
// TYPES
// ============================================

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type TenantDomain = typeof tenantDomains.$inferSelect;
export type InsertTenantDomain = z.infer<typeof insertTenantDomainSchema>;

export type TenantSettings = typeof tenantSettings.$inferSelect;
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;

export type TenantBranding = typeof tenantBranding.$inferSelect;
export type InsertTenantBranding = z.infer<typeof insertTenantBrandingSchema>;

export type TenantEmailTemplate = typeof tenantEmailTemplates.$inferSelect;
export type InsertTenantEmailTemplate = z.infer<typeof insertTenantEmailTemplateSchema>;

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;

export type TenantFeature = typeof tenantFeatures.$inferSelect;
export type InsertTenantFeature = z.infer<typeof insertTenantFeatureSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

export type TenantNotificationSettings = typeof tenantNotificationSettings.$inferSelect;
export type InsertTenantNotificationSettings = z.infer<typeof insertTenantNotificationSettingsSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;

export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;

export type CustomerMembership = typeof customerMemberships.$inferSelect;
export type InsertCustomerMembership = z.infer<typeof insertCustomerMembershipSchema>;

export type Space = typeof spaces.$inferSelect;
export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Desk = typeof desks.$inferSelect;
export type InsertDesk = z.infer<typeof insertDeskSchema>;
export type DeskBooking = typeof deskBookings.$inferSelect;
export type InsertDeskBooking = z.infer<typeof insertDeskBookingSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = z.infer<typeof insertUsageMetricSchema>;

// Global billing types
export type GlobalPricingPlan = typeof globalPricingPlans.$inferSelect;
export type InsertGlobalPricingPlan = z.infer<typeof insertGlobalPricingPlanSchema>;

export type CountryPricingConfig = typeof countryPricingConfigs.$inferSelect;
export type InsertCountryPricingConfig = z.infer<typeof insertCountryPricingConfigSchema>;

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;

export type PlanLocalPrice = typeof planLocalPrices.$inferSelect;
export type InsertPlanLocalPrice = z.infer<typeof insertPlanLocalPriceSchema>;

export type BillingOffer = typeof billingOffers.$inferSelect;
export type InsertBillingOffer = z.infer<typeof insertBillingOfferSchema>;

export type OfferRedemption = typeof offerRedemptions.$inferSelect;
export type InsertOfferRedemption = z.infer<typeof insertOfferRedemptionSchema>;

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;

export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = z.infer<typeof insertSubscriptionInvoiceSchema>;

export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect;
export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;

export type TransactionLog = typeof transactionLogs.$inferSelect;
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type InsertPaymentAttempt = z.infer<typeof insertPaymentAttemptSchema>;

export type BillingPayment = typeof billingPayments.$inferSelect;
export type InsertBillingPayment = z.infer<typeof insertBillingPaymentSchema>;

// Usage-based billing types
export type PlanUsageLimits = typeof planUsageLimits.$inferSelect;
export type InsertPlanUsageLimits = z.infer<typeof insertPlanUsageLimitsSchema>;

export type TenantUsageTracking = typeof tenantUsageTracking.$inferSelect;
export type InsertTenantUsageTracking = z.infer<typeof insertTenantUsageTrackingSchema>;

export type UsageEvent = typeof usageEvents.$inferSelect;
export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;

export type UsageType = typeof usageTypeEnum.enumValues[number];

// WhatsApp types
export type WhatsappProviderConfig = typeof whatsappProviderConfigs.$inferSelect;
export type InsertWhatsappProviderConfig = z.infer<typeof insertWhatsappProviderConfigSchema>;

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;

export type WhatsappOptIn = typeof whatsappOptIns.$inferSelect;
export type InsertWhatsappOptIn = z.infer<typeof insertWhatsappOptInSchema>;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

export type WhatsappUsage = typeof whatsappUsage.$inferSelect;
export type InsertWhatsappUsage = z.infer<typeof insertWhatsappUsageSchema>;

export type WhatsappProviderHealth = typeof whatsappProviderHealth.$inferSelect;
export type InsertWhatsappProviderHealth = z.infer<typeof insertWhatsappProviderHealthSchema>;

export type WhatsappWebhookEvent = typeof whatsappWebhookEvents.$inferSelect;
export type InsertWhatsappWebhookEvent = z.infer<typeof insertWhatsappWebhookEventSchema>;

// AI service types
export type TenantAiSettings = typeof tenantAiSettings.$inferSelect;
export type InsertTenantAiSettings = z.infer<typeof insertTenantAiSettingsSchema>;

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;

export type StudentRiskPrediction = typeof studentRiskPredictions.$inferSelect;
export type InsertStudentRiskPrediction = z.infer<typeof insertStudentRiskPredictionSchema>;

// AI role-based permissions types
export type AiFeature = typeof aiFeatures.$inferSelect;
export type InsertAiFeature = z.infer<typeof insertAiFeatureSchema>;

export type AiRoleSetting = typeof aiRoleSettings.$inferSelect;
export type InsertAiRoleSetting = z.infer<typeof insertAiRoleSettingSchema>;

export type AiUsageCounter = typeof aiUsageCounters.$inferSelect;
export type InsertAiUsageCounter = z.infer<typeof insertAiUsageCounterSchema>;

export type AiUsageResetWindow = typeof aiUsageResetWindowEnum.enumValues[number];

export type AiAuditLog = typeof aiAuditLogs.$inferSelect;
export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;
export type AiAuditAction = typeof aiAuditActionEnum.enumValues[number];

// ============================================
// COMPLIANCE & DATA GOVERNANCE
// ============================================

export const dataProtectionRegulationEnum = pgEnum("data_protection_regulation", [
  "gdpr",           // UK/EU - General Data Protection Regulation
  "pdpa_sg",        // Singapore - Personal Data Protection Act
  "pdpa_my",        // Malaysia - Personal Data Protection Act
  "dpdp",           // India - Digital Personal Data Protection Act
  "uae_dpl",        // UAE - Data Protection Law
]);

export const consentTypeEnum = pgEnum("consent_type", [
  "marketing",              // Marketing communications
  "data_processing",        // General data processing
  "data_sharing",           // Third-party data sharing
  "profiling",              // Automated profiling/decisions
  "cross_border_transfer",  // Cross-border data transfer
  "health_data",            // Health/medical data processing
  "biometric",              // Biometric data processing
  "location_tracking",      // Location data collection
]);

export const consentStatusEnum = pgEnum("consent_status", [
  "granted",
  "denied",
  "withdrawn",
  "expired",
]);

export const dsarTypeEnum = pgEnum("dsar_type", [
  "access",         // Right to access personal data
  "rectification",  // Right to correct inaccurate data
  "erasure",        // Right to be forgotten
  "portability",    // Right to data portability
  "restriction",    // Right to restrict processing
  "objection",      // Right to object to processing
]);

export const dsarStatusEnum = pgEnum("dsar_status", [
  "submitted",
  "acknowledged",
  "in_progress",
  "pending_verification",
  "completed",
  "rejected",
  "expired",
]);

export const sensitiveDataCategoryEnum = pgEnum("sensitive_data_category", [
  "pii",            // Personally Identifiable Information
  "phi",            // Protected Health Information
  "financial",      // Financial/payment data
  "biometric",      // Biometric data
  "location",       // Location data
  "authentication", // Passwords, tokens, etc.
]);

export const accessReasonEnum = pgEnum("access_reason", [
  "customer_request",
  "support_ticket",
  "compliance_audit",
  "legal_requirement",
  "system_maintenance",
  "debugging",
  "authorized_investigation",
]);

// Regional compliance configurations
export const complianceConfigs = pgTable("compliance_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regulation: dataProtectionRegulationEnum("regulation").notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  applicableCountries: jsonb("applicable_countries").default([]), // ["uk", "india", etc.]
  dataRetentionDays: integer("data_retention_days").default(365),
  breachNotificationHours: integer("breach_notification_hours").default(72),
  consentExpiryDays: integer("consent_expiry_days"),
  requireExplicitConsent: boolean("require_explicit_consent").default(true),
  allowImpliedConsent: boolean("allow_implied_consent").default(false),
  minorAgeThreshold: integer("minor_age_threshold").default(18),
  requireParentalConsent: boolean("require_parental_consent").default(true),
  crossBorderRules: jsonb("cross_border_rules").default({}),
  requiredConsentTypes: jsonb("required_consent_types").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenant-level compliance settings
export const tenantComplianceSettings = pgTable("tenant_compliance_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  primaryRegulation: dataProtectionRegulationEnum("primary_regulation").notNull(),
  additionalRegulations: jsonb("additional_regulations").default([]),
  dataRetentionDays: integer("data_retention_days").default(365),
  autoDeleteExpiredData: boolean("auto_delete_expired_data").default(false),
  requireConsentForMarketing: boolean("require_consent_for_marketing").default(true),
  enableDataMasking: boolean("enable_data_masking").default(true),
  enableAuditLogging: boolean("enable_audit_logging").default(true),
  dpoEmail: varchar("dpo_email", { length: 255 }),
  dpoName: varchar("dpo_name", { length: 255 }),
  privacyPolicyUrl: text("privacy_policy_url"),
  termsUrl: text("terms_url"),
  cookiePolicyUrl: text("cookie_policy_url"),
  customSettings: jsonb("custom_settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consent records for data subjects
export const consentRecords = pgTable("consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  subjectType: varchar("subject_type", { length: 50 }).notNull(), // customer, patient, user
  subjectId: varchar("subject_id", { length: 100 }).notNull(),
  subjectEmail: varchar("subject_email", { length: 255 }),
  consentType: consentTypeEnum("consent_type").notNull(),
  status: consentStatusEnum("status").notNull().default("granted"),
  regulation: dataProtectionRegulationEnum("regulation"),
  purpose: text("purpose").notNull(),
  legalBasis: varchar("legal_basis", { length: 100 }), // consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
  consentText: text("consent_text"),
  version: varchar("version", { length: 20 }),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawalReason: text("withdrawal_reason"),
  collectionMethod: varchar("collection_method", { length: 50 }), // web_form, paper, verbal, checkbox, double_opt_in
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  proofDocumentUrl: text("proof_document_url"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_consent_tenant_subject").on(table.tenantId, table.subjectType, table.subjectId),
  index("idx_consent_type").on(table.consentType),
  index("idx_consent_status").on(table.status),
  index("idx_consent_expires").on(table.expiresAt),
]);

// Data Subject Access Requests (DSAR)
export const dsarRequests = pgTable("dsar_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  requestType: dsarTypeEnum("request_type").notNull(),
  status: dsarStatusEnum("status").notNull().default("submitted"),
  regulation: dataProtectionRegulationEnum("regulation"),
  subjectEmail: varchar("subject_email", { length: 255 }).notNull(),
  subjectName: varchar("subject_name", { length: 255 }),
  subjectPhone: varchar("subject_phone", { length: 20 }),
  subjectIdType: varchar("subject_id_type", { length: 50 }), // passport, national_id, driver_license
  subjectIdNumber: varchar("subject_id_number", { length: 100 }),
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"), // pending, verified, failed
  verificationMethod: varchar("verification_method", { length: 50 }), // email, phone, document
  verifiedAt: timestamp("verified_at"),
  requestDetails: text("request_details"),
  dataCategories: jsonb("data_categories").default([]), // which data categories are requested
  responseDeadline: timestamp("response_deadline"),
  acknowledgedAt: timestamp("acknowledged_at"),
  completedAt: timestamp("completed_at"),
  responseNotes: text("response_notes"),
  rejectionReason: text("rejection_reason"),
  dataExportUrl: text("data_export_url"),
  dataExportExpiresAt: timestamp("data_export_expires_at"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dsar_tenant").on(table.tenantId),
  index("idx_dsar_status").on(table.status),
  index("idx_dsar_subject_email").on(table.subjectEmail),
  index("idx_dsar_deadline").on(table.responseDeadline),
  index("idx_dsar_created").on(table.createdAt),
]);

// DSAR activity log for tracking request progress
export const dsarActivityLog = pgTable("dsar_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dsarId: varchar("dsar_id").notNull().references(() => dsarRequests.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(),
  previousStatus: dsarStatusEnum("previous_status"),
  newStatus: dsarStatusEnum("new_status"),
  performedBy: varchar("performed_by").references(() => users.id, { onDelete: "set null" }),
  performedByEmail: varchar("performed_by_email", { length: 255 }),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dsar_activity_dsar").on(table.dsarId),
  index("idx_dsar_activity_created").on(table.createdAt),
]);

// Sensitive data access logs for compliance auditing
export const sensitiveDataAccessLogs = pgTable("sensitive_data_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  accessorType: varchar("accessor_type", { length: 50 }).notNull(), // user, admin, platform_admin, system
  accessorId: varchar("accessor_id", { length: 100 }).notNull(),
  accessorEmail: varchar("accessor_email", { length: 255 }),
  accessorRole: varchar("accessor_role", { length: 100 }),
  dataCategory: sensitiveDataCategoryEnum("data_category").notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(), // customer, patient, payment, etc.
  resourceId: varchar("resource_id", { length: 100 }).notNull(),
  fieldsAccessed: jsonb("fields_accessed").default([]), // which specific fields were accessed
  accessType: varchar("access_type", { length: 50 }).notNull(), // view, export, modify, delete
  accessReason: accessReasonEnum("access_reason").notNull(),
  reasonDetails: text("reason_details"),
  ticketId: varchar("ticket_id", { length: 100 }), // support ticket reference if applicable
  wasDataMasked: boolean("was_data_masked").default(false),
  dataMaskingApplied: jsonb("data_masking_applied").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  geoLocation: jsonb("geo_location").default({}),
  sessionId: varchar("session_id", { length: 100 }),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // low, medium, high, critical
  flagged: boolean("flagged").default(false),
  flagReason: text("flag_reason"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sensitive_access_tenant").on(table.tenantId),
  index("idx_sensitive_access_accessor").on(table.accessorType, table.accessorId),
  index("idx_sensitive_access_resource").on(table.resourceType, table.resourceId),
  index("idx_sensitive_access_category").on(table.dataCategory),
  index("idx_sensitive_access_risk").on(table.riskLevel),
  index("idx_sensitive_access_flagged").on(table.flagged),
  index("idx_sensitive_access_created").on(table.createdAt),
]);

// Data masking rules per role and data category
export const dataMaskingRules = pgTable("data_masking_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }),
  roleName: varchar("role_name", { length: 100 }), // for platform-level rules without role FK
  dataCategory: sensitiveDataCategoryEnum("data_category").notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  maskingType: varchar("masking_type", { length: 50 }).notNull(), // full, partial, hash, redact, tokenize
  maskingPattern: varchar("masking_pattern", { length: 100 }), // e.g., "****1234" for partial
  preserveLength: boolean("preserve_length").default(true),
  preserveFormat: boolean("preserve_format").default(false),
  isEnabled: boolean("is_enabled").default(true),
  priority: integer("priority").default(0), // higher priority rules take precedence
  conditions: jsonb("conditions").default({}), // additional conditions for applying the rule
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_masking_tenant").on(table.tenantId),
  index("idx_masking_role").on(table.roleId),
  index("idx_masking_category").on(table.dataCategory),
  index("idx_masking_resource").on(table.resourceType, table.fieldName),
]);

// Data breach records for compliance reporting
export const dataBreachRecords = pgTable("data_breach_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  breachType: varchar("breach_type", { length: 100 }).notNull(), // unauthorized_access, data_leak, system_compromise, human_error
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  regulation: dataProtectionRegulationEnum("regulation"),
  discoveredAt: timestamp("discovered_at").notNull(),
  occurredAt: timestamp("occurred_at"),
  reportedToAuthorityAt: timestamp("reported_to_authority_at"),
  reportDeadline: timestamp("report_deadline"),
  affectedDataCategories: jsonb("affected_data_categories").default([]),
  affectedSubjectsCount: integer("affected_subjects_count"),
  affectedSubjectsNotified: boolean("affected_subjects_notified").default(false),
  notifiedAt: timestamp("notified_at"),
  description: text("description"),
  impactAssessment: text("impact_assessment"),
  containmentActions: text("containment_actions"),
  remediationActions: text("remediation_actions"),
  preventionMeasures: text("prevention_measures"),
  authorityReference: varchar("authority_reference", { length: 100 }),
  status: varchar("status", { length: 50 }).default("investigating"), // investigating, contained, reported, resolved, closed
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by").references(() => users.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_breach_tenant").on(table.tenantId),
  index("idx_breach_severity").on(table.severity),
  index("idx_breach_status").on(table.status),
  index("idx_breach_discovered").on(table.discoveredAt),
]);

// Data retention policies
export const dataRetentionPolicies = pgTable("data_retention_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  regulation: dataProtectionRegulationEnum("regulation"),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  dataCategory: sensitiveDataCategoryEnum("data_category"),
  retentionDays: integer("retention_days").notNull(),
  archiveBeforeDelete: boolean("archive_before_delete").default(true),
  archiveLocation: varchar("archive_location", { length: 255 }),
  autoDelete: boolean("auto_delete").default(false),
  deleteAction: varchar("delete_action", { length: 50 }).default("soft_delete"), // soft_delete, hard_delete, anonymize
  legalHold: boolean("legal_hold").default(false),
  legalHoldReason: text("legal_hold_reason"),
  lastExecutedAt: timestamp("last_executed_at"),
  nextScheduledAt: timestamp("next_scheduled_at"),
  isEnabled: boolean("is_enabled").default(true),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_retention_tenant").on(table.tenantId),
  index("idx_retention_resource").on(table.resourceType),
  index("idx_retention_enabled").on(table.isEnabled),
]);

// Compliance checklist status enum
export const complianceChecklistStatusEnum = pgEnum("compliance_checklist_status", [
  "not_started",
  "in_progress",
  "completed",
  "not_applicable",
  "overdue",
]);

// Compliance packs - country/regulation-specific compliance packages
export const compliancePacks = pgTable("compliance_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g., "gdpr_basic", "dpdp_full"
  regulation: dataProtectionRegulationEnum("regulation").notNull(),
  description: text("description"),
  applicableCountries: jsonb("applicable_countries").default([]), // ["in", "gb", "sg"]
  applicableBusinessTypes: jsonb("applicable_business_types").default([]), // ["clinic", "salon"]
  tier: varchar("tier", { length: 50 }).default("standard"), // basic, standard, enterprise
  version: varchar("version", { length: 20 }).default("1.0"),
  totalItems: integer("total_items").default(0),
  estimatedHours: integer("estimated_hours"), // Estimated time to complete
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false), // Default pack for new tenants
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_compliance_packs_regulation").on(table.regulation),
  index("idx_compliance_packs_code").on(table.code),
  index("idx_compliance_packs_active").on(table.isActive),
]);

// Compliance checklist items - individual items within a pack
export const complianceChecklistItems = pgTable("compliance_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").notNull().references(() => compliancePacks.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "Data Collection", "Consent Management"
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  guidance: text("guidance"), // How to implement/complete this item
  documentationUrl: text("documentation_url"), // Link to relevant docs
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, critical
  isMandatory: boolean("is_mandatory").default(true),
  requiresEvidence: boolean("requires_evidence").default(false),
  evidenceTypes: jsonb("evidence_types").default([]), // ["document", "screenshot", "policy_link"]
  dueDays: integer("due_days"), // Days from pack assignment to complete
  sortOrder: integer("sort_order").default(0),
  dependencies: jsonb("dependencies").default([]), // IDs of items that must be completed first
  tags: jsonb("tags").default([]), // ["technical", "policy", "training"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_checklist_pack").on(table.packId),
  index("idx_checklist_category").on(table.category),
  index("idx_checklist_priority").on(table.priority),
  index("idx_checklist_sort").on(table.sortOrder),
]);

// Tenant compliance pack assignments - which packs are assigned to which tenant
export const tenantCompliancePacks = pgTable("tenant_compliance_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  packId: varchar("pack_id").notNull().references(() => compliancePacks.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionPercentage: integer("completion_percentage").default(0),
  status: varchar("status", { length: 50 }).default("active"), // active, completed, suspended
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_packs_tenant").on(table.tenantId),
  index("idx_tenant_packs_pack").on(table.packId),
  uniqueIndex("idx_tenant_packs_unique").on(table.tenantId, table.packId),
]);

// Tenant compliance progress - tracks progress on individual checklist items
export const tenantComplianceProgress = pgTable("tenant_compliance_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  packId: varchar("pack_id").notNull().references(() => compliancePacks.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => complianceChecklistItems.id, { onDelete: "cascade" }),
  status: complianceChecklistStatusEnum("status").default("not_started"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  evidenceUrl: text("evidence_url"),
  evidenceDescription: text("evidence_description"),
  notes: text("notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_progress_tenant").on(table.tenantId),
  index("idx_progress_pack").on(table.packId),
  index("idx_progress_item").on(table.itemId),
  index("idx_progress_status").on(table.status),
  uniqueIndex("idx_progress_unique").on(table.tenantId, table.packId, table.itemId),
]);

// Insert schemas for compliance tables
export const insertComplianceConfigSchema = createInsertSchema(complianceConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantComplianceSettingsSchema = createInsertSchema(tenantComplianceSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDsarRequestSchema = createInsertSchema(dsarRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDsarActivityLogSchema = createInsertSchema(dsarActivityLog).omit({ id: true, createdAt: true });
export const insertSensitiveDataAccessLogSchema = createInsertSchema(sensitiveDataAccessLogs).omit({ id: true, createdAt: true });
export const insertDataMaskingRuleSchema = createInsertSchema(dataMaskingRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataBreachRecordSchema = createInsertSchema(dataBreachRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompliancePackSchema = createInsertSchema(compliancePacks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertComplianceChecklistItemSchema = createInsertSchema(complianceChecklistItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantCompliancePackSchema = createInsertSchema(tenantCompliancePacks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantComplianceProgressSchema = createInsertSchema(tenantComplianceProgress).omit({ id: true, createdAt: true, updatedAt: true });

// Compliance types
export type ComplianceConfig = typeof complianceConfigs.$inferSelect;
export type InsertComplianceConfig = z.infer<typeof insertComplianceConfigSchema>;

export type TenantComplianceSettings = typeof tenantComplianceSettings.$inferSelect;
export type InsertTenantComplianceSettings = z.infer<typeof insertTenantComplianceSettingsSchema>;

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = z.infer<typeof insertConsentRecordSchema>;

export type DsarRequest = typeof dsarRequests.$inferSelect;
export type InsertDsarRequest = z.infer<typeof insertDsarRequestSchema>;

export type DsarActivityLog = typeof dsarActivityLog.$inferSelect;
export type InsertDsarActivityLog = z.infer<typeof insertDsarActivityLogSchema>;

export type SensitiveDataAccessLog = typeof sensitiveDataAccessLogs.$inferSelect;
export type InsertSensitiveDataAccessLog = z.infer<typeof insertSensitiveDataAccessLogSchema>;

export type DataMaskingRule = typeof dataMaskingRules.$inferSelect;
export type InsertDataMaskingRule = z.infer<typeof insertDataMaskingRuleSchema>;

export type DataBreachRecord = typeof dataBreachRecords.$inferSelect;
export type InsertDataBreachRecord = z.infer<typeof insertDataBreachRecordSchema>;

export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;

export type CompliancePack = typeof compliancePacks.$inferSelect;
export type InsertCompliancePack = z.infer<typeof insertCompliancePackSchema>;

export type ComplianceChecklistItem = typeof complianceChecklistItems.$inferSelect;
export type InsertComplianceChecklistItem = z.infer<typeof insertComplianceChecklistItemSchema>;

export type TenantCompliancePack = typeof tenantCompliancePacks.$inferSelect;
export type InsertTenantCompliancePack = z.infer<typeof insertTenantCompliancePackSchema>;

export type TenantComplianceProgress = typeof tenantComplianceProgress.$inferSelect;
export type InsertTenantComplianceProgress = z.infer<typeof insertTenantComplianceProgressSchema>;

// ============================================
// INDIA COMPLIANCE MODULE (GST, DLT, Aadhaar, RBI)
// ============================================

// GST Configuration for tenants
export const gstConfigurations = pgTable("gst_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  gstin: varchar("gstin", { length: 15 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  tradeName: varchar("trade_name", { length: 255 }),
  registrationDate: timestamp("registration_date"),
  gstType: varchar("gst_type", { length: 20 }).default("regular"), // regular, composition, unregistered
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  placeOfSupply: varchar("place_of_supply", { length: 100 }),
  hsnCodes: jsonb("hsn_codes").default([]),
  sacCodes: jsonb("sac_codes").default([]),
  isEInvoiceEnabled: boolean("is_e_invoice_enabled").default(false),
  eInvoiceUsername: varchar("e_invoice_username", { length: 100 }),
  isEWayBillEnabled: boolean("is_eway_bill_enabled").default(false),
  eWayBillUsername: varchar("eway_bill_username", { length: 100 }),
  defaultCgstRate: decimal("default_cgst_rate", { precision: 5, scale: 2 }).default("9.00"),
  defaultSgstRate: decimal("default_sgst_rate", { precision: 5, scale: 2 }).default("9.00"),
  defaultIgstRate: decimal("default_igst_rate", { precision: 5, scale: 2 }).default("18.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GST Invoices
export const gstInvoices = pgTable("gst_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  invoiceType: varchar("invoice_type", { length: 20 }).notNull(), // tax_invoice, bill_of_supply, credit_note, debit_note
  supplyType: varchar("supply_type", { length: 20 }).default("B2C"), // B2B, B2C, B2G, SEZ, Export
  placeOfSupply: varchar("place_of_supply", { length: 2 }).notNull(),
  reverseCharge: boolean("reverse_charge").default(false),
  customerGstin: varchar("customer_gstin", { length: 15 }),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerAddress: text("customer_address"),
  customerState: varchar("customer_state", { length: 100 }),
  customerStateCode: varchar("customer_state_code", { length: 2 }),
  lineItems: jsonb("line_items").notNull().default([]),
  taxableAmount: decimal("taxable_amount", { precision: 15, scale: 2 }).notNull(),
  cgstAmount: decimal("cgst_amount", { precision: 15, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 15, scale: 2 }).default("0"),
  igstAmount: decimal("igst_amount", { precision: 15, scale: 2 }).default("0"),
  cessAmount: decimal("cess_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  roundOff: decimal("round_off", { precision: 10, scale: 2 }).default("0"),
  eInvoiceIrn: varchar("e_invoice_irn", { length: 100 }),
  eInvoiceAckNo: varchar("e_invoice_ack_no", { length: 50 }),
  eInvoiceAckDate: timestamp("e_invoice_ack_date"),
  eInvoiceQrCode: text("e_invoice_qr_code"),
  eWayBillNo: varchar("eway_bill_no", { length: 20 }),
  eWayBillDate: timestamp("eway_bill_date"),
  status: varchar("status", { length: 20 }).default("draft"), // draft, issued, cancelled, amended
  linkedBookingId: varchar("linked_booking_id"),
  linkedPaymentId: varchar("linked_payment_id"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp DLT Templates (TRAI compliance for India)
export const dltTemplates = pgTable("dlt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  senderId: varchar("sender_id", { length: 11 }).notNull(),
  principalEntityId: varchar("principal_entity_id", { length: 30 }).notNull(),
  templateType: varchar("template_type", { length: 20 }).notNull(), // transactional, promotional, service_implicit, service_explicit
  contentType: varchar("content_type", { length: 20 }).default("text"), // text, unicode
  templateContent: text("template_content").notNull(),
  variables: jsonb("variables").default([]),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, expired
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"),
  category: varchar("category", { length: 50 }), // booking_confirmation, payment_reminder, etc.
  language: varchar("language", { length: 10 }).default("en"),
  isActive: boolean("is_active").default(true),
  registeredWith: varchar("registered_with", { length: 50 }), // Jio, Airtel, Vodafone, BSNL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Aadhaar masking configuration and logs
export const aadhaarMaskingLogs = pgTable("aadhaar_masking_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // customer, patient, member, etc.
  entityId: varchar("entity_id").notNull(),
  fieldName: varchar("field_name", { length: 50 }).notNull(),
  maskedValue: varchar("masked_value", { length: 20 }).notNull(),
  accessedBy: varchar("accessed_by"),
  accessReason: varchar("access_reason", { length: 255 }),
  accessedAt: timestamp("accessed_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

// RBI Payment Compliance Configuration
export const rbiPaymentCompliance = pgTable("rbi_payment_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  paGuidelines: jsonb("pa_guidelines").default({}), // Payment Aggregator guidelines compliance
  ppiGuidelines: jsonb("ppi_guidelines").default({}), // Prepaid Payment Instruments
  cardStorageCompliant: boolean("card_storage_compliant").default(false),
  tokenizationEnabled: boolean("tokenization_enabled").default(true),
  recurringPaymentCompliant: boolean("recurring_payment_compliant").default(false),
  eMandate2faEnabled: boolean("e_mandate_2fa_enabled").default(true),
  maxRecurringAmount: decimal("max_recurring_amount", { precision: 15, scale: 2 }),
  refundPolicyDays: integer("refund_policy_days").default(7),
  disputeResolutionDays: integer("dispute_resolution_days").default(30),
  gstOnPaymentServices: boolean("gst_on_payment_services").default(true),
  merchantCategoryCode: varchar("merchant_category_code", { length: 10 }),
  nodalofficerName: varchar("nodal_officer_name", { length: 255 }),
  nodalOfficerEmail: varchar("nodal_officer_email", { length: 255 }),
  nodalOfficerPhone: varchar("nodal_officer_phone", { length: 20 }),
  lastAuditDate: timestamp("last_audit_date"),
  nextAuditDue: timestamp("next_audit_due"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// India Compliance Insert Schemas
export const insertGstConfigurationSchema = createInsertSchema(gstConfigurations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGstInvoiceSchema = createInsertSchema(gstInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDltTemplateSchema = createInsertSchema(dltTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAadhaarMaskingLogSchema = createInsertSchema(aadhaarMaskingLogs).omit({ id: true, accessedAt: true });
export const insertRbiPaymentComplianceSchema = createInsertSchema(rbiPaymentCompliance).omit({ id: true, createdAt: true, updatedAt: true });

// India Compliance Types
export type GstConfiguration = typeof gstConfigurations.$inferSelect;
export type InsertGstConfiguration = z.infer<typeof insertGstConfigurationSchema>;

export type GstInvoice = typeof gstInvoices.$inferSelect;
export type InsertGstInvoice = z.infer<typeof insertGstInvoiceSchema>;

export type DltTemplate = typeof dltTemplates.$inferSelect;
export type InsertDltTemplate = z.infer<typeof insertDltTemplateSchema>;

export type AadhaarMaskingLog = typeof aadhaarMaskingLogs.$inferSelect;
export type InsertAadhaarMaskingLog = z.infer<typeof insertAadhaarMaskingLogSchema>;

export type RbiPaymentCompliance = typeof rbiPaymentCompliance.$inferSelect;
export type InsertRbiPaymentCompliance = z.infer<typeof insertRbiPaymentComplianceSchema>;

// ============================================
// UAE COMPLIANCE MODULE
// ============================================

// UAE VAT Configuration for tenants
export const uaeVatConfigurations = pgTable("uae_vat_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  trn: varchar("trn", { length: 15 }).notNull(), // Tax Registration Number (15 digits)
  businessNameEn: varchar("business_name_en", { length: 255 }).notNull(),
  businessNameAr: varchar("business_name_ar", { length: 255 }), // Arabic name
  tradeLicenseNumber: varchar("trade_license_number", { length: 50 }),
  emirate: varchar("emirate", { length: 50 }).notNull(), // Dubai, Abu Dhabi, Sharjah, etc.
  freeZone: varchar("free_zone", { length: 100 }), // JAFZA, DAFZA, etc. (optional)
  isDesignatedZone: boolean("is_designated_zone").default(false),
  vatGroupNumber: varchar("vat_group_number", { length: 20 }), // For VAT group registrations
  defaultVatRate: decimal("default_vat_rate", { precision: 5, scale: 2 }).default("5.00"),
  fiscalYearEnd: varchar("fiscal_year_end", { length: 10 }), // e.g., "12-31"
  vatReturnFrequency: varchar("vat_return_frequency", { length: 20 }).default("quarterly"), // monthly, quarterly
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UAE VAT Invoices
export const uaeVatInvoices = pgTable("uae_vat_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  supplyDate: timestamp("supply_date"), // Tax point
  invoiceType: varchar("invoice_type", { length: 20 }).default("standard"), // standard, simplified, credit_note, debit_note
  customerTrn: varchar("customer_trn", { length: 15 }), // Customer TRN (optional for B2C)
  customerNameEn: varchar("customer_name_en", { length: 255 }).notNull(),
  customerNameAr: varchar("customer_name_ar", { length: 255 }),
  customerAddress: text("customer_address"),
  customerEmirate: varchar("customer_emirate", { length: 50 }),
  isExport: boolean("is_export").default(false),
  isReverseCharge: boolean("is_reverse_charge").default(false), // Reverse charge mechanism
  isZeroRated: boolean("is_zero_rated").default(false),
  isExempt: boolean("is_exempt").default(false),
  lineItems: jsonb("line_items").default([]), // Array of line items
  taxableAmount: decimal("taxable_amount", { precision: 15, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("AED"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  status: varchar("status", { length: 20 }).default("draft"), // draft, issued, paid, cancelled
  language: varchar("language", { length: 5 }).default("en"), // en, ar, both
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// TRA (Telecom Regulatory Authority) Message Templates
export const traTemplates = pgTable("tra_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  senderId: varchar("sender_id", { length: 11 }).notNull(), // TRA registered sender ID
  category: varchar("category", { length: 50 }).notNull(), // promotional, transactional, otp, service
  templateContentEn: text("template_content_en").notNull(),
  templateContentAr: text("template_content_ar"),
  variables: jsonb("variables").default([]),
  traApprovalStatus: varchar("tra_approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  traApprovalId: varchar("tra_approval_id", { length: 50 }),
  traSubmissionDate: timestamp("tra_submission_date"),
  traApprovalDate: timestamp("tra_approval_date"),
  messageType: varchar("message_type", { length: 10 }).default("sms"), // sms, whatsapp
  isOptOutRequired: boolean("is_opt_out_required").default(true),
  optOutText: varchar("opt_out_text", { length: 100 }).default("Reply STOP to unsubscribe"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Residency Logs for UAE compliance
export const dataResidencyLogs = pgTable("data_residency_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  dataType: varchar("data_type", { length: 50 }).notNull(), // personal, financial, health, government
  dataClassification: varchar("data_classification", { length: 30 }).notNull(), // public, internal, confidential, restricted
  storageLocation: varchar("storage_location", { length: 50 }).notNull(), // uae, gcc, international
  dataCenter: varchar("data_center", { length: 100 }), // Specific data center
  isUaeResident: boolean("is_uae_resident").default(true),
  requiresLocalStorage: boolean("requires_local_storage").default(false),
  crossBorderTransfer: boolean("cross_border_transfer").default(false),
  transferJustification: text("transfer_justification"),
  dataSubjectConsent: boolean("data_subject_consent").default(false),
  consentDate: timestamp("consent_date"),
  retentionPeriodDays: integer("retention_period_days"),
  deletionScheduled: timestamp("deletion_scheduled"),
  lastAccessedAt: timestamp("last_accessed_at"),
  accessedBy: varchar("accessed_by", { length: 255 }),
  accessPurpose: text("access_purpose"),
  createdAt: timestamp("created_at").defaultNow(),
});

// UAE Compliance Settings
export const uaeComplianceSettings = pgTable("uae_compliance_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  arabicLanguageEnabled: boolean("arabic_language_enabled").default(false),
  defaultLanguage: varchar("default_language", { length: 5 }).default("en"), // en, ar
  dualLanguageInvoices: boolean("dual_language_invoices").default(true),
  dataResidencyRequired: boolean("data_residency_required").default(true),
  primaryDataCenter: varchar("primary_data_center", { length: 100 }).default("UAE"),
  backupDataCenter: varchar("backup_data_center", { length: 100 }),
  gdprCompliant: boolean("gdpr_compliant").default(true), // UAE follows GDPR-like principles
  pdpCompliant: boolean("pdp_compliant").default(true), // UAE Personal Data Protection
  traRegistered: boolean("tra_registered").default(false),
  traSenderIds: jsonb("tra_sender_ids").default([]), // Array of registered sender IDs
  emiratesIdValidation: boolean("emirates_id_validation").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UAE Compliance Insert Schemas
export const insertUaeVatConfigurationSchema = createInsertSchema(uaeVatConfigurations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUaeVatInvoiceSchema = createInsertSchema(uaeVatInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTraTemplateSchema = createInsertSchema(traTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataResidencyLogSchema = createInsertSchema(dataResidencyLogs).omit({ id: true, createdAt: true });
export const insertUaeComplianceSettingsSchema = createInsertSchema(uaeComplianceSettings).omit({ id: true, createdAt: true, updatedAt: true });

// UAE Compliance Types
export type UaeVatConfiguration = typeof uaeVatConfigurations.$inferSelect;
export type InsertUaeVatConfiguration = z.infer<typeof insertUaeVatConfigurationSchema>;

export type UaeVatInvoice = typeof uaeVatInvoices.$inferSelect;
export type InsertUaeVatInvoice = z.infer<typeof insertUaeVatInvoiceSchema>;

export type TraTemplate = typeof traTemplates.$inferSelect;
export type InsertTraTemplate = z.infer<typeof insertTraTemplateSchema>;

export type DataResidencyLog = typeof dataResidencyLogs.$inferSelect;
export type InsertDataResidencyLog = z.infer<typeof insertDataResidencyLogSchema>;

export type UaeComplianceSettings = typeof uaeComplianceSettings.$inferSelect;
export type InsertUaeComplianceSettings = z.infer<typeof insertUaeComplianceSettingsSchema>;

// ============================================
// UK COMPLIANCE MODULE
// ============================================

// UK VAT Configuration
export const ukVatConfigurations = pgTable("uk_vat_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  vatNumber: varchar("vat_number", { length: 15 }).notNull(), // GB + 9 digits or GB + 12 digits
  businessName: varchar("business_name", { length: 255 }).notNull(),
  tradingName: varchar("trading_name", { length: 255 }),
  address: text("address").notNull(),
  postcode: varchar("postcode", { length: 10 }).notNull(),
  mtdEnabled: boolean("mtd_enabled").default(true), // Making Tax Digital
  vatScheme: varchar("vat_scheme", { length: 50 }).default("standard"), // standard, flat_rate, cash_accounting
  flatRatePercentage: decimal("flat_rate_percentage", { precision: 5, scale: 2 }),
  returnFrequency: varchar("return_frequency", { length: 20 }).default("quarterly"), // monthly, quarterly, annual
  accountingPeriodStart: date("accounting_period_start"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UK VAT Invoices
export const ukVatInvoices = pgTable("uk_vat_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerVatNumber: varchar("customer_vat_number", { length: 15 }), // If VAT registered
  customerAddress: text("customer_address"),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  lineItems: jsonb("line_items").notNull().default([]),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("20"), // Standard 20%
  vatRateType: varchar("vat_rate_type", { length: 20 }).default("standard"), // standard, reduced, zero, exempt
  isReverseCharge: boolean("is_reverse_charge").default(false),
  isEcSupply: boolean("is_ec_supply").default(false), // EU/EC supply (post-Brexit rules)
  status: varchar("status", { length: 20 }).default("draft"), // draft, issued, paid, cancelled
  paidAt: timestamp("paid_at"),
  currency: varchar("currency", { length: 3 }).default("GBP"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR Consent Records
export const gdprConsentRecords = pgTable("gdpr_consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  dataSubjectId: varchar("data_subject_id").notNull(), // Customer/User ID
  dataSubjectType: varchar("data_subject_type", { length: 20 }).notNull(), // customer, staff, visitor
  dataSubjectEmail: varchar("data_subject_email", { length: 255 }),
  consentType: varchar("consent_type", { length: 50 }).notNull(), // marketing_email, marketing_sms, data_processing, analytics, third_party_sharing
  lawfulBasis: varchar("lawful_basis", { length: 50 }).notNull(), // consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
  purpose: text("purpose").notNull(), // Description of processing purpose
  dataCategories: jsonb("data_categories").default([]), // Types of data being processed
  consentGiven: boolean("consent_given").notNull(),
  consentMethod: varchar("consent_method", { length: 50 }).notNull(), // web_form, email, paper, verbal
  consentText: text("consent_text"), // The actual consent text shown
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  evidenceUrl: text("evidence_url"), // Link to proof of consent
  withdrawnAt: timestamp("withdrawn_at"),
  withdrawalReason: text("withdrawal_reason"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UK-specific Data Retention Policies (extends base retention with UK/GDPR requirements)
export const ukDataRetentionPolicies = pgTable("uk_data_retention_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  policyName: varchar("policy_name", { length: 100 }).notNull(),
  dataCategory: varchar("data_category", { length: 50 }).notNull(),
  description: text("description"),
  retentionPeriodDays: integer("retention_period_days").notNull(),
  retentionBasis: varchar("retention_basis", { length: 100 }),
  legalReference: text("legal_reference"),
  automatedDeletion: boolean("automated_deletion").default(false),
  deletionMethod: varchar("deletion_method", { length: 50 }).default("soft_delete"),
  reviewFrequencyDays: integer("review_frequency_days").default(365),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewAt: timestamp("next_review_at"),
  approvedBy: varchar("approved_by"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UK Data Retention Logs
export const ukDataRetentionLogs = pgTable("uk_data_retention_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  policyId: varchar("policy_id").references(() => ukDataRetentionPolicies.id),
  action: varchar("action", { length: 50 }).notNull(),
  dataCategory: varchar("data_category", { length: 50 }).notNull(),
  recordCount: integer("record_count").default(0),
  recordIds: jsonb("record_ids").default([]),
  reason: text("reason"),
  performedBy: varchar("performed_by"),
  performedAt: timestamp("performed_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// GDPR Data Subject Access Requests (DSARs)
export const gdprDsarRequests = pgTable("gdpr_dsar_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  requestNumber: varchar("request_number", { length: 50 }).notNull(),
  dataSubjectId: varchar("data_subject_id"),
  dataSubjectName: varchar("data_subject_name", { length: 255 }).notNull(),
  dataSubjectEmail: varchar("data_subject_email", { length: 255 }).notNull(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // access, rectification, erasure, portability, restriction, objection
  requestDetails: text("request_details"),
  identityVerified: boolean("identity_verified").default(false),
  verificationMethod: varchar("verification_method", { length: 50 }),
  status: varchar("status", { length: 20 }).default("received"), // received, in_progress, completed, rejected, extended
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  receivedAt: timestamp("received_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  dueDate: timestamp("due_date"), // 30 days from receipt by default
  extendedDueDate: timestamp("extended_due_date"), // If extended
  extensionReason: text("extension_reason"),
  completedAt: timestamp("completed_at"),
  responseMethod: varchar("response_method", { length: 50 }), // email, portal, post
  responseDetails: text("response_details"),
  rejectionReason: text("rejection_reason"),
  assignedTo: varchar("assigned_to"),
  attachments: jsonb("attachments").default([]),
  auditTrail: jsonb("audit_trail").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR Data Breach Register
export const gdprDataBreaches = pgTable("gdpr_data_breaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  breachNumber: varchar("breach_number", { length: 50 }).notNull(),
  discoveredAt: timestamp("discovered_at").notNull(),
  occurredAt: timestamp("occurred_at"),
  breachType: varchar("breach_type", { length: 50 }).notNull(), // confidentiality, integrity, availability
  breachCategory: varchar("breach_category", { length: 100 }), // cyber_attack, human_error, system_failure, theft, unauthorized_access
  description: text("description").notNull(),
  dataTypesAffected: jsonb("data_types_affected").default([]),
  dataSubjectsAffected: integer("data_subjects_affected").default(0),
  dataSubjectCategories: jsonb("data_subject_categories").default([]), // customers, employees, suppliers
  severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
  riskToRights: varchar("risk_to_rights", { length: 50 }), // unlikely, possible, likely, high
  icoNotificationRequired: boolean("ico_notification_required").default(false),
  icoNotifiedAt: timestamp("ico_notified_at"),
  icoReferenceNumber: varchar("ico_reference_number", { length: 50 }),
  dataSubjectsNotified: boolean("data_subjects_notified").default(false),
  dataSubjectsNotifiedAt: timestamp("data_subjects_notified_at"),
  rootCause: text("root_cause"),
  containmentActions: text("containment_actions"),
  remediationActions: text("remediation_actions"),
  preventionMeasures: text("prevention_measures"),
  status: varchar("status", { length: 20 }).default("open"), // open, investigating, contained, resolved, closed
  resolvedAt: timestamp("resolved_at"),
  dpoReviewedAt: timestamp("dpo_reviewed_at"),
  dpoComments: text("dpo_comments"),
  attachments: jsonb("attachments").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UK Compliance Settings
export const ukComplianceSettings = pgTable("uk_compliance_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  gdprEnabled: boolean("gdpr_enabled").default(true),
  icoCertificationNumber: varchar("ico_certification_number", { length: 50 }),
  dpoName: varchar("dpo_name", { length: 255 }),
  dpoEmail: varchar("dpo_email", { length: 255 }),
  dpoPhone: varchar("dpo_phone", { length: 20 }),
  privacyPolicyUrl: text("privacy_policy_url"),
  cookiePolicyUrl: text("cookie_policy_url"),
  dataRetentionEnabled: boolean("data_retention_enabled").default(true),
  autoConsentExpiry: boolean("auto_consent_expiry").default(true),
  consentExpiryDays: integer("consent_expiry_days").default(365),
  dsarAutomation: boolean("dsar_automation").default(false),
  dsarResponseDays: integer("dsar_response_days").default(30),
  breachNotificationHours: integer("breach_notification_hours").default(72),
  mtdEnabled: boolean("mtd_enabled").default(true),
  vatReturnReminders: boolean("vat_return_reminders").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UK Compliance Insert Schemas
export const insertUkVatConfigurationSchema = createInsertSchema(ukVatConfigurations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUkVatInvoiceSchema = createInsertSchema(ukVatInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGdprConsentRecordSchema = createInsertSchema(gdprConsentRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUkDataRetentionPolicySchema = createInsertSchema(ukDataRetentionPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUkDataRetentionLogSchema = createInsertSchema(ukDataRetentionLogs).omit({ id: true, createdAt: true });
export const insertGdprDsarRequestSchema = createInsertSchema(gdprDsarRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGdprDataBreachSchema = createInsertSchema(gdprDataBreaches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUkComplianceSettingsSchema = createInsertSchema(ukComplianceSettings).omit({ id: true, createdAt: true, updatedAt: true });

// UK Compliance Types
export type UkVatConfiguration = typeof ukVatConfigurations.$inferSelect;
export type InsertUkVatConfiguration = z.infer<typeof insertUkVatConfigurationSchema>;

export type UkVatInvoice = typeof ukVatInvoices.$inferSelect;
export type InsertUkVatInvoice = z.infer<typeof insertUkVatInvoiceSchema>;

export type GdprConsentRecord = typeof gdprConsentRecords.$inferSelect;
export type InsertGdprConsentRecord = z.infer<typeof insertGdprConsentRecordSchema>;

export type UkDataRetentionPolicy = typeof ukDataRetentionPolicies.$inferSelect;
export type InsertUkDataRetentionPolicy = z.infer<typeof insertUkDataRetentionPolicySchema>;

export type UkDataRetentionLog = typeof ukDataRetentionLogs.$inferSelect;
export type InsertUkDataRetentionLog = z.infer<typeof insertUkDataRetentionLogSchema>;

export type GdprDsarRequest = typeof gdprDsarRequests.$inferSelect;
export type InsertGdprDsarRequest = z.infer<typeof insertGdprDsarRequestSchema>;

export type GdprDataBreach = typeof gdprDataBreaches.$inferSelect;
export type InsertGdprDataBreach = z.infer<typeof insertGdprDataBreachSchema>;

export type UkComplianceSettings = typeof ukComplianceSettings.$inferSelect;
export type InsertUkComplianceSettings = z.infer<typeof insertUkComplianceSettingsSchema>;

// ============================================
// REAL ESTATE MODULE
// ============================================

// Enums for Real Estate
export const propertyTypeEnum = pgEnum("property_type", [
  "apartment", "house", "villa", "plot", "commercial", "office", "warehouse", "shop", "other"
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "available", "under_offer", "sold", "rented", "off_market", "pending"
]);

export const listingTypeEnum = pgEnum("listing_type", ["sale", "rent", "lease"]);

export const listingStatusEnum = pgEnum("listing_status", [
  "draft", "active", "paused", "expired", "sold", "rented", "withdrawn"
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "qualified", "negotiating", "won", "lost", "dormant"
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "website", "referral", "walk_in", "phone", "social_media", "portal", "advertisement", "other"
]);

export const siteVisitStatusEnum = pgEnum("site_visit_status", [
  "scheduled", "confirmed", "completed", "cancelled", "no_show", "rescheduled"
]);

export const agentStatusEnum = pgEnum("agent_status", ["active", "inactive", "suspended"]);

// Properties Table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  status: propertyStatusEnum("status").default("available"),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }).default("India"),
  postalCode: varchar("postal_code", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  area: decimal("area", { precision: 12, scale: 2 }),
  areaUnit: varchar("area_unit", { length: 20 }).default("sqft"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parkingSpaces: integer("parking_spaces"),
  yearBuilt: integer("year_built"),
  description: text("description"),
  features: jsonb("features").default([]),
  images: jsonb("images").default([]),
  documents: jsonb("documents").default([]),
  ownerId: varchar("owner_id"),
  ownerName: text("owner_name"),
  ownerPhone: varchar("owner_phone", { length: 20 }),
  ownerEmail: text("owner_email"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_properties_tenant").on(table.tenantId),
  index("idx_properties_status").on(table.status),
  index("idx_properties_type").on(table.propertyType),
  index("idx_properties_city").on(table.city),
]);

// Listings Table
export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  listingType: listingTypeEnum("listing_type").notNull(),
  status: listingStatusEnum("status").default("draft"),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  priceUnit: varchar("price_unit", { length: 20 }).default("total"),
  negotiable: boolean("negotiable").default(true),
  deposit: decimal("deposit", { precision: 15, scale: 2 }),
  maintenanceCharges: decimal("maintenance_charges", { precision: 10, scale: 2 }),
  availableFrom: date("available_from"),
  expiresAt: timestamp("expires_at"),
  isFeatured: boolean("is_featured").default(false),
  viewCount: integer("view_count").default(0),
  inquiryCount: integer("inquiry_count").default(0),
  assignedAgentId: varchar("assigned_agent_id"),
  portalListings: jsonb("portal_listings").default([]),
  metadata: jsonb("metadata").default({}),
  publishedAt: timestamp("published_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_listings_tenant").on(table.tenantId),
  index("idx_listings_property").on(table.propertyId),
  index("idx_listings_status").on(table.status),
  index("idx_listings_type").on(table.listingType),
  index("idx_listings_agent").on(table.assignedAgentId),
]);

// Leads Table
export const realEstateLeads = pgTable("real_estate_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  status: leadStatusEnum("status").default("new"),
  source: leadSourceEnum("source").default("website"),
  interestedIn: listingTypeEnum("interested_in"),
  budgetMin: decimal("budget_min", { precision: 15, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 15, scale: 2 }),
  preferredLocations: jsonb("preferred_locations").default([]),
  propertyTypes: jsonb("property_types").default([]),
  requirements: text("requirements"),
  assignedAgentId: varchar("assigned_agent_id"),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  notes: text("notes"),
  tags: jsonb("tags").default([]),
  score: integer("score").default(0),
  metadata: jsonb("metadata").default({}),
  convertedAt: timestamp("converted_at"),
  lostReason: text("lost_reason"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_re_leads_tenant").on(table.tenantId),
  index("idx_re_leads_status").on(table.status),
  index("idx_re_leads_source").on(table.source),
  index("idx_re_leads_agent").on(table.assignedAgentId),
  index("idx_re_leads_followup").on(table.nextFollowUpAt),
]);

// Site Visits Table
export const siteVisits = pgTable("site_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  leadId: varchar("lead_id").notNull().references(() => realEstateLeads.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id"),
  status: siteVisitStatusEnum("status").default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  visitorCount: integer("visitor_count").default(1),
  feedback: text("feedback"),
  interestLevel: integer("interest_level"),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpNotes: text("follow_up_notes"),
  rescheduleReason: text("reschedule_reason"),
  cancellationReason: text("cancellation_reason"),
  transportProvided: boolean("transport_provided").default(false),
  pickupLocation: text("pickup_location"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_site_visits_tenant").on(table.tenantId),
  index("idx_site_visits_lead").on(table.leadId),
  index("idx_site_visits_property").on(table.propertyId),
  index("idx_site_visits_agent").on(table.agentId),
  index("idx_site_visits_status").on(table.status),
  index("idx_site_visits_scheduled").on(table.scheduledAt),
]);

// Agents Table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  status: agentStatusEnum("status").default("active"),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseExpiry: date("license_expiry"),
  specializations: jsonb("specializations").default([]),
  serviceAreas: jsonb("service_areas").default([]),
  bio: text("bio"),
  photo: text("photo"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  totalDeals: integer("total_deals").default(0),
  totalSalesValue: decimal("total_sales_value", { precision: 18, scale: 2 }).default("0"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_agents_tenant").on(table.tenantId),
  index("idx_agents_user").on(table.userId),
  index("idx_agents_status").on(table.status),
]);

// Commission Status Enum
export const commissionStatusEnum = pgEnum("commission_status", [
  "pending", "approved", "paid", "cancelled", "disputed"
]);

// Commission Type Enum
export const commissionTypeEnum = pgEnum("commission_type", [
  "sale", "rental", "lease", "referral", "management_fee"
]);

// Real Estate Commissions Table
export const realEstateCommissions = pgTable("real_estate_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  listingId: varchar("listing_id").references(() => listings.id, { onDelete: "set null" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  leadId: varchar("lead_id").references(() => realEstateLeads.id, { onDelete: "set null" }),
  commissionNumber: varchar("commission_number", { length: 50 }),
  commissionType: commissionTypeEnum("commission_type").default("sale"),
  status: commissionStatusEnum("status").default("pending"),
  dealValue: decimal("deal_value", { precision: 18, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR"),
  dealClosedDate: date("deal_closed_date"),
  paymentDueDate: date("payment_due_date"),
  paidDate: date("paid_date"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: varchar("client_phone", { length: 20 }),
  description: text("description"),
  notes: text("notes"),
  invoiceId: varchar("invoice_id"),
  metadata: jsonb("metadata").default({}),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_re_commissions_tenant").on(table.tenantId),
  index("idx_re_commissions_agent").on(table.agentId),
  index("idx_re_commissions_status").on(table.status),
  index("idx_re_commissions_listing").on(table.listingId),
]);

// Insert schemas for Real Estate
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRealEstateLeadSchema = createInsertSchema(realEstateLeads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiteVisitSchema = createInsertSchema(siteVisits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRealEstateCommissionSchema = createInsertSchema(realEstateCommissions).omit({ id: true, createdAt: true, updatedAt: true });

// Real Estate types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type RealEstateLead = typeof realEstateLeads.$inferSelect;
export type InsertRealEstateLead = z.infer<typeof insertRealEstateLeadSchema>;

export type SiteVisit = typeof siteVisits.$inferSelect;
export type InsertSiteVisit = z.infer<typeof insertSiteVisitSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type RealEstateCommission = typeof realEstateCommissions.$inferSelect;
export type InsertRealEstateCommission = z.infer<typeof insertRealEstateCommissionSchema>;

// ============================================
// TOURISM MODULE
// ============================================

// Enums for Tourism
export const tourPackageTypeEnum = pgEnum("tour_package_type", [
  "domestic", "international", "adventure", "pilgrimage", "honeymoon", "family", "group", "corporate", "custom"
]);

export const tourPackageStatusEnum = pgEnum("tour_package_status", [
  "draft", "active", "paused", "expired", "archived"
]);

export const tourBookingStatusEnum = pgEnum("tour_booking_status", [
  "inquiry", "pending", "confirmed", "partial_paid", "paid", "in_progress", "completed", "cancelled", "refunded"
]);

export const itineraryDayStatusEnum = pgEnum("itinerary_day_status", [
  "planned", "confirmed", "in_progress", "completed", "skipped"
]);

export const vendorTypeEnum = pgEnum("vendor_type", [
  "hotel", "transport", "airline", "restaurant", "activity", "guide", "insurance", "visa", "other"
]);

export const vendorStatusEnum = pgEnum("vendor_status", ["active", "inactive", "blacklisted"]);

export const travelerTypeEnum = pgEnum("traveler_type", ["adult", "child", "infant"]);

// Tour Packages Table
export const tourPackages = pgTable("tour_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  packageType: tourPackageTypeEnum("package_type").default("domestic"),
  status: tourPackageStatusEnum("status").default("draft"),
  description: text("description"),
  highlights: jsonb("highlights").default([]),
  inclusions: jsonb("inclusions").default([]),
  exclusions: jsonb("exclusions").default([]),
  destinations: jsonb("destinations").default([]),
  duration: integer("duration").notNull(),
  durationUnit: varchar("duration_unit", { length: 20 }).default("days"),
  nights: integer("nights"),
  basePrice: decimal("base_price", { precision: 15, scale: 2 }).notNull(),
  childPrice: decimal("child_price", { precision: 15, scale: 2 }),
  infantPrice: decimal("infant_price", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  minGroupSize: integer("min_group_size").default(1),
  maxGroupSize: integer("max_group_size"),
  departureCity: varchar("departure_city", { length: 100 }),
  departureDates: jsonb("departure_dates").default([]),
  isCustomizable: boolean("is_customizable").default(false),
  isFeatured: boolean("is_featured").default(false),
  images: jsonb("images").default([]),
  documents: jsonb("documents").default([]),
  termsAndConditions: text("terms_and_conditions"),
  cancellationPolicy: text("cancellation_policy"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  viewCount: integer("view_count").default(0),
  bookingCount: integer("booking_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tour_packages_tenant").on(table.tenantId),
  index("idx_tour_packages_status").on(table.status),
  index("idx_tour_packages_type").on(table.packageType),
  index("idx_tour_packages_featured").on(table.isFeatured),
]);

// Tour Bookings Table
export const tourBookings = pgTable("tour_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bookingNumber: varchar("booking_number", { length: 50 }).notNull(),
  packageId: varchar("package_id").references(() => tourPackages.id, { onDelete: "set null" }),
  customerId: varchar("customer_id"),
  status: tourBookingStatusEnum("status").default("inquiry"),
  departureDate: date("departure_date").notNull(),
  returnDate: date("return_date"),
  adults: integer("adults").default(1),
  children: integer("children").default(0),
  infants: integer("infants").default(0),
  baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  paymentDueDate: date("payment_due_date"),
  specialRequests: text("special_requests"),
  dietaryPreferences: jsonb("dietary_preferences").default([]),
  emergencyContact: jsonb("emergency_contact").default({}),
  pickupDetails: jsonb("pickup_details").default({}),
  assignedAgentId: varchar("assigned_agent_id"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tour_bookings_tenant").on(table.tenantId),
  index("idx_tour_bookings_package").on(table.packageId),
  index("idx_tour_bookings_customer").on(table.customerId),
  index("idx_tour_bookings_status").on(table.status),
  index("idx_tour_bookings_departure").on(table.departureDate),
  uniqueIndex("idx_tour_bookings_number").on(table.tenantId, table.bookingNumber),
]);

// Itineraries Table
export const itineraries = pgTable("itineraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").references(() => tourPackages.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").references(() => tourBookings.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: itineraryDayStatusEnum("status").default("planned"),
  date: date("date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  location: text("location"),
  city: varchar("city", { length: 100 }),
  accommodation: jsonb("accommodation").default({}),
  meals: jsonb("meals").default([]),
  activities: jsonb("activities").default([]),
  transport: jsonb("transport").default({}),
  vendorIds: jsonb("vendor_ids").default([]),
  notes: text("notes"),
  images: jsonb("images").default([]),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_itineraries_tenant").on(table.tenantId),
  index("idx_itineraries_package").on(table.packageId),
  index("idx_itineraries_booking").on(table.bookingId),
  index("idx_itineraries_day").on(table.dayNumber),
]);

// Vendors Table
export const tourVendors = pgTable("tour_vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  vendorType: vendorTypeEnum("vendor_type").notNull(),
  status: vendorStatusEnum("status").default("active"),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  contactPerson: text("contact_person"),
  contactDesignation: varchar("contact_designation", { length: 100 }),
  gstNumber: varchar("gst_number", { length: 50 }),
  panNumber: varchar("pan_number", { length: 20 }),
  bankDetails: jsonb("bank_details").default({}),
  serviceAreas: jsonb("service_areas").default([]),
  services: jsonb("services").default([]),
  pricing: jsonb("pricing").default({}),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  paymentTerms: text("payment_terms"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  totalBookings: integer("total_bookings").default(0),
  documents: jsonb("documents").default([]),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tour_vendors_tenant").on(table.tenantId),
  index("idx_tour_vendors_type").on(table.vendorType),
  index("idx_tour_vendors_status").on(table.status),
  index("idx_tour_vendors_city").on(table.city),
]);

// Travelers Table
export const travelers = pgTable("travelers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").notNull().references(() => tourBookings.id, { onDelete: "cascade" }),
  travelerType: travelerTypeEnum("traveler_type").default("adult"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  nationality: varchar("nationality", { length: 100 }),
  passportNumber: varchar("passport_number", { length: 50 }),
  passportExpiry: date("passport_expiry"),
  passportCountry: varchar("passport_country", { length: 100 }),
  visaNumber: varchar("visa_number", { length: 100 }),
  visaExpiry: date("visa_expiry"),
  idType: varchar("id_type", { length: 50 }),
  idNumber: varchar("id_number", { length: 100 }),
  dietaryPreferences: jsonb("dietary_preferences").default([]),
  medicalConditions: text("medical_conditions"),
  specialAssistance: text("special_assistance"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }),
  roomPreference: varchar("room_preference", { length: 50 }),
  seatPreference: varchar("seat_preference", { length: 50 }),
  isPrimary: boolean("is_primary").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_travelers_tenant").on(table.tenantId),
  index("idx_travelers_booking").on(table.bookingId),
  index("idx_travelers_type").on(table.travelerType),
]);

// Insert schemas for Tourism
export const insertTourPackageSchema = createInsertSchema(tourPackages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTourBookingSchema = createInsertSchema(tourBookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertItinerarySchema = createInsertSchema(itineraries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTourVendorSchema = createInsertSchema(tourVendors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTravelerSchema = createInsertSchema(travelers).omit({ id: true, createdAt: true, updatedAt: true });

// Tourism types
export type TourPackage = typeof tourPackages.$inferSelect;
export type InsertTourPackage = z.infer<typeof insertTourPackageSchema>;

export type TourBooking = typeof tourBookings.$inferSelect;
export type InsertTourBooking = z.infer<typeof insertTourBookingSchema>;

export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;

export type TourVendor = typeof tourVendors.$inferSelect;
export type InsertTourVendor = z.infer<typeof insertTourVendorSchema>;

export type Traveler = typeof travelers.$inferSelect;
export type InsertTraveler = z.infer<typeof insertTravelerSchema>;

// Extended types for joins
export type BookingWithDetails = Booking & {
  customer: Customer;
  service: Service;
  staff: Staff | null;
};

export type UserTenantWithDetails = UserTenant & {
  tenant: Tenant;
  role: Role;
};

export type RoleWithPermissions = Role & {
  rolePermissions: (RolePermission & { permission: Permission })[];
};

// Request context type for middleware
export type RequestContext = {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  tenant: Tenant | null;
  role: Role | null;
  permissions: string[];
  features: string[];
};

// ============================================
// EDUCATION MODULE
// ============================================

export const studentStatusEnum = pgEnum("student_status", ["active", "inactive", "graduated", "withdrawn", "suspended"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "active", "archived"]);
export const batchStatusEnum = pgEnum("batch_status", ["upcoming", "ongoing", "completed", "cancelled"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "excused"]);
export const examStatusEnum = pgEnum("exam_status", ["scheduled", "ongoing", "completed", "cancelled"]);
export const feeStatusEnum = pgEnum("fee_status", ["pending", "partial", "paid", "overdue", "waived"]);

// Students Table
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  
  // Academic Information
  enrollmentNumber: varchar("enrollment_number", { length: 50 }),
  enrollmentDate: date("enrollment_date"),
  currentBatchId: varchar("current_batch_id"),
  status: studentStatusEnum("status").default("active"),
  
  // Guardian Information
  guardianName: text("guardian_name"),
  guardianPhone: varchar("guardian_phone", { length: 20 }),
  guardianEmail: text("guardian_email"),
  guardianRelation: varchar("guardian_relation", { length: 50 }),
  
  // Additional
  profileImageUrl: text("profile_image_url"),
  bloodGroup: varchar("blood_group", { length: 10 }),
  medicalNotes: text("medical_notes"),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_students_tenant").on(table.tenantId),
  index("idx_students_tenant_status").on(table.tenantId, table.status),
  index("idx_students_enrollment").on(table.enrollmentNumber),
  index("idx_students_batch").on(table.currentBatchId),
]);

// Courses Table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  
  // Duration
  durationValue: integer("duration_value"),
  durationUnit: varchar("duration_unit", { length: 20 }).default("months"),
  
  // Fees
  baseFee: decimal("base_fee", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  // Course Details
  syllabus: jsonb("syllabus").default([]),
  prerequisites: jsonb("prerequisites").default([]),
  objectives: jsonb("objectives").default([]),
  maxStudents: integer("max_students"),
  minStudents: integer("min_students"),
  
  status: courseStatusEnum("status").default("active"),
  isActive: boolean("is_active").default(true),
  
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_courses_tenant").on(table.tenantId),
  index("idx_courses_tenant_status").on(table.tenantId, table.status),
  index("idx_courses_code").on(table.code),
  index("idx_courses_category").on(table.category),
]);

// Batches Table
export const batches = pgTable("batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  
  // Schedule
  startDate: date("start_date"),
  endDate: date("end_date"),
  schedule: jsonb("schedule").default({}),
  
  // Capacity
  maxStudents: integer("max_students"),
  currentStudentCount: integer("current_student_count").default(0),
  
  // Instructor
  instructorId: varchar("instructor_id"),
  instructorName: text("instructor_name"),
  
  // Location
  room: varchar("room", { length: 100 }),
  venue: text("venue"),
  isOnline: boolean("is_online").default(false),
  meetingLink: text("meeting_link"),
  
  status: batchStatusEnum("status").default("upcoming"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_batches_tenant").on(table.tenantId),
  index("idx_batches_tenant_status").on(table.tenantId, table.status),
  index("idx_batches_course").on(table.courseId),
  index("idx_batches_dates").on(table.startDate, table.endDate),
]);

// Batch Students (Many-to-Many)
export const batchStudents = pgTable("batch_students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("active"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_batch_students_tenant").on(table.tenantId),
  index("idx_batch_students_batch").on(table.batchId),
  index("idx_batch_students_student").on(table.studentId),
  uniqueIndex("idx_batch_students_unique").on(table.batchId, table.studentId),
]);

// Attendance Table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  
  date: date("date").notNull(),
  status: attendanceStatusEnum("status").default("present"),
  
  checkInTime: time("check_in_time"),
  checkOutTime: time("check_out_time"),
  
  remarks: text("remarks"),
  markedBy: varchar("marked_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_attendance_tenant").on(table.tenantId),
  index("idx_attendance_tenant_status").on(table.tenantId, table.status),
  index("idx_attendance_batch").on(table.batchId),
  index("idx_attendance_student").on(table.studentId),
  index("idx_attendance_date").on(table.date),
  uniqueIndex("idx_attendance_unique").on(table.batchId, table.studentId, table.date),
]);

// Exams Table
export const exams = pgTable("exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  batchId: varchar("batch_id").references(() => batches.id, { onDelete: "set null" }),
  
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  examType: varchar("exam_type", { length: 50 }).default("written"),
  
  // Schedule
  examDate: date("exam_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  duration: integer("duration"),
  
  // Scoring
  totalMarks: decimal("total_marks", { precision: 8, scale: 2 }),
  passingMarks: decimal("passing_marks", { precision: 8, scale: 2 }),
  
  // Location
  venue: text("venue"),
  room: varchar("room", { length: 100 }),
  
  instructions: text("instructions"),
  syllabusCovered: jsonb("syllabus_covered").default([]),
  
  status: examStatusEnum("status").default("scheduled"),
  
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_exams_tenant").on(table.tenantId),
  index("idx_exams_tenant_status").on(table.tenantId, table.status),
  index("idx_exams_course").on(table.courseId),
  index("idx_exams_batch").on(table.batchId),
  index("idx_exams_date").on(table.examDate),
]);

// Exam Results Table
export const examResults = pgTable("exam_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  examId: varchar("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  
  marksObtained: decimal("marks_obtained", { precision: 8, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  grade: varchar("grade", { length: 10 }),
  rank: integer("rank"),
  
  isPassed: boolean("is_passed"),
  remarks: text("remarks"),
  
  evaluatedBy: varchar("evaluated_by"),
  evaluatedAt: timestamp("evaluated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_exam_results_tenant").on(table.tenantId),
  index("idx_exam_results_exam").on(table.examId),
  index("idx_exam_results_student").on(table.studentId),
  uniqueIndex("idx_exam_results_unique").on(table.examId, table.studentId),
]);

// Fees Table
export const fees = pgTable("fees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  batchId: varchar("batch_id").references(() => batches.id, { onDelete: "set null" }),
  
  feeType: varchar("fee_type", { length: 50 }).default("tuition"),
  description: text("description"),
  
  // Amounts
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }),
  
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  // Due Date
  dueDate: date("due_date"),
  
  // Installment
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  
  status: feeStatusEnum("status").default("pending"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_fees_tenant").on(table.tenantId),
  index("idx_fees_tenant_status").on(table.tenantId, table.status),
  index("idx_fees_student").on(table.studentId),
  index("idx_fees_course").on(table.courseId),
  index("idx_fees_due_date").on(table.dueDate),
]);

// Fee Payments Table
export const feePayments = pgTable("fee_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  feeId: varchar("fee_id").notNull().references(() => fees.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("cash"),
  
  transactionId: varchar("transaction_id", { length: 100 }),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  
  notes: text("notes"),
  receivedBy: varchar("received_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_fee_payments_tenant").on(table.tenantId),
  index("idx_fee_payments_fee").on(table.feeId),
  index("idx_fee_payments_student").on(table.studentId),
  index("idx_fee_payments_date").on(table.paymentDate),
]);

// Insert schemas for Education
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertBatchSchema = createInsertSchema(batches).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertBatchStudentSchema = createInsertSchema(batchStudents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertExamResultSchema = createInsertSchema(examResults).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeeSchema = createInsertSchema(fees).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertFeePaymentSchema = createInsertSchema(feePayments).omit({ id: true, createdAt: true, updatedAt: true });

// Education types
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;

export type BatchStudent = typeof batchStudents.$inferSelect;
export type InsertBatchStudent = z.infer<typeof insertBatchStudentSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;

export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = z.infer<typeof insertExamResultSchema>;

export type Fee = typeof fees.$inferSelect;
export type InsertFee = z.infer<typeof insertFeeSchema>;

export type FeePayment = typeof feePayments.$inferSelect;
export type InsertFeePayment = z.infer<typeof insertFeePaymentSchema>;

// ============================================
// LOGISTICS & FLEET MODULE
// ============================================

export const vehicleStatusEnum = pgEnum("vehicle_status", ["active", "inactive", "maintenance", "retired"]);
export const driverStatusEnum = pgEnum("driver_status", ["available", "on_trip", "off_duty", "suspended", "terminated"]);
export const tripStatusEnum = pgEnum("trip_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const shipmentStatusEnum = pgEnum("shipment_status", ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "returned"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["scheduled", "in_progress", "completed", "cancelled"]);
export const maintenanceTypeEnum = pgEnum("maintenance_type", ["preventive", "corrective", "emergency", "inspection"]);

// Vehicles Table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Vehicle Details
  registrationNumber: varchar("registration_number", { length: 50 }).notNull(),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: integer("year"),
  color: varchar("color", { length: 50 }),
  vin: varchar("vin", { length: 50 }),
  
  // Capacity
  loadCapacity: decimal("load_capacity", { precision: 10, scale: 2 }),
  loadCapacityUnit: varchar("load_capacity_unit", { length: 20 }).default("kg"),
  volumeCapacity: decimal("volume_capacity", { precision: 10, scale: 2 }),
  volumeCapacityUnit: varchar("volume_capacity_unit", { length: 20 }).default("cubic_m"),
  passengerCapacity: integer("passenger_capacity"),
  
  // Fuel
  fuelType: varchar("fuel_type", { length: 30 }),
  fuelCapacity: decimal("fuel_capacity", { precision: 8, scale: 2 }),
  mileage: decimal("mileage", { precision: 8, scale: 2 }),
  currentOdometer: decimal("current_odometer", { precision: 12, scale: 2 }),
  
  // Insurance & Documents
  insuranceNumber: varchar("insurance_number", { length: 100 }),
  insuranceExpiry: date("insurance_expiry"),
  registrationExpiry: date("registration_expiry"),
  fitnessExpiry: date("fitness_expiry"),
  permitExpiry: date("permit_expiry"),
  
  // GPS / Location (optional)
  lastLatitude: decimal("last_latitude", { precision: 10, scale: 7 }),
  lastLongitude: decimal("last_longitude", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  gpsDeviceId: varchar("gps_device_id", { length: 100 }),
  
  // Assignment
  assignedDriverId: varchar("assigned_driver_id"),
  
  status: vehicleStatusEnum("status").default("active"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_vehicles_tenant").on(table.tenantId),
  index("idx_vehicles_tenant_status").on(table.tenantId, table.status),
  index("idx_vehicles_registration").on(table.registrationNumber),
  index("idx_vehicles_type").on(table.vehicleType),
]);

// Drivers Table
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  
  // License Details
  licenseNumber: varchar("license_number", { length: 50 }),
  licenseType: varchar("license_type", { length: 30 }),
  licenseExpiry: date("license_expiry"),
  licenseState: varchar("license_state", { length: 100 }),
  
  // Employment
  employeeId: varchar("employee_id", { length: 50 }),
  joiningDate: date("joining_date"),
  salary: decimal("salary", { precision: 12, scale: 2 }),
  salaryCurrency: varchar("salary_currency", { length: 10 }).default("INR"),
  
  // Emergency Contact
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }),
  
  // GPS / Location (optional)
  lastLatitude: decimal("last_latitude", { precision: 10, scale: 7 }),
  lastLongitude: decimal("last_longitude", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  
  // Assigned Vehicle
  assignedVehicleId: varchar("assigned_vehicle_id"),
  
  status: driverStatusEnum("status").default("available"),
  
  profileImageUrl: text("profile_image_url"),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  totalTrips: integer("total_trips").default(0),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_drivers_tenant").on(table.tenantId),
  index("idx_drivers_tenant_status").on(table.tenantId, table.status),
  index("idx_drivers_license").on(table.licenseNumber),
  index("idx_drivers_employee").on(table.employeeId),
]);

// Trips Table
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  driverId: varchar("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  
  tripNumber: varchar("trip_number", { length: 50 }),
  tripType: varchar("trip_type", { length: 50 }),
  
  // Origin
  originAddress: text("origin_address"),
  originCity: varchar("origin_city", { length: 100 }),
  originState: varchar("origin_state", { length: 100 }),
  originLatitude: decimal("origin_latitude", { precision: 10, scale: 7 }),
  originLongitude: decimal("origin_longitude", { precision: 10, scale: 7 }),
  
  // Destination
  destinationAddress: text("destination_address"),
  destinationCity: varchar("destination_city", { length: 100 }),
  destinationState: varchar("destination_state", { length: 100 }),
  destinationLatitude: decimal("destination_latitude", { precision: 10, scale: 7 }),
  destinationLongitude: decimal("destination_longitude", { precision: 10, scale: 7 }),
  
  // Schedule
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // Distance & Fuel
  estimatedDistance: decimal("estimated_distance", { precision: 10, scale: 2 }),
  actualDistance: decimal("actual_distance", { precision: 10, scale: 2 }),
  distanceUnit: varchar("distance_unit", { length: 10 }).default("km"),
  fuelConsumed: decimal("fuel_consumed", { precision: 10, scale: 2 }),
  
  // Current Location (for tracking)
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }),
  currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  
  // Waypoints
  waypoints: jsonb("waypoints").default([]),
  
  status: tripStatusEnum("status").default("scheduled"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_trips_tenant").on(table.tenantId),
  index("idx_trips_tenant_status").on(table.tenantId, table.status),
  index("idx_trips_vehicle").on(table.vehicleId),
  index("idx_trips_driver").on(table.driverId),
  index("idx_trips_number").on(table.tripNumber),
  index("idx_trips_scheduled").on(table.scheduledStartTime),
]);

// Shipments Table
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tripId: varchar("trip_id").references(() => trips.id, { onDelete: "set null" }),
  
  // Tracking
  trackingNumber: varchar("tracking_number", { length: 100 }),
  awbNumber: varchar("awb_number", { length: 100 }),
  
  // Sender
  senderName: text("sender_name"),
  senderPhone: varchar("sender_phone", { length: 20 }),
  senderEmail: text("sender_email"),
  senderAddress: text("sender_address"),
  senderCity: varchar("sender_city", { length: 100 }),
  senderState: varchar("sender_state", { length: 100 }),
  senderPostalCode: varchar("sender_postal_code", { length: 20 }),
  senderLatitude: decimal("sender_latitude", { precision: 10, scale: 7 }),
  senderLongitude: decimal("sender_longitude", { precision: 10, scale: 7 }),
  
  // Receiver
  receiverName: text("receiver_name"),
  receiverPhone: varchar("receiver_phone", { length: 20 }),
  receiverEmail: text("receiver_email"),
  receiverAddress: text("receiver_address"),
  receiverCity: varchar("receiver_city", { length: 100 }),
  receiverState: varchar("receiver_state", { length: 100 }),
  receiverPostalCode: varchar("receiver_postal_code", { length: 20 }),
  receiverLatitude: decimal("receiver_latitude", { precision: 10, scale: 7 }),
  receiverLongitude: decimal("receiver_longitude", { precision: 10, scale: 7 }),
  
  // Package Details
  packageType: varchar("package_type", { length: 50 }),
  packageCount: integer("package_count").default(1),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
  dimensions: jsonb("dimensions").default({}),
  declaredValue: decimal("declared_value", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  contents: text("contents"),
  specialInstructions: text("special_instructions"),
  
  // Charges
  freightCharges: decimal("freight_charges", { precision: 12, scale: 2 }),
  insuranceCharges: decimal("insurance_charges", { precision: 12, scale: 2 }),
  handlingCharges: decimal("handling_charges", { precision: 12, scale: 2 }),
  totalCharges: decimal("total_charges", { precision: 12, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  paymentMethod: varchar("payment_method", { length: 30 }),
  
  // Schedule
  pickupDate: date("pickup_date"),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  
  // Current Location (for tracking)
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 7 }),
  currentLongitude: decimal("current_longitude", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("last_location_update"),
  currentLocation: text("current_location"),
  
  // Proof of Delivery
  deliveredTo: text("delivered_to"),
  deliverySignature: text("delivery_signature"),
  deliveryPhoto: text("delivery_photo"),
  
  status: shipmentStatusEnum("status").default("pending"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_shipments_tenant").on(table.tenantId),
  index("idx_shipments_tenant_status").on(table.tenantId, table.status),
  index("idx_shipments_tracking").on(table.trackingNumber),
  index("idx_shipments_awb").on(table.awbNumber),
  index("idx_shipments_trip").on(table.tripId),
  index("idx_shipments_pickup_date").on(table.pickupDate),
]);

// Maintenance Logs Table
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  
  // Maintenance Details
  maintenanceType: maintenanceTypeEnum("maintenance_type").default("preventive"),
  title: text("title").notNull(),
  description: text("description"),
  
  // Schedule
  scheduledDate: date("scheduled_date"),
  startDate: date("start_date"),
  completionDate: date("completion_date"),
  
  // Odometer
  odometerReading: decimal("odometer_reading", { precision: 12, scale: 2 }),
  
  // Service Provider
  serviceProvider: text("service_provider"),
  serviceProviderContact: varchar("service_provider_contact", { length: 20 }),
  serviceLocation: text("service_location"),
  
  // Costs
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }),
  partsCost: decimal("parts_cost", { precision: 12, scale: 2 }),
  otherCost: decimal("other_cost", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  // Parts
  partsReplaced: jsonb("parts_replaced").default([]),
  
  // Next Service
  nextServiceDate: date("next_service_date"),
  nextServiceOdometer: decimal("next_service_odometer", { precision: 12, scale: 2 }),
  
  status: maintenanceStatusEnum("status").default("scheduled"),
  
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  attachments: jsonb("attachments").default([]),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_maintenance_tenant").on(table.tenantId),
  index("idx_maintenance_tenant_status").on(table.tenantId, table.status),
  index("idx_maintenance_vehicle").on(table.vehicleId),
  index("idx_maintenance_type").on(table.maintenanceType),
  index("idx_maintenance_scheduled").on(table.scheduledDate),
]);

// Insert schemas for Logistics
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });

// Logistics types
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;

export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;

// Route Optimization AI Tables
export const routeOptimizationStatusEnum = pgEnum("route_optimization_status", ["pending", "processing", "completed", "failed", "expired"]);

export const routeOptimizationJobs = pgTable("route_optimization_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Optional references
  shipmentId: varchar("shipment_id").references(() => shipments.id, { onDelete: "set null" }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  tripId: varchar("trip_id").references(() => trips.id, { onDelete: "set null" }),
  
  // Input data
  pickupLocation: jsonb("pickup_location").notNull(), // { lat, lng, address }
  dropOffLocations: jsonb("drop_off_locations").notNull(), // [{ lat, lng, address, order? }]
  vehicleCapacity: decimal("vehicle_capacity", { precision: 12, scale: 2 }),
  capacityUnit: varchar("capacity_unit", { length: 20 }).default("kg"),
  deliveryWindowStart: timestamp("delivery_window_start"),
  deliveryWindowEnd: timestamp("delivery_window_end"),
  trafficData: jsonb("traffic_data"), // Optional traffic snapshot
  
  // AI Output
  optimizedRoute: jsonb("optimized_route"), // { waypoints: [], totalDistance, totalDuration }
  etaMinutes: integer("eta_minutes"),
  distanceKm: decimal("distance_km", { precision: 12, scale: 2 }),
  costEstimate: decimal("cost_estimate", { precision: 12, scale: 2 }),
  costBreakdown: jsonb("cost_breakdown"), // { distanceCost, timeCost, trafficSurcharge }
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  // AI metadata
  aiGenerated: boolean("ai_generated").default(false),
  aiModel: varchar("ai_model", { length: 100 }),
  consentVersion: varchar("consent_version", { length: 20 }),
  usageLogId: varchar("usage_log_id"),
  cacheKey: varchar("cache_key", { length: 64 }),
  cacheHit: boolean("cache_hit").default(false),
  
  // Manual override
  isOverridden: boolean("is_overridden").default(false),
  overrideRoute: jsonb("override_route"),
  overrideEtaMinutes: integer("override_eta_minutes"),
  overrideCostEstimate: decimal("override_cost_estimate", { precision: 12, scale: 2 }),
  overrideReason: text("override_reason"),
  overriddenBy: varchar("overridden_by"),
  overriddenAt: timestamp("overridden_at"),
  
  status: routeOptimizationStatusEnum("status").default("pending"),
  errorMessage: text("error_message"),
  
  requestedBy: varchar("requested_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_route_opt_tenant").on(table.tenantId),
  index("idx_route_opt_tenant_status").on(table.tenantId, table.status),
  index("idx_route_opt_shipment").on(table.shipmentId),
  index("idx_route_opt_vehicle").on(table.vehicleId),
  index("idx_route_opt_cache_key").on(table.cacheKey),
]);

export const routeOptimizationCache = pgTable("route_optimization_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  cacheKey: varchar("cache_key", { length: 64 }).notNull(),
  requestPayloadHash: varchar("request_payload_hash", { length: 64 }).notNull(),
  
  // Cached response
  responsePayload: jsonb("response_payload").notNull(),
  etaMinutes: integer("eta_minutes"),
  costEstimate: decimal("cost_estimate", { precision: 12, scale: 2 }),
  distanceKm: decimal("distance_km", { precision: 12, scale: 2 }),
  
  // Traffic context for invalidation
  hasTrafficData: boolean("has_traffic_data").default(false),
  trafficContextHash: varchar("traffic_context_hash", { length: 64 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  hitCount: integer("hit_count").default(0),
}, (table) => [
  index("idx_route_cache_tenant").on(table.tenantId),
  index("idx_route_cache_key").on(table.tenantId, table.cacheKey),
  index("idx_route_cache_expires").on(table.expiresAt),
]);

export const insertRouteOptimizationJobSchema = createInsertSchema(routeOptimizationJobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRouteOptimizationCacheSchema = createInsertSchema(routeOptimizationCache).omit({ id: true, createdAt: true });

export type RouteOptimizationJob = typeof routeOptimizationJobs.$inferSelect;
export type InsertRouteOptimizationJob = z.infer<typeof insertRouteOptimizationJobSchema>;
export type RouteOptimizationCache = typeof routeOptimizationCache.$inferSelect;
export type InsertRouteOptimizationCache = z.infer<typeof insertRouteOptimizationCacheSchema>;

// ============================================
// LEGAL & CONSULTING MODULE
// ============================================

export const legalClientStatusEnum = pgEnum("legal_client_status", ["active", "inactive", "prospect", "archived"]);
export const legalClientTypeEnum = pgEnum("legal_client_type", ["individual", "corporate", "government", "nonprofit"]);
export const caseStatusEnum = pgEnum("case_status", ["open", "in_progress", "on_hold", "closed", "won", "lost", "settled"]);
export const casePriorityEnum = pgEnum("case_priority", ["low", "medium", "high", "urgent"]);
export const legalAppointmentStatusEnum = pgEnum("legal_appointment_status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]);
export const documentConfidentialityEnum = pgEnum("document_confidentiality", ["public", "internal", "confidential", "privileged", "highly_restricted"]);
export const legalInvoiceStatusEnum = pgEnum("legal_invoice_status", ["draft", "pending", "sent", "partial", "paid", "overdue", "cancelled", "written_off"]);

// Legal Clients Table
export const legalClients = pgTable("legal_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Client Type
  clientType: legalClientTypeEnum("client_type").default("individual"),
  
  // Individual Details
  firstName: text("first_name"),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  
  // Corporate Details
  companyName: text("company_name"),
  registrationNumber: varchar("registration_number", { length: 100 }),
  taxId: varchar("tax_id", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  
  // Contact Information
  email: text("email"),
  phone: varchar("phone", { length: 20 }),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  
  // Primary Contact (for corporate clients)
  primaryContactName: text("primary_contact_name"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactPhone: varchar("primary_contact_phone", { length: 20 }),
  primaryContactDesignation: varchar("primary_contact_designation", { length: 100 }),
  
  // KYC / Verification (confidentiality-safe: minimal PII storage)
  isKycVerified: boolean("is_kyc_verified").default(false),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  kycVerifiedBy: varchar("kyc_verified_by"),
  
  // Conflict Check
  conflictCheckCompleted: boolean("conflict_check_completed").default(false),
  conflictCheckDate: date("conflict_check_date"),
  conflictCheckNotes: text("conflict_check_notes"),
  
  // Referral
  referralSource: varchar("referral_source", { length: 100 }),
  referredBy: varchar("referred_by", { length: 100 }),
  
  status: legalClientStatusEnum("status").default("active"),
  
  // Billing
  defaultBillingRate: decimal("default_billing_rate", { precision: 12, scale: 2 }),
  billingCurrency: varchar("billing_currency", { length: 10 }).default("INR"),
  paymentTerms: varchar("payment_terms", { length: 50 }).default("net_30"),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  
  // Audit Trail
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_legal_clients_tenant").on(table.tenantId),
  index("idx_legal_clients_tenant_status").on(table.tenantId, table.status),
  index("idx_legal_clients_type").on(table.clientType),
  index("idx_legal_clients_email").on(table.email),
  index("idx_legal_clients_company").on(table.companyName),
]);

// Cases Table
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => legalClients.id, { onDelete: "cascade" }),
  
  // Case Identification
  caseNumber: varchar("case_number", { length: 100 }),
  title: text("title").notNull(),
  description: text("description"),
  
  // Case Classification
  practiceArea: varchar("practice_area", { length: 100 }),
  caseType: varchar("case_type", { length: 100 }),
  subType: varchar("sub_type", { length: 100 }),
  
  // Court / Tribunal Details
  courtName: text("court_name"),
  courtCaseNumber: varchar("court_case_number", { length: 100 }),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  judge: text("judge"),
  
  // Dates
  filingDate: date("filing_date"),
  openDate: date("open_date"),
  closeDate: date("close_date"),
  nextHearingDate: date("next_hearing_date"),
  statuteOfLimitations: date("statute_of_limitations"),
  
  // Opposing Party (stored securely)
  opposingPartyName: text("opposing_party_name"),
  opposingCounsel: text("opposing_counsel"),
  opposingCounselFirm: text("opposing_counsel_firm"),
  opposingCounselContact: varchar("opposing_counsel_contact", { length: 100 }),
  
  // Team Assignment
  leadAttorneyId: varchar("lead_attorney_id"),
  leadAttorneyName: text("lead_attorney_name"),
  assignedTeam: jsonb("assigned_team").default([]),
  
  // Financial
  estimatedValue: decimal("estimated_value", { precision: 15, scale: 2 }),
  contingencyPercentage: decimal("contingency_percentage", { precision: 5, scale: 2 }),
  retainerAmount: decimal("retainer_amount", { precision: 12, scale: 2 }),
  billingType: varchar("billing_type", { length: 30 }).default("hourly"),
  hourlyRate: decimal("hourly_rate", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  status: caseStatusEnum("status").default("open"),
  priority: casePriorityEnum("priority").default("medium"),
  
  // Confidentiality
  confidentialityLevel: documentConfidentialityEnum("confidentiality_level").default("confidential"),
  isPrivileged: boolean("is_privileged").default(true),
  
  // Tags and Categories
  tags: jsonb("tags").default([]),
  
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  
  // Audit Trail
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_cases_tenant").on(table.tenantId),
  index("idx_cases_tenant_status").on(table.tenantId, table.status),
  index("idx_cases_client").on(table.clientId),
  index("idx_cases_number").on(table.caseNumber),
  index("idx_cases_practice_area").on(table.practiceArea),
  index("idx_cases_lead_attorney").on(table.leadAttorneyId),
  index("idx_cases_next_hearing").on(table.nextHearingDate),
]);

// Legal Appointments Table
export const legalAppointments = pgTable("legal_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => legalClients.id, { onDelete: "set null" }),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  
  // Appointment Details
  title: text("title").notNull(),
  description: text("description"),
  appointmentType: varchar("appointment_type", { length: 50 }).default("consultation"),
  
  // Schedule
  scheduledDate: date("scheduled_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  duration: integer("duration"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Kolkata"),
  
  // Location
  location: text("location"),
  isVirtual: boolean("is_virtual").default(false),
  meetingLink: text("meeting_link"),
  
  // Attendees
  attendeeId: varchar("attendee_id"),
  attendeeName: text("attendee_name"),
  attendees: jsonb("attendees").default([]),
  
  // Billing
  isBillable: boolean("is_billable").default(true),
  billedAmount: decimal("billed_amount", { precision: 12, scale: 2 }),
  billedHours: decimal("billed_hours", { precision: 8, scale: 2 }),
  
  // Reminders
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  
  status: legalAppointmentStatusEnum("status").default("scheduled"),
  
  // Confidentiality
  confidentialityLevel: documentConfidentialityEnum("confidentiality_level").default("confidential"),
  
  notes: text("notes"),
  outcome: text("outcome"),
  metadata: jsonb("metadata").default({}),
  
  // Audit Trail
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_legal_appointments_tenant").on(table.tenantId),
  index("idx_legal_appointments_tenant_status").on(table.tenantId, table.status),
  index("idx_legal_appointments_client").on(table.clientId),
  index("idx_legal_appointments_case").on(table.caseId),
  index("idx_legal_appointments_date").on(table.scheduledDate),
  index("idx_legal_appointments_attendee").on(table.attendeeId),
]);

// Legal Documents Table
export const legalDocuments = pgTable("legal_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => legalClients.id, { onDelete: "set null" }),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  
  // Document Details
  title: text("title").notNull(),
  description: text("description"),
  documentType: varchar("document_type", { length: 100 }),
  documentCategory: varchar("document_category", { length: 100 }),
  
  // File Information
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Version Control
  version: integer("version").default(1),
  parentDocumentId: varchar("parent_document_id"),
  isLatestVersion: boolean("is_latest_version").default(true),
  
  // Confidentiality & Security
  confidentialityLevel: documentConfidentialityEnum("confidentiality_level").default("confidential"),
  isPrivileged: boolean("is_privileged").default(false),
  isAttorneyClientPrivilege: boolean("is_attorney_client_privilege").default(false),
  isWorkProduct: boolean("is_work_product").default(false),
  
  // Access Control
  accessRestrictions: jsonb("access_restrictions").default([]),
  allowedUsers: jsonb("allowed_users").default([]),
  
  // Execution Details
  isExecuted: boolean("is_executed").default(false),
  executedDate: date("executed_date"),
  executedBy: text("executed_by"),
  witnesses: jsonb("witnesses").default([]),
  
  // Expiry / Validity
  effectiveDate: date("effective_date"),
  expiryDate: date("expiry_date"),
  
  // Court Filing
  isFiledWithCourt: boolean("is_filed_with_court").default(false),
  courtFilingDate: date("court_filing_date"),
  courtFilingNumber: varchar("court_filing_number", { length: 100 }),
  
  // Review Status
  reviewStatus: varchar("review_status", { length: 50 }).default("pending"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  
  // Audit Trail
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_legal_documents_tenant").on(table.tenantId),
  index("idx_legal_documents_client").on(table.clientId),
  index("idx_legal_documents_case").on(table.caseId),
  index("idx_legal_documents_type").on(table.documentType),
  index("idx_legal_documents_confidentiality").on(table.confidentialityLevel),
  index("idx_legal_documents_parent").on(table.parentDocumentId),
]);

// Legal Invoices Table
export const legalInvoices = pgTable("legal_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => legalClients.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").references(() => cases.id, { onDelete: "set null" }),
  
  // Invoice Identification
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  
  // Billing Period
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("INR"),
  
  // Time Entries
  totalHours: decimal("total_hours", { precision: 10, scale: 2 }),
  timeEntries: jsonb("time_entries").default([]),
  
  // Expenses
  expenses: jsonb("expenses").default([]),
  
  // Trust Account
  trustAccountApplied: decimal("trust_account_applied", { precision: 15, scale: 2 }).default("0"),
  
  // Payment Details
  paymentTerms: varchar("payment_terms", { length: 50 }),
  paymentInstructions: text("payment_instructions"),
  lastPaymentDate: date("last_payment_date"),
  
  status: legalInvoiceStatusEnum("status").default("draft"),
  
  // Communication
  sentAt: timestamp("sent_at"),
  sentTo: text("sent_to"),
  viewedAt: timestamp("viewed_at"),
  
  // Reminders
  reminderCount: integer("reminder_count").default(0),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  termsAndConditions: text("terms_and_conditions"),
  metadata: jsonb("metadata").default({}),
  
  // Audit Trail
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_legal_invoices_tenant").on(table.tenantId),
  index("idx_legal_invoices_tenant_status").on(table.tenantId, table.status),
  index("idx_legal_invoices_client").on(table.clientId),
  index("idx_legal_invoices_case").on(table.caseId),
  index("idx_legal_invoices_number").on(table.invoiceNumber),
  index("idx_legal_invoices_date").on(table.invoiceDate),
  index("idx_legal_invoices_due_date").on(table.dueDate),
]);

// Case Activity Log (Audit Trail)
export const caseActivityLog = pgTable("case_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  
  // Activity Details
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  activityDescription: text("activity_description"),
  
  // Related Entities
  relatedDocumentId: varchar("related_document_id"),
  relatedAppointmentId: varchar("related_appointment_id"),
  relatedInvoiceId: varchar("related_invoice_id"),
  
  // Changes (for update activities)
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  changedFields: jsonb("changed_fields").default([]),
  
  // User Info
  performedBy: varchar("performed_by"),
  performedByName: text("performed_by_name"),
  performedByRole: varchar("performed_by_role", { length: 50 }),
  
  // IP / Access Info
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_case_activity_tenant").on(table.tenantId),
  index("idx_case_activity_case").on(table.caseId),
  index("idx_case_activity_type").on(table.activityType),
  index("idx_case_activity_date").on(table.createdAt),
  index("idx_case_activity_user").on(table.performedBy),
]);

// Insert schemas for Legal
export const insertLegalClientSchema = createInsertSchema(legalClients).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertLegalAppointmentSchema = createInsertSchema(legalAppointments).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertLegalInvoiceSchema = createInsertSchema(legalInvoices).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertCaseActivityLogSchema = createInsertSchema(caseActivityLog).omit({ id: true, createdAt: true });

// Legal types
export type LegalClient = typeof legalClients.$inferSelect;
export type InsertLegalClient = z.infer<typeof insertLegalClientSchema>;

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type LegalAppointment = typeof legalAppointments.$inferSelect;
export type InsertLegalAppointment = z.infer<typeof insertLegalAppointmentSchema>;

export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;

export type LegalInvoice = typeof legalInvoices.$inferSelect;
export type InsertLegalInvoice = z.infer<typeof insertLegalInvoiceSchema>;

export type CaseActivityLog = typeof caseActivityLog.$inferSelect;
export type InsertCaseActivityLog = z.infer<typeof insertCaseActivityLogSchema>;

// Case Notes
export const caseNotes = pgTable("case_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  
  // Note Content
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  noteType: varchar("note_type", { length: 50 }).default("general"), // general, hearing, client_meeting, research, strategy
  
  // Confidentiality
  isConfidential: boolean("is_confidential").default(false),
  isPrivileged: boolean("is_privileged").default(false), // Attorney-client privilege
  accessRestrictions: jsonb("access_restrictions").default([]),
  
  // Author Info
  createdBy: varchar("created_by").notNull(),
  createdByName: text("created_by_name"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_case_notes_tenant").on(table.tenantId),
  index("idx_case_notes_case").on(table.caseId),
]);

// Case Hearings
export const caseHearings = pgTable("case_hearings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  
  // Hearing Details
  hearingDate: timestamp("hearing_date").notNull(),
  hearingType: varchar("hearing_type", { length: 100 }), // motion, trial, pre-trial, settlement, etc.
  location: text("location"),
  courtroom: varchar("courtroom", { length: 50 }),
  judgeName: text("judge_name"),
  
  // Status
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, completed, postponed, cancelled
  
  // Outcome (after hearing)
  outcome: text("outcome"),
  outcomeNotes: text("outcome_notes"),
  nextSteps: jsonb("next_steps").default([]),
  
  // Attendees
  attendees: jsonb("attendees").default([]),
  
  // Documents
  relatedDocumentIds: jsonb("related_document_ids").default([]),
  
  // Confidentiality
  isConfidential: boolean("is_confidential").default(false),
  
  // Author Info
  createdBy: varchar("created_by").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_case_hearings_tenant").on(table.tenantId),
  index("idx_case_hearings_case").on(table.caseId),
  index("idx_case_hearings_date").on(table.hearingDate),
]);

// Case Summarization Jobs
export const caseSummaryJobs = pgTable("case_summary_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  
  // Job Status
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  
  // Input Snapshot Hash (for cache invalidation)
  inputSnapshotHash: varchar("input_snapshot_hash", { length: 64 }),
  
  // Source Material Counts (for audit)
  documentCount: integer("document_count").default(0),
  noteCount: integer("note_count").default(0),
  hearingCount: integer("hearing_count").default(0),
  
  // AI Generated Outputs
  caseSummary: text("case_summary"),
  timeline: jsonb("timeline").default([]), // Array of {date, event, description, significance}
  actionItems: jsonb("action_items").default([]), // Array of {item, priority, dueDate, assignee, status}
  keyFindings: jsonb("key_findings").default([]),
  riskFactors: jsonb("risk_factors").default([]),
  
  // AI Metadata
  aiGenerated: boolean("ai_generated").default(false),
  aiModel: varchar("ai_model", { length: 50 }),
  aiUsageLogId: varchar("ai_usage_log_id"),
  consentVersion: varchar("consent_version", { length: 20 }),
  promptHash: varchar("prompt_hash", { length: 64 }),
  responseHash: varchar("response_hash", { length: 64 }),
  
  // Error Handling
  errorMessage: text("error_message"),
  errorCode: varchar("error_code", { length: 50 }),
  
  // Cache
  cacheHit: boolean("cache_hit").default(false),
  
  // Requestor
  requestedBy: varchar("requested_by").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_case_summary_jobs_tenant").on(table.tenantId),
  index("idx_case_summary_jobs_case").on(table.caseId),
  index("idx_case_summary_jobs_status").on(table.status),
  index("idx_case_summary_jobs_hash").on(table.tenantId, table.caseId, table.inputSnapshotHash),
]);

// Insert schemas for Case Notes, Hearings, Summary Jobs
export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertCaseHearingSchema = createInsertSchema(caseHearings).omit({ id: true, createdAt: true, updatedAt: true, deletedAt: true });
export const insertCaseSummaryJobSchema = createInsertSchema(caseSummaryJobs).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });

// Types for Case Notes, Hearings, Summary Jobs
export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;

export type CaseHearing = typeof caseHearings.$inferSelect;
export type InsertCaseHearing = z.infer<typeof insertCaseHearingSchema>;

export type CaseSummaryJob = typeof caseSummaryJobs.$inferSelect;
export type InsertCaseSummaryJob = z.infer<typeof insertCaseSummaryJobSchema>;

// ============================================
// WHITE-LABEL RESELLER SYSTEM
// ============================================

// Reseller Profiles - Extended branding and config for resellers
export const resellerProfiles = pgTable("reseller_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  
  // Status
  status: resellerStatusEnum("status").default("pending_approval"),
  
  // Branding - Visual Identity
  brandName: text("brand_name").notNull(),
  brandTagline: text("brand_tagline"),
  logoUrl: text("logo_url"),
  logoAltUrl: text("logo_alt_url"), // Alternative logo (dark/light mode)
  faviconUrl: text("favicon_url"),
  
  // Color Palette
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#1E40AF"),
  accentColor: text("accent_color").default("#10B981"),
  backgroundColor: text("background_color").default("#FFFFFF"),
  foregroundColor: text("foreground_color").default("#111827"),
  
  // Theme Tokens (full customization)
  themeTokens: jsonb("theme_tokens").default({}),
  
  // Domain Configuration
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").default(false),
  customDomainVerifiedAt: timestamp("custom_domain_verified_at"),
  subdomainPrefix: varchar("subdomain_prefix", { length: 50 }),
  
  // Email Branding
  emailFromName: text("email_from_name"),
  emailFromAddress: text("email_from_address"),
  emailReplyTo: text("email_reply_to"),
  emailSignature: text("email_signature"),
  
  // Legal/Compliance
  termsOfServiceUrl: text("terms_of_service_url"),
  privacyPolicyUrl: text("privacy_policy_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  
  // Feature Controls
  allowedBusinessTypes: jsonb("allowed_business_types").default([]),
  maxChildTenants: integer("max_child_tenants").default(100),
  currentChildTenantCount: integer("current_child_tenant_count").default(0),
  
  // Analytics
  analyticsId: varchar("analytics_id", { length: 100 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
}, (table) => [
  index("idx_reseller_profiles_tenant").on(table.tenantId),
  index("idx_reseller_profiles_status").on(table.status),
  uniqueIndex("idx_reseller_profiles_domain").on(table.customDomain),
  uniqueIndex("idx_reseller_profiles_subdomain").on(table.subdomainPrefix),
]);

// Revenue Sharing Agreements
export const resellerRevenueAgreements = pgTable("reseller_revenue_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Agreement Details
  agreementName: text("agreement_name").notNull(),
  agreementVersion: integer("agreement_version").default(1),
  isActive: boolean("is_active").default(true),
  
  // Revenue Share Configuration
  revenueShareType: revenueShareTypeEnum("revenue_share_type").default("percentage"),
  baseSharePercentage: decimal("base_share_percentage", { precision: 5, scale: 2 }).default("20.00"), // Reseller's share
  
  // Tiered Revenue (for type="tiered")
  tieredRates: jsonb("tiered_rates").default([]), // [{minRevenue: 0, maxRevenue: 10000, percentage: 15}, ...]
  
  // Fixed Amount (for type="fixed")
  fixedAmount: decimal("fixed_amount", { precision: 10, scale: 2 }).default("0.00"),
  fixedCurrency: varchar("fixed_currency", { length: 3 }).default("USD"),
  
  // Billing Configuration
  billingCadence: billingCadenceEnum("billing_cadence").default("monthly"),
  paymentTermsDays: integer("payment_terms_days").default(30), // Net 30
  
  // Payout Preferences
  payoutMethod: varchar("payout_method", { length: 50 }).default("bank_transfer"), // bank_transfer, paypal, stripe
  payoutDetails: jsonb("payout_details").default({}), // Encrypted bank account details, etc.
  minimumPayoutAmount: decimal("minimum_payout_amount", { precision: 10, scale: 2 }).default("100.00"),
  
  // Valid Period
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  
  // Approval
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reseller_revenue_agreements_reseller").on(table.resellerId),
  index("idx_reseller_revenue_agreements_active").on(table.isActive),
]);

// Revenue Records - Monthly/periodic revenue tracking
export const resellerRevenueRecords = pgTable("reseller_revenue_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  agreementId: varchar("agreement_id").notNull().references(() => resellerRevenueAgreements.id, { onDelete: "cascade" }),
  
  // Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  periodLabel: varchar("period_label", { length: 20 }), // "2025-01", "2025-Q1", etc.
  
  // Revenue Breakdown
  grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).default("0.00"),
  refunds: decimal("refunds", { precision: 12, scale: 2 }).default("0.00"),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0.00"),
  
  // Child Tenant Stats
  activeChildTenants: integer("active_child_tenants").default(0),
  totalTransactions: integer("total_transactions").default(0),
  
  // Revenue Share Calculation
  resellerShareAmount: decimal("reseller_share_amount", { precision: 12, scale: 2 }).default("0.00"),
  platformShareAmount: decimal("platform_share_amount", { precision: 12, scale: 2 }).default("0.00"),
  appliedSharePercentage: decimal("applied_share_percentage", { precision: 5, scale: 2 }),
  
  // Currency
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Status
  status: varchar("status", { length: 50 }).default("pending"), // pending, calculated, invoiced, paid, disputed
  
  // Payout Tracking
  payoutId: varchar("payout_id"),
  payoutStatus: varchar("payout_status", { length: 50 }),
  paidAt: timestamp("paid_at"),
  
  // Invoice Reference
  platformInvoiceId: varchar("platform_invoice_id"),
  
  // Metadata
  calculationDetails: jsonb("calculation_details").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  finalizedAt: timestamp("finalized_at"),
}, (table) => [
  index("idx_reseller_revenue_records_reseller").on(table.resellerId),
  index("idx_reseller_revenue_records_period").on(table.periodStart, table.periodEnd),
  index("idx_reseller_revenue_records_status").on(table.status),
  uniqueIndex("idx_reseller_revenue_records_unique_period").on(table.resellerId, table.periodLabel),
]);

// Child Tenant Invoices - Track individual child tenant billing
export const resellerChildInvoices = pgTable("reseller_child_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  childTenantId: varchar("child_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  revenueRecordId: varchar("revenue_record_id").references(() => resellerRevenueRecords.id),
  
  // Invoice Details
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceDate: timestamp("invoice_date").defaultNow(),
  dueDate: timestamp("due_date"),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00"),
  discounts: decimal("discounts", { precision: 10, scale: 2 }).default("0.00"),
  taxes: decimal("taxes", { precision: 10, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0.00"),
  
  // Currency
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Status
  status: invoiceStatusEnum("status").default("pending"),
  
  // Payment
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  
  // Line Items
  lineItems: jsonb("line_items").default([]),
  
  // Notes
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reseller_child_invoices_reseller").on(table.resellerId),
  index("idx_reseller_child_invoices_child").on(table.childTenantId),
  index("idx_reseller_child_invoices_revenue_record").on(table.revenueRecordId),
  uniqueIndex("idx_reseller_child_invoices_number").on(table.resellerId, table.invoiceNumber),
]);

// Brand Assets - Store reseller-specific assets
export const resellerBrandAssets = pgTable("reseller_brand_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resellerId: varchar("reseller_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Asset Details
  assetType: varchar("asset_type", { length: 50 }).notNull(), // logo, favicon, banner, email_header, etc.
  assetName: text("asset_name").notNull(),
  assetUrl: text("asset_url").notNull(),
  
  // Metadata
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  dimensions: jsonb("dimensions").default({}), // {width, height}
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reseller_brand_assets_reseller").on(table.resellerId),
  index("idx_reseller_brand_assets_type").on(table.assetType),
]);

// Reseller Insert Schemas
export const insertResellerProfileSchema = createInsertSchema(resellerProfiles).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
  customDomainVerified: true,
  customDomainVerifiedAt: true,
  currentChildTenantCount: true,
});

export const insertResellerRevenueAgreementSchema = createInsertSchema(resellerRevenueAgreements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
});

export const insertResellerRevenueRecordSchema = createInsertSchema(resellerRevenueRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  finalizedAt: true,
});

export const insertResellerChildInvoiceSchema = createInsertSchema(resellerChildInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResellerBrandAssetSchema = createInsertSchema(resellerBrandAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Reseller Types
export type ResellerProfile = typeof resellerProfiles.$inferSelect;
export type InsertResellerProfile = z.infer<typeof insertResellerProfileSchema>;

export type ResellerRevenueAgreement = typeof resellerRevenueAgreements.$inferSelect;
export type InsertResellerRevenueAgreement = z.infer<typeof insertResellerRevenueAgreementSchema>;

export type ResellerRevenueRecord = typeof resellerRevenueRecords.$inferSelect;
export type InsertResellerRevenueRecord = z.infer<typeof insertResellerRevenueRecordSchema>;

export type ResellerChildInvoice = typeof resellerChildInvoices.$inferSelect;
export type InsertResellerChildInvoice = z.infer<typeof insertResellerChildInvoiceSchema>;

export type ResellerBrandAsset = typeof resellerBrandAssets.$inferSelect;
export type InsertResellerBrandAsset = z.infer<typeof insertResellerBrandAssetSchema>;

// ============================================
// ADD-ON MARKETPLACE
// ============================================

export const addonCategoryEnum = pgEnum("addon_category", [
  "analytics",
  "automation",
  "billing",
  "booking",
  "communication",
  "compliance",
  "crm",
  "healthcare",
  "integration",
  "inventory",
  "marketing",
  "payments",
  "reporting",
  "scheduling",
  "security",
  "utilities",
]);

export const addonStatusEnum = pgEnum("addon_status", [
  "draft",
  "review",
  "published",
  "deprecated",
  "archived",
]);

export const addonPricingTypeEnum = pgEnum("addon_pricing_type", [
  "free",
  "one_time",
  "monthly",
  "yearly",
  "usage_based",
]);

export const addonInstallStatusEnum = pgEnum("addon_install_status", [
  "pending",
  "installing",
  "updating",
  "active",
  "disabled",
  "uninstalling",
  "failed",
]);

// Core add-on catalog
export const addons = pgTable("addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  category: addonCategoryEnum("category").notNull(),
  status: addonStatusEnum("status").default("draft"),
  
  // Authorship
  developerId: varchar("developer_id"),
  developerName: varchar("developer_name", { length: 255 }),
  developerEmail: text("developer_email"),
  developerWebsite: text("developer_website"),
  
  // Branding
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  screenshotUrls: jsonb("screenshot_urls").default([]),
  
  // Technical
  entryPoint: varchar("entry_point", { length: 255 }),
  permissions: jsonb("permissions").default([]),
  requiredFeatures: jsonb("required_features").default([]),
  supportedBusinessTypes: jsonb("supported_business_types").default([]),
  supportedCountries: jsonb("supported_countries").default([]), // Array of country codes like ["IN", "MY", "UK", "US"] - empty means all countries
  minPlatformVersion: varchar("min_platform_version", { length: 20 }),
  dependencies: jsonb("dependencies").default([]), // Array of { addonId, optional, minVersion? }
  
  // Discovery
  tags: jsonb("tags").default([]),
  featured: boolean("featured").default(false),
  featuredOrder: integer("featured_order"),
  
  // Stats
  installCount: integer("install_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  deprecatedAt: timestamp("deprecated_at"),
}, (table) => [
  index("idx_addons_category").on(table.category),
  index("idx_addons_status").on(table.status),
  index("idx_addons_featured").on(table.featured),
  index("idx_addons_developer").on(table.developerId),
]);

// Versioned releases
export const addonVersions = pgTable("addon_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addonId: varchar("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 50 }).notNull(),
  semverMajor: integer("semver_major").notNull(),
  semverMinor: integer("semver_minor").notNull(),
  semverPatch: integer("semver_patch").notNull(),
  
  // Release info
  releaseNotes: text("release_notes"),
  isStable: boolean("is_stable").default(true),
  isPrerelease: boolean("is_prerelease").default(false),
  isLatest: boolean("is_latest").default(false),
  
  // Technical
  bundleUrl: text("bundle_url"),
  bundleHash: varchar("bundle_hash", { length: 64 }),
  bundleSize: integer("bundle_size"),
  configSchema: jsonb("config_schema").default({}),
  migrationScripts: jsonb("migration_scripts").default([]),
  
  // Compatibility
  minPlatformVersion: varchar("min_platform_version", { length: 20 }),
  maxPlatformVersion: varchar("max_platform_version", { length: 20 }),
  dependencies: jsonb("dependencies").default([]),
  breakingChanges: jsonb("breaking_changes").default([]),
  
  // Stats
  downloadCount: integer("download_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
}, (table) => [
  index("idx_addon_versions_addon").on(table.addonId),
  index("idx_addon_versions_latest").on(table.addonId, table.isLatest),
  uniqueIndex("idx_addon_versions_unique").on(table.addonId, table.version),
]);

// Pricing tiers
export const addonPricing = pgTable("addon_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addonId: varchar("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  pricingType: addonPricingTypeEnum("pricing_type").notNull(),
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  billingPeriod: varchar("billing_period", { length: 20 }),
  
  // Usage-based pricing
  usageMetric: varchar("usage_metric", { length: 100 }),
  usageUnit: varchar("usage_unit", { length: 50 }),
  usageTiers: jsonb("usage_tiers").default([]),
  includedUsage: integer("included_usage"),
  
  // Limits
  maxUsers: integer("max_users"),
  maxRecords: integer("max_records"),
  features: jsonb("features").default([]),
  
  // Trial
  trialDays: integer("trial_days").default(0),
  
  // Status
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_addon_pricing_addon").on(table.addonId),
]);

// Per-tenant installations
export const tenantAddons = pgTable("tenant_addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  addonId: varchar("addon_id").notNull().references(() => addons.id, { onDelete: "restrict" }),
  versionId: varchar("version_id").notNull().references(() => addonVersions.id, { onDelete: "restrict" }),
  pricingId: varchar("pricing_id").references(() => addonPricing.id),
  
  // Status
  status: addonInstallStatusEnum("status").default("pending"),
  
  // Configuration
  config: jsonb("config").default({}),
  enabledModules: jsonb("enabled_modules").default([]),
  
  // Subscription
  subscriptionId: varchar("subscription_id"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  // Trial
  trialEndsAt: timestamp("trial_ends_at"),
  
  // Usage tracking
  usageThisPeriod: jsonb("usage_this_period").default({}),
  
  // Auto-update settings
  autoUpdate: boolean("auto_update").default(true),
  autoUpdateChannel: varchar("auto_update_channel", { length: 20 }).default("stable"),
  
  // Metadata
  installedBy: varchar("installed_by"),
  installedAt: timestamp("installed_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
  uninstalledAt: timestamp("uninstalled_at"),
}, (table) => [
  index("idx_tenant_addons_tenant").on(table.tenantId),
  index("idx_tenant_addons_addon").on(table.addonId),
  index("idx_tenant_addons_status").on(table.status),
  uniqueIndex("idx_tenant_addons_unique").on(table.tenantId, table.addonId),
]);

// Installation history / audit
export const addonInstallHistory = pgTable("addon_install_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantAddonId: varchar("tenant_addon_id").notNull().references(() => tenantAddons.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull(),
  addonId: varchar("addon_id").notNull(),
  
  action: varchar("action", { length: 50 }).notNull(),
  fromVersionId: varchar("from_version_id"),
  toVersionId: varchar("to_version_id"),
  
  status: varchar("status", { length: 50 }).notNull(),
  errorMessage: text("error_message"),
  rollbackVersionId: varchar("rollback_version_id"),
  
  performedBy: varchar("performed_by"),
  performedAt: timestamp("performed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
}, (table) => [
  index("idx_addon_install_history_tenant_addon").on(table.tenantAddonId),
  index("idx_addon_install_history_tenant").on(table.tenantId),
]);

// User reviews
export const addonReviews = pgTable("addon_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addonId: varchar("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  
  // Moderation
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  isApproved: boolean("is_approved").default(true),
  isFlagged: boolean("is_flagged").default(false),
  
  // Response
  developerResponse: text("developer_response"),
  developerRespondedAt: timestamp("developer_responded_at"),
  
  // Engagement
  helpfulCount: integer("helpful_count").default(0),
  reportCount: integer("report_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_addon_reviews_addon").on(table.addonId),
  index("idx_addon_reviews_tenant").on(table.tenantId),
  uniqueIndex("idx_addon_reviews_unique").on(table.addonId, table.tenantId),
]);

// ==================== PAYROLL ADDON TIERS ====================
// Employee-based pricing tiers for payroll add-on

export const payrollAddonTiers = pgTable("payroll_addon_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addonCode: varchar("addon_code", { length: 50 }).notNull().default("payroll"),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  minEmployees: integer("min_employees").notNull(),
  maxEmployees: integer("max_employees").notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 10, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("INR"),
  countryCode: varchar("country_code", { length: 5 }).notNull().default("IN"),
  razorpayMonthlyPlanId: varchar("razorpay_monthly_plan_id", { length: 100 }),
  razorpayYearlyPlanId: varchar("razorpay_yearly_plan_id", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payroll_tiers_addon").on(table.addonCode),
  index("idx_payroll_tiers_country").on(table.countryCode),
  index("idx_payroll_tiers_employees").on(table.minEmployees, table.maxEmployees),
]);

// ==================== BUNDLE DISCOUNTS ====================
// Discount rules for plan + addon combinations

export const bundleDiscounts = pgTable("bundle_discounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  planCode: varchar("plan_code", { length: 50 }).notNull(),
  addonCode: varchar("addon_code", { length: 50 }).notNull(),
  addonTierId: varchar("addon_tier_id").references(() => payrollAddonTiers.id),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("fixed"), // 'fixed' | 'percentage'
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull().default("INR"),
  countryCode: varchar("country_code", { length: 5 }).notNull().default("IN"),
  appliesTo: varchar("applies_to", { length: 20 }).notNull().default("addon"), // 'addon' | 'plan' | 'both'
  billingCycle: billingCycleEnum("billing_cycle"),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bundle_discounts_plan").on(table.planCode),
  index("idx_bundle_discounts_addon").on(table.addonCode),
  index("idx_bundle_discounts_country").on(table.countryCode),
]);

// ==================== TENANT PAYROLL ADDON ====================
// Extended payroll addon tracking per tenant

export const tenantPayrollAddon = pgTable("tenant_payroll_addon", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tierId: varchar("tier_id").references(() => payrollAddonTiers.id),
  enabled: boolean("enabled").default(false).notNull(),
  billingCycle: billingCycleEnum("billing_cycle").default("monthly"),
  price: decimal("price", { precision: 10, scale: 2 }),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).default("0"),
  
  // Trial
  trialUsed: boolean("trial_used").default(false).notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  
  // Grace period for tier upgrades
  graceUntil: timestamp("grace_until"),
  graceEmployeeCount: integer("grace_employee_count"),
  
  // Razorpay
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
  razorpayPlanId: varchar("razorpay_plan_id", { length: 100 }),
  
  // Subscription
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("inactive"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_tenant_payroll_addon_unique").on(table.tenantId),
  index("idx_tenant_payroll_addon_tier").on(table.tierId),
  index("idx_tenant_payroll_addon_status").on(table.subscriptionStatus),
]);

// Insert schemas for payroll addon
export const insertPayrollAddonTierSchema = createInsertSchema(payrollAddonTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBundleDiscountSchema = createInsertSchema(bundleDiscounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantPayrollAddonSchema = createInsertSchema(tenantPayrollAddon).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for payroll addon
export type PayrollAddonTier = typeof payrollAddonTiers.$inferSelect;
export type InsertPayrollAddonTier = z.infer<typeof insertPayrollAddonTierSchema>;

export type BundleDiscount = typeof bundleDiscounts.$inferSelect;
export type InsertBundleDiscount = z.infer<typeof insertBundleDiscountSchema>;

export type TenantPayrollAddon = typeof tenantPayrollAddon.$inferSelect;
export type InsertTenantPayrollAddon = z.infer<typeof insertTenantPayrollAddonSchema>;

// Insert schemas
export const insertAddonSchema = createInsertSchema(addons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  deprecatedAt: true,
  installCount: true,
  averageRating: true,
  reviewCount: true,
});

export const insertAddonVersionSchema = createInsertSchema(addonVersions).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
  downloadCount: true,
});

export const insertAddonPricingSchema = createInsertSchema(addonPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantAddonSchema = createInsertSchema(tenantAddons).omit({
  id: true,
  installedAt: true,
  updatedAt: true,
  lastActiveAt: true,
  uninstalledAt: true,
});

export const insertAddonReviewSchema = createInsertSchema(addonReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerifiedPurchase: true,
  isApproved: true,
  isFlagged: true,
  developerResponse: true,
  developerRespondedAt: true,
  helpfulCount: true,
  reportCount: true,
});

// Types
export type Addon = typeof addons.$inferSelect;
export type InsertAddon = z.infer<typeof insertAddonSchema>;

export type AddonVersion = typeof addonVersions.$inferSelect;
export type InsertAddonVersion = z.infer<typeof insertAddonVersionSchema>;

export type AddonPricing = typeof addonPricing.$inferSelect;
export type InsertAddonPricing = z.infer<typeof insertAddonPricingSchema>;

export type TenantAddon = typeof tenantAddons.$inferSelect;
export type InsertTenantAddon = z.infer<typeof insertTenantAddonSchema>;

export type AddonInstallHistory = typeof addonInstallHistory.$inferSelect;

export type AddonReview = typeof addonReviews.$inferSelect;
export type InsertAddonReview = z.infer<typeof insertAddonReviewSchema>;

// ============================================
// PLATFORM COUNTRIES (Source of Truth for Country Data)
// ============================================

export const platformCountries = pgTable("platform_countries", {
  code: varchar("code", { length: 5 }).primaryKey(), // ISO 3166-1 alpha-2: IN, AE, GB
  name: varchar("name", { length: 100 }).notNull(),
  defaultCurrency: varchar("default_currency", { length: 5 }).notNull(), // INR, AED, GBP
  defaultTimezone: varchar("default_timezone", { length: 50 }).notNull(), // Asia/Kolkata
  regionGroup: varchar("region_group", { length: 50 }).notNull(), // Asia Pacific, Middle East, Europe
  taxType: varchar("tax_type", { length: 20 }), // GST, VAT, SST, SalesTax
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }), // 18.00 for 18%
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformCountrySchema = createInsertSchema(platformCountries);
export type PlatformCountry = typeof platformCountries.$inferSelect;
export type InsertPlatformCountry = z.infer<typeof insertPlatformCountrySchema>;

// ============================================
// PLATFORM REGION CONFIGURATION (Region-Lock System)
// ============================================

export const regionStatusEnum = pgEnum("region_status", [
  "enabled",
  "disabled",
  "maintenance",
  "coming_soon",
]);

export const platformRegionConfigs = pgTable("platform_region_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Region identification
  countryCode: varchar("country_code", { length: 5 }).notNull().unique(), // ISO 3166-1 alpha-2: IN, AE, GB, SG, MY
  countryName: varchar("country_name", { length: 100 }).notNull(),
  region: tenantRegionEnum("region").notNull(), // asia_pacific, middle_east, europe
  
  // Status controls
  status: regionStatusEnum("status").default("enabled").notNull(),
  
  // Feature toggles
  registrationEnabled: boolean("registration_enabled").default(true).notNull(),
  billingEnabled: boolean("billing_enabled").default(true).notNull(),
  compliancePacksEnabled: boolean("compliance_packs_enabled").default(true).notNull(),
  
  // Allowed business types (null = all allowed)
  allowedBusinessTypes: jsonb("allowed_business_types"), // ["clinic", "salon", "pg"]
  
  // Allowed subscription tiers (null = all allowed)
  allowedSubscriptionTiers: jsonb("allowed_subscription_tiers"), // ["free", "pro", "enterprise"]
  
  // Currency and localization
  defaultCurrency: varchar("default_currency", { length: 5 }).notNull(), // INR, AED, GBP
  defaultTimezone: varchar("default_timezone", { length: 50 }).notNull(), // Asia/Kolkata
  
  // Compliance and legal
  requiredCompliancePacks: jsonb("required_compliance_packs").default([]), // ["dpdp_basic", "gst_compliance"]
  dataResidencyRequired: boolean("data_residency_required").default(false),
  dataResidencyRegion: varchar("data_residency_region", { length: 50 }), // aws-ap-south-1, gcp-asia-south1
  
  // Tax configuration
  taxType: varchar("tax_type", { length: 20 }), // GST, VAT, etc.
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }), // 18.00 for 18%
  taxInclusive: boolean("tax_inclusive").default(false),
  
  // Messaging/communication restrictions
  smsEnabled: boolean("sms_enabled").default(true),
  whatsappEnabled: boolean("whatsapp_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  
  // Maintenance window
  maintenanceMessage: text("maintenance_message"),
  maintenanceStartAt: timestamp("maintenance_start_at"),
  maintenanceEndAt: timestamp("maintenance_end_at"),
  
  // Launch configuration
  launchDate: timestamp("launch_date"),
  betaAccessOnly: boolean("beta_access_only").default(false),
  betaAccessCodes: jsonb("beta_access_codes").default([]), // ["BETA2024", "EARLYADOPTER"]
  
  // Audit
  createdBy: varchar("created_by"),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_region_config_country").on(table.countryCode),
  index("idx_region_config_region").on(table.region),
  index("idx_region_config_status").on(table.status),
]);

// Region access logs - for audit trail
export const regionAccessLogs = pgTable("region_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  countryCode: varchar("country_code", { length: 5 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // registration_attempt, billing_attempt, access_denied
  result: varchar("result", { length: 20 }).notNull(), // allowed, blocked, pending
  
  // Context
  tenantId: varchar("tenant_id"),
  userId: varchar("user_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Details
  reason: text("reason"), // Why blocked/allowed
  metadata: jsonb("metadata"), // Additional context
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_region_access_country").on(table.countryCode),
  index("idx_region_access_action").on(table.action),
  index("idx_region_access_created").on(table.createdAt),
]);

// Insert schemas
export const insertPlatformRegionConfigSchema = createInsertSchema(platformRegionConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegionAccessLogSchema = createInsertSchema(regionAccessLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type PlatformRegionConfig = typeof platformRegionConfigs.$inferSelect;
export type InsertPlatformRegionConfig = z.infer<typeof insertPlatformRegionConfigSchema>;

export type RegionAccessLog = typeof regionAccessLogs.$inferSelect;
export type InsertRegionAccessLog = z.infer<typeof insertRegionAccessLogSchema>;

// ============================================
// TAX CALCULATION AND REPORTING MODULE
// ============================================

// Business-type specific tax rules
export const taxCategoryEnum = pgEnum("tax_category", [
  "standard",      // Standard rate
  "reduced",       // Reduced rate (essential services)
  "zero",          // Zero-rated
  "exempt",        // Exempt from tax
  "reverse_charge" // Reverse charge (B2B cross-border)
]);

// Tax rules per country and business type
export const taxRules = pgTable("tax_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: tenantCountryEnum("country").notNull(),
  businessType: businessTypeEnum("business_type").notNull(),
  taxCategory: taxCategoryEnum("tax_category").default("standard"),
  taxName: varchar("tax_name", { length: 50 }).notNull(), // GST, VAT, Service Tax
  taxCode: varchar("tax_code", { length: 20 }), // HSN/SAC code for India, VAT code for UK
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"), // null = currently active
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}), // Extra country-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tax_rules_country").on(table.country),
  index("idx_tax_rules_business_type").on(table.businessType),
  index("idx_tax_rules_active").on(table.isActive),
]);

// Tax calculation logs for audit trail
export const taxCalculationLogs = pgTable("tax_calculation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  invoiceId: varchar("invoice_id"),
  country: tenantCountryEnum("country").notNull(),
  businessType: businessTypeEnum("business_type").notNull(),
  taxRuleId: varchar("tax_rule_id").references(() => taxRules.id),
  baseAmount: decimal("base_amount", { precision: 15, scale: 2 }).notNull(),
  taxName: varchar("tax_name", { length: 50 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  calculationDetails: jsonb("calculation_details").default({}), // Breakdown (CGST/SGST for India, etc.)
  calculatedAt: timestamp("calculated_at").defaultNow(),
  calculatedBy: varchar("calculated_by"), // admin ID if manual override
}, (table) => [
  index("idx_tax_calc_logs_tenant").on(table.tenantId),
  index("idx_tax_calc_logs_country").on(table.country),
  index("idx_tax_calc_logs_date").on(table.calculatedAt),
]);

// Periodic tax reports
export const taxReports = pgTable("tax_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: varchar("report_type", { length: 50 }).notNull(), // monthly, quarterly, annual
  country: tenantCountryEnum("country"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalInvoices: integer("total_invoices").default(0),
  totalBaseAmount: decimal("total_base_amount", { precision: 15, scale: 2 }).default("0"),
  totalTaxCollected: decimal("total_tax_collected", { precision: 15, scale: 2 }).default("0"),
  currency: currencyEnum("currency").notNull(),
  breakdown: jsonb("breakdown").default({}), // By tax type, business type, etc.
  status: varchar("status", { length: 20 }).default("draft"), // draft, finalized, filed
  generatedBy: varchar("generated_by"),
  generatedAt: timestamp("generated_at").defaultNow(),
  filedAt: timestamp("filed_at"),
  notes: text("notes"),
}, (table) => [
  index("idx_tax_reports_country").on(table.country),
  index("idx_tax_reports_period").on(table.periodStart, table.periodEnd),
  index("idx_tax_reports_status").on(table.status),
]);

// Insert schemas
export const insertTaxRuleSchema = createInsertSchema(taxRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaxCalculationLogSchema = createInsertSchema(taxCalculationLogs).omit({
  id: true,
  calculatedAt: true,
});

export const insertTaxReportSchema = createInsertSchema(taxReports).omit({
  id: true,
  generatedAt: true,
});

// Types
export type TaxRule = typeof taxRules.$inferSelect;
export type InsertTaxRule = z.infer<typeof insertTaxRuleSchema>;

export type TaxCalculationLog = typeof taxCalculationLogs.$inferSelect;
export type InsertTaxCalculationLog = z.infer<typeof insertTaxCalculationLogSchema>;

export type TaxReport = typeof taxReports.$inferSelect;
export type InsertTaxReport = z.infer<typeof insertTaxReportSchema>;

// ============================================
// CUSTOMER PORTAL
// ============================================

// Customer portal settings per tenant
export const customerPortalSettings = pgTable("customer_portal_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").default(false),
  portalToken: varchar("portal_token", { length: 64 }).notNull(), // Unique token for portal URL
  allowSelfRegistration: boolean("allow_self_registration").default(true),
  allowProfileEdit: boolean("allow_profile_edit").default(true),
  allowInvoiceView: boolean("allow_invoice_view").default(true),
  allowPayments: boolean("allow_payments").default(true),
  welcomeMessage: text("welcome_message"),
  termsAndConditions: text("terms_and_conditions"),
  privacyPolicy: text("privacy_policy"),
  brandingConfig: jsonb("branding_config").default({}), // Custom colors, logo, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_portal_settings_tenant").on(table.tenantId),
  index("idx_portal_settings_token").on(table.portalToken),
]);

// Customer portal account status enum
export const portalAccountStatusEnum = pgEnum("portal_account_status", [
  "pending",    // Invited but not yet registered
  "active",     // Active account
  "suspended",  // Temporarily suspended
  "deactivated" // Permanently deactivated
]);

// Customer portal accounts (login credentials for customers)
export const customerPortalAccounts = pgTable("customer_portal_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  passwordHash: text("password_hash"), // null if pending invite
  status: portalAccountStatusEnum("status").default("pending"),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 64 }),
  passwordResetToken: varchar("password_reset_token", { length: 64 }),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_portal_accounts_tenant").on(table.tenantId),
  index("idx_portal_accounts_customer").on(table.customerId),
  index("idx_portal_accounts_email").on(table.tenantId, table.email),
]);

// Customer portal sessions
export const customerPortalSessions = pgTable("customer_portal_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => customerPortalAccounts.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 128 }).notNull(),
  refreshToken: varchar("refresh_token", { length: 128 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_portal_sessions_account").on(table.accountId),
  index("idx_portal_sessions_token").on(table.sessionToken),
  index("idx_portal_sessions_expires").on(table.expiresAt),
]);

// Customer portal invitations
export const customerPortalInvites = pgTable("customer_portal_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  inviteToken: varchar("invite_token", { length: 64 }).notNull(),
  email: text("email").notNull(),
  sentVia: varchar("sent_via", { length: 20 }), // email, whatsapp, sms
  sentAt: timestamp("sent_at"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_portal_invites_tenant").on(table.tenantId),
  index("idx_portal_invites_customer").on(table.customerId),
  index("idx_portal_invites_token").on(table.inviteToken),
  index("idx_portal_invites_expires").on(table.expiresAt),
]);

// Insert schemas for customer portal
export const insertCustomerPortalSettingsSchema = createInsertSchema(customerPortalSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerPortalAccountSchema = createInsertSchema(customerPortalAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerPortalSessionSchema = createInsertSchema(customerPortalSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerPortalInviteSchema = createInsertSchema(customerPortalInvites).omit({
  id: true,
  createdAt: true,
});

// Types for customer portal
export type CustomerPortalSettings = typeof customerPortalSettings.$inferSelect;
export type InsertCustomerPortalSettings = z.infer<typeof insertCustomerPortalSettingsSchema>;

export type CustomerPortalAccount = typeof customerPortalAccounts.$inferSelect;
export type InsertCustomerPortalAccount = z.infer<typeof insertCustomerPortalAccountSchema>;

export type CustomerPortalSession = typeof customerPortalSessions.$inferSelect;
export type InsertCustomerPortalSession = z.infer<typeof insertCustomerPortalSessionSchema>;

export type CustomerPortalInvite = typeof customerPortalInvites.$inferSelect;
export type InsertCustomerPortalInvite = z.infer<typeof insertCustomerPortalInviteSchema>;

// ============================================
// FURNITURE MANUFACTURING MODULE
// ============================================

// Furniture product type enum
export const furnitureProductTypeEnum = pgEnum("furniture_product_type", [
  "ready_made",      // Ready to sell from inventory
  "made_to_order",   // Custom manufacturing required
  "semi_finished"    // Partially completed product
]);

// Furniture material type enum
export const furnitureMaterialTypeEnum = pgEnum("furniture_material_type", [
  "wood",
  "metal",
  "fabric",
  "leather",
  "glass",
  "plastic",
  "composite",
  "other"
]);

// Production order status enum
export const productionOrderStatusEnum = pgEnum("production_order_status", [
  "draft",
  "pending",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled"
]);

// Production stage type enum
export const productionStageTypeEnum = pgEnum("production_stage_type", [
  "cutting",
  "assembly",
  "finishing",
  "quality_check",
  "ready_for_dispatch",
  "custom"
]);

// Production stage status enum
export const productionStageStatusEnum = pgEnum("production_stage_status", [
  "pending",
  "in_progress",
  "completed",
  "skipped",
  "failed"
]);

// Delivery status enum
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "scheduled",
  "in_transit",
  "delivered",
  "failed",
  "cancelled"
]);

// Installation status enum  
export const installationStatusEnum = pgEnum("installation_status", [
  "not_required",
  "pending",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled"
]);

// Invoice document type enum for furniture module
export const furnitureInvoiceTypeEnum = pgEnum("furniture_invoice_type", [
  "proforma",
  "tax_invoice",
  "delivery_challan",
  "advance_receipt",
  "final_invoice"
]);

// ============================================
// FURNITURE: PRODUCT CATALOG EXTENSION
// ============================================

// Furniture products table - extends base product catalog
export const furnitureProducts = pgTable("furniture_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  productType: furnitureProductTypeEnum("product_type").notNull().default("ready_made"),
  materialType: furnitureMaterialTypeEnum("material_type").notNull().default("wood"),
  
  // Dimensions in CM
  dimensionLength: decimal("dimension_length", { precision: 10, scale: 2 }),
  dimensionWidth: decimal("dimension_width", { precision: 10, scale: 2 }),
  dimensionHeight: decimal("dimension_height", { precision: 10, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 2 }), // in KG
  
  // Finish and appearance
  finish: varchar("finish", { length: 100 }),
  color: varchar("color", { length: 50 }),
  
  // Pricing
  costPrice: decimal("cost_price", { precision: 12, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(),
  wholesalePrice: decimal("wholesale_price", { precision: 12, scale: 2 }),
  
  // Tax category
  hsnCode: varchar("hsn_code", { length: 20 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  taxCategory: varchar("tax_category", { length: 50 }),
  
  // Inventory
  currentStock: integer("current_stock").default(0),
  minStockLevel: integer("min_stock_level").default(0),
  maxStockLevel: integer("max_stock_level"),
  reorderPoint: integer("reorder_point").default(5),
  
  // Customization
  allowCustomDimensions: boolean("allow_custom_dimensions").default(false),
  customizationOptions: jsonb("customization_options").default([]),
  
  // Media
  images: jsonb("images").default([]),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Manufacturing
  defaultBomId: varchar("default_bom_id"),
  manufacturingLeadTime: integer("manufacturing_lead_time"), // in days
  
  // Category
  categoryId: varchar("category_id").references(() => inventoryCategories.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_furniture_products_tenant").on(table.tenantId),
  uniqueIndex("idx_furniture_products_sku").on(table.tenantId, table.sku),
  index("idx_furniture_products_type").on(table.tenantId, table.productType),
  index("idx_furniture_products_material").on(table.tenantId, table.materialType),
  index("idx_furniture_products_category").on(table.categoryId),
]);

// ============================================
// FURNITURE: RAW MATERIALS INVENTORY
// ============================================

// Raw material categories
export const rawMaterialCategories = pgTable("raw_material_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_raw_material_categories_tenant").on(table.tenantId),
  index("idx_raw_material_categories_parent").on(table.parentId),
]);

// Raw materials inventory items
export const rawMaterials = pgTable("raw_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => rawMaterialCategories.id),
  
  sku: varchar("sku", { length: 100 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Units of measurement
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).notNull(), // sqft, pcs, kg, meter, etc.
  conversionFactor: decimal("conversion_factor", { precision: 10, scale: 4 }).default("1"),
  
  // Pricing
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  lastPurchasePrice: decimal("last_purchase_price", { precision: 12, scale: 2 }),
  
  // Stock levels
  currentStock: decimal("current_stock", { precision: 12, scale: 4 }).default("0"),
  minStockLevel: decimal("min_stock_level", { precision: 12, scale: 4 }).default("0"),
  maxStockLevel: decimal("max_stock_level", { precision: 12, scale: 4 }),
  reorderPoint: decimal("reorder_point", { precision: 12, scale: 4 }).default("0"),
  
  // Location
  warehouseLocation: varchar("warehouse_location", { length: 100 }),
  
  // Supplier info
  preferredSupplierId: varchar("preferred_supplier_id"),
  
  // Batch/Lot tracking
  enableBatchTracking: boolean("enable_batch_tracking").default(false),
  
  // HSN for GST
  hsnCode: varchar("hsn_code", { length: 20 }),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_raw_materials_tenant").on(table.tenantId),
  uniqueIndex("idx_raw_materials_sku").on(table.tenantId, table.sku),
  index("idx_raw_materials_category").on(table.categoryId),
]);

// Raw material stock movements
export const rawMaterialStockMovements = pgTable("raw_material_stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  rawMaterialId: varchar("raw_material_id").notNull().references(() => rawMaterials.id, { onDelete: "cascade" }),
  
  movementType: varchar("movement_type", { length: 20 }).notNull(), // in, out, adjustment
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 4 }).notNull(),
  
  // Reference
  referenceType: varchar("reference_type", { length: 50 }), // purchase_order, production_order, adjustment
  referenceId: varchar("reference_id"),
  
  // Batch info
  batchNumber: varchar("batch_number", { length: 100 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  
  // Cost tracking
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_raw_material_movements_tenant").on(table.tenantId),
  index("idx_raw_material_movements_material").on(table.rawMaterialId),
  index("idx_raw_material_movements_type").on(table.movementType),
  index("idx_raw_material_movements_created").on(table.createdAt),
]);

// ============================================
// FURNITURE: BILL OF MATERIALS (BOM)
// ============================================

// Bill of Materials header
export const billOfMaterials = pgTable("bill_of_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => furnitureProducts.id, { onDelete: "cascade" }),
  
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").default(1),
  description: text("description"),
  
  // Calculated costs
  totalMaterialCost: decimal("total_material_cost", { precision: 12, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).default("0"),
  overheadCost: decimal("overhead_cost", { precision: 12, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  
  // Yields one unit of the product
  yieldQuantity: integer("yield_quantity").default(1),
  
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false), // Primary BOM for the product
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_bom_tenant").on(table.tenantId),
  index("idx_bom_product").on(table.productId),
  uniqueIndex("idx_bom_product_version").on(table.tenantId, table.productId, table.version),
]);

// BOM components/items
export const bomComponents = pgTable("bom_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bomId: varchar("bom_id").notNull().references(() => billOfMaterials.id, { onDelete: "cascade" }),
  rawMaterialId: varchar("raw_material_id").notNull().references(() => rawMaterials.id, { onDelete: "cascade" }),
  
  quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).notNull(),
  
  // Waste/scrap allowance
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }).default("0"),
  effectiveQuantity: decimal("effective_quantity", { precision: 12, scale: 4 }), // quantity * (1 + wastePercentage/100)
  
  // Cost
  unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bom_components_bom").on(table.bomId),
  index("idx_bom_components_material").on(table.rawMaterialId),
]);

// ============================================
// FURNITURE: PRODUCTION ORDERS
// ============================================

// Production orders
export const productionOrders = pgTable("production_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  
  // Link to product and BOM
  productId: varchar("product_id").notNull().references(() => furnitureProducts.id),
  bomId: varchar("bom_id").references(() => billOfMaterials.id),
  
  // Link to sales order (if created from sales order)
  salesOrderId: varchar("sales_order_id"),
  
  // Production details
  quantity: integer("quantity").notNull().default(1),
  
  // Custom dimensions for made-to-order
  customDimensions: jsonb("custom_dimensions").default({}),
  customSpecifications: jsonb("custom_specifications").default({}),
  
  // Status
  status: productionOrderStatusEnum("status").default("draft"),
  
  // Scheduling
  scheduledStartDate: date("scheduled_start_date"),
  scheduledEndDate: date("scheduled_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  
  // Assignment
  assignedToId: varchar("assigned_to_id").references(() => staff.id),
  
  // Priority (1-5, 1 being highest)
  priority: integer("priority").default(3),
  
  // Costing
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  
  // Wastage tracking
  totalWastage: decimal("total_wastage", { precision: 12, scale: 4 }),
  wastageNotes: text("wastage_notes"),
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  completedQuantity: integer("completed_quantity").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_production_orders_tenant").on(table.tenantId),
  uniqueIndex("idx_production_orders_number").on(table.tenantId, table.orderNumber),
  index("idx_production_orders_product").on(table.productId),
  index("idx_production_orders_status").on(table.tenantId, table.status),
  index("idx_production_orders_scheduled").on(table.tenantId, table.scheduledStartDate),
]);

// Production stages/steps
export const productionStages = pgTable("production_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productionOrderId: varchar("production_order_id").notNull().references(() => productionOrders.id, { onDelete: "cascade" }),
  
  stageType: productionStageTypeEnum("stage_type").notNull(),
  customStageName: varchar("custom_stage_name", { length: 100 }),
  
  stageOrder: integer("stage_order").notNull(),
  
  status: productionStageStatusEnum("status").default("pending"),
  
  // Assignment
  assignedToId: varchar("assigned_to_id").references(() => staff.id),
  
  // Timing
  scheduledStartTime: timestamp("scheduled_start_time"),
  scheduledEndTime: timestamp("scheduled_end_time"),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // Tracking
  wastageRecorded: decimal("wastage_recorded", { precision: 12, scale: 4 }),
  wastageNotes: text("wastage_notes"),
  
  // Quality check
  qualityCheckPassed: boolean("quality_check_passed"),
  qualityNotes: text("quality_notes"),
  
  notes: text("notes"),
  
  completedBy: varchar("completed_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_production_stages_order").on(table.productionOrderId),
  index("idx_production_stages_status").on(table.status),
  index("idx_production_stages_assigned").on(table.assignedToId),
]);

// ============================================
// FURNITURE: DELIVERY & INSTALLATION
// ============================================

// Delivery orders
export const deliveryOrders = pgTable("delivery_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  deliveryNumber: varchar("delivery_number", { length: 50 }).notNull(),
  
  // Reference to sales order or invoice
  salesOrderId: varchar("sales_order_id"),
  invoiceId: varchar("invoice_id").references(() => invoices.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Delivery details
  deliveryStatus: deliveryStatusEnum("delivery_status").default("pending"),
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTimeSlot: varchar("scheduled_time_slot", { length: 50 }),
  
  actualDeliveryDate: date("actual_delivery_date"),
  actualDeliveryTime: time("actual_delivery_time"),
  
  // Address
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: varchar("delivery_city", { length: 100 }),
  deliveryState: varchar("delivery_state", { length: 100 }),
  deliveryPincode: varchar("delivery_pincode", { length: 20 }),
  deliveryContact: varchar("delivery_contact", { length: 100 }),
  deliveryPhone: varchar("delivery_phone", { length: 20 }),
  
  // Assignment
  driverId: varchar("driver_id").references(() => staff.id),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  
  // Delivery charges
  deliveryCharges: decimal("delivery_charges", { precision: 10, scale: 2 }).default("0"),
  
  // Proof of delivery
  podSignature: text("pod_signature"), // Base64 signature
  podPhoto: text("pod_photo"), // Photo URL
  podNotes: text("pod_notes"),
  
  // Tracking
  trackingUrl: text("tracking_url"),
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  failureReason: text("failure_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_delivery_orders_tenant").on(table.tenantId),
  uniqueIndex("idx_delivery_orders_number").on(table.tenantId, table.deliveryNumber),
  index("idx_delivery_orders_customer").on(table.customerId),
  index("idx_delivery_orders_status").on(table.tenantId, table.deliveryStatus),
  index("idx_delivery_orders_scheduled").on(table.tenantId, table.scheduledDate),
]);

// Delivery order items
export const deliveryOrderItems = pgTable("delivery_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryOrderId: varchar("delivery_order_id").notNull().references(() => deliveryOrders.id, { onDelete: "cascade" }),
  
  productId: varchar("product_id").references(() => furnitureProducts.id),
  productionOrderId: varchar("production_order_id").references(() => productionOrders.id),
  
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  
  // Dimensions for custom items
  dimensions: jsonb("dimensions").default({}),
  
  isDelivered: boolean("is_delivered").default(false),
  deliveredAt: timestamp("delivered_at"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_delivery_items_order").on(table.deliveryOrderId),
  index("idx_delivery_items_product").on(table.productId),
]);

// Installation orders
export const installationOrders = pgTable("installation_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  installationNumber: varchar("installation_number", { length: 50 }).notNull(),
  
  // Link to delivery
  deliveryOrderId: varchar("delivery_order_id").references(() => deliveryOrders.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Status
  installationStatus: installationStatusEnum("installation_status").default("pending"),
  
  // Scheduling
  scheduledDate: date("scheduled_date"),
  scheduledTimeSlot: varchar("scheduled_time_slot", { length: 50 }),
  
  actualDate: date("actual_date"),
  actualStartTime: time("actual_start_time"),
  actualEndTime: time("actual_end_time"),
  
  // Assignment
  installerId: varchar("installer_id").references(() => staff.id),
  helperIds: jsonb("helper_ids").default([]), // Array of staff IDs
  
  // Installation charges
  installationCharges: decimal("installation_charges", { precision: 10, scale: 2 }).default("0"),
  
  // Completion
  completionPhoto: text("completion_photo"),
  customerSignature: text("customer_signature"),
  customerFeedback: text("customer_feedback"),
  customerRating: integer("customer_rating"), // 1-5
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_installation_orders_tenant").on(table.tenantId),
  uniqueIndex("idx_installation_orders_number").on(table.tenantId, table.installationNumber),
  index("idx_installation_orders_customer").on(table.customerId),
  index("idx_installation_orders_delivery").on(table.deliveryOrderId),
  index("idx_installation_orders_status").on(table.tenantId, table.installationStatus),
]);

// ============================================
// FURNITURE: SALES ORDERS EXTENSION
// ============================================

// Sales orders for furniture (extends existing orders)
export const furnitureSalesOrders = pgTable("furniture_sales_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Order type
  orderType: varchar("order_type", { length: 20 }).notNull().default("retail"), // retail, wholesale, b2b
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, confirmed, processing, ready, delivered, completed, cancelled
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  deliveryCharges: decimal("delivery_charges", { precision: 12, scale: 2 }).default("0"),
  installationCharges: decimal("installation_charges", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Payments
  advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }).default("0"),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 12, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, partial, paid
  
  // Currency
  currency: varchar("currency", { length: 5 }).default("INR").notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }).default("1.000000"),
  
  // Delivery
  expectedDeliveryDate: date("expected_delivery_date"),
  deliveryAddress: text("delivery_address"),
  
  // Delivery order reference
  deliveryOrderId: varchar("delivery_order_id").references(() => deliveryOrders.id),
  
  // Installation required
  requiresInstallation: boolean("requires_installation").default(false),
  installationOrderId: varchar("installation_order_id").references(() => installationOrders.id),
  
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Sales person
  salesPersonId: varchar("sales_person_id").references(() => staff.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_furniture_sales_orders_tenant").on(table.tenantId),
  uniqueIndex("idx_furniture_sales_orders_number").on(table.tenantId, table.orderNumber),
  index("idx_furniture_sales_orders_customer").on(table.customerId),
  index("idx_furniture_sales_orders_status").on(table.tenantId, table.status),
]);

// Sales order line items
export const furnitureSalesOrderItems = pgTable("furniture_sales_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  salesOrderId: varchar("sales_order_id").notNull().references(() => furnitureSalesOrders.id, { onDelete: "cascade" }),
  
  productId: varchar("product_id").references(() => furnitureProducts.id),
  
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  
  // Custom dimensions (for made-to-order)
  customLength: decimal("custom_length", { precision: 10, scale: 2 }),
  customWidth: decimal("custom_width", { precision: 10, scale: 2 }),
  customHeight: decimal("custom_height", { precision: 10, scale: 2 }),
  customSpecifications: jsonb("custom_specifications").default({}),
  
  // Pricing
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  
  // HSN for GST
  hsnCode: varchar("hsn_code", { length: 20 }),
  
  // Link to production order (for made-to-order items)
  productionOrderId: varchar("production_order_id").references(() => productionOrders.id),
  
  // Delivery status per item
  deliveredQuantity: integer("delivered_quantity").default(0),
  
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_furniture_sales_items_order").on(table.salesOrderId),
  index("idx_furniture_sales_items_product").on(table.productId),
]);

// ============================================
// FURNITURE MODULE: INVOICES
// ============================================

// Furniture invoice status enum
export const furnitureInvoiceStatusEnum = pgEnum("furniture_invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded"
]);

// Furniture invoices table - comprehensive multi-currency and tax support
export const furnitureInvoices = pgTable("furniture_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Invoice identification
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceType: furnitureInvoiceTypeEnum("invoice_type").notNull().default("tax_invoice"),
  status: furnitureInvoiceStatusEnum("status").notNull().default("draft"),
  
  // Links
  salesOrderId: varchar("sales_order_id").references(() => furnitureSalesOrders.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Invoice dates
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  
  // Currency - invoice currency (what customer sees)
  currency: varchar("currency", { length: 5 }).notNull().default("INR"),
  
  // Base currency - tenant's base currency for reporting
  baseCurrency: varchar("base_currency", { length: 5 }).notNull().default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }).notNull().default("1.00000000"),
  exchangeRateId: varchar("exchange_rate_id").references(() => exchangeRates.id),
  exchangeRateDate: timestamp("exchange_rate_date"),
  
  // Amounts in invoice currency
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0"),
  deliveryCharges: decimal("delivery_charges", { precision: 12, scale: 2 }).default("0"),
  installationCharges: decimal("installation_charges", { precision: 12, scale: 2 }).default("0"),
  
  // Tax amounts - supports multiple tax types
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  
  // Country-specific tax breakdowns (stored in taxMetadata)
  // India: CGST, SGST, IGST
  // UAE: VAT
  // UK: VAT
  // Malaysia: SST (Sales Tax 10% / Service Tax 6%)
  // US: State Sales Tax
  taxMetadata: jsonb("tax_metadata").default({}),
  
  // Total amounts
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  
  // Amounts in base currency (for reporting)
  baseSubtotal: decimal("base_subtotal", { precision: 15, scale: 2 }),
  baseTaxAmount: decimal("base_tax_amount", { precision: 15, scale: 2 }),
  baseTotalAmount: decimal("base_total_amount", { precision: 15, scale: 2 }),
  
  // Payment tracking
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  balanceAmount: decimal("balance_amount", { precision: 15, scale: 2 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  lastPaymentDate: timestamp("last_payment_date"),
  
  // Customer billing details snapshot
  billingName: varchar("billing_name", { length: 255 }),
  billingAddress: text("billing_address"),
  billingCity: varchar("billing_city", { length: 100 }),
  billingState: varchar("billing_state", { length: 100 }),
  billingPostalCode: varchar("billing_postal_code", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 100 }),
  billingEmail: varchar("billing_email", { length: 255 }),
  billingPhone: varchar("billing_phone", { length: 50 }),
  
  // Customer tax registration (snapshot at invoice time)
  customerTaxId: varchar("customer_tax_id", { length: 50 }), // GSTIN, TRN, VAT number, SST number, EIN/TIN
  customerTaxIdType: varchar("customer_tax_id_type", { length: 20 }), // gstin, trn, vat, sst, ein
  
  // Tenant tax registration (snapshot at invoice time)
  tenantTaxId: varchar("tenant_tax_id", { length: 50 }),
  tenantTaxIdType: varchar("tenant_tax_id_type", { length: 20 }),
  tenantBusinessName: varchar("tenant_business_name", { length: 255 }),
  tenantAddress: text("tenant_address"),
  
  // PDF and document storage
  isLocked: boolean("is_locked").default(false), // Locked after finalization
  lockedAt: timestamp("locked_at"),
  pdfStorageKey: varchar("pdf_storage_key", { length: 500 }), // S3/GCS path
  pdfGeneratedAt: timestamp("pdf_generated_at"),
  pdfVersion: integer("pdf_version").default(1),
  
  // Notes
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Compliance metadata
  complianceCountry: varchar("compliance_country", { length: 5 }), // IN, AE, GB, MY, US
  complianceMetadata: jsonb("compliance_metadata").default({}), // Country-specific compliance data
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("idx_furniture_invoices_tenant").on(table.tenantId),
  uniqueIndex("idx_furniture_invoices_number").on(table.tenantId, table.invoiceNumber),
  index("idx_furniture_invoices_customer").on(table.customerId),
  index("idx_furniture_invoices_sales_order").on(table.salesOrderId),
  index("idx_furniture_invoices_status").on(table.tenantId, table.status),
  index("idx_furniture_invoices_date").on(table.tenantId, table.invoiceDate),
  index("idx_furniture_invoices_currency").on(table.tenantId, table.currency),
]);

// Furniture invoice items table
export const furnitureInvoiceItems = pgTable("furniture_invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => furnitureInvoices.id, { onDelete: "cascade" }),
  
  // Link to original sales order item
  salesOrderItemId: varchar("sales_order_item_id").references(() => furnitureSalesOrderItems.id),
  productId: varchar("product_id").references(() => furnitureProducts.id),
  
  // Item details
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).default("pcs"),
  
  // Pricing in invoice currency
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  
  // Tax details per line item
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  taxType: varchar("tax_type", { length: 20 }), // gst, vat, sst, sales_tax
  
  // Country-specific tax codes
  hsnCode: varchar("hsn_code", { length: 20 }), // India HSN/SAC
  taxCode: varchar("tax_code", { length: 50 }), // Generic tax code
  
  // Line total
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  
  // Tax breakdown for this item (India: CGST/SGST/IGST split, etc.)
  taxBreakdown: jsonb("tax_breakdown").default({}),
  
  sortOrder: integer("sort_order").default(0),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_furniture_invoice_items_invoice").on(table.invoiceId),
  index("idx_furniture_invoice_items_product").on(table.productId),
]);

// Furniture invoice payments tracking
export const furnitureInvoicePayments = pgTable("furniture_invoice_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => furnitureInvoices.id, { onDelete: "cascade" }),
  
  // Payment details
  paymentNumber: varchar("payment_number", { length: 50 }),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  
  // Amount in payment currency
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).notNull(),
  
  // If payment currency differs from invoice currency
  invoiceAmount: decimal("invoice_amount", { precision: 15, scale: 2 }),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 8 }),
  
  // Payment method
  paymentMethod: varchar("payment_method", { length: 50 }), // cash, card, bank_transfer, upi, cheque
  paymentReference: varchar("payment_reference", { length: 255 }),
  
  // Status
  status: varchar("status", { length: 20 }).default("completed"), // pending, completed, failed, refunded
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_furniture_invoice_payments_invoice").on(table.invoiceId),
  index("idx_furniture_invoice_payments_date").on(table.paymentDate),
]);

// ============================================
// RECURRING PAYMENTS & SCHEDULED BILLING
// ============================================

// Recurrence frequency enum
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "daily",
  "weekly", 
  "biweekly",
  "monthly",
  "quarterly",
  "yearly"
]);

// Recurring payment status enum
export const recurringPaymentStatusEnum = pgEnum("recurring_payment_status", [
  "active",
  "paused",
  "cancelled",
  "completed",
  "failed"
]);

// Recurring payment schedules
export const recurringPaymentSchedules = pgTable("recurring_payment_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Source - either linked to invoice or standalone subscription
  sourceInvoiceId: varchar("source_invoice_id").references(() => furnitureInvoices.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  
  // Subscription details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Recurrence configuration
  frequency: recurrenceFrequencyEnum("frequency").notNull().default("monthly"),
  intervalCount: integer("interval_count").notNull().default(1), // e.g., every 2 weeks
  
  // Amount and currency
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).notNull().default("INR"),
  
  // Payment method preferences
  preferredPaymentMethod: varchar("preferred_payment_method", { length: 50 }), // upi, card, bank_transfer
  paymentGateway: varchar("payment_gateway", { length: 50 }), // stripe, razorpay, etc.
  gatewaySubscriptionId: varchar("gateway_subscription_id", { length: 255 }), // External subscription ID
  
  // Schedule timing
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null = indefinite
  nextBillingDate: timestamp("next_billing_date").notNull(),
  lastBillingDate: timestamp("last_billing_date"),
  
  // Billing period tracking to prevent duplicates
  currentBillingPeriodStart: timestamp("current_billing_period_start"),
  currentBillingPeriodEnd: timestamp("current_billing_period_end"),
  
  // Status
  status: recurringPaymentStatusEnum("status").notNull().default("active"),
  
  // Payment history
  totalPaymentsMade: integer("total_payments_made").default(0),
  totalAmountPaid: decimal("total_amount_paid", { precision: 15, scale: 2 }).default("0"),
  failedPaymentCount: integer("failed_payment_count").default(0),
  lastPaymentStatus: varchar("last_payment_status", { length: 20 }),
  lastPaymentDate: timestamp("last_payment_date"),
  
  // Auto-invoice generation
  autoGenerateInvoice: boolean("auto_generate_invoice").default(true),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }),
  
  // Retry configuration
  maxRetryAttempts: integer("max_retry_attempts").default(3),
  retryIntervalMinutes: integer("retry_interval_minutes").default(1440), // 24 hours
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_recurring_schedule_tenant").on(table.tenantId),
  index("idx_recurring_schedule_customer").on(table.customerId),
  index("idx_recurring_schedule_next_billing").on(table.nextBillingDate),
  index("idx_recurring_schedule_status").on(table.status),
]);

// Recurring payment execution log
export const recurringPaymentExecutions = pgTable("recurring_payment_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => recurringPaymentSchedules.id, { onDelete: "cascade" }),
  
  // Billing period this execution covers
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  
  // Generated invoice (if auto-generate enabled)
  generatedInvoiceId: varchar("generated_invoice_id").references(() => furnitureInvoices.id),
  
  // Payment details
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 5 }).notNull(),
  
  // Execution status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  
  // Payment processing
  paymentId: varchar("payment_id").references(() => furnitureInvoicePayments.id),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  
  // Retry tracking
  attemptCount: integer("attempt_count").default(1),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorCode: varchar("error_code", { length: 50 }),
  
  executedAt: timestamp("executed_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_recurring_exec_schedule").on(table.scheduleId),
  index("idx_recurring_exec_status").on(table.status),
  index("idx_recurring_exec_period").on(table.billingPeriodStart, table.billingPeriodEnd),
]);

// Invoice reminder schedules
export const invoiceReminderSchedules = pgTable("invoice_reminder_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Name and description
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Timing: days relative to due date (negative = before, positive = after)
  daysFromDueDate: integer("days_from_due_date").notNull(), // -7 = 7 days before, 3 = 3 days after
  
  // Time of day to send (in tenant's timezone)
  sendTimeHour: integer("send_time_hour").default(9), // 0-23
  sendTimeMinute: integer("send_time_minute").default(0), // 0-59
  
  // Channel configuration
  channels: text("channels").array().notNull().default(sql`ARRAY['email']::text[]`), // email, whatsapp
  
  // Template to use (references notification templates)
  emailTemplateId: varchar("email_template_id").references(() => notificationTemplates.id),
  whatsappTemplateId: varchar("whatsapp_template_id").references(() => notificationTemplates.id),
  
  // Event type for notification
  eventType: varchar("event_type", { length: 50 }).default("payment_reminder"),
  
  // Conditions
  appliesTo: varchar("applies_to", { length: 20 }).default("all"), // all, overdue_only, upcoming_only
  minBalanceAmount: decimal("min_balance_amount", { precision: 15, scale: 2 }).default("0"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Retry configuration
  maxRetryAttempts: integer("max_retry_attempts").default(3),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("idx_reminder_schedule_tenant").on(table.tenantId),
  index("idx_reminder_schedule_active").on(table.isActive),
]);

// Scheduled reminder executions
export const scheduledReminderExecutions = pgTable("scheduled_reminder_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => invoiceReminderSchedules.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull().references(() => furnitureInvoices.id, { onDelete: "cascade" }),
  
  // Scheduled execution time
  scheduledFor: timestamp("scheduled_for").notNull(),
  
  // Execution status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, failed, skipped
  
  // Channels attempted
  emailSent: boolean("email_sent").default(false),
  whatsappSent: boolean("whatsapp_sent").default(false),
  
  // Link to notification logs
  emailNotificationLogId: varchar("email_notification_log_id").references(() => notificationLogs.id),
  whatsappNotificationLogId: varchar("whatsapp_notification_log_id").references(() => notificationLogs.id),
  
  // Retry tracking
  attemptCount: integer("attempt_count").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Error tracking
  errorMessage: text("error_message"),
  
  // Skip reason (if skipped)
  skipReason: varchar("skip_reason", { length: 255 }),
  
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_reminder_exec_schedule").on(table.scheduleId),
  index("idx_reminder_exec_invoice").on(table.invoiceId),
  index("idx_reminder_exec_scheduled").on(table.scheduledFor),
  index("idx_reminder_exec_status").on(table.status),
  uniqueIndex("idx_reminder_exec_unique").on(table.scheduleId, table.invoiceId, table.scheduledFor),
]);

// Scheduled billing jobs
export const scheduledBillingJobs = pgTable("scheduled_billing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Job type
  jobType: varchar("job_type", { length: 50 }).notNull(), // recurring_invoice, reminder_dispatch, overdue_check
  
  // Job configuration
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Schedule (cron-like configuration)
  cronExpression: varchar("cron_expression", { length: 100 }), // e.g., "0 9 * * *" for 9 AM daily
  frequency: varchar("frequency", { length: 20 }), // hourly, daily, weekly
  runAtHour: integer("run_at_hour").default(9), // 0-23
  runAtMinute: integer("run_at_minute").default(0), // 0-59
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  
  // Reference to related schedule (if applicable)
  recurringScheduleId: varchar("recurring_schedule_id").references(() => recurringPaymentSchedules.id),
  reminderScheduleId: varchar("reminder_schedule_id").references(() => invoiceReminderSchedules.id),
  
  // Execution tracking
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  lastRunStatus: varchar("last_run_status", { length: 20 }), // success, partial, failed
  lastRunError: text("last_run_error"),
  
  // Statistics
  totalRuns: integer("total_runs").default(0),
  successfulRuns: integer("successful_runs").default(0),
  failedRuns: integer("failed_runs").default(0),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_job_tenant").on(table.tenantId),
  index("idx_billing_job_next_run").on(table.nextRunAt),
  index("idx_billing_job_type").on(table.jobType),
  index("idx_billing_job_active").on(table.isActive),
]);

// Scheduled billing job execution log
export const scheduledBillingJobLogs = pgTable("scheduled_billing_job_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => scheduledBillingJobs.id, { onDelete: "cascade" }),
  
  // Execution details
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("running"), // running, success, partial, failed
  
  // Results
  itemsProcessed: integer("items_processed").default(0),
  itemsSucceeded: integer("items_succeeded").default(0),
  itemsFailed: integer("items_failed").default(0),
  
  // Details
  details: jsonb("details").default({}), // Detailed results per item
  errorMessage: text("error_message"),
  
  // Duration
  durationMs: integer("duration_ms"),
}, (table) => [
  index("idx_billing_job_log_job").on(table.jobId),
  index("idx_billing_job_log_started").on(table.startedAt),
]);

// ============================================
// MALAYSIA SST CONFIGURATION
// ============================================

export const malaysiaSstConfigurations = pgTable("malaysia_sst_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  
  // SST Registration
  sstNumber: varchar("sst_number", { length: 20 }), // SST registration number
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessAddress: text("business_address"),
  registrationDate: timestamp("registration_date"),
  
  // Tax types applicable
  isSalesTaxRegistered: boolean("is_sales_tax_registered").default(false), // 10% on goods
  isServiceTaxRegistered: boolean("is_service_tax_registered").default(false), // 6% on services
  
  // Default rates
  defaultSalesTaxRate: decimal("default_sales_tax_rate", { precision: 5, scale: 2 }).default("10.00"),
  defaultServiceTaxRate: decimal("default_service_tax_rate", { precision: 5, scale: 2 }).default("6.00"),
  
  // Tax codes for common furniture categories
  furnitureTariffCodes: jsonb("furniture_tariff_codes").default([]), // Malaysian tariff codes
  
  // Filing details
  returnFrequency: varchar("return_frequency", { length: 20 }).default("bimonthly"), // bimonthly
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// US STATE SALES TAX CONFIGURATION
// ============================================

export const usStateSalesTaxConfigurations = pgTable("us_state_sales_tax_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Business registration
  einNumber: varchar("ein_number", { length: 15 }), // Federal EIN
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessAddress: text("business_address"),
  
  // State where tenant has nexus
  stateCode: varchar("state_code", { length: 2 }).notNull(), // CA, NY, TX, etc.
  stateName: varchar("state_name", { length: 100 }),
  
  // State tax registration
  stateTaxId: varchar("state_tax_id", { length: 50 }), // State sales tax permit number
  registrationDate: timestamp("registration_date"),
  
  // Tax rates
  stateTaxRate: decimal("state_tax_rate", { precision: 5, scale: 3 }).notNull(), // e.g., 7.25% for CA
  countyTaxRate: decimal("county_tax_rate", { precision: 5, scale: 3 }).default("0"),
  cityTaxRate: decimal("city_tax_rate", { precision: 5, scale: 3 }).default("0"),
  specialDistrictRate: decimal("special_district_rate", { precision: 5, scale: 3 }).default("0"),
  combinedRate: decimal("combined_rate", { precision: 5, scale: 3 }), // Total combined rate
  
  // Exemptions
  exemptCategories: jsonb("exempt_categories").default([]), // Categories exempt from sales tax
  
  // Filing
  filingFrequency: varchar("filing_frequency", { length: 20 }).default("quarterly"), // monthly, quarterly, annual
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_us_state_tax_tenant").on(table.tenantId),
  uniqueIndex("idx_us_state_tax_tenant_state").on(table.tenantId, table.stateCode),
]);

// ============================================
// TENANT TAX REGISTRATIONS (Multi-country)
// ============================================

export const tenantTaxRegistrations = pgTable("tenant_tax_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // Country and registration type
  country: varchar("country", { length: 5 }).notNull(), // IN, AE, GB, MY, US
  taxType: varchar("tax_type", { length: 20 }).notNull(), // gst, vat, sst, sales_tax
  
  // Registration details
  registrationNumber: varchar("registration_number", { length: 50 }).notNull(),
  registrationName: varchar("registration_name", { length: 255 }),
  registrationDate: timestamp("registration_date"),
  expiryDate: timestamp("expiry_date"),
  
  // Address for this registration
  registeredAddress: text("registered_address"),
  stateOrRegion: varchar("state_or_region", { length: 100 }), // For India state code, US state, etc.
  
  // Default tax rate
  defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 2 }),
  
  // Additional metadata
  metadata: jsonb("metadata").default({}),
  
  isPrimary: boolean("is_primary").default(false),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tenant_tax_reg_tenant").on(table.tenantId),
  index("idx_tenant_tax_reg_country").on(table.tenantId, table.country),
  uniqueIndex("idx_tenant_tax_reg_number").on(table.tenantId, table.country, table.registrationNumber),
]);

// ============================================
// ANALYTICS & AI INSIGHTS
// ============================================

export const analyticsSnapshotTypeEnum = pgEnum("analytics_snapshot_type", [
  "daily",
  "weekly", 
  "monthly",
]);

export const aiInsightCategoryEnum = pgEnum("ai_insight_category", [
  "production",
  "sales",
  "payments",
  "operations",
  "inventory",
  "customer",
  "cashflow",
]);

export const aiInsightSeverityEnum = pgEnum("ai_insight_severity", [
  "info",
  "warning",
  "critical",
]);

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  snapshotDate: date("snapshot_date").notNull(),
  snapshotType: analyticsSnapshotTypeEnum("snapshot_type").notNull().default("daily"),
  
  // Production metrics
  productionOrdersTotal: integer("production_orders_total").default(0),
  productionOrdersDraft: integer("production_orders_draft").default(0),
  productionOrdersPending: integer("production_orders_pending").default(0),
  productionOrdersInProgress: integer("production_orders_in_progress").default(0),
  productionOrdersCompleted: integer("production_orders_completed").default(0),
  productionOrdersCancelled: integer("production_orders_cancelled").default(0),
  avgProductionTimeHours: decimal("avg_production_time_hours", { precision: 10, scale: 2 }),
  wastagePercentage: decimal("wastage_percentage", { precision: 5, scale: 2 }),
  
  // Sales metrics
  salesOrdersTotal: integer("sales_orders_total").default(0),
  salesOrdersCompleted: integer("sales_orders_completed").default(0),
  revenueTotal: decimal("revenue_total", { precision: 14, scale: 2 }).default("0"),
  revenueUsd: decimal("revenue_usd", { precision: 14, scale: 2 }).default("0"),
  orderConversionRate: decimal("order_conversion_rate", { precision: 5, scale: 2 }),
  topProductsSold: jsonb("top_products_sold").default([]),
  
  // Payment metrics
  invoicesTotal: integer("invoices_total").default(0),
  invoicesPaid: integer("invoices_paid").default(0),
  invoicesOverdue: integer("invoices_overdue").default(0),
  invoicesPartiallyPaid: integer("invoices_partially_paid").default(0),
  totalReceivables: decimal("total_receivables", { precision: 14, scale: 2 }).default("0"),
  totalReceivablesUsd: decimal("total_receivables_usd", { precision: 14, scale: 2 }).default("0"),
  avgPaymentDelayDays: decimal("avg_payment_delay_days", { precision: 6, scale: 2 }),
  paymentsReceived: decimal("payments_received", { precision: 14, scale: 2 }).default("0"),
  paymentsReceivedUsd: decimal("payments_received_usd", { precision: 14, scale: 2 }).default("0"),
  
  // Operations metrics
  deliveriesTotal: integer("deliveries_total").default(0),
  deliveriesOnTime: integer("deliveries_on_time").default(0),
  deliveriesLate: integer("deliveries_late").default(0),
  deliveryOnTimeRate: decimal("delivery_on_time_rate", { precision: 5, scale: 2 }),
  installationsTotal: integer("installations_total").default(0),
  installationsCompleted: integer("installations_completed").default(0),
  installationCompletionRate: decimal("installation_completion_rate", { precision: 5, scale: 2 }),
  avgInstallationRating: decimal("avg_installation_rating", { precision: 3, scale: 2 }),
  
  // Raw data for drill-down
  rawMetrics: jsonb("raw_metrics").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_analytics_snapshots_tenant").on(table.tenantId),
  index("idx_analytics_snapshots_date").on(table.tenantId, table.snapshotDate),
  uniqueIndex("idx_analytics_snapshots_unique").on(table.tenantId, table.snapshotDate, table.snapshotType),
]);

export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  category: aiInsightCategoryEnum("category").notNull(),
  severity: aiInsightSeverityEnum("severity").notNull().default("info"),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // Data supporting the insight
  supportingData: jsonb("supporting_data").default({}),
  
  // Related entities
  relatedEntityType: varchar("related_entity_type", { length: 50 }),
  relatedEntityId: varchar("related_entity_id"),
  
  // Metrics
  metricValue: decimal("metric_value", { precision: 14, scale: 4 }),
  metricUnit: varchar("metric_unit", { length: 50 }),
  comparisonValue: decimal("comparison_value", { precision: 14, scale: 4 }),
  changePercentage: decimal("change_percentage", { precision: 8, scale: 2 }),
  
  // Time context
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  // Status
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  
  // Expiry
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ai_insights_tenant").on(table.tenantId),
  index("idx_ai_insights_category").on(table.tenantId, table.category),
  index("idx_ai_insights_severity").on(table.tenantId, table.severity),
  index("idx_ai_insights_created").on(table.tenantId, table.createdAt),
]);

// ============================================
// FURNITURE MODULE: INSERT SCHEMAS
// ============================================

export const insertFurnitureInvoiceSchema = createInsertSchema(furnitureInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFurnitureInvoiceItemSchema = createInsertSchema(furnitureInvoiceItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFurnitureInvoicePaymentSchema = createInsertSchema(furnitureInvoicePayments).omit({
  id: true,
  createdAt: true,
});

export const insertMalaysiaSstConfigurationSchema = createInsertSchema(malaysiaSstConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUsStateSalesTaxConfigurationSchema = createInsertSchema(usStateSalesTaxConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantTaxRegistrationSchema = createInsertSchema(tenantTaxRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFurnitureProductSchema = createInsertSchema(furnitureProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertRawMaterialCategorySchema = createInsertSchema(rawMaterialCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertRawMaterialStockMovementSchema = createInsertSchema(rawMaterialStockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertBillOfMaterialsSchema = createInsertSchema(billOfMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertBomComponentSchema = createInsertSchema(bomComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertProductionStageSchema = createInsertSchema(productionStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertDeliveryOrderItemSchema = createInsertSchema(deliveryOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertInstallationOrderSchema = createInsertSchema(installationOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFurnitureSalesOrderSchema = createInsertSchema(furnitureSalesOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFurnitureSalesOrderItemSchema = createInsertSchema(furnitureSalesOrderItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringPaymentScheduleSchema = createInsertSchema(recurringPaymentSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecurringPaymentExecutionSchema = createInsertSchema(recurringPaymentExecutions).omit({
  id: true,
  executedAt: true,
});

export const insertInvoiceReminderScheduleSchema = createInsertSchema(invoiceReminderSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduledReminderExecutionSchema = createInsertSchema(scheduledReminderExecutions).omit({
  id: true,
  createdAt: true,
});

export const insertScheduledBillingJobSchema = createInsertSchema(scheduledBillingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduledBillingJobLogSchema = createInsertSchema(scheduledBillingJobLogs).omit({
  id: true,
  startedAt: true,
});

// ============================================
// FURNITURE MODULE: TYPES
// ============================================

export type FurnitureProduct = typeof furnitureProducts.$inferSelect;
export type InsertFurnitureProduct = z.infer<typeof insertFurnitureProductSchema>;

export type RawMaterialCategory = typeof rawMaterialCategories.$inferSelect;
export type InsertRawMaterialCategory = z.infer<typeof insertRawMaterialCategorySchema>;

export type RawMaterial = typeof rawMaterials.$inferSelect;
export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;

export type RawMaterialStockMovement = typeof rawMaterialStockMovements.$inferSelect;
export type InsertRawMaterialStockMovement = z.infer<typeof insertRawMaterialStockMovementSchema>;

export type BillOfMaterials = typeof billOfMaterials.$inferSelect;
export type InsertBillOfMaterials = z.infer<typeof insertBillOfMaterialsSchema>;

export type BomComponent = typeof bomComponents.$inferSelect;
export type InsertBomComponent = z.infer<typeof insertBomComponentSchema>;

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;

export type ProductionStage = typeof productionStages.$inferSelect;
export type InsertProductionStage = z.infer<typeof insertProductionStageSchema>;

export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;

export type DeliveryOrderItem = typeof deliveryOrderItems.$inferSelect;
export type InsertDeliveryOrderItem = z.infer<typeof insertDeliveryOrderItemSchema>;

export type InstallationOrder = typeof installationOrders.$inferSelect;
export type InsertInstallationOrder = z.infer<typeof insertInstallationOrderSchema>;

export type FurnitureSalesOrder = typeof furnitureSalesOrders.$inferSelect;
export type InsertFurnitureSalesOrder = z.infer<typeof insertFurnitureSalesOrderSchema>;

export type FurnitureSalesOrderItem = typeof furnitureSalesOrderItems.$inferSelect;
export type InsertFurnitureSalesOrderItem = z.infer<typeof insertFurnitureSalesOrderItemSchema>;

export type FurnitureInvoice = typeof furnitureInvoices.$inferSelect;
export type InsertFurnitureInvoice = z.infer<typeof insertFurnitureInvoiceSchema>;

export type FurnitureInvoiceItem = typeof furnitureInvoiceItems.$inferSelect;
export type InsertFurnitureInvoiceItem = z.infer<typeof insertFurnitureInvoiceItemSchema>;

export type FurnitureInvoicePayment = typeof furnitureInvoicePayments.$inferSelect;
export type InsertFurnitureInvoicePayment = z.infer<typeof insertFurnitureInvoicePaymentSchema>;

export type MalaysiaSstConfiguration = typeof malaysiaSstConfigurations.$inferSelect;
export type InsertMalaysiaSstConfiguration = z.infer<typeof insertMalaysiaSstConfigurationSchema>;

export type UsStateSalesTaxConfiguration = typeof usStateSalesTaxConfigurations.$inferSelect;
export type InsertUsStateSalesTaxConfiguration = z.infer<typeof insertUsStateSalesTaxConfigurationSchema>;

export type TenantTaxRegistration = typeof tenantTaxRegistrations.$inferSelect;
export type InsertTenantTaxRegistration = z.infer<typeof insertTenantTaxRegistrationSchema>;

export type RecurringPaymentSchedule = typeof recurringPaymentSchedules.$inferSelect;
export type InsertRecurringPaymentSchedule = z.infer<typeof insertRecurringPaymentScheduleSchema>;

export type RecurringPaymentExecution = typeof recurringPaymentExecutions.$inferSelect;
export type InsertRecurringPaymentExecution = z.infer<typeof insertRecurringPaymentExecutionSchema>;

export type InvoiceReminderSchedule = typeof invoiceReminderSchedules.$inferSelect;
export type InsertInvoiceReminderSchedule = z.infer<typeof insertInvoiceReminderScheduleSchema>;

export type ScheduledReminderExecution = typeof scheduledReminderExecutions.$inferSelect;
export type InsertScheduledReminderExecution = z.infer<typeof insertScheduledReminderExecutionSchema>;

export type ScheduledBillingJob = typeof scheduledBillingJobs.$inferSelect;
export type InsertScheduledBillingJob = z.infer<typeof insertScheduledBillingJobSchema>;

export type ScheduledBillingJobLog = typeof scheduledBillingJobLogs.$inferSelect;
export type InsertScheduledBillingJobLog = z.infer<typeof insertScheduledBillingJobLogSchema>;

// Analytics types
export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type InsertAiInsight = z.infer<typeof insertAiInsightSchema>;

// ============================================
// IN-APP NOTIFICATIONS
// ============================================

export const inAppNotificationTypeEnum = pgEnum("in_app_notification_type", [
  "system",       // Platform-wide announcements
  "alert",        // Important alerts requiring attention
  "info",         // Informational messages
  "success",      // Success confirmations
  "warning",      // Warnings
  "action",       // Action required by user
  "reminder",     // Reminders
]);

export const inAppNotificationSeverityEnum = pgEnum("in_app_notification_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const inAppNotifications = pgTable("in_app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: inAppNotificationTypeEnum("type").default("info"),
  severity: inAppNotificationSeverityEnum("severity").default("low"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  metadata: jsonb("metadata").default({}),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_in_app_notifications_tenant_id").on(table.tenantId),
  index("idx_in_app_notifications_user_id").on(table.userId),
  index("idx_in_app_notifications_is_read").on(table.isRead),
  index("idx_in_app_notifications_created_at").on(table.createdAt),
  index("idx_in_app_notifications_user_unread").on(table.userId, table.isRead),
]);

export const insertInAppNotificationSchema = createInsertSchema(inAppNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = z.infer<typeof insertInAppNotificationSchema>;

// ============================================
// SOFTWARE SERVICES & CONSULTING MODULES
// ============================================

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
  "archived"
]);

// Project billing model enum
export const projectBillingModelEnum = pgEnum("project_billing_model", [
  "fixed_price",
  "time_and_materials",
  "retainer",
  "milestone_based",
  "hybrid"
]);

// Task status enum
export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "completed",
  "cancelled"
]);

// Task priority enum
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
  "critical"
]);

// Timesheet status enum
export const timesheetStatusEnum = pgEnum("timesheet_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "billed"
]);

// Projects table - tenant-scoped project management
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "set null" }),
  
  // Project details
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  status: projectStatusEnum("status").default("draft"),
  
  // Billing configuration
  billingModel: projectBillingModelEnum("billing_model").default("time_and_materials"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  fixedBudget: decimal("fixed_budget", { precision: 15, scale: 2 }),
  currency: text("currency").default("USD"),
  
  // Timeline
  startDate: date("start_date"),
  endDate: date("end_date"),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }).default("0"),
  
  // Team assignment
  projectManagerId: varchar("project_manager_id").references(() => users.id),
  teamMemberIds: jsonb("team_member_ids").default([]),
  
  // Metadata
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_projects_tenant_id").on(table.tenantId),
  index("idx_projects_customer_id").on(table.customerId),
  index("idx_projects_status").on(table.status),
  index("idx_projects_billing_model").on(table.billingModel),
  index("idx_projects_manager").on(table.projectManagerId),
  uniqueIndex("idx_projects_tenant_code").on(table.tenantId, table.code),
]);

// Project Tasks table - tasks and milestones within projects
export const projectTasks = pgTable("project_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentTaskId: varchar("parent_task_id"),
  
  // Task details
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("backlog"),
  priority: taskPriorityEnum("priority").default("medium"),
  isMilestone: boolean("is_milestone").default(false),
  
  // Assignment
  assigneeId: varchar("assignee_id").references(() => users.id),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  
  // Effort tracking
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  loggedHours: decimal("logged_hours", { precision: 10, scale: 2 }).default("0"),
  
  // Timeline
  dueDate: date("due_date"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Billing
  isBillable: boolean("is_billable").default(true),
  hourlyRateOverride: decimal("hourly_rate_override", { precision: 10, scale: 2 }),
  
  // Ordering
  sortOrder: integer("sort_order").default(0),
  
  // Metadata
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_tasks_tenant_id").on(table.tenantId),
  index("idx_project_tasks_project_id").on(table.projectId),
  index("idx_project_tasks_parent").on(table.parentTaskId),
  index("idx_project_tasks_status").on(table.status),
  index("idx_project_tasks_assignee").on(table.assigneeId),
  index("idx_project_tasks_priority").on(table.priority),
  index("idx_project_tasks_due_date").on(table.dueDate),
]);

// Timesheets table - time tracking for projects/tasks
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => projectTasks.id, { onDelete: "set null" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Time entry details
  date: date("date").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  description: text("description"),
  
  // Status and approval
  status: timesheetStatusEnum("status").default("draft"),
  submittedAt: timestamp("submitted_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Billing
  isBillable: boolean("is_billable").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  invoiceId: varchar("invoice_id"),
  billedAt: timestamp("billed_at"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_timesheets_tenant_id").on(table.tenantId),
  index("idx_timesheets_project_id").on(table.projectId),
  index("idx_timesheets_task_id").on(table.taskId),
  index("idx_timesheets_user_id").on(table.userId),
  index("idx_timesheets_date").on(table.date),
  index("idx_timesheets_status").on(table.status),
  index("idx_timesheets_billable").on(table.isBillable),
  index("idx_timesheets_invoice").on(table.invoiceId),
  index("idx_timesheets_user_date").on(table.userId, table.date),
]);

// Invoice Project Links - connects invoices to projects/timesheets without duplicating invoice logic
export const invoiceProjectLinks = pgTable("invoice_project_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id").notNull(),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  
  // Link details
  totalHours: decimal("total_hours", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  dateRangeStart: date("date_range_start"),
  dateRangeEnd: date("date_range_end"),
  
  // Grouping info for billing
  groupingType: varchar("grouping_type", { length: 20 }).default("flat"),
  timesheetIds: jsonb("timesheet_ids").default([]),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoice_project_links_tenant_id").on(table.tenantId),
  index("idx_invoice_project_links_invoice_id").on(table.invoiceId),
  index("idx_invoice_project_links_project_id").on(table.projectId),
  uniqueIndex("idx_invoice_project_links_unique").on(table.invoiceId, table.projectId),
]);

// Insert schemas for new tables
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  actualHours: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  loggedHours: true,
  startedAt: true,
  completedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  approvedAt: true,
  approvedBy: true,
  rejectedAt: true,
  rejectedBy: true,
  billedAt: true,
  totalAmount: true,
});

export const insertInvoiceProjectLinkSchema = createInsertSchema(invoiceProjectLinks).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type InvoiceProjectLink = typeof invoiceProjectLinks.$inferSelect;
export type InsertInvoiceProjectLink = z.infer<typeof insertInvoiceProjectLinkSchema>;

// ============================================
// WAITLIST
// ============================================

export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  countryCode: varchar("country_code", { length: 10 }).notNull(),
  source: varchar("source", { length: 50 }).default("landing"),
  referrer: text("referrer"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_waitlist_email").on(table.email),
  index("idx_waitlist_country").on(table.countryCode),
  uniqueIndex("idx_waitlist_email_country").on(table.email, table.countryCode),
]);

export type Waitlist = typeof waitlist.$inferSelect;

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});

export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;

// ============================================
// PROMO/COUPON ENGINE
// ============================================

export const promoAppliesEnum = pgEnum("promo_applies", ["plan", "addon", "bundle", "any"]);
export const discountTypeEnum = pgEnum("discount_type", ["flat", "percent"]);

export const billingPromos = pgTable("billing_promos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  appliesTo: promoAppliesEnum("applies_to").default("any"),
  targetIds: jsonb("target_ids").default([]),
  
  discountType: discountTypeEnum("discount_type").default("percent"),
  discountValue: integer("discount_value").notNull(),
  maxDiscountAmount: integer("max_discount_amount"),
  minAmount: integer("min_amount"),
  
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  
  usageLimitTotal: integer("usage_limit_total"),
  usageLimitPerTenant: integer("usage_limit_per_tenant").default(1),
  usageCount: integer("usage_count").default(0),
  
  allowStacking: boolean("allow_stacking").default(false),
  isActive: boolean("is_active").default(true),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_billing_promos_code").on(table.code),
  index("idx_billing_promos_active").on(table.isActive),
  index("idx_billing_promos_dates").on(table.startAt, table.endAt),
]);

export const billingPromoRedemptions = pgTable("billing_promo_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoId: varchar("promo_id").notNull().references(() => billingPromos.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  paymentId: varchar("payment_id"),
  
  amountBefore: integer("amount_before").notNull(),
  discountAmount: integer("discount_amount").notNull(),
  amountAfter: integer("amount_after").notNull(),
  
  appliedTo: promoAppliesEnum("applied_to"),
  targetId: varchar("target_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_promo_redemptions_promo_id").on(table.promoId),
  index("idx_promo_redemptions_tenant_id").on(table.tenantId),
  index("idx_promo_redemptions_payment_id").on(table.paymentId),
]);

export type BillingPromo = typeof billingPromos.$inferSelect;
export type BillingPromoRedemption = typeof billingPromoRedemptions.$inferSelect;

export const insertBillingPromoSchema = createInsertSchema(billingPromos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  usageCount: true,
});

export const insertBillingPromoRedemptionSchema = createInsertSchema(billingPromoRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertBillingPromo = z.infer<typeof insertBillingPromoSchema>;
export type InsertBillingPromoRedemption = z.infer<typeof insertBillingPromoRedemptionSchema>;

// ============================================
// COUNTRY ROLLOUT POLICY (extends platformRegionConfigs for granular control)
// ============================================

export const payrollStatusEnum = pgEnum("payroll_status", ["disabled", "beta", "live"]);
export const rolloutStatusEnum = pgEnum("rollout_status", ["coming_soon", "beta", "live"]);

// Feature flags type for enabled_features JSONB
export type RolloutFeatures = {
  hrms?: boolean;
  payroll?: boolean;
  whatsapp_automation?: boolean;
  gst_invoicing?: boolean;
  sms_notifications?: boolean;
  [key: string]: boolean | undefined;
};

export const countryRolloutPolicy = pgTable("country_rollout_policy", {
  countryCode: varchar("country_code", { length: 5 }).primaryKey(),
  isActive: boolean("is_active").default(false),
  status: rolloutStatusEnum("status").default("coming_soon"),
  enabledBusinessTypes: jsonb("enabled_business_types").$type<string[]>().default([]),
  enabledModules: jsonb("enabled_modules").$type<string[]>().default([]),
  enabledFeatures: jsonb("enabled_features").$type<RolloutFeatures>().default({}),
  disabledFeatures: jsonb("disabled_features").$type<string[]>().default([]),
  enabledAddons: jsonb("enabled_addons").$type<string[]>().default([]),
  enabledPlans: jsonb("enabled_plans").$type<string[]>().default([]),
  comingSoonMessage: text("coming_soon_message"),
  payrollStatus: payrollStatusEnum("payroll_status").default("disabled"),
  payrollCohortTenantIds: jsonb("payroll_cohort_tenant_ids").$type<string[]>().default([]),
  payrollDisclaimerText: text("payroll_disclaimer_text"),
  notes: text("notes"),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CountryRolloutPolicy = typeof countryRolloutPolicy.$inferSelect;

export const insertCountryRolloutPolicySchema = createInsertSchema(countryRolloutPolicy).omit({
  updatedAt: true,
});

export type InsertCountryRolloutPolicy = z.infer<typeof insertCountryRolloutPolicySchema>;

// ============================================
// EMPLOYEE PORTAL (Self-Service)
// ============================================

export const employeePortalInvites = pgTable("employee_portal_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  email: text("email").notNull(),
  inviteToken: varchar("invite_token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_emp_portal_inv_tenant").on(table.tenantId),
  index("idx_emp_portal_inv_employee").on(table.employeeId),
  index("idx_emp_portal_inv_token").on(table.inviteToken),
]);

export const employeePortalSessions = pgTable("employee_portal_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  sessionToken: varchar("session_token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_emp_portal_sess_tenant").on(table.tenantId),
  index("idx_emp_portal_sess_employee").on(table.employeeId),
  index("idx_emp_portal_sess_token").on(table.sessionToken),
]);

export type EmployeePortalInvite = typeof employeePortalInvites.$inferSelect;
export type EmployeePortalSession = typeof employeePortalSessions.$inferSelect;

export const insertEmployeePortalInviteSchema = createInsertSchema(employeePortalInvites).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeePortalSessionSchema = createInsertSchema(employeePortalSessions).omit({
  id: true,
  createdAt: true,
});

// ============================================
// SUPER ADMIN: Delete Jobs (Background Processing)
// ============================================

export const deleteJobStatusEnum = pgEnum("delete_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const deleteJobTargetTypeEnum = pgEnum("delete_job_target_type", [
  "tenant",
  "user",
]);

export const deleteJobModeEnum = pgEnum("delete_job_mode", [
  "soft_delete",    // Mark as deleted, retain data
  "hard_delete",    // Permanently delete all data
  "anonymize",      // Keep records but remove PII
]);

export const deleteJobs = pgTable("delete_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: deleteJobTargetTypeEnum("target_type").notNull(),
  targetId: varchar("target_id").notNull(),
  tenantId: varchar("tenant_id"),
  mode: deleteJobModeEnum("mode").notNull().default("hard_delete"),
  status: deleteJobStatusEnum("status").notNull().default("queued"),
  requestedBy: varchar("requested_by").notNull(),
  reason: text("reason").notNull(),
  confirmText: varchar("confirm_text", { length: 255 }),
  progress: integer("progress").default(0),
  currentStep: varchar("current_step", { length: 255 }),
  totalSteps: integer("total_steps").default(0),
  summary: jsonb("summary").default({}),
  errorMessage: text("error_message"),
  queuedAt: timestamp("queued_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_delete_jobs_status").on(table.status),
  index("idx_delete_jobs_target").on(table.targetType, table.targetId),
  index("idx_delete_jobs_tenant").on(table.tenantId),
  index("idx_delete_jobs_requested_by").on(table.requestedBy),
]);

export type DeleteJob = typeof deleteJobs.$inferSelect;
export type InsertDeleteJob = typeof deleteJobs.$inferInsert;

export const insertDeleteJobSchema = createInsertSchema(deleteJobs).omit({
  id: true,
  queuedAt: true,
  startedAt: true,
  completedAt: true,
  progress: true,
  currentStep: true,
  totalSteps: true,
  summary: true,
  errorMessage: true,
});

// Delete job summary types for UI preview
export type DeleteSummary = {
  tableName: string;
  count: number;
  description: string;
};

export type TenantDeleteSummary = {
  tenantId: string;
  tenantName: string;
  isProtected: boolean;
  tables: DeleteSummary[];
  totalRecords: number;
};

export type UserDeleteSummary = {
  userId: string;
  userEmail: string;
  tenantId: string;
  tables: DeleteSummary[];
  totalRecords: number;
};
