import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, time, pgEnum, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";
import { users } from "./models/auth";

// Re-export SSO models
export * from "./models/sso";

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
  "legal"
]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "login", "logout", "access"]);
export const tenantCountryEnum = pgEnum("tenant_country", ["india", "uae", "uk", "malaysia", "singapore", "other"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "suspended", "cancelled"]);
export const tenantRegionEnum = pgEnum("tenant_region", ["asia_pacific", "middle_east", "europe"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "sms", "whatsapp", "push"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "delivered", "failed"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "pending", "paid", "partial", "overdue", "cancelled", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "upi", "netbanking", "wallet", "other"]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "expired", "suspended", "cancelled"]);
export const appointmentTypeEnum = pgEnum("appointment_type", ["walk_in", "online", "phone"]);
export const patientGenderEnum = pgEnum("patient_gender", ["male", "female", "other"]);

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("idx_tenants_country").on(table.country),
  index("idx_tenants_region").on(table.region),
  index("idx_tenants_status").on(table.status),
]);

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
  businessHours: jsonb("business_hours").default({}),
  bookingRules: jsonb("booking_rules").default({}),
  notificationSettings: jsonb("notification_settings").default({}),
  paymentSettings: jsonb("payment_settings").default({}),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  subject: text("subject"),
  body: text("body").notNull(),
  variables: jsonb("variables").default([]),
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_notification_templates_unique").on(table.tenantId, table.code, table.channel),
]);

export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => notificationTemplates.id),
  channel: notificationChannelEnum("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: notificationStatusEnum("status").default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notification_logs_tenant").on(table.tenantId),
  index("idx_notification_logs_status").on(table.status),
  index("idx_notification_logs_created").on(table.createdAt),
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
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
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
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
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
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "suspended", "cancelled", "trialing"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "quarterly", "yearly"]);
export const currencyEnum = pgEnum("currency_code", ["INR", "AED", "GBP", "MYR", "SGD", "USD"]);

// Global pricing plans (platform-level)
export const globalPricingPlans = pgTable("global_pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  tier: varchar("tier", { length: 20 }).notNull(), // free, starter, pro, enterprise
  billingCycle: billingCycleEnum("billing_cycle").default("monthly"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(), // in USD
  maxUsers: integer("max_users").default(5),
  maxCustomers: integer("max_customers").default(100),
  features: jsonb("features").default([]),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_global_pricing_plans_tier").on(table.tier),
  index("idx_global_pricing_plans_active").on(table.isActive),
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
  "api_calls"
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
// INSERT SCHEMAS
// ============================================

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantDomainSchema = createInsertSchema(tenantDomains).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSettingsSchema = createInsertSchema(tenantSettings).omit({ id: true, createdAt: true, updatedAt: true });
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
export const insertPlanLocalPriceSchema = createInsertSchema(planLocalPrices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });
export const insertPaymentAttemptSchema = createInsertSchema(paymentAttempts).omit({ id: true, createdAt: true });

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

// ============================================
// TYPES
// ============================================

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type TenantDomain = typeof tenantDomains.$inferSelect;
export type InsertTenantDomain = z.infer<typeof insertTenantDomainSchema>;

export type TenantSettings = typeof tenantSettings.$inferSelect;
export type InsertTenantSettings = z.infer<typeof insertTenantSettingsSchema>;

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

export type PlanLocalPrice = typeof planLocalPrices.$inferSelect;
export type InsertPlanLocalPrice = z.infer<typeof insertPlanLocalPriceSchema>;

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;

export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = z.infer<typeof insertSubscriptionInvoiceSchema>;

export type TransactionLog = typeof transactionLogs.$inferSelect;
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type InsertPaymentAttempt = z.infer<typeof insertPaymentAttemptSchema>;

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

// Insert schemas for Real Estate
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export const insertListingSchema = createInsertSchema(listings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRealEstateLeadSchema = createInsertSchema(realEstateLeads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiteVisitSchema = createInsertSchema(siteVisits).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });

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
