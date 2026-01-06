import { 
  tenants, customers, services, bookings, staff,
  notificationTemplates, notificationLogs,
  invoices, invoiceItems, payments,
  inventoryCategories, inventoryItems, inventoryTransactions,
  membershipPlans, customerMemberships,
  spaces, desks, deskBookings,
  patients, doctors, appointments, medicalRecords,
  platformAdmins, platformAdminPermissions, platformAdminPermissionAssignments,
  platformRegionConfigs, exchangeRates,
  supportTickets, supportTicketMessages, errorLogs, usageMetrics,
  auditLogs, userTenants,
  type Tenant, type InsertTenant,
  type Customer, type InsertCustomer,
  type Service, type InsertService,
  type Booking, type InsertBooking,
  type Staff, type InsertStaff,
  type BookingWithDetails,
  type NotificationTemplate, type InsertNotificationTemplate,
  type NotificationLog, type InsertNotificationLog,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Payment, type InsertPayment,
  type InventoryCategory, type InsertInventoryCategory,
  type InventoryItem, type InsertInventoryItem,
  type InventoryTransaction, type InsertInventoryTransaction,
  type MembershipPlan, type InsertMembershipPlan,
  type CustomerMembership, type InsertCustomerMembership,
  type Space, type InsertSpace,
  type Desk, type InsertDesk,
  type DeskBooking, type InsertDeskBooking,
  type Patient, type InsertPatient,
  type Doctor, type InsertDoctor,
  type Appointment, type InsertAppointment,
  type MedicalRecord, type InsertMedicalRecord,
  type PlatformAdmin, type PlatformAdminRole,
  type PlatformAdminPermission, type PlatformAdminPermissionAssignment,
  type PlatformRegionConfig, type InsertPlatformRegionConfig,
  type ExchangeRate, type InsertExchangeRate,
  type SupportTicket, type InsertSupportTicket,
  type SupportTicketMessage, type InsertSupportTicketMessage,
  type ErrorLog, type InsertErrorLog,
  type UsageMetric, type InsertUsageMetric,
  type AuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getOrCreateDefaultTenant(): Promise<Tenant>;

  // Customers
  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(id: string, tenantId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, tenantId: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string, tenantId: string): Promise<void>;

  // Services
  getServices(tenantId: string): Promise<Service[]>;
  getService(id: string, tenantId: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, tenantId: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string, tenantId: string): Promise<void>;

  // Bookings
  getBookings(tenantId: string): Promise<BookingWithDetails[]>;
  getUpcomingBookings(tenantId: string, limit?: number): Promise<BookingWithDetails[]>;
  getBooking(id: string, tenantId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, tenantId: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string, tenantId: string): Promise<void>;

  // Dashboard stats
  getDashboardStats(tenantId: string): Promise<{
    totalCustomers: number;
    totalBookings: number;
    todayBookings: number;
    monthlyRevenue: number;
    revenueGrowth: number;
  }>;

  // Analytics
  getAnalytics(tenantId: string): Promise<{
    totalRevenue: number;
    totalBookings: number;
    totalCustomers: number;
    totalServices: number;
    completedBookings: number;
    cancelledBookings: number;
    averageBookingValue: number;
    revenueByMonth: { month: string; revenue: number }[];
    bookingsByStatus: { status: string; count: number }[];
    topServices: { name: string; bookings: number; revenue: number }[];
    recentTrend: { date: string; bookings: number; revenue: number }[];
  }>;

  // Notification Templates
  getNotificationTemplates(tenantId: string): Promise<NotificationTemplate[]>;
  getNotificationTemplate(id: string, tenantId: string): Promise<NotificationTemplate | undefined>;
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, tenantId: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined>;
  deleteNotificationTemplate(id: string, tenantId: string): Promise<void>;

  // Notification Logs
  getNotificationLogs(tenantId: string, limit?: number): Promise<NotificationLog[]>;
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLog(id: string, tenantId: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog | undefined>;

  // Invoices
  getInvoices(tenantId: string): Promise<Invoice[]>;
  getInvoice(id: string, tenantId: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, tenantId: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string, tenantId: string): Promise<void>;

  // Invoice Items
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItems(invoiceId: string): Promise<void>;

  // Payments
  getPayments(tenantId: string): Promise<Payment[]>;
  getPayment(id: string, tenantId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, tenantId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Inventory Categories
  getInventoryCategories(tenantId: string): Promise<InventoryCategory[]>;
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  updateInventoryCategory(id: string, tenantId: string, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined>;
  deleteInventoryCategory(id: string, tenantId: string): Promise<void>;

  // Inventory Items
  getInventoryItems(tenantId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: string, tenantId: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, tenantId: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string, tenantId: string): Promise<void>;

  // Inventory Transactions
  getInventoryTransactions(itemId: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;

  // Membership Plans
  getMembershipPlans(tenantId: string): Promise<MembershipPlan[]>;
  getMembershipPlan(id: string, tenantId: string): Promise<MembershipPlan | undefined>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
  updateMembershipPlan(id: string, tenantId: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan | undefined>;
  deleteMembershipPlan(id: string, tenantId: string): Promise<void>;

  // Customer Memberships
  getCustomerMemberships(tenantId: string): Promise<CustomerMembership[]>;
  getCustomerMembership(id: string, tenantId: string): Promise<CustomerMembership | undefined>;
  createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership>;
  updateCustomerMembership(id: string, tenantId: string, membership: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined>;

  // Coworking - Spaces
  createSpace(space: InsertSpace): Promise<Space>;
  getSpaces(tenantId: string): Promise<Space[]>;

  // Coworking - Desks
  getDesks(tenantId: string, spaceId?: string): Promise<Desk[]>;

  // Coworking - Desk Bookings
  createDeskBooking(booking: InsertDeskBooking): Promise<DeskBooking>;
  getDeskBookings(tenantId: string, userId?: string): Promise<DeskBooking[]>;

  // Patients (Healthcare)
  getPatients(tenantId: string): Promise<Patient[]>;
  getPatient(id: string, tenantId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, tenantId: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string, tenantId: string): Promise<void>;

  // Doctors (Healthcare)
  getDoctors(tenantId: string): Promise<Doctor[]>;
  getDoctor(id: string, tenantId: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, tenantId: string, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined>;

  // Appointments (Healthcare)
  getAppointments(tenantId: string): Promise<Appointment[]>;
  getAppointment(id: string, tenantId: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, tenantId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string, tenantId: string): Promise<void>;

  // Medical Records (Healthcare)
  getMedicalRecords(patientId: string, tenantId: string): Promise<MedicalRecord[]>;
  getMedicalRecord(id: string, tenantId: string): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: string, tenantId: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;

  // Platform Admins (NOT tied to tenant)
  getPlatformAdmins(): Promise<PlatformAdmin[]>;
  getPlatformAdmin(id: string): Promise<PlatformAdmin | undefined>;
  getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined>;
  createPlatformAdmin(admin: { name: string; email: string; passwordHash: string; role?: PlatformAdminRole; forcePasswordReset?: boolean; createdBy?: string }): Promise<PlatformAdmin>;
  updatePlatformAdmin(id: string, admin: Partial<{ name: string; email: string; passwordHash: string; role: PlatformAdminRole; isActive: boolean; forcePasswordReset: boolean }>): Promise<PlatformAdmin | undefined>;
  deletePlatformAdmin(id: string): Promise<void>;
  updatePlatformAdminLastLogin(id: string): Promise<void>;

  // Platform Region Configs
  getRegionConfigs(): Promise<PlatformRegionConfig[]>;
  getActiveRegionConfigs(): Promise<PlatformRegionConfig[]>;
  getRegionConfig(id: string): Promise<PlatformRegionConfig | undefined>;
  getRegionConfigByCode(countryCode: string): Promise<PlatformRegionConfig | undefined>;
  createRegionConfig(config: InsertPlatformRegionConfig): Promise<PlatformRegionConfig>;
  updateRegionConfig(id: string, config: Partial<InsertPlatformRegionConfig>): Promise<PlatformRegionConfig | undefined>;
  deleteRegionConfig(id: string): Promise<void>;
  toggleRegionStatus(id: string, status: "enabled" | "disabled"): Promise<PlatformRegionConfig | undefined>;

  // Platform Dashboard - Tenant Overview (read-only)
  getAllTenants(): Promise<Tenant[]>;
  getTenantStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    tenantsByBusinessType: { type: string; count: number }[];
    tenantsByTier: { tier: string; count: number }[];
  }>;

  // Platform Dashboard - User Statistics
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByTenant: { tenantId: string; tenantName: string; count: number }[];
  }>;

  // Platform Dashboard - Error Logs
  getErrorLogs(options?: { tenantId?: string; severity?: string; limit?: number; offset?: number }): Promise<ErrorLog[]>;
  getErrorLogStats(): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsBySource: { source: string; count: number }[];
  }>;
  createErrorLog(log: InsertErrorLog): Promise<ErrorLog>;
  resolveErrorLog(id: string, resolvedBy: string): Promise<ErrorLog | undefined>;

  // Platform Dashboard - Support Tickets
  getSupportTickets(options?: { tenantId?: string; status?: string; limit?: number; offset?: number }): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getSupportTicketStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    ticketsByStatus: { status: string; count: number }[];
    ticketsByPriority: { priority: string; count: number }[];
  }>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]>;
  createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage>;

  // Platform Dashboard - Usage Metrics
  getUsageMetrics(tenantId: string, metricType?: string, startDate?: Date, endDate?: Date): Promise<UsageMetric[]>;
  getAggregatedUsageMetrics(): Promise<{
    totalApiCalls: number;
    totalStorageUsed: number;
    totalActiveUsers: number;
    metricsByType: { type: string; total: number }[];
  }>;
  createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric>;

  // Platform Dashboard - Audit Logs (read-only)
  getAuditLogs(options?: { tenantId?: string; userId?: string; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;

  // Exchange Rates
  getExchangeRates(): Promise<ExchangeRate[]>;
  getActiveExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: string, rate: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined>;
  deactivateExchangeRate(id: string): Promise<void>;
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{ convertedAmount: number; rate: number; decimalPlaces: number }>;
}

export class DatabaseStorage implements IStorage {
  private defaultTenantId: string | null = null;

  async getOrCreateDefaultTenant(): Promise<Tenant> {
    // Check if default tenant exists
    const [existing] = await db.select().from(tenants).limit(1);
    if (existing) {
      this.defaultTenantId = existing.id;
      return existing;
    }

    // Create default tenant
    const [tenant] = await db.insert(tenants).values({
      name: "My Business",
      businessType: "service",
      email: "admin@example.com",
      currency: "INR",
      timezone: "Asia/Kolkata",
    }).returning();
    
    this.defaultTenantId = tenant.id;
    return tenant;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  // Customers
  async getCustomers(tenantId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.tenantId, tenantId)).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, tenantId: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteCustomer(id: string, tenantId: string): Promise<void> {
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  }

  // Services
  async getServices(tenantId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.createdAt));
  }

  async getService(id: string, tenantId: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: string, tenantId: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(service).where(and(eq(services.id, id), eq(services.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteService(id: string, tenantId: string): Promise<void> {
    await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
  }

  // Bookings
  async getBookings(tenantId: string): Promise<BookingWithDetails[]> {
    const result = await db.select({
      booking: bookings,
      customer: customers,
      service: services,
      staff: staff,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(staff, eq(bookings.staffId, staff.id))
    .where(eq(bookings.tenantId, tenantId))
    .orderBy(desc(bookings.bookingDate), desc(bookings.startTime));

    return result.map(r => ({
      ...r.booking,
      customer: r.customer!,
      service: r.service!,
      staff: r.staff,
    }));
  }

  async getUpcomingBookings(tenantId: string, limit = 10): Promise<BookingWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.select({
      booking: bookings,
      customer: customers,
      service: services,
      staff: staff,
    })
    .from(bookings)
    .leftJoin(customers, eq(bookings.customerId, customers.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(staff, eq(bookings.staffId, staff.id))
    .where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.bookingDate, today),
      sql`${bookings.status} != 'cancelled'`,
      sql`${bookings.status} != 'completed'`
    ))
    .orderBy(bookings.bookingDate, bookings.startTime)
    .limit(limit);

    return result.map(r => ({
      ...r.booking,
      customer: r.customer!,
      service: r.service!,
      staff: r.staff,
    }));
  }

  async getBooking(id: string, tenantId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBooking(id: string, tenantId: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings).set(booking).where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteBooking(id: string, tenantId: string): Promise<void> {
    await db.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)));
  }

  // Dashboard stats
  async getDashboardStats(tenantId: string): Promise<{
    totalCustomers: number;
    totalBookings: number;
    todayBookings: number;
    monthlyRevenue: number;
    revenueGrowth: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    const [customerCount] = await db.select({ count: count() }).from(customers).where(eq(customers.tenantId, tenantId));
    const [bookingCount] = await db.select({ count: count() }).from(bookings).where(eq(bookings.tenantId, tenantId));
    const [todayBookingCount] = await db.select({ count: count() }).from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.bookingDate, today)));
    
    const [monthlyRevenue] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)` 
    }).from(bookings).where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.bookingDate, startOfMonth),
      eq(bookings.status, 'completed')
    ));

    const [lastMonthRevenue] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)` 
    }).from(bookings).where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.bookingDate, startOfLastMonth),
      lte(bookings.bookingDate, endOfLastMonth),
      eq(bookings.status, 'completed')
    ));

    const currentRevenue = Number(monthlyRevenue?.total || 0);
    const previousRevenue = Number(lastMonthRevenue?.total || 0);
    const growth = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0;

    return {
      totalCustomers: customerCount?.count || 0,
      totalBookings: bookingCount?.count || 0,
      todayBookings: todayBookingCount?.count || 0,
      monthlyRevenue: currentRevenue,
      revenueGrowth: growth,
    };
  }

  // Analytics
  async getAnalytics(tenantId: string): Promise<{
    totalRevenue: number;
    totalBookings: number;
    totalCustomers: number;
    totalServices: number;
    completedBookings: number;
    cancelledBookings: number;
    averageBookingValue: number;
    revenueByMonth: { month: string; revenue: number }[];
    bookingsByStatus: { status: string; count: number }[];
    topServices: { name: string; bookings: number; revenue: number }[];
    recentTrend: { date: string; bookings: number; revenue: number }[];
  }> {
    const [customerCount] = await db.select({ count: count() }).from(customers).where(eq(customers.tenantId, tenantId));
    const [serviceCount] = await db.select({ count: count() }).from(services).where(eq(services.tenantId, tenantId));
    const [bookingCount] = await db.select({ count: count() }).from(bookings).where(eq(bookings.tenantId, tenantId));
    const [completedCount] = await db.select({ count: count() }).from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.status, 'completed')));
    const [cancelledCount] = await db.select({ count: count() }).from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.status, 'cancelled')));
    
    const [totalRevenue] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)` 
    }).from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.status, 'completed')));

    const total = bookingCount?.count || 0;
    const revenue = Number(totalRevenue?.total || 0);
    const avgValue = total > 0 ? revenue / total : 0;

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [monthRevenue] = await db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)` 
      }).from(bookings).where(and(
        eq(bookings.tenantId, tenantId),
        gte(bookings.bookingDate, monthStart),
        lte(bookings.bookingDate, monthEnd),
        eq(bookings.status, 'completed')
      ));
      
      revenueByMonth.push({
        month: date.toLocaleString('default', { month: 'short' }),
        revenue: Number(monthRevenue?.total || 0),
      });
    }

    // Bookings by status
    const statusCounts = await db.select({ 
      status: bookings.status,
      count: count() 
    }).from(bookings).where(eq(bookings.tenantId, tenantId)).groupBy(bookings.status);

    const bookingsByStatus = statusCounts.map(s => ({
      status: s.status || 'pending',
      count: s.count,
    }));

    // Top services
    const topServicesResult = await db.select({
      name: services.name,
      bookings: count(),
      revenue: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)`,
    })
    .from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(eq(bookings.tenantId, tenantId))
    .groupBy(services.name)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

    const topServices = topServicesResult.map(s => ({
      name: s.name || 'Unknown',
      bookings: s.bookings,
      revenue: Number(s.revenue || 0),
    }));

    // Recent trend (last 7 days)
    const recentTrend: { date: string; bookings: number; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const [dayStats] = await db.select({
        count: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${bookings.amount} AS DECIMAL)), 0)`,
      }).from(bookings).where(and(
        eq(bookings.tenantId, tenantId),
        eq(bookings.bookingDate, dateStr)
      ));
      
      recentTrend.push({
        date: date.toLocaleString('default', { weekday: 'short' }),
        bookings: dayStats?.count || 0,
        revenue: Number(dayStats?.revenue || 0),
      });
    }

    return {
      totalRevenue: revenue,
      totalBookings: total,
      totalCustomers: customerCount?.count || 0,
      totalServices: serviceCount?.count || 0,
      completedBookings: completedCount?.count || 0,
      cancelledBookings: cancelledCount?.count || 0,
      averageBookingValue: avgValue,
      revenueByMonth,
      bookingsByStatus,
      topServices,
      recentTrend,
    };
  }

  // Notification Templates
  async getNotificationTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    return db.select().from(notificationTemplates).where(eq(notificationTemplates.tenantId, tenantId)).orderBy(desc(notificationTemplates.createdAt));
  }

  async getNotificationTemplate(id: string, tenantId: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, tenantId)));
    return template;
  }

  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [created] = await db.insert(notificationTemplates).values(template).returning();
    return created;
  }

  async updateNotificationTemplate(id: string, tenantId: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined> {
    const [updated] = await db.update(notificationTemplates).set({ ...template, updatedAt: new Date() }).where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteNotificationTemplate(id: string, tenantId: string): Promise<void> {
    await db.delete(notificationTemplates).where(and(eq(notificationTemplates.id, id), eq(notificationTemplates.tenantId, tenantId)));
  }

  // Notification Logs
  async getNotificationLogs(tenantId: string, limit = 100): Promise<NotificationLog[]> {
    return db.select().from(notificationLogs).where(eq(notificationLogs.tenantId, tenantId)).orderBy(desc(notificationLogs.createdAt)).limit(limit);
  }

  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [created] = await db.insert(notificationLogs).values(log).returning();
    return created;
  }

  async updateNotificationLog(id: string, tenantId: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog | undefined> {
    const [updated] = await db.update(notificationLogs).set(log).where(and(eq(notificationLogs.id, id), eq(notificationLogs.tenantId, tenantId))).returning();
    return updated;
  }

  // Invoices
  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string, tenantId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: string, tenantId: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...invoice, updatedAt: new Date() }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteInvoice(id: string, tenantId: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
  }

  // Invoice Items
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [created] = await db.insert(invoiceItems).values(item).returning();
    return created;
  }

  async deleteInvoiceItems(invoiceId: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  // Payments
  async getPayments(tenantId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.createdAt));
  }

  async getPayment(id: string, tenantId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.tenantId, tenantId)));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: string, tenantId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set(payment).where(and(eq(payments.id, id), eq(payments.tenantId, tenantId))).returning();
    return updated;
  }

  // Inventory Categories
  async getInventoryCategories(tenantId: string): Promise<InventoryCategory[]> {
    return db.select().from(inventoryCategories).where(eq(inventoryCategories.tenantId, tenantId)).orderBy(inventoryCategories.sortOrder);
  }

  async createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory> {
    const [created] = await db.insert(inventoryCategories).values(category).returning();
    return created;
  }

  async updateInventoryCategory(id: string, tenantId: string, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined> {
    const [updated] = await db.update(inventoryCategories).set(category).where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteInventoryCategory(id: string, tenantId: string): Promise<void> {
    await db.delete(inventoryCategories).where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.tenantId, tenantId)));
  }

  // Inventory Items
  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).orderBy(inventoryItems.name);
  }

  async getInventoryItem(id: string, tenantId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(id: string, tenantId: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set({ ...item, updatedAt: new Date() }).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteInventoryItem(id: string, tenantId: string): Promise<void> {
    await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));
  }

  // Inventory Transactions
  async getInventoryTransactions(itemId: string): Promise<InventoryTransaction[]> {
    return db.select().from(inventoryTransactions).where(eq(inventoryTransactions.itemId, itemId)).orderBy(desc(inventoryTransactions.createdAt));
  }

  async createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction> {
    const [created] = await db.insert(inventoryTransactions).values(transaction).returning();
    return created;
  }

  // Membership Plans
  async getMembershipPlans(tenantId: string): Promise<MembershipPlan[]> {
    return db.select().from(membershipPlans).where(eq(membershipPlans.tenantId, tenantId)).orderBy(membershipPlans.sortOrder);
  }

  async getMembershipPlan(id: string, tenantId: string): Promise<MembershipPlan | undefined> {
    const [plan] = await db.select().from(membershipPlans).where(and(eq(membershipPlans.id, id), eq(membershipPlans.tenantId, tenantId)));
    return plan;
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const [created] = await db.insert(membershipPlans).values(plan).returning();
    return created;
  }

  async updateMembershipPlan(id: string, tenantId: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan | undefined> {
    const [updated] = await db.update(membershipPlans).set({ ...plan, updatedAt: new Date() }).where(and(eq(membershipPlans.id, id), eq(membershipPlans.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteMembershipPlan(id: string, tenantId: string): Promise<void> {
    await db.delete(membershipPlans).where(and(eq(membershipPlans.id, id), eq(membershipPlans.tenantId, tenantId)));
  }

  // Customer Memberships
  async getCustomerMemberships(tenantId: string): Promise<CustomerMembership[]> {
    return db.select().from(customerMemberships).where(eq(customerMemberships.tenantId, tenantId)).orderBy(desc(customerMemberships.createdAt));
  }

  async getCustomerMembership(id: string, tenantId: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db.select().from(customerMemberships).where(and(eq(customerMemberships.id, id), eq(customerMemberships.tenantId, tenantId)));
    return membership;
  }

  async createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership> {
    const [created] = await db.insert(customerMemberships).values(membership).returning();
    return created;
  }

  async updateCustomerMembership(id: string, tenantId: string, membership: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined> {
    const [updated] = await db.update(customerMemberships).set({ ...membership, updatedAt: new Date() }).where(and(eq(customerMemberships.id, id), eq(customerMemberships.tenantId, tenantId))).returning();
    return updated;
  }

  // Coworking - Spaces
  async createSpace(space: InsertSpace): Promise<Space> {
    const [created] = await db.insert(spaces).values(space).returning();
    return created;
  }

  async getSpaces(tenantId: string): Promise<Space[]> {
    return db.select().from(spaces).where(eq(spaces.tenantId, tenantId));
  }

  // Coworking - Desks
  async getDesks(tenantId: string, spaceId?: string): Promise<Desk[]> {
    if (spaceId) {
      return db.select().from(desks).where(and(eq(desks.tenantId, tenantId), eq(desks.spaceId, spaceId)));
    }
    return db.select().from(desks).where(eq(desks.tenantId, tenantId));
  }

  // Coworking - Desk Bookings
  async createDeskBooking(booking: InsertDeskBooking): Promise<DeskBooking> {
    const [created] = await db.insert(deskBookings).values(booking).returning();
    return created;
  }

  async getDeskBookings(tenantId: string, userId?: string): Promise<DeskBooking[]> {
    if (userId) {
      return db.select().from(deskBookings).where(and(eq(deskBookings.tenantId, tenantId), eq(deskBookings.userId, userId))).orderBy(desc(deskBookings.createdAt));
    }
    return db.select().from(deskBookings).where(eq(deskBookings.tenantId, tenantId)).orderBy(desc(deskBookings.createdAt));
  }

  // Patients (Healthcare)
  async getPatients(tenantId: string): Promise<Patient[]> {
    return db.select().from(patients).where(eq(patients.tenantId, tenantId)).orderBy(patients.firstName);
  }

  async getPatient(id: string, tenantId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async updatePatient(id: string, tenantId: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set({ ...patient, updatedAt: new Date() }).where(and(eq(patients.id, id), eq(patients.tenantId, tenantId))).returning();
    return updated;
  }

  async deletePatient(id: string, tenantId: string): Promise<void> {
    await db.delete(patients).where(and(eq(patients.id, id), eq(patients.tenantId, tenantId)));
  }

  // Doctors (Healthcare)
  async getDoctors(tenantId: string): Promise<Doctor[]> {
    return db.select().from(doctors).where(eq(doctors.tenantId, tenantId));
  }

  async getDoctor(id: string, tenantId: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(and(eq(doctors.id, id), eq(doctors.tenantId, tenantId)));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [created] = await db.insert(doctors).values(doctor).returning();
    return created;
  }

  async updateDoctor(id: string, tenantId: string, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [updated] = await db.update(doctors).set({ ...doctor, updatedAt: new Date() }).where(and(eq(doctors.id, id), eq(doctors.tenantId, tenantId))).returning();
    return updated;
  }

  // Appointments (Healthcare)
  async getAppointments(tenantId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(desc(appointments.appointmentDate));
  }

  async getAppointment(id: string, tenantId: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: string, tenantId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set({ ...appointment, updatedAt: new Date() }).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteAppointment(id: string, tenantId: string): Promise<void> {
    await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
  }

  // Medical Records (Healthcare)
  async getMedicalRecords(patientId: string, tenantId: string): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(and(eq(medicalRecords.patientId, patientId), eq(medicalRecords.tenantId, tenantId))).orderBy(desc(medicalRecords.visitDate));
  }

  async getMedicalRecord(id: string, tenantId: string): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(and(eq(medicalRecords.id, id), eq(medicalRecords.tenantId, tenantId)));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [created] = await db.insert(medicalRecords).values(record).returning();
    return created;
  }

  async updateMedicalRecord(id: string, tenantId: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const [updated] = await db.update(medicalRecords).set({ ...record, updatedAt: new Date() }).where(and(eq(medicalRecords.id, id), eq(medicalRecords.tenantId, tenantId))).returning();
    return updated;
  }

  // Platform Admins (NOT tied to tenant)
  async getPlatformAdmins(): Promise<PlatformAdmin[]> {
    return db.select().from(platformAdmins).orderBy(desc(platformAdmins.createdAt));
  }

  async getPlatformAdmin(id: string): Promise<PlatformAdmin | undefined> {
    const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, id));
    return admin;
  }

  async getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | undefined> {
    const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email.toLowerCase()));
    return admin;
  }

  async createPlatformAdmin(admin: { name: string; email: string; passwordHash: string; role?: PlatformAdminRole; forcePasswordReset?: boolean; createdBy?: string }): Promise<PlatformAdmin> {
    const [created] = await db.insert(platformAdmins).values({
      name: admin.name,
      email: admin.email.toLowerCase(),
      passwordHash: admin.passwordHash,
      role: admin.role || "PLATFORM_ADMIN",
      forcePasswordReset: admin.forcePasswordReset ?? true,
      createdBy: admin.createdBy,
    }).returning();
    return created;
  }

  async updatePlatformAdmin(id: string, admin: Partial<{ name: string; email: string; passwordHash: string; role: PlatformAdminRole; isActive: boolean; forcePasswordReset: boolean }>): Promise<PlatformAdmin | undefined> {
    const updateData: any = { ...admin, updatedAt: new Date() };
    if (admin.email) {
      updateData.email = admin.email.toLowerCase();
    }
    const [updated] = await db.update(platformAdmins).set(updateData).where(eq(platformAdmins.id, id)).returning();
    return updated;
  }

  async deletePlatformAdmin(id: string): Promise<void> {
    await db.delete(platformAdmins).where(eq(platformAdmins.id, id));
  }

  async updatePlatformAdminLastLogin(id: string): Promise<void> {
    await db.update(platformAdmins).set({ lastLoginAt: new Date() }).where(eq(platformAdmins.id, id));
  }

  // Platform Region Configs
  async getRegionConfigs(): Promise<PlatformRegionConfig[]> {
    return db.select().from(platformRegionConfigs).orderBy(desc(platformRegionConfigs.createdAt));
  }

  async getActiveRegionConfigs(): Promise<PlatformRegionConfig[]> {
    return db.select().from(platformRegionConfigs).where(eq(platformRegionConfigs.status, "enabled")).orderBy(platformRegionConfigs.countryName);
  }

  async getRegionConfig(id: string): Promise<PlatformRegionConfig | undefined> {
    const [config] = await db.select().from(platformRegionConfigs).where(eq(platformRegionConfigs.id, id));
    return config;
  }

  async getRegionConfigByCode(countryCode: string): Promise<PlatformRegionConfig | undefined> {
    const [config] = await db.select().from(platformRegionConfigs).where(eq(platformRegionConfigs.countryCode, countryCode.toUpperCase()));
    return config;
  }

  async createRegionConfig(config: InsertPlatformRegionConfig): Promise<PlatformRegionConfig> {
    const [created] = await db.insert(platformRegionConfigs).values({
      ...config,
      countryCode: config.countryCode.toUpperCase(),
    }).returning();
    return created;
  }

  async updateRegionConfig(id: string, config: Partial<InsertPlatformRegionConfig>): Promise<PlatformRegionConfig | undefined> {
    const updateData: any = { ...config, updatedAt: new Date() };
    if (config.countryCode) {
      updateData.countryCode = config.countryCode.toUpperCase();
    }
    const [updated] = await db.update(platformRegionConfigs).set(updateData).where(eq(platformRegionConfigs.id, id)).returning();
    return updated;
  }

  async deleteRegionConfig(id: string): Promise<void> {
    await db.delete(platformRegionConfigs).where(eq(platformRegionConfigs.id, id));
  }

  async toggleRegionStatus(id: string, status: "enabled" | "disabled"): Promise<PlatformRegionConfig | undefined> {
    const [updated] = await db.update(platformRegionConfigs).set({ status, updatedAt: new Date() }).where(eq(platformRegionConfigs.id, id)).returning();
    return updated;
  }

  // Platform Admin Permissions
  async getAllPlatformAdminPermissions(): Promise<PlatformAdminPermission[]> {
    return db.select().from(platformAdminPermissions).orderBy(platformAdminPermissions.category, platformAdminPermissions.code);
  }

  async getPlatformAdminPermission(code: string): Promise<PlatformAdminPermission | undefined> {
    const [perm] = await db.select().from(platformAdminPermissions).where(eq(platformAdminPermissions.code, code));
    return perm;
  }

  async createPlatformAdminPermission(perm: { code: string; name: string; description?: string; category?: string }): Promise<PlatformAdminPermission> {
    const [created] = await db.insert(platformAdminPermissions).values(perm).returning();
    return created;
  }

  async deletePlatformAdminPermission(code: string): Promise<void> {
    await db.delete(platformAdminPermissions).where(eq(platformAdminPermissions.code, code));
  }

  // Platform Admin Permission Assignments
  async getAdminPermissions(adminId: string): Promise<string[]> {
    const assignments = await db.select()
      .from(platformAdminPermissionAssignments)
      .where(eq(platformAdminPermissionAssignments.adminId, adminId));
    return assignments.map(a => a.permissionCode);
  }

  async assignPermissionToAdmin(adminId: string, permissionCode: string, grantedBy?: string): Promise<PlatformAdminPermissionAssignment> {
    const [assignment] = await db.insert(platformAdminPermissionAssignments)
      .values({ adminId, permissionCode, grantedBy })
      .returning();
    return assignment;
  }

  async revokePermissionFromAdmin(adminId: string, permissionCode: string): Promise<void> {
    await db.delete(platformAdminPermissionAssignments)
      .where(and(
        eq(platformAdminPermissionAssignments.adminId, adminId),
        eq(platformAdminPermissionAssignments.permissionCode, permissionCode)
      ));
  }

  async revokeAllPermissionsFromAdmin(adminId: string): Promise<void> {
    await db.delete(platformAdminPermissionAssignments)
      .where(eq(platformAdminPermissionAssignments.adminId, adminId));
  }

  async getAdminsWithPermission(permissionCode: string): Promise<string[]> {
    const assignments = await db.select()
      .from(platformAdminPermissionAssignments)
      .where(eq(platformAdminPermissionAssignments.permissionCode, permissionCode));
    return assignments.map(a => a.adminId);
  }

  async hasAdminPermission(adminId: string, permissionCode: string): Promise<boolean> {
    const [assignment] = await db.select()
      .from(platformAdminPermissionAssignments)
      .where(and(
        eq(platformAdminPermissionAssignments.adminId, adminId),
        eq(platformAdminPermissionAssignments.permissionCode, permissionCode)
      ));
    return !!assignment;
  }

  // Platform Dashboard - Tenant Overview
  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenantStats(): Promise<{
    totalTenants: number;
    activeTenants: number;
    tenantsByBusinessType: { type: string; count: number }[];
    tenantsByTier: { tier: string; count: number }[];
  }> {
    const allTenants = await db.select().from(tenants);
    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter(t => t.isActive).length;

    const businessTypeMap = new Map<string, number>();
    const tierMap = new Map<string, number>();

    for (const tenant of allTenants) {
      const type = tenant.businessType || "service";
      businessTypeMap.set(type, (businessTypeMap.get(type) || 0) + 1);
      
      const tier = tenant.subscriptionTier || "free";
      tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
    }

    return {
      totalTenants,
      activeTenants,
      tenantsByBusinessType: Array.from(businessTypeMap.entries()).map(([type, count]) => ({ type, count })),
      tenantsByTier: Array.from(tierMap.entries()).map(([tier, count]) => ({ tier, count })),
    };
  }

  // Platform Dashboard - User Statistics
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByTenant: { tenantId: string; tenantName: string; count: number }[];
  }> {
    const allUserTenants = await db.select({
      tenantId: userTenants.tenantId,
      tenantName: tenants.name,
      isActive: userTenants.isActive,
    })
      .from(userTenants)
      .leftJoin(tenants, eq(userTenants.tenantId, tenants.id));

    const totalUsers = allUserTenants.length;
    const activeUsers = allUserTenants.filter(ut => ut.isActive).length;

    const tenantCountMap = new Map<string, { name: string; count: number }>();
    for (const ut of allUserTenants) {
      if (ut.tenantId) {
        const existing = tenantCountMap.get(ut.tenantId);
        if (existing) {
          existing.count++;
        } else {
          tenantCountMap.set(ut.tenantId, { name: ut.tenantName || "Unknown", count: 1 });
        }
      }
    }

    return {
      totalUsers,
      activeUsers,
      usersByTenant: Array.from(tenantCountMap.entries()).map(([tenantId, data]) => ({
        tenantId,
        tenantName: data.name,
        count: data.count,
      })),
    };
  }

  // Platform Dashboard - Error Logs
  async getErrorLogs(options?: { tenantId?: string; severity?: string; limit?: number; offset?: number }): Promise<ErrorLog[]> {
    let query = db.select().from(errorLogs).$dynamic();
    
    const conditions: any[] = [];
    if (options?.tenantId) {
      conditions.push(eq(errorLogs.tenantId, options.tenantId));
    }
    if (options?.severity) {
      conditions.push(eq(errorLogs.severity, options.severity as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(errorLogs.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return query;
  }

  async getErrorLogStats(): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsBySource: { source: string; count: number }[];
  }> {
    const allErrors = await db.select().from(errorLogs);
    const totalErrors = allErrors.length;
    const unresolvedErrors = allErrors.filter(e => !e.isResolved).length;

    const severityMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();

    for (const error of allErrors) {
      const severity = error.severity || "error";
      severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
      
      const source = error.source;
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    return {
      totalErrors,
      unresolvedErrors,
      errorsBySeverity: Array.from(severityMap.entries()).map(([severity, count]) => ({ severity, count })),
      errorsBySource: Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })),
    };
  }

  async createErrorLog(log: InsertErrorLog): Promise<ErrorLog> {
    const [created] = await db.insert(errorLogs).values(log).returning();
    return created;
  }

  async resolveErrorLog(id: string, resolvedBy: string): Promise<ErrorLog | undefined> {
    const [updated] = await db.update(errorLogs)
      .set({ isResolved: true, resolvedAt: new Date(), resolvedBy })
      .where(eq(errorLogs.id, id))
      .returning();
    return updated;
  }

  // Platform Dashboard - Support Tickets
  async getSupportTickets(options?: { tenantId?: string; status?: string; limit?: number; offset?: number }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets).$dynamic();
    
    const conditions: any[] = [];
    if (options?.tenantId) {
      conditions.push(eq(supportTickets.tenantId, options.tenantId));
    }
    if (options?.status) {
      conditions.push(eq(supportTickets.status, options.status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(supportTickets.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return query;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async getSupportTicketStats(): Promise<{
    totalTickets: number;
    openTickets: number;
    ticketsByStatus: { status: string; count: number }[];
    ticketsByPriority: { priority: string; count: number }[];
  }> {
    const allTickets = await db.select().from(supportTickets);
    const totalTickets = allTickets.length;
    const openTickets = allTickets.filter(t => t.status === "open" || t.status === "in_progress").length;

    const statusMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();

    for (const ticket of allTickets) {
      const status = ticket.status || "open";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
      
      const priority = ticket.priority || "medium";
      priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
    }

    return {
      totalTickets,
      openTickets,
      ticketsByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      ticketsByPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({ priority, count })),
    };
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set({ ...ticket, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }

  async getSupportTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    return db.select()
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(supportTicketMessages.createdAt);
  }

  async createSupportTicketMessage(message: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const [created] = await db.insert(supportTicketMessages).values(message).returning();
    return created;
  }

  // Platform Dashboard - Usage Metrics
  async getUsageMetrics(tenantId: string, metricType?: string, startDate?: Date, endDate?: Date): Promise<UsageMetric[]> {
    const conditions: any[] = [eq(usageMetrics.tenantId, tenantId)];
    
    if (metricType) {
      conditions.push(eq(usageMetrics.metricType, metricType));
    }
    if (startDate) {
      conditions.push(gte(usageMetrics.periodStart, startDate));
    }
    if (endDate) {
      conditions.push(lte(usageMetrics.periodEnd, endDate));
    }
    
    return db.select()
      .from(usageMetrics)
      .where(and(...conditions))
      .orderBy(desc(usageMetrics.periodStart));
  }

  async getAggregatedUsageMetrics(): Promise<{
    totalApiCalls: number;
    totalStorageUsed: number;
    totalActiveUsers: number;
    metricsByType: { type: string; total: number }[];
  }> {
    const allMetrics = await db.select().from(usageMetrics);
    
    let totalApiCalls = 0;
    let totalStorageUsed = 0;
    let totalActiveUsers = 0;
    const typeMap = new Map<string, number>();

    for (const metric of allMetrics) {
      const value = parseFloat(metric.metricValue);
      
      if (metric.metricType === "api_calls") {
        totalApiCalls += value;
      } else if (metric.metricType === "storage_mb") {
        totalStorageUsed += value;
      } else if (metric.metricType === "active_users") {
        totalActiveUsers += value;
      }
      
      typeMap.set(metric.metricType, (typeMap.get(metric.metricType) || 0) + value);
    }

    return {
      totalApiCalls,
      totalStorageUsed,
      totalActiveUsers,
      metricsByType: Array.from(typeMap.entries()).map(([type, total]) => ({ type, total })),
    };
  }

  async createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric> {
    const [created] = await db.insert(usageMetrics).values(metric).returning();
    return created;
  }

  // Platform Dashboard - Audit Logs
  async getAuditLogs(options?: { tenantId?: string; userId?: string; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs).$dynamic();
    
    const conditions: any[] = [];
    if (options?.tenantId) {
      conditions.push(eq(auditLogs.tenantId, options.tenantId));
    }
    if (options?.userId) {
      conditions.push(eq(auditLogs.userId, options.userId));
    }
    if (options?.action) {
      conditions.push(eq(auditLogs.action, options.action as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(auditLogs.createdAt));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(100); // Default limit
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    return query;
  }

  // Exchange Rates
  async getExchangeRates(): Promise<ExchangeRate[]> {
    return db.select().from(exchangeRates).orderBy(desc(exchangeRates.createdAt));
  }

  async getActiveExchangeRates(): Promise<ExchangeRate[]> {
    return db.select().from(exchangeRates)
      .where(eq(exchangeRates.isActive, true))
      .orderBy(exchangeRates.fromCurrency, exchangeRates.toCurrency);
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined> {
    // If same currency, return 1:1 rate
    if (fromCurrency === toCurrency) {
      return {
        id: "same-currency",
        fromCurrency,
        toCurrency,
        rate: "1.00000000",
        inverseRate: "1.00000000",
        source: "identity",
        isActive: true,
        validFrom: new Date(),
        validTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Try direct rate first
    const [directRate] = await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.fromCurrency, fromCurrency),
        eq(exchangeRates.toCurrency, toCurrency),
        eq(exchangeRates.isActive, true)
      ))
      .limit(1);

    if (directRate) return directRate;

    // Try inverse rate
    const [inverseRate] = await db.select().from(exchangeRates)
      .where(and(
        eq(exchangeRates.fromCurrency, toCurrency),
        eq(exchangeRates.toCurrency, fromCurrency),
        eq(exchangeRates.isActive, true)
      ))
      .limit(1);

    if (inverseRate) {
      // Return inverse rate as direct
      return {
        ...inverseRate,
        fromCurrency,
        toCurrency,
        rate: inverseRate.inverseRate,
        inverseRate: inverseRate.rate,
      };
    }

    return undefined;
  }

  async createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate> {
    // Deactivate any existing active rate for the same currency pair
    await db.update(exchangeRates)
      .set({ isActive: false, validTo: new Date() })
      .where(and(
        eq(exchangeRates.fromCurrency, rate.fromCurrency),
        eq(exchangeRates.toCurrency, rate.toCurrency),
        eq(exchangeRates.isActive, true)
      ));

    const [created] = await db.insert(exchangeRates).values(rate).returning();
    return created;
  }

  async updateExchangeRate(id: string, rate: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined> {
    const [updated] = await db.update(exchangeRates)
      .set({ ...rate, updatedAt: new Date() })
      .where(eq(exchangeRates.id, id))
      .returning();
    return updated;
  }

  async deactivateExchangeRate(id: string): Promise<void> {
    await db.update(exchangeRates)
      .set({ isActive: false, validTo: new Date(), updatedAt: new Date() })
      .where(eq(exchangeRates.id, id));
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{ convertedAmount: number; rate: number; decimalPlaces: number }> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    if (!exchangeRate) {
      throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
    }

    // Get decimal places for the target currency
    const currencyDecimalPlaces: Record<string, number> = {
      JPY: 0, KRW: 0, VND: 0, // Zero decimal currencies
      BHD: 3, KWD: 3, OMR: 3, // Three decimal currencies
      // Default is 2 for most currencies
    };
    const decimalPlaces = currencyDecimalPlaces[toCurrency.toUpperCase()] ?? 2;
    
    // Use string-based math to avoid floating point precision issues
    const rateStr = exchangeRate.rate;
    const rate = parseFloat(rateStr);
    
    // Calculate with high precision then round to target currency's decimal places
    const multiplier = Math.pow(10, decimalPlaces);
    const convertedAmount = Math.round(amount * rate * multiplier) / multiplier;
    
    return {
      convertedAmount,
      rate,
      decimalPlaces,
    };
  }
}

export const storage = new DatabaseStorage();
