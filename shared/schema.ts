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
export const businessTypeEnum = pgEnum("business_type", ["clinic", "salon", "pg", "coworking", "service"]);
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

export const tenantDomains = pgTable("tenant_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tenant_domains_tenant").on(table.tenantId),
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
export const insertTenantDomainSchema = createInsertSchema(tenantDomains).omit({ id: true, createdAt: true });
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
