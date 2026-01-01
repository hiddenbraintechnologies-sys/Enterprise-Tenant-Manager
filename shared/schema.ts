import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, time, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "staff"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "partial", "paid", "refunded"]);

// Tenants (Business organizations)
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(), // pg, salon, gym, coaching, service
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3B82F6"),
  timezone: text("timezone").default("Asia/Kolkata"),
  currency: text("currency").default("INR"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff members linked to tenants
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: userRoleEnum("role").default("staff"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Import users table from auth
import { users } from "./models/auth";

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services offered by tenants
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull().default(60), // in minutes
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  staff: many(staff),
  customers: many(customers),
  services: many(services),
  bookings: many(bookings),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, { fields: [staff.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  bookings: many(bookings),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [bookings.customerId], references: [customers.id] }),
  service: one(services, { fields: [bookings.serviceId], references: [services.id] }),
  staff: one(staff, { fields: [bookings.staffId], references: [staff.id] }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Extended types for joins
export type BookingWithDetails = Booking & {
  customer: Customer;
  service: Service;
  staff: Staff | null;
};
