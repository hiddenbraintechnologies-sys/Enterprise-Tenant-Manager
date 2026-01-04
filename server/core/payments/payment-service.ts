import { db } from "../../db";
import { 
  tenants, 
  tenantSubscriptions, 
  subscriptionInvoices, 
  transactionLogs, 
  webhookEvents, 
  paymentAttempts,
  globalPricingPlans,
  countryPricingConfigs,
  planLocalPrices,
} from "@shared/schema";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { gatewaySelector, initializePaymentGateways } from "./gateway-selector";
import type { 
  TenantCountry, 
  Currency, 
  CreatePaymentParams, 
  NormalizedWebhookEvent,
  PaymentGatewayType,
} from "./types";

const MAX_PAYMENT_RETRIES = 3;
const SUSPEND_AFTER_FAILURES = 3;
const GRACE_PERIOD_DAYS = 7;

export class PaymentService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await initializePaymentGateways();
    this.initialized = true;
  }

  async createSubscriptionPayment(
    tenantId: string,
    planCode: string,
  ): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
    await this.initialize();

    const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant.length) {
      return { success: false, error: "Tenant not found" };
    }

    const country = tenant[0].country as TenantCountry;
    const gateway = gatewaySelector.getGatewayForCountry(country);
    if (!gateway) {
      return { success: false, error: "No payment gateway available for this country" };
    }

    const countryConfig = gatewaySelector.getCountryConfig(country);
    if (!countryConfig) {
      return { success: false, error: "Country configuration not found" };
    }

    const plan = await db.select().from(globalPricingPlans).where(eq(globalPricingPlans.code, planCode)).limit(1);
    if (!plan.length) {
      return { success: false, error: "Plan not found" };
    }

    const localPrice = await db.select().from(planLocalPrices)
      .where(and(eq(planLocalPrices.planId, plan[0].id), eq(planLocalPrices.country, country)))
      .limit(1);
    
    const basePrice = localPrice.length 
      ? parseFloat(localPrice[0].localPrice) 
      : parseFloat(plan[0].basePrice);

    const taxAmount = basePrice * (countryConfig.taxRate / 100);
    const totalAmount = basePrice + taxAmount;

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [invoice] = await db.insert(subscriptionInvoices).values({
      tenantId,
      invoiceNumber,
      status: "pending",
      country,
      currency: countryConfig.currency as any,
      subtotal: basePrice.toFixed(2),
      taxName: countryConfig.taxName,
      taxRate: countryConfig.taxRate.toString(),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      amountDue: totalAmount.toFixed(2),
      dueDate,
      lineItems: [{
        description: plan[0].name,
        quantity: 1,
        unitPrice: basePrice,
        total: basePrice,
      }],
    }).returning();

    try {
      const paymentIntent = await gateway.createPayment({
        tenantId,
        invoiceId: invoice.id,
        amount: totalAmount,
        currency: countryConfig.currency as Currency,
        description: `Subscription: ${plan[0].name}`,
        customerEmail: tenant[0].email || undefined,
        returnUrl: `${process.env.APP_URL || ''}/billing/success`,
        webhookUrl: `${process.env.APP_URL || ''}/api/webhooks/${gateway.name}`,
        metadata: {
          tenantId,
          invoiceId: invoice.id,
          planId: plan[0].id,
        },
      });

      await db.insert(transactionLogs).values({
        tenantId,
        invoiceId: invoice.id,
        gateway: gateway.name as any,
        gatewayTransactionId: paymentIntent.gatewayPaymentId,
        transactionType: "payment",
        country,
        currency: countryConfig.currency as any,
        amount: totalAmount.toFixed(2),
        status: paymentIntent.status,
        gatewayResponse: paymentIntent as any,
      });

      await db.insert(paymentAttempts).values({
        tenantId,
        invoiceId: invoice.id,
        gateway: gateway.name as any,
        amount: totalAmount.toFixed(2),
        currency: countryConfig.currency as any,
        status: paymentIntent.status,
        gatewayPaymentId: paymentIntent.gatewayPaymentId,
        attemptNumber: 1,
      });

      return {
        success: true,
        paymentUrl: paymentIntent.redirectUrl || paymentIntent.clientSecret,
      };
    } catch (error: any) {
      console.error("Payment creation failed:", error);

      await db.insert(transactionLogs).values({
        tenantId,
        invoiceId: invoice.id,
        gateway: gateway.name as any,
        transactionType: "payment",
        country,
        currency: countryConfig.currency as any,
        amount: totalAmount.toFixed(2),
        status: "failed",
        errorMessage: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  async handleWebhookEvent(
    gateway: PaymentGatewayType,
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string | Buffer,
  ): Promise<{ success: boolean; error?: string }> {
    await this.initialize();

    const gatewayAdapter = gatewaySelector.getGateway(gateway);
    if (!gatewayAdapter) {
      return { success: false, error: "Gateway not found" };
    }

    const isValid = await gatewayAdapter.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error(`Invalid webhook signature for ${gateway}`);
      return { success: false, error: "Invalid signature" };
    }

    const normalizedEvent = gatewayAdapter.normalizeWebhookEvent(payload);

    const existingEvent = await db.select().from(webhookEvents)
      .where(and(
        eq(webhookEvents.gateway, gateway),
        eq(webhookEvents.eventId, normalizedEvent.gatewayEventId),
      ))
      .limit(1);

    if (existingEvent.length) {
      return { success: true };
    }

    await db.insert(webhookEvents).values({
      gateway: gateway as any,
      eventId: normalizedEvent.gatewayEventId,
      eventType: normalizedEvent.type,
      payload: normalizedEvent.rawPayload,
      status: "pending",
    });

    try {
      await this.processWebhookEvent(normalizedEvent, gateway);

      await db.update(webhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(and(
          eq(webhookEvents.gateway, gateway),
          eq(webhookEvents.eventId, normalizedEvent.gatewayEventId),
        ));

      return { success: true };
    } catch (error: any) {
      console.error("Webhook processing failed:", error);

      await db.update(webhookEvents)
        .set({ status: "failed", errorMessage: error.message })
        .where(and(
          eq(webhookEvents.gateway, gateway),
          eq(webhookEvents.eventId, normalizedEvent.gatewayEventId),
        ));

      return { success: false, error: error.message };
    }
  }

  private async processWebhookEvent(event: NormalizedWebhookEvent, gateway: PaymentGatewayType): Promise<void> {
    switch (event.type) {
      case "payment.succeeded":
        await this.handlePaymentSuccess(event, gateway);
        break;
      case "payment.failed":
        await this.handlePaymentFailure(event, gateway);
        break;
      case "subscription.cancelled":
        await this.handleSubscriptionCancelled(event);
        break;
      case "refund.completed":
        await this.handleRefundCompleted(event, gateway);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(event: NormalizedWebhookEvent, gateway: PaymentGatewayType): Promise<void> {
    const tenantId = event.tenantId || event.metadata?.tenantId as string;
    if (!tenantId) {
      console.warn("Payment success event missing tenantId");
      return;
    }

    const invoiceId = event.metadata?.invoiceId as string;
    if (invoiceId) {
      await db.update(subscriptionInvoices)
        .set({
          status: "paid",
          paidAt: new Date(),
          amountPaid: event.amount?.toFixed(2),
          amountDue: "0",
          gateway: gateway as any,
          gatewayInvoiceId: event.gatewayPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionInvoices.id, invoiceId));
    }

    await db.update(tenantSubscriptions)
      .set({
        status: "active",
        paymentFailureCount: 0,
        lastPaymentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.tenantId, tenantId));

    await db.update(tenants)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    await db.insert(transactionLogs).values({
      tenantId,
      invoiceId,
      gateway: gateway as any,
      gatewayTransactionId: event.gatewayPaymentId,
      transactionType: "payment",
      country: "india",
      currency: (event.currency || "USD") as any,
      amount: (event.amount || 0).toFixed(2),
      status: "success",
      metadata: event.metadata as any,
    });
  }

  private async handlePaymentFailure(event: NormalizedWebhookEvent, gateway: PaymentGatewayType): Promise<void> {
    const tenantId = event.tenantId || event.metadata?.tenantId as string;
    if (!tenantId) {
      console.warn("Payment failure event missing tenantId");
      return;
    }

    const subscription = await db.select().from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subscription.length) return;

    const newFailureCount = (subscription[0].paymentFailureCount || 0) + 1;

    await db.update(tenantSubscriptions)
      .set({
        status: newFailureCount >= SUSPEND_AFTER_FAILURES ? "suspended" : "past_due",
        paymentFailureCount: newFailureCount,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.tenantId, tenantId));

    if (newFailureCount >= SUSPEND_AFTER_FAILURES) {
      await this.suspendTenant(tenantId, "Payment failures exceeded threshold");
    }

    await db.insert(transactionLogs).values({
      tenantId,
      gateway: gateway as any,
      gatewayTransactionId: event.gatewayPaymentId,
      transactionType: "payment",
      country: "india",
      currency: (event.currency || "USD") as any,
      amount: (event.amount || 0).toFixed(2),
      status: "failed",
      metadata: event.metadata as any,
    });
  }

  private async handleSubscriptionCancelled(event: NormalizedWebhookEvent): Promise<void> {
    const tenantId = event.tenantId || event.metadata?.tenantId as string;
    if (!tenantId) return;

    await db.update(tenantSubscriptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.tenantId, tenantId));
  }

  private async handleRefundCompleted(event: NormalizedWebhookEvent, gateway: PaymentGatewayType): Promise<void> {
    const tenantId = event.tenantId || event.metadata?.tenantId as string;
    
    await db.insert(transactionLogs).values({
      tenantId,
      gateway: gateway as any,
      gatewayTransactionId: event.gatewayPaymentId,
      transactionType: "refund",
      country: "india",
      currency: (event.currency || "USD") as any,
      amount: (event.amount || 0).toFixed(2),
      status: "success",
      metadata: event.metadata as any,
    });
  }

  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await db.update(tenants)
      .set({
        status: "suspended",
        statusChangedAt: new Date(),
        statusChangeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    console.log(`Tenant ${tenantId} suspended: ${reason}`);
  }

  async checkOverduePayments(): Promise<void> {
    await this.initialize();

    const now = new Date();
    const overdueInvoices = await db.select()
      .from(subscriptionInvoices)
      .where(and(
        eq(subscriptionInvoices.status, "pending"),
        lt(subscriptionInvoices.dueDate, now),
      ));

    for (const invoice of overdueInvoices) {
      await db.update(subscriptionInvoices)
        .set({ status: "overdue", updatedAt: new Date() })
        .where(eq(subscriptionInvoices.id, invoice.id));

      const subscription = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, invoice.tenantId))
        .limit(1);

      if (subscription.length) {
        const newFailureCount = (subscription[0].paymentFailureCount || 0) + 1;

        await db.update(tenantSubscriptions)
          .set({
            paymentFailureCount: newFailureCount,
            status: newFailureCount >= SUSPEND_AFTER_FAILURES ? "suspended" : "past_due",
            updatedAt: new Date(),
          })
          .where(eq(tenantSubscriptions.tenantId, invoice.tenantId));

        if (newFailureCount >= SUSPEND_AFTER_FAILURES) {
          await this.suspendTenant(invoice.tenantId, "Overdue payments exceeded threshold");
        }
      }
    }
  }

  async getRevenueStats(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    revenueByCountry: Record<string, number>;
    revenueByGateway: Record<string, number>;
    revenueByBusinessType: Record<string, number>;
    subscriptionsByBusinessType: Record<string, number>;
    activeSubscriptions: number;
    mrr: number;
    pendingInvoices: number;
    revenueChange: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const allTransactions = await db.select()
      .from(transactionLogs)
      .where(and(
        eq(transactionLogs.transactionType, "payment"),
        eq(transactionLogs.status, "success"),
      ));

    const monthlyTransactions = allTransactions.filter(
      t => t.createdAt && new Date(t.createdAt) >= startOfMonth
    );

    const lastMonthTransactions = allTransactions.filter(
      t => t.createdAt && new Date(t.createdAt) >= startOfLastMonth && new Date(t.createdAt) < startOfMonth
    );

    const totalRevenue = allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const revenueChange = lastMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : monthlyRevenue > 0 ? 100 : 0;

    const revenueByCountry: Record<string, number> = {};
    const revenueByGateway: Record<string, number> = {};

    for (const t of allTransactions) {
      revenueByCountry[t.country] = (revenueByCountry[t.country] || 0) + parseFloat(t.amount);
      revenueByGateway[t.gateway] = (revenueByGateway[t.gateway] || 0) + parseFloat(t.amount);
    }

    const activeSubscriptionsWithTenants = await db.select({
      tenantId: tenantSubscriptions.tenantId,
      businessType: tenants.businessType,
    })
      .from(tenantSubscriptions)
      .innerJoin(tenants, eq(tenants.id, tenantSubscriptions.tenantId))
      .where(eq(tenantSubscriptions.status, "active"));

    const revenueByBusinessType: Record<string, number> = {};
    const subscriptionsByBusinessType: Record<string, number> = {};

    for (const sub of activeSubscriptionsWithTenants) {
      const type = sub.businessType || "service";
      subscriptionsByBusinessType[type] = (subscriptionsByBusinessType[type] || 0) + 1;
    }

    const tenantBusinessTypes = new Map(
      activeSubscriptionsWithTenants.map(s => [s.tenantId, s.businessType || "service"])
    );

    for (const t of monthlyTransactions) {
      const businessType = t.tenantId ? tenantBusinessTypes.get(t.tenantId) || "service" : "service";
      revenueByBusinessType[businessType] = (revenueByBusinessType[businessType] || 0) + parseFloat(t.amount);
    }

    const pendingInvoicesCount = await db.select({ count: sql<number>`count(*)` })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.status, "pending"));

    return {
      totalRevenue,
      monthlyRevenue,
      revenueByCountry,
      revenueByGateway,
      revenueByBusinessType,
      subscriptionsByBusinessType,
      activeSubscriptions: activeSubscriptionsWithTenants.length,
      mrr: monthlyRevenue,
      pendingInvoices: pendingInvoicesCount[0]?.count || 0,
      revenueChange,
    };
  }

  async getPricingPlans(country?: TenantCountry): Promise<any[]> {
    const plans = await db.select().from(globalPricingPlans)
      .where(eq(globalPricingPlans.isActive, true))
      .orderBy(globalPricingPlans.sortOrder);

    if (!country) return plans;

    const countryConfig = gatewaySelector.getCountryConfig(country);
    const localPrices = await db.select().from(planLocalPrices)
      .where(eq(planLocalPrices.country, country));

    const localPriceMap = new Map(localPrices.map(p => [p.planId, parseFloat(p.localPrice)]));

    return plans.map(plan => ({
      ...plan,
      currency: countryConfig?.currency || "USD",
      localPrice: localPriceMap.get(plan.id) || parseFloat(plan.basePrice),
      taxRate: countryConfig?.taxRate || 0,
      taxName: countryConfig?.taxName || "Tax",
    }));
  }
}

export const paymentService = new PaymentService();
