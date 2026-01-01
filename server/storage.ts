import { 
  tenants, customers, services, bookings, staff,
  type Tenant, type InsertTenant,
  type Customer, type InsertCustomer,
  type Service, type InsertService,
  type Booking, type InsertBooking,
  type Staff, type InsertStaff,
  type BookingWithDetails,
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
}

export const storage = new DatabaseStorage();
