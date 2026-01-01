import { 
  tenants, customers, services, bookings, staff,
  notificationTemplates, notificationLogs,
  invoices, invoiceItems, payments,
  inventoryCategories, inventoryItems, inventoryTransactions,
  membershipPlans, customerMemberships,
  spaces, desks, deskBookings,
  patients, doctors, appointments, medicalRecords,
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
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;

  // Services
  getServices(tenantId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Bookings
  getBookings(tenantId: string): Promise<BookingWithDetails[]>;
  getUpcomingBookings(tenantId: string, limit?: number): Promise<BookingWithDetails[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;

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
  getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined>;
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined>;
  deleteNotificationTemplate(id: string): Promise<void>;

  // Notification Logs
  getNotificationLogs(tenantId: string, limit?: number): Promise<NotificationLog[]>;
  createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog>;
  updateNotificationLog(id: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog | undefined>;

  // Invoices
  getInvoices(tenantId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;

  // Invoice Items
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItems(invoiceId: string): Promise<void>;

  // Payments
  getPayments(tenantId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Inventory Categories
  getInventoryCategories(tenantId: string): Promise<InventoryCategory[]>;
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  updateInventoryCategory(id: string, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined>;
  deleteInventoryCategory(id: string): Promise<void>;

  // Inventory Items
  getInventoryItems(tenantId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<void>;

  // Inventory Transactions
  getInventoryTransactions(itemId: string): Promise<InventoryTransaction[]>;
  createInventoryTransaction(transaction: InsertInventoryTransaction): Promise<InventoryTransaction>;

  // Membership Plans
  getMembershipPlans(tenantId: string): Promise<MembershipPlan[]>;
  getMembershipPlan(id: string): Promise<MembershipPlan | undefined>;
  createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan>;
  updateMembershipPlan(id: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan | undefined>;
  deleteMembershipPlan(id: string): Promise<void>;

  // Customer Memberships
  getCustomerMemberships(tenantId: string): Promise<CustomerMembership[]>;
  getCustomerMembership(id: string): Promise<CustomerMembership | undefined>;
  createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership>;
  updateCustomerMembership(id: string, membership: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined>;

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
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<void>;

  // Doctors (Healthcare)
  getDoctors(tenantId: string): Promise<Doctor[]>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined>;

  // Appointments (Healthcare)
  getAppointments(tenantId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;

  // Medical Records (Healthcare)
  getMedicalRecords(patientId: string): Promise<MedicalRecord[]>;
  getMedicalRecord(id: string): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;
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

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Services
  async getServices(tenantId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.createdAt));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(service).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
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

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings).set(booking).where(eq(bookings.id, id)).returning();
    return updated;
  }

  async deleteBooking(id: string): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
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

  async getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id));
    return template;
  }

  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [created] = await db.insert(notificationTemplates).values(template).returning();
    return created;
  }

  async updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate | undefined> {
    const [updated] = await db.update(notificationTemplates).set({ ...template, updatedAt: new Date() }).where(eq(notificationTemplates.id, id)).returning();
    return updated;
  }

  async deleteNotificationTemplate(id: string): Promise<void> {
    await db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  }

  // Notification Logs
  async getNotificationLogs(tenantId: string, limit = 100): Promise<NotificationLog[]> {
    return db.select().from(notificationLogs).where(eq(notificationLogs.tenantId, tenantId)).orderBy(desc(notificationLogs.createdAt)).limit(limit);
  }

  async createNotificationLog(log: InsertNotificationLog): Promise<NotificationLog> {
    const [created] = await db.insert(notificationLogs).values(log).returning();
    return created;
  }

  async updateNotificationLog(id: string, log: Partial<InsertNotificationLog>): Promise<NotificationLog | undefined> {
    const [updated] = await db.update(notificationLogs).set(log).where(eq(notificationLogs.id, id)).returning();
    return updated;
  }

  // Invoices
  async getInvoices(tenantId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...invoice, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
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

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
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

  async updateInventoryCategory(id: string, category: Partial<InsertInventoryCategory>): Promise<InventoryCategory | undefined> {
    const [updated] = await db.update(inventoryCategories).set(category).where(eq(inventoryCategories.id, id)).returning();
    return updated;
  }

  async deleteInventoryCategory(id: string): Promise<void> {
    await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
  }

  // Inventory Items
  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).orderBy(inventoryItems.name);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set({ ...item, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
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

  async getMembershipPlan(id: string): Promise<MembershipPlan | undefined> {
    const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, id));
    return plan;
  }

  async createMembershipPlan(plan: InsertMembershipPlan): Promise<MembershipPlan> {
    const [created] = await db.insert(membershipPlans).values(plan).returning();
    return created;
  }

  async updateMembershipPlan(id: string, plan: Partial<InsertMembershipPlan>): Promise<MembershipPlan | undefined> {
    const [updated] = await db.update(membershipPlans).set({ ...plan, updatedAt: new Date() }).where(eq(membershipPlans.id, id)).returning();
    return updated;
  }

  async deleteMembershipPlan(id: string): Promise<void> {
    await db.delete(membershipPlans).where(eq(membershipPlans.id, id));
  }

  // Customer Memberships
  async getCustomerMemberships(tenantId: string): Promise<CustomerMembership[]> {
    return db.select().from(customerMemberships).where(eq(customerMemberships.tenantId, tenantId)).orderBy(desc(customerMemberships.createdAt));
  }

  async getCustomerMembership(id: string): Promise<CustomerMembership | undefined> {
    const [membership] = await db.select().from(customerMemberships).where(eq(customerMemberships.id, id));
    return membership;
  }

  async createCustomerMembership(membership: InsertCustomerMembership): Promise<CustomerMembership> {
    const [created] = await db.insert(customerMemberships).values(membership).returning();
    return created;
  }

  async updateCustomerMembership(id: string, membership: Partial<InsertCustomerMembership>): Promise<CustomerMembership | undefined> {
    const [updated] = await db.update(customerMemberships).set({ ...membership, updatedAt: new Date() }).where(eq(customerMemberships.id, id)).returning();
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

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values(patient).returning();
    return created;
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set({ ...patient, updatedAt: new Date() }).where(eq(patients.id, id)).returning();
    return updated;
  }

  async deletePatient(id: string): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  // Doctors (Healthcare)
  async getDoctors(tenantId: string): Promise<Doctor[]> {
    return db.select().from(doctors).where(eq(doctors.tenantId, tenantId));
  }

  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [created] = await db.insert(doctors).values(doctor).returning();
    return created;
  }

  async updateDoctor(id: string, doctor: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [updated] = await db.update(doctors).set({ ...doctor, updatedAt: new Date() }).where(eq(doctors.id, id)).returning();
    return updated;
  }

  // Appointments (Healthcare)
  async getAppointments(tenantId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(desc(appointments.appointmentDate));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set({ ...appointment, updatedAt: new Date() }).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  // Medical Records (Healthcare)
  async getMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId)).orderBy(desc(medicalRecords.visitDate));
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [created] = await db.insert(medicalRecords).values(record).returning();
    return created;
  }

  async updateMedicalRecord(id: string, record: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const [updated] = await db.update(medicalRecords).set({ ...record, updatedAt: new Date() }).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
