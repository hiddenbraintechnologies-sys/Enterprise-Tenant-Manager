import { db } from "../db";
import { 
  analyticsSnapshots,
  productionOrders,
  productionStages,
  furnitureSalesOrders,
  furnitureInvoices,
  furnitureInvoicePayments,
  deliveryOrders,
  installationOrders,
  type AnalyticsSnapshot,
} from "@shared/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, format, differenceInDays, differenceInHours } from "date-fns";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface OverviewMetrics {
  production: {
    total: number;
    completed: number;
    inProgress: number;
    avgProductionTimeHours: number;
    wastagePercentage: number;
  };
  sales: {
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    revenueUsd: number;
    conversionRate: number;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  };
  payments: {
    totalInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    partiallyPaidInvoices: number;
    totalReceivables: number;
    totalReceivablesUsd: number;
    avgPaymentDelayDays: number;
    paymentsReceived: number;
  };
  operations: {
    totalDeliveries: number;
    onTimeDeliveries: number;
    lateDeliveries: number;
    deliveryOnTimeRate: number;
    totalInstallations: number;
    completedInstallations: number;
    installationCompletionRate: number;
    avgInstallationRating: number;
  };
}

export class AnalyticsService {
  async getOverview(tenantId: string, dateRange: DateRange): Promise<OverviewMetrics> {
    const [production, sales, payments, operations] = await Promise.all([
      this.getProductionMetrics(tenantId, dateRange),
      this.getSalesMetrics(tenantId, dateRange),
      this.getPaymentMetrics(tenantId, dateRange),
      this.getOperationsMetrics(tenantId, dateRange),
    ]);

    return { production, sales, payments, operations };
  }

  async getProductionMetrics(tenantId: string, dateRange: DateRange) {
    const orders = await db.select()
      .from(productionOrders)
      .where(and(
        eq(productionOrders.tenantId, tenantId),
        gte(productionOrders.createdAt, dateRange.startDate),
        lte(productionOrders.createdAt, dateRange.endDate)
      ));

    const total = orders.length;
    const completed = orders.filter(o => o.status === "completed").length;
    const inProgress = orders.filter(o => o.status === "in_progress").length;

    let avgProductionTimeHours = 0;
    const completedOrders = orders.filter(o => o.status === "completed" && o.actualStartDate && o.actualEndDate);
    if (completedOrders.length > 0) {
      const totalHours = completedOrders.reduce((sum, order) => {
        const start = new Date(order.actualStartDate!);
        const end = new Date(order.actualEndDate!);
        return sum + differenceInHours(end, start);
      }, 0);
      avgProductionTimeHours = totalHours / completedOrders.length;
    }

    let wastagePercentage = 0;
    const ordersWithWastage = orders.filter(o => o.totalWastage && parseFloat(o.totalWastage) > 0);
    if (ordersWithWastage.length > 0) {
      const totalWastage = ordersWithWastage.reduce((sum, o) => sum + parseFloat(o.totalWastage || "0"), 0);
      wastagePercentage = totalWastage / ordersWithWastage.length;
    }

    return {
      total,
      completed,
      inProgress,
      avgProductionTimeHours: Math.round(avgProductionTimeHours * 100) / 100,
      wastagePercentage: Math.round(wastagePercentage * 100) / 100,
    };
  }

  async getSalesMetrics(tenantId: string, dateRange: DateRange) {
    const orders = await db.select()
      .from(furnitureSalesOrders)
      .where(and(
        eq(furnitureSalesOrders.tenantId, tenantId),
        gte(furnitureSalesOrders.createdAt, dateRange.startDate),
        lte(furnitureSalesOrders.createdAt, dateRange.endDate)
      ));

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === "completed").length;
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);
    const revenueUsd = orders.reduce((sum, o) => {
      const amount = parseFloat(o.totalAmount || "0");
      const rate = parseFloat(o.exchangeRate || "1");
      return sum + (amount / rate);
    }, 0);

    return {
      totalOrders,
      completedOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueUsd: Math.round(revenueUsd * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topProducts: [],
    };
  }

  async getPaymentMetrics(tenantId: string, dateRange: DateRange) {
    const invoices = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.tenantId, tenantId),
        gte(furnitureInvoices.createdAt, dateRange.startDate),
        lte(furnitureInvoices.createdAt, dateRange.endDate)
      ));

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === "paid").length;
    const overdueInvoices = invoices.filter(i => i.status === "overdue").length;
    const partiallyPaidInvoices = invoices.filter(i => i.status === "partially_paid").length;

    const totalReceivables = invoices.reduce((sum, i) => {
      if (i.status !== "paid" && i.status !== "cancelled") {
        const total = parseFloat(i.totalAmount || "0");
        const paid = parseFloat(i.paidAmount || "0");
        return sum + (total - paid);
      }
      return sum;
    }, 0);

    const totalReceivablesUsd = invoices.reduce((sum, i) => {
      if (i.status !== "paid" && i.status !== "cancelled") {
        const total = parseFloat(i.totalAmount || "0");
        const paid = parseFloat(i.paidAmount || "0");
        const rate = parseFloat(i.exchangeRate || "1");
        return sum + ((total - paid) / rate);
      }
      return sum;
    }, 0);

    const invoiceIds = invoices.map(i => i.id);
    let paymentsReceived = 0;

    if (invoiceIds.length > 0) {
      const payments = await db.select()
        .from(furnitureInvoicePayments)
        .where(and(
          sql`${furnitureInvoicePayments.invoiceId} = ANY(${invoiceIds})`,
          gte(furnitureInvoicePayments.paymentDate, dateRange.startDate),
          lte(furnitureInvoicePayments.paymentDate, dateRange.endDate)
        ));

      paymentsReceived = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    }

    let avgPaymentDelayDays = 0;
    const paidInvoicesWithDates = invoices.filter(i => i.status === "paid" && i.dueDate);
    if (paidInvoicesWithDates.length > 0) {
      avgPaymentDelayDays = 0;
    }

    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      partiallyPaidInvoices,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalReceivablesUsd: Math.round(totalReceivablesUsd * 100) / 100,
      avgPaymentDelayDays,
      paymentsReceived: Math.round(paymentsReceived * 100) / 100,
    };
  }

  async getOperationsMetrics(tenantId: string, dateRange: DateRange) {
    const deliveries = await db.select()
      .from(deliveryOrders)
      .where(and(
        eq(deliveryOrders.tenantId, tenantId),
        gte(deliveryOrders.createdAt, dateRange.startDate),
        lte(deliveryOrders.createdAt, dateRange.endDate)
      ));

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.deliveryStatus === "delivered");
    
    let onTimeDeliveries = 0;
    let lateDeliveries = 0;
    completedDeliveries.forEach(d => {
      if (d.scheduledDate && d.actualDeliveryDate) {
        const scheduled = new Date(d.scheduledDate);
        const actual = new Date(d.actualDeliveryDate);
        if (actual <= scheduled) {
          onTimeDeliveries++;
        } else {
          lateDeliveries++;
        }
      }
    });

    const deliveryOnTimeRate = completedDeliveries.length > 0 
      ? (onTimeDeliveries / completedDeliveries.length) * 100 
      : 0;

    const installations = await db.select()
      .from(installationOrders)
      .where(and(
        eq(installationOrders.tenantId, tenantId),
        gte(installationOrders.createdAt, dateRange.startDate),
        lte(installationOrders.createdAt, dateRange.endDate)
      ));

    const totalInstallations = installations.length;
    const completedInstallations = installations.filter(i => i.installationStatus === "completed").length;
    const installationCompletionRate = totalInstallations > 0 
      ? (completedInstallations / totalInstallations) * 100 
      : 0;

    const ratedInstallations = installations.filter(i => i.customerRating);
    const avgInstallationRating = ratedInstallations.length > 0
      ? ratedInstallations.reduce((sum, i) => sum + (i.customerRating || 0), 0) / ratedInstallations.length
      : 0;

    return {
      totalDeliveries,
      onTimeDeliveries,
      lateDeliveries,
      deliveryOnTimeRate: Math.round(deliveryOnTimeRate * 100) / 100,
      totalInstallations,
      completedInstallations,
      installationCompletionRate: Math.round(installationCompletionRate * 100) / 100,
      avgInstallationRating: Math.round(avgInstallationRating * 100) / 100,
    };
  }

  async createDailySnapshot(tenantId: string, date: Date = new Date()): Promise<AnalyticsSnapshot> {
    const snapshotDate = format(startOfDay(date), "yyyy-MM-dd");
    const dateRange = {
      startDate: startOfDay(date),
      endDate: endOfDay(date),
    };

    const [production, sales, payments, operations] = await Promise.all([
      this.getProductionMetrics(tenantId, dateRange),
      this.getSalesMetrics(tenantId, dateRange),
      this.getPaymentMetrics(tenantId, dateRange),
      this.getOperationsMetrics(tenantId, dateRange),
    ]);

    const existing = await db.select()
      .from(analyticsSnapshots)
      .where(and(
        eq(analyticsSnapshots.tenantId, tenantId),
        eq(analyticsSnapshots.snapshotDate, snapshotDate),
        eq(analyticsSnapshots.snapshotType, "daily")
      ));

    if (existing.length > 0) {
      const [updated] = await db.update(analyticsSnapshots)
        .set({
          productionOrdersTotal: production.total,
          productionOrdersCompleted: production.completed,
          productionOrdersInProgress: production.inProgress,
          avgProductionTimeHours: String(production.avgProductionTimeHours),
          wastagePercentage: String(production.wastagePercentage),
          salesOrdersTotal: sales.totalOrders,
          salesOrdersCompleted: sales.completedOrders,
          revenueTotal: String(sales.totalRevenue),
          revenueUsd: String(sales.revenueUsd),
          orderConversionRate: String(sales.conversionRate),
          invoicesTotal: payments.totalInvoices,
          invoicesPaid: payments.paidInvoices,
          invoicesOverdue: payments.overdueInvoices,
          invoicesPartiallyPaid: payments.partiallyPaidInvoices,
          totalReceivables: String(payments.totalReceivables),
          totalReceivablesUsd: String(payments.totalReceivablesUsd),
          avgPaymentDelayDays: String(payments.avgPaymentDelayDays),
          paymentsReceived: String(payments.paymentsReceived),
          paymentsReceivedUsd: String(payments.paymentsReceived),
          deliveriesTotal: operations.totalDeliveries,
          deliveriesOnTime: operations.onTimeDeliveries,
          deliveriesLate: operations.lateDeliveries,
          deliveryOnTimeRate: String(operations.deliveryOnTimeRate),
          installationsTotal: operations.totalInstallations,
          installationsCompleted: operations.completedInstallations,
          installationCompletionRate: String(operations.installationCompletionRate),
          avgInstallationRating: String(operations.avgInstallationRating),
          updatedAt: new Date(),
        })
        .where(eq(analyticsSnapshots.id, existing[0].id))
        .returning();
      return updated;
    }

    const [snapshot] = await db.insert(analyticsSnapshots).values({
      tenantId,
      snapshotDate,
      snapshotType: "daily",
      productionOrdersTotal: production.total,
      productionOrdersCompleted: production.completed,
      productionOrdersInProgress: production.inProgress,
      avgProductionTimeHours: String(production.avgProductionTimeHours),
      wastagePercentage: String(production.wastagePercentage),
      salesOrdersTotal: sales.totalOrders,
      salesOrdersCompleted: sales.completedOrders,
      revenueTotal: String(sales.totalRevenue),
      revenueUsd: String(sales.revenueUsd),
      orderConversionRate: String(sales.conversionRate),
      invoicesTotal: payments.totalInvoices,
      invoicesPaid: payments.paidInvoices,
      invoicesOverdue: payments.overdueInvoices,
      invoicesPartiallyPaid: payments.partiallyPaidInvoices,
      totalReceivables: String(payments.totalReceivables),
      totalReceivablesUsd: String(payments.totalReceivablesUsd),
      avgPaymentDelayDays: String(payments.avgPaymentDelayDays),
      paymentsReceived: String(payments.paymentsReceived),
      paymentsReceivedUsd: String(payments.paymentsReceived),
      deliveriesTotal: operations.totalDeliveries,
      deliveriesOnTime: operations.onTimeDeliveries,
      deliveriesLate: operations.lateDeliveries,
      deliveryOnTimeRate: String(operations.deliveryOnTimeRate),
      installationsTotal: operations.totalInstallations,
      installationsCompleted: operations.completedInstallations,
      installationCompletionRate: String(operations.installationCompletionRate),
      avgInstallationRating: String(operations.avgInstallationRating),
    }).returning();

    return snapshot;
  }

  async getSnapshots(tenantId: string, dateRange: DateRange, type: "daily" | "weekly" | "monthly" = "daily"): Promise<AnalyticsSnapshot[]> {
    return db.select()
      .from(analyticsSnapshots)
      .where(and(
        eq(analyticsSnapshots.tenantId, tenantId),
        eq(analyticsSnapshots.snapshotType, type),
        gte(analyticsSnapshots.snapshotDate, format(dateRange.startDate, "yyyy-MM-dd")),
        lte(analyticsSnapshots.snapshotDate, format(dateRange.endDate, "yyyy-MM-dd"))
      ))
      .orderBy(analyticsSnapshots.snapshotDate);
  }

  async getTrendData(tenantId: string, metric: string, days: number = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const snapshots = await this.getSnapshots(tenantId, { startDate, endDate }, "daily");
    
    return snapshots.map(s => ({
      date: s.snapshotDate,
      value: (s as any)[metric] || 0,
    }));
  }
}

export const analyticsService = new AnalyticsService();
