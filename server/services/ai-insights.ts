import { db } from "../db";
import { 
  aiInsights,
  productionOrders,
  productionStages,
  furnitureSalesOrders,
  furnitureSalesOrderItems,
  furnitureInvoices,
  furnitureInvoicePayments,
  deliveryOrders,
  installationOrders,
  furnitureProducts,
  type AiInsight,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { subDays, startOfMonth, endOfMonth, format, differenceInDays } from "date-fns";
import { analyticsService } from "./analytics";

interface InsightGenerationResult {
  generated: number;
  insights: AiInsight[];
}

export class AiInsightsService {
  async generateInsights(tenantId: string): Promise<InsightGenerationResult> {
    const insights: AiInsight[] = [];
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);

    const [
      productionInsights,
      salesInsights,
      paymentInsights,
      operationsInsights,
    ] = await Promise.all([
      this.analyzeProduction(tenantId, thirtyDaysAgo, now),
      this.analyzeSales(tenantId, thirtyDaysAgo, now),
      this.analyzePayments(tenantId, thirtyDaysAgo, now),
      this.analyzeOperations(tenantId, thirtyDaysAgo, now),
    ]);

    insights.push(...productionInsights, ...salesInsights, ...paymentInsights, ...operationsInsights);

    return { generated: insights.length, insights };
  }

  private async analyzeProduction(tenantId: string, startDate: Date, endDate: Date): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    const orders = await db.select()
      .from(productionOrders)
      .where(and(
        eq(productionOrders.tenantId, tenantId),
        gte(productionOrders.createdAt, startDate),
        lte(productionOrders.createdAt, endDate)
      ));

    const completedOrders = orders.filter(o => o.status === "completed");
    const highWastageOrders = orders.filter(o => {
      const wastage = parseFloat(o.totalWastage || "0");
      return wastage > 10;
    });

    if (highWastageOrders.length > 0) {
      const avgWastage = highWastageOrders.reduce((sum, o) => sum + parseFloat(o.totalWastage || "0"), 0) / highWastageOrders.length;
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "production",
        severity: avgWastage > 20 ? "critical" : "warning",
        title: "High Wastage Detected in Production",
        description: `${highWastageOrders.length} production orders in the last 30 days have wastage exceeding 10%. Average wastage: ${avgWastage.toFixed(1)}%`,
        metricValue: String(avgWastage),
        metricUnit: "percentage",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { orderCount: highWastageOrders.length, avgWastage },
      }).returning();
      insights.push(insight);
    }

    const stages = await db.select()
      .from(productionStages)
      .where(and(
        eq(productionStages.status, "completed"),
        gte(productionStages.createdAt, startDate)
      ));

    const stageGroups: Record<string, number[]> = {};
    stages.forEach(stage => {
      if (stage.actualStartTime && stage.actualEndTime) {
        const duration = (new Date(stage.actualEndTime).getTime() - new Date(stage.actualStartTime).getTime()) / (1000 * 60 * 60);
        const stageType = stage.stageType;
        if (!stageGroups[stageType]) stageGroups[stageType] = [];
        stageGroups[stageType].push(duration);
      }
    });

    const avgDurations = Object.entries(stageGroups).map(([stage, durations]) => ({
      stage,
      avgHours: durations.reduce((a, b) => a + b, 0) / durations.length,
    }));

    const bottleneck = avgDurations.sort((a, b) => b.avgHours - a.avgHours)[0];
    if (bottleneck && bottleneck.avgHours > 24) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "production",
        severity: "warning",
        title: `Production Bottleneck in ${bottleneck.stage} Stage`,
        description: `The ${bottleneck.stage} stage is taking an average of ${bottleneck.avgHours.toFixed(1)} hours, which may be slowing down overall production.`,
        metricValue: String(bottleneck.avgHours),
        metricUnit: "hours",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { stage: bottleneck.stage, avgHours: bottleneck.avgHours },
      }).returning();
      insights.push(insight);
    }

    return insights;
  }

  private async analyzeSales(tenantId: string, startDate: Date, endDate: Date): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    const orders = await db.select()
      .from(furnitureSalesOrders)
      .where(and(
        eq(furnitureSalesOrders.tenantId, tenantId),
        gte(furnitureSalesOrders.createdAt, startDate),
        lte(furnitureSalesOrders.createdAt, endDate)
      ));

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);

    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    for (const order of orders) {
      const items = await db.select()
        .from(furnitureSalesOrderItems)
        .where(eq(furnitureSalesOrderItems.salesOrderId, order.id));

      items.forEach(item => {
        const productId = item.productId || "unknown";
        if (!productSales[productId]) {
          productSales[productId] = { quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += parseFloat(item.totalPrice || "0");
      });
    }

    const sortedProducts = Object.entries(productSales)
      .sort((a, b) => b[1].revenue - a[1].revenue);

    const top3Revenue = sortedProducts.slice(0, 3).reduce((sum, [_, data]) => sum + data.revenue, 0);
    const top3Percentage = totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0;

    if (top3Percentage > 60 && sortedProducts.length > 3) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "sales",
        severity: "info",
        title: "Revenue Concentration in Top Products",
        description: `Top 3 products are driving ${top3Percentage.toFixed(0)}% of total revenue. Consider diversifying your product mix or focusing marketing on these products.`,
        metricValue: String(top3Percentage),
        metricUnit: "percentage",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { top3Products: sortedProducts.slice(0, 3), totalRevenue, top3Revenue },
      }).returning();
      insights.push(insight);
    }

    return insights;
  }

  private async analyzePayments(tenantId: string, startDate: Date, endDate: Date): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    const invoices = await db.select()
      .from(furnitureInvoices)
      .where(and(
        eq(furnitureInvoices.tenantId, tenantId),
        gte(furnitureInvoices.createdAt, startDate)
      ));

    const overdueInvoices = invoices.filter(i => i.status === "overdue");
    const overdueAmount = overdueInvoices.reduce((sum, i) => {
      const total = parseFloat(i.totalAmount || "0");
      const paid = parseFloat(i.paidAmount || "0");
      return sum + (total - paid);
    }, 0);

    if (overdueInvoices.length >= 5 || overdueAmount > 50000) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "cashflow",
        severity: overdueAmount > 100000 ? "critical" : "warning",
        title: "Cashflow Risk from Overdue Invoices",
        description: `${overdueInvoices.length} invoices are overdue with a total outstanding amount of ${overdueAmount.toFixed(2)}. This may impact your cash flow.`,
        metricValue: String(overdueAmount),
        metricUnit: "currency",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { overdueCount: overdueInvoices.length, overdueAmount },
      }).returning();
      insights.push(insight);
    }

    const invoiceIds = invoices.map(i => i.id);
    let payments: Array<{ invoiceId: string; paymentDate: Date | null }> = [];
    
    if (invoiceIds.length > 0) {
      payments = await db.select({
        invoiceId: furnitureInvoicePayments.invoiceId,
        paymentDate: furnitureInvoicePayments.paymentDate,
      })
        .from(furnitureInvoicePayments)
        .where(and(
          sql`${furnitureInvoicePayments.invoiceId} = ANY(${invoiceIds})`,
          gte(furnitureInvoicePayments.paymentDate, startDate)
        ));
    }

    const customerPaymentDelays: Record<string, number[]> = {};
    for (const invoice of invoices) {
      if (invoice.status === "paid" && invoice.dueDate) {
        const payment = payments.find(p => p.invoiceId === invoice.id);
        if (payment && payment.paymentDate) {
          const dueDate = new Date(invoice.dueDate);
          const paidDate = new Date(payment.paymentDate);
          const delay = differenceInDays(paidDate, dueDate);
          const customerId = invoice.customerId || "unknown";
          if (!customerPaymentDelays[customerId]) customerPaymentDelays[customerId] = [];
          customerPaymentDelays[customerId].push(delay);
        }
      }
    }

    const latePayingCustomers = Object.entries(customerPaymentDelays)
      .filter(([_, delays]) => delays.every(d => d > 7) && delays.length >= 2)
      .map(([customerId, delays]) => ({
        customerId,
        avgDelay: delays.reduce((a, b) => a + b, 0) / delays.length,
        invoiceCount: delays.length,
      }));

    if (latePayingCustomers.length > 0) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "customer",
        severity: "warning",
        title: "Customers with Repeated Late Payments",
        description: `${latePayingCustomers.length} customers have consistently paid invoices late. Consider reviewing credit terms for these accounts.`,
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { customers: latePayingCustomers },
      }).returning();
      insights.push(insight);
    }

    return insights;
  }

  private async analyzeOperations(tenantId: string, startDate: Date, endDate: Date): Promise<AiInsight[]> {
    const insights: AiInsight[] = [];

    const deliveries = await db.select()
      .from(deliveryOrders)
      .where(and(
        eq(deliveryOrders.tenantId, tenantId),
        gte(deliveryOrders.createdAt, startDate),
        lte(deliveryOrders.createdAt, endDate)
      ));

    const completedDeliveries = deliveries.filter(d => d.deliveryStatus === "delivered");
    let lateDeliveries = 0;
    completedDeliveries.forEach(d => {
      if (d.scheduledDate && d.actualDeliveryDate) {
        const scheduled = new Date(d.scheduledDate);
        const actual = new Date(d.actualDeliveryDate);
        if (actual > scheduled) lateDeliveries++;
      }
    });

    const lateRate = completedDeliveries.length > 0 ? (lateDeliveries / completedDeliveries.length) * 100 : 0;
    if (lateRate > 20 && completedDeliveries.length >= 5) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "operations",
        severity: lateRate > 40 ? "critical" : "warning",
        title: "High Rate of Late Deliveries",
        description: `${lateRate.toFixed(0)}% of deliveries in the last 30 days were completed late. Consider reviewing your delivery scheduling and logistics.`,
        metricValue: String(lateRate),
        metricUnit: "percentage",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { lateDeliveries, totalDeliveries: completedDeliveries.length },
      }).returning();
      insights.push(insight);
    }

    const installations = await db.select()
      .from(installationOrders)
      .where(and(
        eq(installationOrders.tenantId, tenantId),
        gte(installationOrders.createdAt, startDate),
        lte(installationOrders.createdAt, endDate)
      ));

    const lowRatedInstallations = installations.filter(i => i.customerRating && i.customerRating <= 2);
    if (lowRatedInstallations.length >= 3) {
      const [insight] = await db.insert(aiInsights).values({
        tenantId,
        category: "operations",
        severity: "warning",
        title: "Low Customer Satisfaction with Installations",
        description: `${lowRatedInstallations.length} installations received low ratings (2 or below). Review installer performance and customer feedback.`,
        metricValue: String(lowRatedInstallations.length),
        metricUnit: "count",
        periodStart: startDate,
        periodEnd: endDate,
        supportingData: { lowRatedCount: lowRatedInstallations.length },
      }).returning();
      insights.push(insight);
    }

    return insights;
  }

  async getInsights(
    tenantId: string, 
    options: { 
      category?: string; 
      severity?: string; 
      includeRead?: boolean;
      limit?: number;
    } = {}
  ): Promise<AiInsight[]> {
    const conditions = [eq(aiInsights.tenantId, tenantId)];

    if (options.category) {
      conditions.push(eq(aiInsights.category, options.category as any));
    }
    if (options.severity) {
      conditions.push(eq(aiInsights.severity, options.severity as any));
    }
    if (!options.includeRead) {
      conditions.push(eq(aiInsights.isDismissed, false));
    }

    return db.select()
      .from(aiInsights)
      .where(and(...conditions))
      .orderBy(desc(aiInsights.createdAt))
      .limit(options.limit || 20);
  }

  async markInsightRead(id: string, tenantId: string): Promise<AiInsight | undefined> {
    const [updated] = await db.update(aiInsights)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(
        eq(aiInsights.id, id),
        eq(aiInsights.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }

  async dismissInsight(id: string, tenantId: string): Promise<AiInsight | undefined> {
    const [updated] = await db.update(aiInsights)
      .set({ isDismissed: true, updatedAt: new Date() })
      .where(and(
        eq(aiInsights.id, id),
        eq(aiInsights.tenantId, tenantId)
      ))
      .returning();
    return updated;
  }
}

export const aiInsightsService = new AiInsightsService();
