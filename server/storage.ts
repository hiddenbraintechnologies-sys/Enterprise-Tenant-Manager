import { 
  tenants, customers, services, bookings, staff,
  notificationTemplates, notificationLogs,
  invoices, invoiceItems, payments,
  inventoryCategories, inventoryItems, inventoryTransactions,
  membershipPlans, customerMemberships,
  spaces, desks, deskBookings,
  patients, doctors, appointments, medicalRecords,
  platformAdmins, platformAdminPermissions, platformAdminPermissionAssignments,
  platformAdminCountryAssignments,
  platformRegionConfigs, exchangeRates,
  supportTickets, supportTicketMessages, errorLogs, usageMetrics,
  auditLogs, userTenants, users,
  customerPortalSettings, customerPortalAccounts, customerPortalSessions, customerPortalInvites,
  furnitureProducts, rawMaterialCategories, rawMaterials, rawMaterialStockMovements,
  billOfMaterials, bomComponents, productionOrders, productionStages,
  deliveryOrders, deliveryOrderItems, installationOrders,
  furnitureSalesOrders, furnitureSalesOrderItems,
  tenantRoles, tenantRolePermissions, tenantStaff, tenantStaffInvites,
  type Tenant, type InsertTenant,
  type Customer, type InsertCustomer,
  type Service, type InsertService,
  type Booking, type InsertBooking,
  type Staff, type InsertStaff,
  type BookingWithDetails,
  type TenantRole, type InsertTenantRole,
  type TenantRolePermission, type InsertTenantRolePermission,
  type TenantStaff, type InsertTenantStaff,
  type TenantStaffInvite, type InsertTenantStaffInvite,
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
  type PlatformAdminCountryAssignment, type InsertPlatformAdminCountryAssignment,
  type PlatformRegionConfig, type InsertPlatformRegionConfig,
  type ExchangeRate, type InsertExchangeRate,
  type SupportTicket, type InsertSupportTicket,
  type SupportTicketMessage, type InsertSupportTicketMessage,
  type ErrorLog, type InsertErrorLog,
  type UsageMetric, type InsertUsageMetric,
  type AuditLog,
  type CustomerPortalSettings, type InsertCustomerPortalSettings,
  type CustomerPortalAccount, type InsertCustomerPortalAccount,
  type CustomerPortalSession, type InsertCustomerPortalSession,
  type CustomerPortalInvite, type InsertCustomerPortalInvite,
  type FurnitureProduct, type InsertFurnitureProduct,
  type RawMaterialCategory, type InsertRawMaterialCategory,
  type RawMaterial, type InsertRawMaterial,
  type RawMaterialStockMovement, type InsertRawMaterialStockMovement,
  type BillOfMaterials, type InsertBillOfMaterials,
  type BomComponent, type InsertBomComponent,
  type ProductionOrder, type InsertProductionOrder,
  type ProductionStage, type InsertProductionStage,
  type DeliveryOrder, type InsertDeliveryOrder,
  type DeliveryOrderItem, type InsertDeliveryOrderItem,
  type InstallationOrder, type InsertInstallationOrder,
  type FurnitureSalesOrder, type InsertFurnitureSalesOrder,
  type FurnitureSalesOrderItem, type InsertFurnitureSalesOrderItem,
  inAppNotifications,
  type InAppNotification, type InsertInAppNotification,
  notificationPreferences,
  type NotificationPreferences, type InsertNotificationPreferences,
  projects, projectTasks, timesheets, invoiceProjectLinks,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
  type Timesheet, type InsertTimesheet,
  type InvoiceProjectLink, type InsertInvoiceProjectLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, isNull } from "drizzle-orm";

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

  // In-App Notifications
  getInAppNotifications(userId: string, options?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<InAppNotification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification>;
  markNotificationAsRead(id: string, userId: string): Promise<InAppNotification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  deleteNotification(id: string, userId: string): Promise<void>;
  
  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(userId: string, tenantId: string | undefined, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;

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
  getSpace(id: string, tenantId: string): Promise<Space | undefined>;
  updateSpace(id: string, tenantId: string, space: Partial<InsertSpace>): Promise<Space | undefined>;
  deleteSpace(id: string, tenantId: string): Promise<void>;

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
  getTenantStats(countryFilter?: string[]): Promise<{
    totalTenants: number;
    activeTenants: number;
    tenantsByBusinessType: { type: string; count: number }[];
    tenantsByTier: { tier: string; count: number }[];
  }>;

  // Platform Dashboard - User Statistics
  getUserStats(countryFilter?: string[]): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByTenant: { tenantId: string; tenantName: string; count: number }[];
  }>;

  // User Management
  getUser(id: string): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; passwordHash: string | null; } | undefined>;
  updateUser(id: string, updates: Partial<{ passwordHash: string }>): Promise<void>;
  getUsersByTenant(tenantId: string, options?: { limit?: number; offset?: number; search?: string }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; }[]>;

  // Platform Dashboard - Error Logs
  getErrorLogs(options?: { tenantId?: string; severity?: string; limit?: number; offset?: number }): Promise<ErrorLog[]>;
  getErrorLogStats(countryFilter?: string[]): Promise<{
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
  getSupportTicketStats(countryFilter?: string[]): Promise<{
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
  getAggregatedUsageMetrics(countryFilter?: string[]): Promise<{
    totalApiCalls: number;
    totalStorageUsed: number;
    totalActiveUsers: number;
    metricsByType: { type: string; total: number }[];
  }>;
  createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric>;

  // Platform Dashboard - Audit Logs (read-only)
  getAuditLogs(options?: { tenantId?: string; userId?: string; action?: string; limit?: number; offset?: number }): Promise<AuditLog[]>;

  // Platform Admin Country Assignments
  getAdminCountryAssignments(adminId: string): Promise<PlatformAdminCountryAssignment[]>;
  assignCountryToAdmin(assignment: InsertPlatformAdminCountryAssignment): Promise<PlatformAdminCountryAssignment>;
  removeCountryFromAdmin(adminId: string, countryCode: string): Promise<void>;
  setAdminCountries(adminId: string, countryCodes: string[], assignedBy?: string): Promise<PlatformAdminCountryAssignment[]>;

  // Exchange Rates
  getExchangeRates(): Promise<ExchangeRate[]>;
  getActiveExchangeRates(): Promise<ExchangeRate[]>;
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | undefined>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: string, rate: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined>;
  deactivateExchangeRate(id: string): Promise<void>;
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{ convertedAmount: number; rate: number; decimalPlaces: number }>;

  // Customer Portal Settings
  getCustomerPortalSettings(tenantId: string): Promise<CustomerPortalSettings | undefined>;
  createCustomerPortalSettings(settings: InsertCustomerPortalSettings): Promise<CustomerPortalSettings>;
  updateCustomerPortalSettings(tenantId: string, settings: Partial<InsertCustomerPortalSettings>): Promise<CustomerPortalSettings | undefined>;
  getCustomerPortalSettingsByToken(portalToken: string): Promise<CustomerPortalSettings | undefined>;

  // Customer Portal Accounts
  getCustomerPortalAccount(id: string, tenantId: string): Promise<CustomerPortalAccount | undefined>;
  getCustomerPortalAccountByEmail(email: string, tenantId: string): Promise<CustomerPortalAccount | undefined>;
  getCustomerPortalAccountByCustomerId(customerId: string, tenantId: string): Promise<CustomerPortalAccount | undefined>;
  createCustomerPortalAccount(account: InsertCustomerPortalAccount): Promise<CustomerPortalAccount>;
  updateCustomerPortalAccount(id: string, tenantId: string, account: Partial<InsertCustomerPortalAccount>): Promise<CustomerPortalAccount | undefined>;

  // Customer Portal Sessions
  createCustomerPortalSession(session: InsertCustomerPortalSession): Promise<CustomerPortalSession>;
  getCustomerPortalSessionByToken(sessionToken: string): Promise<CustomerPortalSession | undefined>;
  deleteCustomerPortalSession(sessionToken: string): Promise<void>;
  deleteExpiredCustomerPortalSessions(): Promise<void>;

  // Customer Portal Invites
  createCustomerPortalInvite(invite: InsertCustomerPortalInvite): Promise<CustomerPortalInvite>;
  getCustomerPortalInviteByToken(inviteToken: string): Promise<CustomerPortalInvite | undefined>;
  updateCustomerPortalInvite(id: string, invite: Partial<InsertCustomerPortalInvite>): Promise<CustomerPortalInvite | undefined>;
  getCustomerPortalInvites(tenantId: string): Promise<CustomerPortalInvite[]>;

  // ============================================
  // FURNITURE MANUFACTURING MODULE
  // ============================================

  // Dashboard Stats
  getFurnitureDashboardStats(tenantId: string): Promise<{
    totalProducts: number;
    activeProductionOrders: number;
    pendingDeliveries: number;
    lowStockMaterials: number;
    pendingSalesOrders: number;
    pendingInstallations: number;
  }>;

  // Furniture Products
  getFurnitureProducts(tenantId: string): Promise<FurnitureProduct[]>;
  getFurnitureProduct(id: string, tenantId: string): Promise<FurnitureProduct | undefined>;
  createFurnitureProduct(product: InsertFurnitureProduct): Promise<FurnitureProduct>;
  updateFurnitureProduct(id: string, tenantId: string, product: Partial<InsertFurnitureProduct>): Promise<FurnitureProduct | undefined>;
  deleteFurnitureProduct(id: string, tenantId: string): Promise<void>;

  // Raw Material Categories
  getRawMaterialCategories(tenantId: string): Promise<RawMaterialCategory[]>;
  createRawMaterialCategory(category: InsertRawMaterialCategory): Promise<RawMaterialCategory>;
  updateRawMaterialCategory(id: string, tenantId: string, category: Partial<InsertRawMaterialCategory>): Promise<RawMaterialCategory | undefined>;
  deleteRawMaterialCategory(id: string, tenantId: string): Promise<void>;

  // Raw Materials
  getRawMaterials(tenantId: string): Promise<RawMaterial[]>;
  getRawMaterial(id: string, tenantId: string): Promise<RawMaterial | undefined>;
  createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial>;
  updateRawMaterial(id: string, tenantId: string, material: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined>;
  deleteRawMaterial(id: string, tenantId: string): Promise<void>;
  getLowStockRawMaterials(tenantId: string): Promise<RawMaterial[]>;

  // Raw Material Stock Movements
  createRawMaterialStockMovement(movement: InsertRawMaterialStockMovement): Promise<RawMaterialStockMovement>;
  getRawMaterialStockMovements(tenantId: string, rawMaterialId?: string): Promise<RawMaterialStockMovement[]>;

  // Bill of Materials
  getBillOfMaterials(tenantId: string, productId?: string): Promise<BillOfMaterials[]>;
  getBillOfMaterial(id: string, tenantId: string): Promise<BillOfMaterials | undefined>;
  createBillOfMaterials(bom: InsertBillOfMaterials): Promise<BillOfMaterials>;
  updateBillOfMaterials(id: string, tenantId: string, bom: Partial<InsertBillOfMaterials>): Promise<BillOfMaterials | undefined>;
  deleteBillOfMaterials(id: string, tenantId: string): Promise<void>;

  // BOM Components (tenant verified through parent BOM)
  getBomComponents(bomId: string, tenantId: string): Promise<BomComponent[]>;
  createBomComponent(component: InsertBomComponent, tenantId: string): Promise<BomComponent>;
  updateBomComponent(id: string, bomId: string, tenantId: string, component: Partial<InsertBomComponent>): Promise<BomComponent | undefined>;
  deleteBomComponent(id: string, bomId: string, tenantId: string): Promise<void>;

  // Production Orders
  getProductionOrders(tenantId: string): Promise<ProductionOrder[]>;
  getProductionOrder(id: string, tenantId: string): Promise<ProductionOrder | undefined>;
  createProductionOrder(order: InsertProductionOrder): Promise<ProductionOrder>;
  updateProductionOrder(id: string, tenantId: string, order: Partial<InsertProductionOrder>): Promise<ProductionOrder | undefined>;
  deleteProductionOrder(id: string, tenantId: string): Promise<void>;

  // Production Stages (tenant verified through parent production order)
  getProductionStages(productionOrderId: string, tenantId: string): Promise<ProductionStage[]>;
  getProductionStage(id: string, productionOrderId: string, tenantId: string): Promise<ProductionStage | undefined>;
  createProductionStage(stage: InsertProductionStage, tenantId: string): Promise<ProductionStage>;
  updateProductionStage(id: string, productionOrderId: string, tenantId: string, stage: Partial<InsertProductionStage>): Promise<ProductionStage | undefined>;

  // Delivery Orders
  getDeliveryOrders(tenantId: string): Promise<DeliveryOrder[]>;
  getDeliveryOrder(id: string, tenantId: string): Promise<DeliveryOrder | undefined>;
  createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder>;
  updateDeliveryOrder(id: string, tenantId: string, order: Partial<InsertDeliveryOrder>): Promise<DeliveryOrder | undefined>;
  deleteDeliveryOrder(id: string, tenantId: string): Promise<void>;

  // Delivery Order Items (tenant verified through parent delivery order)
  getDeliveryOrderItems(deliveryOrderId: string, tenantId: string): Promise<DeliveryOrderItem[]>;
  createDeliveryOrderItem(item: InsertDeliveryOrderItem, tenantId: string): Promise<DeliveryOrderItem>;
  updateDeliveryOrderItem(id: string, deliveryOrderId: string, tenantId: string, item: Partial<InsertDeliveryOrderItem>): Promise<DeliveryOrderItem | undefined>;

  // Installation Orders
  getInstallationOrders(tenantId: string): Promise<InstallationOrder[]>;
  getInstallationOrder(id: string, tenantId: string): Promise<InstallationOrder | undefined>;
  createInstallationOrder(order: InsertInstallationOrder): Promise<InstallationOrder>;
  updateInstallationOrder(id: string, tenantId: string, order: Partial<InsertInstallationOrder>): Promise<InstallationOrder | undefined>;

  // Furniture Sales Orders
  getFurnitureSalesOrders(tenantId: string): Promise<FurnitureSalesOrder[]>;
  getFurnitureSalesOrder(id: string, tenantId: string): Promise<FurnitureSalesOrder | undefined>;
  createFurnitureSalesOrder(order: InsertFurnitureSalesOrder): Promise<FurnitureSalesOrder>;
  updateFurnitureSalesOrder(id: string, tenantId: string, order: Partial<InsertFurnitureSalesOrder>): Promise<FurnitureSalesOrder | undefined>;
  deleteFurnitureSalesOrder(id: string, tenantId: string): Promise<void>;

  // Furniture Sales Order Items (tenant verified through parent sales order)
  getFurnitureSalesOrderItems(salesOrderId: string, tenantId: string): Promise<FurnitureSalesOrderItem[]>;
  createFurnitureSalesOrderItem(item: InsertFurnitureSalesOrderItem, tenantId: string): Promise<FurnitureSalesOrderItem>;
  updateFurnitureSalesOrderItem(id: string, salesOrderId: string, tenantId: string, item: Partial<InsertFurnitureSalesOrderItem>): Promise<FurnitureSalesOrderItem | undefined>;
  deleteFurnitureSalesOrderItem(id: string, salesOrderId: string, tenantId: string): Promise<void>;

  // Projects (Software Services & Consulting)
  getProjects(tenantId: string): Promise<Project[]>;
  getProject(id: string, tenantId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, tenantId: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string, tenantId: string): Promise<void>;

  // Project Tasks
  getProjectTasks(projectId: string, tenantId: string): Promise<ProjectTask[]>;
  getProjectTask(id: string, tenantId: string): Promise<ProjectTask | undefined>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, tenantId: string, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: string, tenantId: string): Promise<void>;

  // Timesheets
  getTimesheets(tenantId: string, filters?: { projectId?: string; userId?: string; startDate?: string; endDate?: string; status?: string }): Promise<Timesheet[]>;
  getTimesheet(id: string, tenantId: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: string, tenantId: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: string, tenantId: string): Promise<void>;

  // Invoice Project Links
  getInvoiceProjectLinks(invoiceId: string, tenantId: string): Promise<InvoiceProjectLink[]>;
  createInvoiceProjectLink(link: InsertInvoiceProjectLink): Promise<InvoiceProjectLink>;

  // Tenant Roles
  getTenantRoles(tenantId: string): Promise<TenantRole[]>;
  getTenantRole(id: string, tenantId: string): Promise<TenantRole | undefined>;
  createTenantRole(role: InsertTenantRole): Promise<TenantRole>;
  updateTenantRole(id: string, tenantId: string, role: Partial<InsertTenantRole>): Promise<TenantRole | undefined>;
  deleteTenantRole(id: string, tenantId: string): Promise<void>;

  // Tenant Role Permissions
  getTenantRolePermissions(roleId: string): Promise<TenantRolePermission[]>;
  setTenantRolePermissions(roleId: string, permissions: string[]): Promise<void>;

  // Tenant Staff
  getTenantStaff(tenantId: string): Promise<TenantStaff[]>;
  getTenantStaffMember(id: string, tenantId: string): Promise<TenantStaff | undefined>;
  getTenantStaffByEmail(email: string, tenantId: string): Promise<TenantStaff | undefined>;
  getTenantStaffByUserId(userId: string, tenantId: string): Promise<TenantStaff | undefined>;
  createTenantStaff(staff: InsertTenantStaff): Promise<TenantStaff>;
  updateTenantStaff(id: string, tenantId: string, staff: Partial<InsertTenantStaff>): Promise<TenantStaff | undefined>;
  deleteTenantStaff(id: string, tenantId: string): Promise<void>;

  // Tenant staff invites
  createStaffInvite(invite: InsertTenantStaffInvite): Promise<TenantStaffInvite>;
  getStaffInviteByToken(tokenHash: string): Promise<TenantStaffInvite | undefined>;
  getActiveInviteForStaff(staffId: string): Promise<TenantStaffInvite | undefined>;
  updateStaffInvite(id: string, data: Partial<TenantStaffInvite>): Promise<TenantStaffInvite | undefined>;
  revokeStaffInvite(staffId: string): Promise<void>;

  // Seed default roles for a tenant
  seedDefaultRolesForTenant(tenantId: string): Promise<void>;
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

  // In-App Notifications
  async getInAppNotifications(userId: string, options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<InAppNotification[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;
    const conditions = [eq(inAppNotifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(inAppNotifications.isRead, false));
    }
    return db.select()
      .from(inAppNotifications)
      .where(and(...conditions))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(inAppNotifications)
      .where(and(eq(inAppNotifications.userId, userId), eq(inAppNotifications.isRead, false)));
    return result?.count || 0;
  }

  async createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification> {
    const [created] = await db.insert(inAppNotifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<InAppNotification | undefined> {
    const [updated] = await db.update(inAppNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(inAppNotifications.id, id), eq(inAppNotifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db.update(inAppNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(inAppNotifications.userId, userId), eq(inAppNotifications.isRead, false)));
    return result.rowCount || 0;
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.delete(inAppNotifications).where(and(eq(inAppNotifications.id, id), eq(inAppNotifications.userId, userId)));
  }

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async upsertNotificationPreferences(
    userId: string, 
    tenantId: string | undefined, 
    preferences: Partial<InsertNotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    
    if (existing) {
      const [updated] = await db.update(notificationPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(notificationPreferences)
        .values({
          userId,
          tenantId,
          ...preferences,
        })
        .returning();
      return created;
    }
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
    return db.select().from(spaces).where(eq(spaces.tenantId, tenantId)).orderBy(spaces.name);
  }

  async getSpace(id: string, tenantId: string): Promise<Space | undefined> {
    const [space] = await db.select().from(spaces).where(and(eq(spaces.id, id), eq(spaces.tenantId, tenantId)));
    return space;
  }

  async updateSpace(id: string, tenantId: string, space: Partial<InsertSpace>): Promise<Space | undefined> {
    const [updated] = await db.update(spaces).set({ ...space, updatedAt: new Date() }).where(and(eq(spaces.id, id), eq(spaces.tenantId, tenantId))).returning();
    return updated;
  }

  async deleteSpace(id: string, tenantId: string): Promise<void> {
    await db.delete(spaces).where(and(eq(spaces.id, id), eq(spaces.tenantId, tenantId)));
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

  async getTenantStats(countryFilter?: string[]): Promise<{
    totalTenants: number;
    activeTenants: number;
    tenantsByBusinessType: { type: string; count: number }[];
    tenantsByTier: { tier: string; count: number }[];
  }> {
    let allTenants = await db.select().from(tenants);
    
    // Filter by country if specified
    if (countryFilter && countryFilter.length > 0) {
      allTenants = allTenants.filter(t => t.country && countryFilter.includes(t.country));
    }
    
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
  async getUserStats(countryFilter?: string[]): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByTenant: { tenantId: string; tenantName: string; count: number }[];
  }> {
    let allUserTenants = await db.select({
      tenantId: userTenants.tenantId,
      tenantName: tenants.name,
      country: tenants.country,
      isActive: userTenants.isActive,
    })
      .from(userTenants)
      .leftJoin(tenants, eq(userTenants.tenantId, tenants.id));

    // Filter by country if specified
    if (countryFilter && countryFilter.length > 0) {
      allUserTenants = allUserTenants.filter(ut => ut.country && countryFilter.includes(ut.country));
    }

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

  // User Management
  async getUser(id: string): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; passwordHash: string | null; } | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
    return user;
  }

  async updateUser(id: string, updates: Partial<{ passwordHash: string }>): Promise<void> {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  async getUsersByTenant(tenantId: string, options?: { limit?: number; offset?: number; search?: string }): Promise<{ id: string; email: string | null; firstName: string | null; lastName: string | null; }[]> {
    const tenantUserLinks = await db.select({ userId: userTenants.userId })
      .from(userTenants)
      .where(eq(userTenants.tenantId, tenantId));

    const userIds = tenantUserLinks.map(u => u.userId);
    if (userIds.length === 0) return [];

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users);

    let filteredUsers = allUsers.filter(u => userIds.includes(u.id));

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filteredUsers = filteredUsers.filter(u =>
        u.email?.toLowerCase().includes(searchLower) ||
        u.firstName?.toLowerCase().includes(searchLower) ||
        u.lastName?.toLowerCase().includes(searchLower)
      );
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return filteredUsers.slice(offset, offset + limit);
  }

  // Tenant Subscription (stub for billing support view)
  async getTenantSubscription(tenantId: string): Promise<{ tier: string; status: string } | null> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return null;
    return {
      tier: tenant.subscriptionTier || "free",
      status: tenant.status || "active",
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

  async getErrorLogStats(countryFilter?: string[]): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    errorsBySeverity: { severity: string; count: number }[];
    errorsBySource: { source: string; count: number }[];
  }> {
    let allErrors = await db.select({
      id: errorLogs.id,
      severity: errorLogs.severity,
      source: errorLogs.source,
      isResolved: errorLogs.isResolved,
      tenantId: errorLogs.tenantId,
      country: tenants.country,
    })
      .from(errorLogs)
      .leftJoin(tenants, eq(errorLogs.tenantId, tenants.id));

    // Filter by country if specified
    if (countryFilter && countryFilter.length > 0) {
      allErrors = allErrors.filter(e => e.country && countryFilter.includes(e.country));
    }

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

  async getSupportTicketStats(countryFilter?: string[]): Promise<{
    totalTickets: number;
    openTickets: number;
    ticketsByStatus: { status: string; count: number }[];
    ticketsByPriority: { priority: string; count: number }[];
  }> {
    let allTickets = await db.select({
      id: supportTickets.id,
      status: supportTickets.status,
      priority: supportTickets.priority,
      tenantId: supportTickets.tenantId,
      country: tenants.country,
    })
      .from(supportTickets)
      .leftJoin(tenants, eq(supportTickets.tenantId, tenants.id));

    // Filter by country if specified
    if (countryFilter && countryFilter.length > 0) {
      allTickets = allTickets.filter(t => t.country && countryFilter.includes(t.country));
    }

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

  async getAggregatedUsageMetrics(countryFilter?: string[]): Promise<{
    totalApiCalls: number;
    totalStorageUsed: number;
    totalActiveUsers: number;
    metricsByType: { type: string; total: number }[];
  }> {
    let allMetrics = await db.select({
      metricType: usageMetrics.metricType,
      metricValue: usageMetrics.metricValue,
      tenantId: usageMetrics.tenantId,
      country: tenants.country,
    })
      .from(usageMetrics)
      .leftJoin(tenants, eq(usageMetrics.tenantId, tenants.id));

    // Filter by country if specified
    if (countryFilter && countryFilter.length > 0) {
      allMetrics = allMetrics.filter(m => m.country && countryFilter.includes(m.country));
    }
    
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

  // Platform Admin Country Assignments
  async getAdminCountryAssignments(adminId: string): Promise<PlatformAdminCountryAssignment[]> {
    return db.select().from(platformAdminCountryAssignments)
      .where(eq(platformAdminCountryAssignments.adminId, adminId))
      .orderBy(platformAdminCountryAssignments.countryCode);
  }

  async assignCountryToAdmin(assignment: InsertPlatformAdminCountryAssignment): Promise<PlatformAdminCountryAssignment> {
    const [created] = await db.insert(platformAdminCountryAssignments).values(assignment).returning();
    return created;
  }

  async removeCountryFromAdmin(adminId: string, countryCode: string): Promise<void> {
    await db.delete(platformAdminCountryAssignments)
      .where(and(
        eq(platformAdminCountryAssignments.adminId, adminId),
        eq(platformAdminCountryAssignments.countryCode, countryCode)
      ));
  }

  async setAdminCountries(adminId: string, countryCodes: string[], assignedBy?: string): Promise<PlatformAdminCountryAssignment[]> {
    // Delete all existing assignments
    await db.delete(platformAdminCountryAssignments)
      .where(eq(platformAdminCountryAssignments.adminId, adminId));
    
    if (countryCodes.length === 0) {
      return [];
    }

    // Insert new assignments
    const assignments = countryCodes.map(code => ({
      adminId,
      countryCode: code,
      assignedBy,
    }));
    
    return db.insert(platformAdminCountryAssignments).values(assignments).returning();
  }

  // Customer Portal Settings
  async getCustomerPortalSettings(tenantId: string): Promise<CustomerPortalSettings | undefined> {
    const [settings] = await db.select().from(customerPortalSettings)
      .where(eq(customerPortalSettings.tenantId, tenantId));
    return settings;
  }

  async createCustomerPortalSettings(settings: InsertCustomerPortalSettings): Promise<CustomerPortalSettings> {
    const [created] = await db.insert(customerPortalSettings).values(settings).returning();
    return created;
  }

  async updateCustomerPortalSettings(tenantId: string, settings: Partial<InsertCustomerPortalSettings>): Promise<CustomerPortalSettings | undefined> {
    const [updated] = await db.update(customerPortalSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(customerPortalSettings.tenantId, tenantId))
      .returning();
    return updated;
  }

  async getCustomerPortalSettingsByToken(portalToken: string): Promise<CustomerPortalSettings | undefined> {
    const [settings] = await db.select().from(customerPortalSettings)
      .where(eq(customerPortalSettings.portalToken, portalToken));
    return settings;
  }

  // Customer Portal Accounts
  async getCustomerPortalAccount(id: string, tenantId: string): Promise<CustomerPortalAccount | undefined> {
    const [account] = await db.select().from(customerPortalAccounts)
      .where(and(
        eq(customerPortalAccounts.id, id),
        eq(customerPortalAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async getCustomerPortalAccountByEmail(email: string, tenantId: string): Promise<CustomerPortalAccount | undefined> {
    const [account] = await db.select().from(customerPortalAccounts)
      .where(and(
        eq(customerPortalAccounts.email, email),
        eq(customerPortalAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async getCustomerPortalAccountByCustomerId(customerId: string, tenantId: string): Promise<CustomerPortalAccount | undefined> {
    const [account] = await db.select().from(customerPortalAccounts)
      .where(and(
        eq(customerPortalAccounts.customerId, customerId),
        eq(customerPortalAccounts.tenantId, tenantId)
      ));
    return account;
  }

  async createCustomerPortalAccount(account: InsertCustomerPortalAccount): Promise<CustomerPortalAccount> {
    const [created] = await db.insert(customerPortalAccounts).values(account).returning();
    return created;
  }

  async updateCustomerPortalAccount(id: string, tenantId: string, account: Partial<InsertCustomerPortalAccount>): Promise<CustomerPortalAccount | undefined> {
    const [updated] = await db.update(customerPortalAccounts)
      .set({ ...account, updatedAt: new Date() })
      .where(and(
        eq(customerPortalAccounts.id, id),
        eq(customerPortalAccounts.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  // Customer Portal Sessions
  async createCustomerPortalSession(session: InsertCustomerPortalSession): Promise<CustomerPortalSession> {
    const [created] = await db.insert(customerPortalSessions).values(session).returning();
    return created;
  }

  async getCustomerPortalSessionByToken(sessionToken: string): Promise<CustomerPortalSession | undefined> {
    const [session] = await db.select().from(customerPortalSessions)
      .where(eq(customerPortalSessions.sessionToken, sessionToken));
    return session;
  }

  async deleteCustomerPortalSession(sessionToken: string): Promise<void> {
    await db.delete(customerPortalSessions)
      .where(eq(customerPortalSessions.sessionToken, sessionToken));
  }

  async deleteExpiredCustomerPortalSessions(): Promise<void> {
    await db.delete(customerPortalSessions)
      .where(lte(customerPortalSessions.expiresAt, new Date()));
  }

  // Customer Portal Invites
  async createCustomerPortalInvite(invite: InsertCustomerPortalInvite): Promise<CustomerPortalInvite> {
    const [created] = await db.insert(customerPortalInvites).values(invite).returning();
    return created;
  }

  async getCustomerPortalInviteByToken(inviteToken: string): Promise<CustomerPortalInvite | undefined> {
    const [invite] = await db.select().from(customerPortalInvites)
      .where(eq(customerPortalInvites.inviteToken, inviteToken));
    return invite;
  }

  async updateCustomerPortalInvite(id: string, invite: Partial<InsertCustomerPortalInvite>): Promise<CustomerPortalInvite | undefined> {
    const [updated] = await db.update(customerPortalInvites)
      .set(invite)
      .where(eq(customerPortalInvites.id, id))
      .returning();
    return updated;
  }

  async getCustomerPortalInvites(tenantId: string): Promise<CustomerPortalInvite[]> {
    return db.select().from(customerPortalInvites)
      .where(eq(customerPortalInvites.tenantId, tenantId))
      .orderBy(desc(customerPortalInvites.createdAt));
  }

  // ============================================
  // FURNITURE MANUFACTURING MODULE
  // ============================================

  // Dashboard Stats
  async getFurnitureDashboardStats(tenantId: string): Promise<{
    totalProducts: number;
    activeProductionOrders: number;
    pendingDeliveries: number;
    lowStockMaterials: number;
    pendingSalesOrders: number;
    pendingInstallations: number;
  }> {
    const [productsResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(furnitureProducts)
      .where(and(eq(furnitureProducts.tenantId, tenantId), sql`${furnitureProducts.deletedAt} IS NULL`));

    const [productionResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(productionOrders)
      .where(and(eq(productionOrders.tenantId, tenantId), eq(productionOrders.status, "in_progress")));

    const [deliveryResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(deliveryOrders)
      .where(and(eq(deliveryOrders.tenantId, tenantId), eq(deliveryOrders.deliveryStatus, "scheduled")));

    const lowStockMaterials = await this.getLowStockRawMaterials(tenantId);

    const [salesResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(furnitureSalesOrders)
      .where(and(eq(furnitureSalesOrders.tenantId, tenantId), eq(furnitureSalesOrders.status, "pending")));

    const [installationResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(installationOrders)
      .where(and(eq(installationOrders.tenantId, tenantId), eq(installationOrders.installationStatus, "scheduled")));

    return {
      totalProducts: productsResult?.count ?? 0,
      activeProductionOrders: productionResult?.count ?? 0,
      pendingDeliveries: deliveryResult?.count ?? 0,
      lowStockMaterials: lowStockMaterials.length,
      pendingSalesOrders: salesResult?.count ?? 0,
      pendingInstallations: installationResult?.count ?? 0,
    };
  }

  // Furniture Products
  async getFurnitureProducts(tenantId: string): Promise<FurnitureProduct[]> {
    return db.select().from(furnitureProducts)
      .where(and(eq(furnitureProducts.tenantId, tenantId), sql`${furnitureProducts.deletedAt} IS NULL`))
      .orderBy(desc(furnitureProducts.createdAt));
  }

  async getFurnitureProduct(id: string, tenantId: string): Promise<FurnitureProduct | undefined> {
    const [product] = await db.select().from(furnitureProducts)
      .where(and(eq(furnitureProducts.id, id), eq(furnitureProducts.tenantId, tenantId)));
    return product;
  }

  async createFurnitureProduct(product: InsertFurnitureProduct): Promise<FurnitureProduct> {
    const [created] = await db.insert(furnitureProducts).values(product).returning();
    return created;
  }

  async updateFurnitureProduct(id: string, tenantId: string, product: Partial<InsertFurnitureProduct>): Promise<FurnitureProduct | undefined> {
    const [updated] = await db.update(furnitureProducts)
      .set({ ...product, updatedAt: new Date() })
      .where(and(eq(furnitureProducts.id, id), eq(furnitureProducts.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteFurnitureProduct(id: string, tenantId: string): Promise<void> {
    await db.update(furnitureProducts)
      .set({ deletedAt: new Date() })
      .where(and(eq(furnitureProducts.id, id), eq(furnitureProducts.tenantId, tenantId)));
  }

  // Raw Material Categories
  async getRawMaterialCategories(tenantId: string): Promise<RawMaterialCategory[]> {
    return db.select().from(rawMaterialCategories)
      .where(eq(rawMaterialCategories.tenantId, tenantId))
      .orderBy(rawMaterialCategories.sortOrder);
  }

  async createRawMaterialCategory(category: InsertRawMaterialCategory): Promise<RawMaterialCategory> {
    const [created] = await db.insert(rawMaterialCategories).values(category).returning();
    return created;
  }

  async updateRawMaterialCategory(id: string, tenantId: string, category: Partial<InsertRawMaterialCategory>): Promise<RawMaterialCategory | undefined> {
    const [updated] = await db.update(rawMaterialCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(and(eq(rawMaterialCategories.id, id), eq(rawMaterialCategories.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteRawMaterialCategory(id: string, tenantId: string): Promise<void> {
    await db.delete(rawMaterialCategories)
      .where(and(eq(rawMaterialCategories.id, id), eq(rawMaterialCategories.tenantId, tenantId)));
  }

  // Raw Materials
  async getRawMaterials(tenantId: string): Promise<RawMaterial[]> {
    return db.select().from(rawMaterials)
      .where(and(eq(rawMaterials.tenantId, tenantId), sql`${rawMaterials.deletedAt} IS NULL`))
      .orderBy(desc(rawMaterials.createdAt));
  }

  async getRawMaterial(id: string, tenantId: string): Promise<RawMaterial | undefined> {
    const [material] = await db.select().from(rawMaterials)
      .where(and(eq(rawMaterials.id, id), eq(rawMaterials.tenantId, tenantId)));
    return material;
  }

  async createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial> {
    const [created] = await db.insert(rawMaterials).values(material).returning();
    return created;
  }

  async updateRawMaterial(id: string, tenantId: string, material: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined> {
    const [updated] = await db.update(rawMaterials)
      .set({ ...material, updatedAt: new Date() })
      .where(and(eq(rawMaterials.id, id), eq(rawMaterials.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteRawMaterial(id: string, tenantId: string): Promise<void> {
    await db.update(rawMaterials)
      .set({ deletedAt: new Date() })
      .where(and(eq(rawMaterials.id, id), eq(rawMaterials.tenantId, tenantId)));
  }

  async getLowStockRawMaterials(tenantId: string): Promise<RawMaterial[]> {
    return db.select().from(rawMaterials)
      .where(and(
        eq(rawMaterials.tenantId, tenantId),
        sql`${rawMaterials.deletedAt} IS NULL`,
        sql`CAST(${rawMaterials.currentStock} AS DECIMAL) <= CAST(${rawMaterials.reorderPoint} AS DECIMAL)`
      ));
  }

  // Raw Material Stock Movements
  async createRawMaterialStockMovement(movement: InsertRawMaterialStockMovement): Promise<RawMaterialStockMovement> {
    const [created] = await db.insert(rawMaterialStockMovements).values(movement).returning();
    return created;
  }

  async getRawMaterialStockMovements(tenantId: string, rawMaterialId?: string): Promise<RawMaterialStockMovement[]> {
    if (rawMaterialId) {
      return db.select().from(rawMaterialStockMovements)
        .where(and(eq(rawMaterialStockMovements.tenantId, tenantId), eq(rawMaterialStockMovements.rawMaterialId, rawMaterialId)))
        .orderBy(desc(rawMaterialStockMovements.createdAt));
    }
    return db.select().from(rawMaterialStockMovements)
      .where(eq(rawMaterialStockMovements.tenantId, tenantId))
      .orderBy(desc(rawMaterialStockMovements.createdAt));
  }

  // Bill of Materials
  async getBillOfMaterials(tenantId: string, productId?: string): Promise<BillOfMaterials[]> {
    if (productId) {
      return db.select().from(billOfMaterials)
        .where(and(eq(billOfMaterials.tenantId, tenantId), eq(billOfMaterials.productId, productId), sql`${billOfMaterials.deletedAt} IS NULL`))
        .orderBy(desc(billOfMaterials.version));
    }
    return db.select().from(billOfMaterials)
      .where(and(eq(billOfMaterials.tenantId, tenantId), sql`${billOfMaterials.deletedAt} IS NULL`))
      .orderBy(desc(billOfMaterials.createdAt));
  }

  async getBillOfMaterial(id: string, tenantId: string): Promise<BillOfMaterials | undefined> {
    const [bom] = await db.select().from(billOfMaterials)
      .where(and(eq(billOfMaterials.id, id), eq(billOfMaterials.tenantId, tenantId)));
    return bom;
  }

  async createBillOfMaterials(bom: InsertBillOfMaterials): Promise<BillOfMaterials> {
    const [created] = await db.insert(billOfMaterials).values(bom).returning();
    return created;
  }

  async updateBillOfMaterials(id: string, tenantId: string, bom: Partial<InsertBillOfMaterials>): Promise<BillOfMaterials | undefined> {
    const [updated] = await db.update(billOfMaterials)
      .set({ ...bom, updatedAt: new Date() })
      .where(and(eq(billOfMaterials.id, id), eq(billOfMaterials.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteBillOfMaterials(id: string, tenantId: string): Promise<void> {
    await db.update(billOfMaterials)
      .set({ deletedAt: new Date() })
      .where(and(eq(billOfMaterials.id, id), eq(billOfMaterials.tenantId, tenantId)));
  }

  // BOM Components (tenant verified through parent BOM)
  async getBomComponents(bomId: string, tenantId: string): Promise<BomComponent[]> {
    // Verify BOM belongs to tenant
    const bom = await this.getBillOfMaterial(bomId, tenantId);
    if (!bom) return [];
    return db.select().from(bomComponents)
      .where(eq(bomComponents.bomId, bomId))
      .orderBy(bomComponents.sortOrder);
  }

  async createBomComponent(component: InsertBomComponent, tenantId: string): Promise<BomComponent> {
    // Verify parent BOM belongs to tenant
    const bom = await this.getBillOfMaterial(component.bomId, tenantId);
    if (!bom) throw new Error("BOM not found or access denied");
    const [created] = await db.insert(bomComponents).values(component).returning();
    return created;
  }

  async updateBomComponent(id: string, bomId: string, tenantId: string, component: Partial<InsertBomComponent>): Promise<BomComponent | undefined> {
    // Verify parent BOM belongs to tenant
    const bom = await this.getBillOfMaterial(bomId, tenantId);
    if (!bom) return undefined;
    const [updated] = await db.update(bomComponents)
      .set({ ...component, updatedAt: new Date() })
      .where(and(eq(bomComponents.id, id), eq(bomComponents.bomId, bomId)))
      .returning();
    return updated;
  }

  async deleteBomComponent(id: string, bomId: string, tenantId: string): Promise<void> {
    // Verify parent BOM belongs to tenant
    const bom = await this.getBillOfMaterial(bomId, tenantId);
    if (!bom) return;
    await db.delete(bomComponents).where(and(eq(bomComponents.id, id), eq(bomComponents.bomId, bomId)));
  }

  // Production Orders
  async getProductionOrders(tenantId: string): Promise<ProductionOrder[]> {
    return db.select().from(productionOrders)
      .where(and(eq(productionOrders.tenantId, tenantId), sql`${productionOrders.deletedAt} IS NULL`))
      .orderBy(desc(productionOrders.createdAt));
  }

  async getProductionOrder(id: string, tenantId: string): Promise<ProductionOrder | undefined> {
    const [order] = await db.select().from(productionOrders)
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)));
    return order;
  }

  async createProductionOrder(order: InsertProductionOrder): Promise<ProductionOrder> {
    const [created] = await db.insert(productionOrders).values(order).returning();
    return created;
  }

  async updateProductionOrder(id: string, tenantId: string, order: Partial<InsertProductionOrder>): Promise<ProductionOrder | undefined> {
    const [updated] = await db.update(productionOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteProductionOrder(id: string, tenantId: string): Promise<void> {
    await db.update(productionOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)));
  }

  // Production Stages (tenant verified through parent production order)
  async getProductionStages(productionOrderId: string, tenantId: string): Promise<ProductionStage[]> {
    // Verify production order belongs to tenant
    const order = await this.getProductionOrder(productionOrderId, tenantId);
    if (!order) return [];
    return db.select().from(productionStages)
      .where(eq(productionStages.productionOrderId, productionOrderId))
      .orderBy(productionStages.stageOrder);
  }

  async getProductionStage(id: string, productionOrderId: string, tenantId: string): Promise<ProductionStage | undefined> {
    // Verify production order belongs to tenant
    const order = await this.getProductionOrder(productionOrderId, tenantId);
    if (!order) return undefined;
    const [stage] = await db.select().from(productionStages)
      .where(and(eq(productionStages.id, id), eq(productionStages.productionOrderId, productionOrderId)));
    return stage;
  }

  async createProductionStage(stage: InsertProductionStage, tenantId: string): Promise<ProductionStage> {
    // Verify parent production order belongs to tenant
    const order = await this.getProductionOrder(stage.productionOrderId, tenantId);
    if (!order) throw new Error("Production order not found or access denied");
    const [created] = await db.insert(productionStages).values(stage).returning();
    return created;
  }

  async updateProductionStage(id: string, productionOrderId: string, tenantId: string, stage: Partial<InsertProductionStage>): Promise<ProductionStage | undefined> {
    // Verify parent production order belongs to tenant
    const order = await this.getProductionOrder(productionOrderId, tenantId);
    if (!order) return undefined;
    const [updated] = await db.update(productionStages)
      .set({ ...stage, updatedAt: new Date() })
      .where(and(eq(productionStages.id, id), eq(productionStages.productionOrderId, productionOrderId)))
      .returning();
    return updated;
  }

  // Delivery Orders
  async getDeliveryOrders(tenantId: string): Promise<DeliveryOrder[]> {
    return db.select().from(deliveryOrders)
      .where(and(eq(deliveryOrders.tenantId, tenantId), sql`${deliveryOrders.deletedAt} IS NULL`))
      .orderBy(desc(deliveryOrders.createdAt));
  }

  async getDeliveryOrder(id: string, tenantId: string): Promise<DeliveryOrder | undefined> {
    const [order] = await db.select().from(deliveryOrders)
      .where(and(eq(deliveryOrders.id, id), eq(deliveryOrders.tenantId, tenantId)));
    return order;
  }

  async createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder> {
    const [created] = await db.insert(deliveryOrders).values(order).returning();
    return created;
  }

  async updateDeliveryOrder(id: string, tenantId: string, order: Partial<InsertDeliveryOrder>): Promise<DeliveryOrder | undefined> {
    const [updated] = await db.update(deliveryOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(deliveryOrders.id, id), eq(deliveryOrders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteDeliveryOrder(id: string, tenantId: string): Promise<void> {
    await db.update(deliveryOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(deliveryOrders.id, id), eq(deliveryOrders.tenantId, tenantId)));
  }

  // Delivery Order Items (tenant verified through parent delivery order)
  async getDeliveryOrderItems(deliveryOrderId: string, tenantId: string): Promise<DeliveryOrderItem[]> {
    // Verify delivery order belongs to tenant
    const order = await this.getDeliveryOrder(deliveryOrderId, tenantId);
    if (!order) return [];
    return db.select().from(deliveryOrderItems)
      .where(eq(deliveryOrderItems.deliveryOrderId, deliveryOrderId));
  }

  async createDeliveryOrderItem(item: InsertDeliveryOrderItem, tenantId: string): Promise<DeliveryOrderItem> {
    // Verify parent delivery order belongs to tenant
    const order = await this.getDeliveryOrder(item.deliveryOrderId, tenantId);
    if (!order) throw new Error("Delivery order not found or access denied");
    const [created] = await db.insert(deliveryOrderItems).values(item).returning();
    return created;
  }

  async updateDeliveryOrderItem(id: string, deliveryOrderId: string, tenantId: string, item: Partial<InsertDeliveryOrderItem>): Promise<DeliveryOrderItem | undefined> {
    // Verify parent delivery order belongs to tenant
    const order = await this.getDeliveryOrder(deliveryOrderId, tenantId);
    if (!order) return undefined;
    const [updated] = await db.update(deliveryOrderItems)
      .set(item)
      .where(and(eq(deliveryOrderItems.id, id), eq(deliveryOrderItems.deliveryOrderId, deliveryOrderId)))
      .returning();
    return updated;
  }

  // Installation Orders
  async getInstallationOrders(tenantId: string): Promise<InstallationOrder[]> {
    return db.select().from(installationOrders)
      .where(and(eq(installationOrders.tenantId, tenantId), sql`${installationOrders.deletedAt} IS NULL`))
      .orderBy(desc(installationOrders.createdAt));
  }

  async getInstallationOrder(id: string, tenantId: string): Promise<InstallationOrder | undefined> {
    const [order] = await db.select().from(installationOrders)
      .where(and(eq(installationOrders.id, id), eq(installationOrders.tenantId, tenantId)));
    return order;
  }

  async createInstallationOrder(order: InsertInstallationOrder): Promise<InstallationOrder> {
    const [created] = await db.insert(installationOrders).values(order).returning();
    return created;
  }

  async updateInstallationOrder(id: string, tenantId: string, order: Partial<InsertInstallationOrder>): Promise<InstallationOrder | undefined> {
    const [updated] = await db.update(installationOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(installationOrders.id, id), eq(installationOrders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  // Furniture Sales Orders
  async getFurnitureSalesOrders(tenantId: string): Promise<FurnitureSalesOrder[]> {
    return db.select().from(furnitureSalesOrders)
      .where(and(eq(furnitureSalesOrders.tenantId, tenantId), sql`${furnitureSalesOrders.deletedAt} IS NULL`))
      .orderBy(desc(furnitureSalesOrders.createdAt));
  }

  async getFurnitureSalesOrder(id: string, tenantId: string): Promise<FurnitureSalesOrder | undefined> {
    const [order] = await db.select().from(furnitureSalesOrders)
      .where(and(eq(furnitureSalesOrders.id, id), eq(furnitureSalesOrders.tenantId, tenantId)));
    return order;
  }

  async createFurnitureSalesOrder(order: InsertFurnitureSalesOrder): Promise<FurnitureSalesOrder> {
    const [created] = await db.insert(furnitureSalesOrders).values(order).returning();
    return created;
  }

  async updateFurnitureSalesOrder(id: string, tenantId: string, order: Partial<InsertFurnitureSalesOrder>): Promise<FurnitureSalesOrder | undefined> {
    const [updated] = await db.update(furnitureSalesOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(and(eq(furnitureSalesOrders.id, id), eq(furnitureSalesOrders.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteFurnitureSalesOrder(id: string, tenantId: string): Promise<void> {
    await db.update(furnitureSalesOrders)
      .set({ deletedAt: new Date() })
      .where(and(eq(furnitureSalesOrders.id, id), eq(furnitureSalesOrders.tenantId, tenantId)));
  }

  // Furniture Sales Order Items (tenant verified through parent sales order)
  async getFurnitureSalesOrderItems(salesOrderId: string, tenantId: string): Promise<FurnitureSalesOrderItem[]> {
    // Verify sales order belongs to tenant
    const order = await this.getFurnitureSalesOrder(salesOrderId, tenantId);
    if (!order) return [];
    return db.select().from(furnitureSalesOrderItems)
      .where(eq(furnitureSalesOrderItems.salesOrderId, salesOrderId))
      .orderBy(furnitureSalesOrderItems.sortOrder);
  }

  async createFurnitureSalesOrderItem(item: InsertFurnitureSalesOrderItem, tenantId: string): Promise<FurnitureSalesOrderItem> {
    // Verify parent sales order belongs to tenant
    const order = await this.getFurnitureSalesOrder(item.salesOrderId, tenantId);
    if (!order) throw new Error("Sales order not found or access denied");
    const [created] = await db.insert(furnitureSalesOrderItems).values(item).returning();
    return created;
  }

  async updateFurnitureSalesOrderItem(id: string, salesOrderId: string, tenantId: string, item: Partial<InsertFurnitureSalesOrderItem>): Promise<FurnitureSalesOrderItem | undefined> {
    // Verify parent sales order belongs to tenant
    const order = await this.getFurnitureSalesOrder(salesOrderId, tenantId);
    if (!order) return undefined;
    const [updated] = await db.update(furnitureSalesOrderItems)
      .set({ ...item, updatedAt: new Date() })
      .where(and(eq(furnitureSalesOrderItems.id, id), eq(furnitureSalesOrderItems.salesOrderId, salesOrderId)))
      .returning();
    return updated;
  }

  async deleteFurnitureSalesOrderItem(id: string, salesOrderId: string, tenantId: string): Promise<void> {
    // Verify parent sales order belongs to tenant
    const order = await this.getFurnitureSalesOrder(salesOrderId, tenantId);
    if (!order) return;
    await db.delete(furnitureSalesOrderItems).where(and(eq(furnitureSalesOrderItems.id, id), eq(furnitureSalesOrderItems.salesOrderId, salesOrderId)));
  }

  // Projects (Software Services & Consulting)
  async getProjects(tenantId: string): Promise<Project[]> {
    return db.select().from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string, tenantId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, tenantId: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteProject(id: string, tenantId: string): Promise<void> {
    await db.update(projects)
      .set({ archivedAt: new Date(), status: "archived" })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
  }

  // Project Tasks
  async getProjectTasks(projectId: string, tenantId: string): Promise<ProjectTask[]> {
    // Verify project belongs to tenant
    const project = await this.getProject(projectId, tenantId);
    if (!project) return [];
    return db.select().from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.sortOrder);
  }

  async getProjectTask(id: string, tenantId: string): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks)
      .where(and(eq(projectTasks.id, id), eq(projectTasks.tenantId, tenantId)));
    return task;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [created] = await db.insert(projectTasks).values(task).returning();
    return created;
  }

  async updateProjectTask(id: string, tenantId: string, task: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    const [updated] = await db.update(projectTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(and(eq(projectTasks.id, id), eq(projectTasks.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteProjectTask(id: string, tenantId: string): Promise<void> {
    await db.delete(projectTasks)
      .where(and(eq(projectTasks.id, id), eq(projectTasks.tenantId, tenantId)));
  }

  // Timesheets
  async getTimesheets(tenantId: string, filters?: { projectId?: string; userId?: string; startDate?: string; endDate?: string; status?: string }): Promise<Timesheet[]> {
    const conditions = [eq(timesheets.tenantId, tenantId)];
    
    if (filters?.projectId) {
      conditions.push(eq(timesheets.projectId, filters.projectId));
    }
    if (filters?.userId) {
      conditions.push(eq(timesheets.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(timesheets.status, filters.status as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(timesheets.date, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(timesheets.date, filters.endDate));
    }
    
    return db.select().from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.date));
  }

  async getTimesheet(id: string, tenantId: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)));
    return timesheet;
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    // Calculate total amount if hourly rate is provided
    const totalAmount = timesheet.hourlyRate && timesheet.hours 
      ? (parseFloat(timesheet.hourlyRate.toString()) * parseFloat(timesheet.hours.toString())).toString()
      : null;
    
    const [created] = await db.insert(timesheets)
      .values({ ...timesheet, totalAmount })
      .returning();
    return created;
  }

  async updateTimesheet(id: string, tenantId: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const [updated] = await db.update(timesheets)
      .set({ ...timesheet, updatedAt: new Date() })
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteTimesheet(id: string, tenantId: string): Promise<void> {
    // Only delete draft timesheets
    const existing = await this.getTimesheet(id, tenantId);
    if (existing?.status === "draft") {
      await db.delete(timesheets)
        .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)));
    }
  }

  // Invoice Project Links
  async getInvoiceProjectLinks(invoiceId: string, tenantId: string): Promise<InvoiceProjectLink[]> {
    return db.select().from(invoiceProjectLinks)
      .where(and(eq(invoiceProjectLinks.invoiceId, invoiceId), eq(invoiceProjectLinks.tenantId, tenantId)));
  }

  async createInvoiceProjectLink(link: InsertInvoiceProjectLink): Promise<InvoiceProjectLink> {
    const [created] = await db.insert(invoiceProjectLinks).values(link).returning();
    return created;
  }

  // ==================== TENANT ROLES ====================
  async getTenantRoles(tenantId: string): Promise<TenantRole[]> {
    return db.select().from(tenantRoles)
      .where(eq(tenantRoles.tenantId, tenantId))
      .orderBy(desc(tenantRoles.isDefault), tenantRoles.name);
  }

  async getTenantRole(id: string, tenantId: string): Promise<TenantRole | undefined> {
    const [role] = await db.select().from(tenantRoles)
      .where(and(eq(tenantRoles.id, id), eq(tenantRoles.tenantId, tenantId)));
    return role;
  }

  async createTenantRole(role: InsertTenantRole): Promise<TenantRole> {
    const [created] = await db.insert(tenantRoles).values(role).returning();
    return created;
  }

  async updateTenantRole(id: string, tenantId: string, role: Partial<InsertTenantRole>): Promise<TenantRole | undefined> {
    const [updated] = await db.update(tenantRoles)
      .set({ ...role, updatedAt: new Date() })
      .where(and(eq(tenantRoles.id, id), eq(tenantRoles.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteTenantRole(id: string, tenantId: string): Promise<void> {
    await db.delete(tenantRoles)
      .where(and(eq(tenantRoles.id, id), eq(tenantRoles.tenantId, tenantId)));
  }

  // ==================== TENANT ROLE PERMISSIONS ====================
  async getTenantRolePermissions(roleId: string): Promise<TenantRolePermission[]> {
    return db.select().from(tenantRolePermissions)
      .where(eq(tenantRolePermissions.tenantRoleId, roleId));
  }

  async setTenantRolePermissions(roleId: string, permissions: string[]): Promise<void> {
    await db.delete(tenantRolePermissions)
      .where(eq(tenantRolePermissions.tenantRoleId, roleId));
    
    if (permissions.length > 0) {
      await db.insert(tenantRolePermissions)
        .values(permissions.map(permission => ({
          tenantRoleId: roleId,
          permission,
        })));
    }
  }

  // ==================== TENANT STAFF ====================
  async getTenantStaff(tenantId: string): Promise<TenantStaff[]> {
    return db.select().from(tenantStaff)
      .where(eq(tenantStaff.tenantId, tenantId))
      .orderBy(tenantStaff.fullName);
  }

  async getTenantStaffMember(id: string, tenantId: string): Promise<TenantStaff | undefined> {
    const [member] = await db.select().from(tenantStaff)
      .where(and(eq(tenantStaff.id, id), eq(tenantStaff.tenantId, tenantId)));
    return member;
  }

  async getTenantStaffByEmail(email: string, tenantId: string): Promise<TenantStaff | undefined> {
    const [member] = await db.select().from(tenantStaff)
      .where(and(eq(tenantStaff.email, email), eq(tenantStaff.tenantId, tenantId)));
    return member;
  }

  async getTenantStaffByUserId(userId: string, tenantId: string): Promise<TenantStaff | undefined> {
    const [member] = await db.select().from(tenantStaff)
      .where(and(eq(tenantStaff.userId, userId), eq(tenantStaff.tenantId, tenantId)));
    return member;
  }

  async createTenantStaff(staffMember: InsertTenantStaff): Promise<TenantStaff> {
    const [created] = await db.insert(tenantStaff).values(staffMember).returning();
    return created;
  }

  async updateTenantStaff(id: string, tenantId: string, staffMember: Partial<InsertTenantStaff>): Promise<TenantStaff | undefined> {
    const [updated] = await db.update(tenantStaff)
      .set({ ...staffMember, updatedAt: new Date() })
      .where(and(eq(tenantStaff.id, id), eq(tenantStaff.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteTenantStaff(id: string, tenantId: string): Promise<void> {
    await db.delete(tenantStaff)
      .where(and(eq(tenantStaff.id, id), eq(tenantStaff.tenantId, tenantId)));
  }

  // ==================== TENANT STAFF INVITES ====================
  async createStaffInvite(invite: InsertTenantStaffInvite): Promise<TenantStaffInvite> {
    const [created] = await db.insert(tenantStaffInvites).values(invite).returning();
    return created;
  }

  async getStaffInviteByToken(tokenHash: string): Promise<TenantStaffInvite | undefined> {
    const [invite] = await db.select().from(tenantStaffInvites)
      .where(eq(tenantStaffInvites.tokenHash, tokenHash));
    return invite;
  }

  async getActiveInviteForStaff(staffId: string): Promise<TenantStaffInvite | undefined> {
    const [invite] = await db.select().from(tenantStaffInvites)
      .where(and(
        eq(tenantStaffInvites.staffId, staffId),
        eq(tenantStaffInvites.status, "pending")
      ));
    return invite;
  }

  async updateStaffInvite(id: string, data: Partial<TenantStaffInvite>): Promise<TenantStaffInvite | undefined> {
    const [updated] = await db.update(tenantStaffInvites)
      .set(data)
      .where(eq(tenantStaffInvites.id, id))
      .returning();
    return updated;
  }

  async revokeStaffInvite(staffId: string): Promise<void> {
    await db.update(tenantStaffInvites)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(and(
        eq(tenantStaffInvites.staffId, staffId),
        eq(tenantStaffInvites.status, "pending")
      ));
  }

  // ==================== SEED DEFAULT ROLES ====================
  async seedDefaultRolesForTenant(tenantId: string): Promise<void> {
    const { DEFAULT_TENANT_ROLES } = await import("@shared/rbac/permissions");
    
    for (const [key, roleDef] of Object.entries(DEFAULT_TENANT_ROLES)) {
      const existingRole = await db.select().from(tenantRoles)
        .where(and(eq(tenantRoles.tenantId, tenantId), eq(tenantRoles.name, roleDef.name)))
        .limit(1);
      
      if (existingRole.length === 0) {
        const [role] = await db.insert(tenantRoles).values({
          tenantId,
          name: roleDef.name,
          description: roleDef.description,
          isDefault: roleDef.isDefault,
          isSystem: roleDef.isSystem,
        }).returning();
        
        if (roleDef.permissions.length > 0) {
          await db.insert(tenantRolePermissions)
            .values(roleDef.permissions.map(permission => ({
              tenantRoleId: role.id,
              permission,
            })));
        }
      }
    }
  }
}

export const storage = new DatabaseStorage();
