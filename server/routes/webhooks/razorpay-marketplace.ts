import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../db";
import {
  marketplaceEvents,
  tenantAddons,
  type InsertMarketplaceEvent,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { auditService } from "../../core";

const router = Router();

interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        customer_id: string;
        status: string;
        current_start?: number;
        current_end?: number;
        ended_at?: number;
        quantity?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        subscription_id?: string;
        status: string;
        error_code?: string;
        error_description?: string;
      };
    };
    payment_link?: {
      entity: {
        id: string;
        status: string;
        reference_id?: string;
        notes?: Record<string, string>;
      };
    };
  };
  created_at: number;
}

function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Helper function to find tenant addon by either providerSubscriptionId or subscriptionId
async function findTenantAddonBySubscription(subscriptionId: string) {
  // Try providerSubscriptionId first
  let [tenantAddon] = await db
    .select()
    .from(tenantAddons)
    .where(eq(tenantAddons.providerSubscriptionId, subscriptionId))
    .limit(1);
  
  if (!tenantAddon) {
    // Fallback to subscriptionId
    [tenantAddon] = await db
      .select()
      .from(tenantAddons)
      .where(eq(tenantAddons.subscriptionId, subscriptionId))
      .limit(1);
  }
  
  return tenantAddon;
}

async function processEvent(
  eventId: string,
  eventType: string,
  payload: RazorpayWebhookPayload
): Promise<void> {
  const subscription = payload.payload.subscription?.entity;
  const payment = payload.payload.payment?.entity;

  if (eventType.startsWith("subscription.")) {
    if (!subscription) {
      console.warn(`[razorpay-marketplace] No subscription in ${eventType}`);
      return;
    }

    const subscriptionId = subscription.id;

    const tenantAddon = await findTenantAddonBySubscription(subscriptionId);

    if (!tenantAddon) {
      console.warn(
        `[razorpay-marketplace] No tenant addon found for subscription ${subscriptionId}`
      );
      return;
    }

    switch (eventType) {
      case "subscription.activated":
        await db
          .update(tenantAddons)
          .set({
            status: "active",
            subscriptionStatus: "active",
            currentPeriodStart: subscription.current_start
              ? new Date(subscription.current_start * 1000)
              : null,
            currentPeriodEnd: subscription.current_end
              ? new Date(subscription.current_end * 1000)
              : null,
            units: subscription.quantity || tenantAddon.units,
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.id));
        console.log(
          `[razorpay-marketplace] Subscription ${subscriptionId} activated`
        );
        break;

      case "subscription.charged":
        await db
          .update(tenantAddons)
          .set({
            status: "active",
            subscriptionStatus: "active",
            currentPeriodStart: subscription.current_start
              ? new Date(subscription.current_start * 1000)
              : null,
            currentPeriodEnd: subscription.current_end
              ? new Date(subscription.current_end * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.id));
        console.log(
          `[razorpay-marketplace] Subscription ${subscriptionId} charged`
        );
        break;

      case "subscription.halted":
        await db
          .update(tenantAddons)
          .set({
            subscriptionStatus: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.id));
        console.log(
          `[razorpay-marketplace] Subscription ${subscriptionId} halted`
        );
        break;

      case "subscription.cancelled":
        await db
          .update(tenantAddons)
          .set({
            status: "disabled",
            subscriptionStatus: "canceled",
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.id));
        console.log(
          `[razorpay-marketplace] Subscription ${subscriptionId} cancelled`
        );
        break;

      case "subscription.completed":
        await db
          .update(tenantAddons)
          .set({
            status: "disabled",
            subscriptionStatus: "expired",
            updatedAt: new Date(),
          })
          .where(eq(tenantAddons.id, tenantAddon.id));
        console.log(
          `[razorpay-marketplace] Subscription ${subscriptionId} completed`
        );
        break;

      default:
        console.log(
          `[razorpay-marketplace] Unhandled subscription event: ${eventType}`
        );
    }
  } else if (eventType === "payment.failed") {
    const subscriptionId = payment?.subscription_id;
    if (!subscriptionId) return;

    const tenantAddon = await findTenantAddonBySubscription(subscriptionId);

    if (tenantAddon) {
      await db
        .update(tenantAddons)
        .set({
          subscriptionStatus: "past_due",
          updatedAt: new Date(),
        })
        .where(eq(tenantAddons.id, tenantAddon.id));
      console.log(
        `[razorpay-marketplace] Payment failed for subscription ${subscriptionId}`
      );
    }
  } else if (eventType === "payment_link.paid") {
    // Handle payment link payments (used for add-on renewals)
    const paymentLink = payload.payload.payment_link?.entity;
    if (!paymentLink) {
      console.warn(`[razorpay-marketplace] No payment_link in ${eventType}`);
      return;
    }

    const paymentLinkId = paymentLink.id;
    const notes = paymentLink.notes || {};
    
    // Find tenant addon by payment link ID
    const tenantAddon = await findTenantAddonBySubscription(paymentLinkId);
    
    if (!tenantAddon) {
      console.warn(
        `[razorpay-marketplace] No tenant addon found for payment link ${paymentLinkId}`
      );
      return;
    }

    // Calculate new period based on billing period from notes
    const billingPeriod = notes.billing_period || "monthly";
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await db
      .update(tenantAddons)
      .set({
        status: "active",
        subscriptionStatus: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        graceUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(tenantAddons.id, tenantAddon.id));
    
    console.log(
      `[razorpay-marketplace] Payment link ${paymentLinkId} paid, addon activated until ${periodEnd.toISOString()}`
    );
    
    // Log ADDON_RENEW_SUCCEEDED audit event
    auditService.logAsync({
      tenantId: tenantAddon.tenantId,
      action: "update",
      resource: "addon_renewal",
      resourceId: notes.addon_slug || tenantAddon.id,
      metadata: {
        event: "ADDON_RENEW_SUCCEEDED",
        addonSlug: notes.addon_slug,
        addonId: notes.addon_id,
        billingPeriod,
        paymentLinkId,
        periodEnd: periodEnd.toISOString(),
      },
    });
  } else if (eventType === "payment_link.expired" || eventType === "payment_link.cancelled") {
    // Handle payment link failures
    const paymentLink = payload.payload.payment_link?.entity;
    if (!paymentLink) return;

    const paymentLinkId = paymentLink.id;
    const notes = paymentLink.notes || {};
    
    const tenantAddon = await findTenantAddonBySubscription(paymentLinkId);
    
    if (tenantAddon) {
      // Log ADDON_RENEW_FAILED audit event
      auditService.logAsync({
        tenantId: tenantAddon.tenantId,
        action: "update",
        resource: "addon_renewal",
        resourceId: notes.addon_slug || tenantAddon.id,
        metadata: {
          event: "ADDON_RENEW_FAILED",
          addonSlug: notes.addon_slug,
          addonId: notes.addon_id,
          paymentLinkId,
          reason: eventType === "payment_link.expired" ? "expired" : "cancelled",
        },
      });
      
      console.log(
        `[razorpay-marketplace] Payment link ${paymentLinkId} ${eventType}, logged failure`
      );
    }
  }
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[razorpay-marketplace] RAZORPAY_WEBHOOK_SECRET not set");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const rawBody = JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[razorpay-marketplace] Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload: RazorpayWebhookPayload = req.body;
    const eventType = payload.event;
    const eventId = `${payload.event}_${payload.created_at}`;

    const [existingEvent] = await db
      .select()
      .from(marketplaceEvents)
      .where(eq(marketplaceEvents.eventId, eventId))
      .limit(1);

    if (existingEvent) {
      console.log(`[razorpay-marketplace] Event ${eventId} already processed`);
      return res.json({ status: "already_processed" });
    }

    const eventRecord: InsertMarketplaceEvent = {
      source: "razorpay",
      eventType,
      eventId,
      payload: payload as unknown as Record<string, unknown>,
      processed: false,
    };

    await db.insert(marketplaceEvents).values(eventRecord);

    try {
      await processEvent(eventId, eventType, payload);

      await db
        .update(marketplaceEvents)
        .set({
          processed: true,
          processedAt: new Date(),
        })
        .where(eq(marketplaceEvents.eventId, eventId));

      console.log(`[razorpay-marketplace] Processed event ${eventId}`);
    } catch (processError) {
      console.error(
        `[razorpay-marketplace] Error processing event ${eventId}:`,
        processError
      );

      await db
        .update(marketplaceEvents)
        .set({
          errorMessage:
            processError instanceof Error
              ? processError.message
              : "Unknown error",
        })
        .where(eq(marketplaceEvents.eventId, eventId));
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("[razorpay-marketplace] Webhook error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
