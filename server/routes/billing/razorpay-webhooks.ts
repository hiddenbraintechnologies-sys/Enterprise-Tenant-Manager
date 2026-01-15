import { Router, Request, Response, raw } from "express";
import crypto from "crypto";
import { db } from "../../db";
import { webhookEvents, tenantPayrollAddon } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.use(raw({ type: "application/json" }));

interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        invoice_id: string | null;
        method: string;
        notes: Record<string, string>;
        error_code: string | null;
        error_description: string | null;
        created_at: number;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        ended_at: number | null;
        quantity: number;
        notes: Record<string, string>;
        charge_at: number;
        offer_id: string | null;
        short_url: string;
        has_scheduled_changes: boolean;
        change_scheduled_at: number | null;
        source: string;
        payment_method: string;
        created_at: number;
      };
    };
  };
  created_at: number;
}

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const [existing] = await db.select()
    .from(webhookEvents)
    .where(and(
      eq(webhookEvents.gateway, "razorpay"),
      eq(webhookEvents.eventId, eventId)
    ))
    .limit(1);
  return !!existing;
}

async function storeWebhookEvent(
  eventId: string,
  eventType: string,
  payload: RazorpayWebhookPayload,
  status: "pending" | "processed" | "failed" = "pending",
  errorMessage?: string
): Promise<string> {
  const result = await db.insert(webhookEvents).values({
    gateway: "razorpay",
    eventId,
    eventType,
    payload: payload as any,
    status,
    errorMessage,
    processedAt: status === "processed" ? new Date() : null
  }).returning({ id: webhookEvents.id });
  
  return result[0].id;
}

async function updateWebhookEvent(
  eventId: string,
  status: "processed" | "failed",
  errorMessage?: string
): Promise<void> {
  await db.update(webhookEvents)
    .set({
      status,
      processedAt: status === "processed" ? new Date() : null,
      errorMessage
    })
    .where(and(
      eq(webhookEvents.gateway, "razorpay"),
      eq(webhookEvents.eventId, eventId)
    ));
}

async function handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
  const payment = payload.payload.payment?.entity;
  if (!payment) {
    throw new Error("Payment entity missing from payload");
  }

  const notes = payment.notes || {};
  const tenantId = notes.tenant_id;
  const addonType = notes.addon;
  const tierId = notes.tier_id;

  if (addonType === "payroll" && tenantId && tierId) {
    const [existing] = await db.select()
      .from(tenantPayrollAddon)
      .where(eq(tenantPayrollAddon.tenantId, tenantId))
      .limit(1);

    if (existing) {
      await db.update(tenantPayrollAddon)
        .set({
          enabled: true,
          tierId,
          subscriptionStatus: "active",
          razorpaySubscriptionId: notes.subscription_id || null,
          updatedAt: new Date()
        })
        .where(eq(tenantPayrollAddon.tenantId, tenantId));
    } else {
      await db.insert(tenantPayrollAddon).values({
        tenantId,
        tierId,
        billingCycle: (notes.billing_cycle as "monthly" | "yearly") || "monthly",
        enabled: true,
        subscriptionStatus: "active",
        razorpaySubscriptionId: notes.subscription_id || null
      });
    }

    console.log(`[razorpay-webhook] Payroll addon enabled for tenant ${tenantId}, tier ${tierId}`);
  }
}

async function handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
  const payment = payload.payload.payment?.entity;
  if (!payment) {
    throw new Error("Payment entity missing from payload");
  }

  const notes = payment.notes || {};
  const tenantId = notes.tenant_id;

  console.log(`[razorpay-webhook] Payment failed for tenant ${tenantId}: ${payment.error_description}`);
}

async function handleSubscriptionActivated(payload: RazorpayWebhookPayload): Promise<void> {
  const subscription = payload.payload.subscription?.entity;
  if (!subscription) {
    throw new Error("Subscription entity missing from payload");
  }

  const notes = subscription.notes || {};
  const tenantId = notes.tenant_id;
  const addonType = notes.addon;

  if (addonType === "payroll" && tenantId) {
    await db.update(tenantPayrollAddon)
      .set({
        enabled: true,
        subscriptionStatus: "active",
        razorpaySubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
        updatedAt: new Date()
      })
      .where(eq(tenantPayrollAddon.tenantId, tenantId));

    console.log(`[razorpay-webhook] Payroll subscription activated for tenant ${tenantId}`);
  }
}

async function handleSubscriptionCharged(payload: RazorpayWebhookPayload): Promise<void> {
  const subscription = payload.payload.subscription?.entity;
  if (!subscription) {
    throw new Error("Subscription entity missing from payload");
  }

  const notes = subscription.notes || {};
  const tenantId = notes.tenant_id;

  if (tenantId) {
    await db.update(tenantPayrollAddon)
      .set({
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
        updatedAt: new Date()
      })
      .where(eq(tenantPayrollAddon.tenantId, tenantId));

    console.log(`[razorpay-webhook] Subscription charged for tenant ${tenantId}`);
  }
}

async function handleSubscriptionCancelled(payload: RazorpayWebhookPayload): Promise<void> {
  const subscription = payload.payload.subscription?.entity;
  if (!subscription) {
    throw new Error("Subscription entity missing from payload");
  }

  const notes = subscription.notes || {};
  const tenantId = notes.tenant_id;
  const addonType = notes.addon;

  if (addonType === "payroll" && tenantId) {
    await db.update(tenantPayrollAddon)
      .set({
        cancelAtPeriodEnd: true,
        subscriptionStatus: "cancelled",
        updatedAt: new Date()
      })
      .where(eq(tenantPayrollAddon.tenantId, tenantId));

    console.log(`[razorpay-webhook] Payroll subscription cancelled for tenant ${tenantId}, will disable at period end`);
  }
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      console.error("[razorpay-webhook] Missing signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[razorpay-webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const payload: RazorpayWebhookPayload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    
    const razorpayEventId = `rzp_${payload.account_id}_${payload.created_at}`;
    const eventId = razorpayEventId;

    if (await isEventProcessed(eventId)) {
      console.log(`[razorpay-webhook] Event ${eventId} already processed, skipping`);
      return res.status(200).json({ status: "already_processed" });
    }

    await storeWebhookEvent(eventId, payload.event, payload);

    try {
      switch (payload.event) {
        case "payment.captured":
          await handlePaymentCaptured(payload);
          break;
        case "payment.failed":
          await handlePaymentFailed(payload);
          break;
        case "subscription.activated":
          await handleSubscriptionActivated(payload);
          break;
        case "subscription.charged":
          await handleSubscriptionCharged(payload);
          break;
        case "subscription.cancelled":
          await handleSubscriptionCancelled(payload);
          break;
        default:
          console.log(`[razorpay-webhook] Unhandled event type: ${payload.event}`);
      }

      await updateWebhookEvent(eventId, "processed");
      console.log(`[razorpay-webhook] Successfully processed event: ${payload.event}`);
      
      return res.status(200).json({ status: "processed" });
    } catch (processingError: any) {
      console.error(`[razorpay-webhook] Error processing event ${payload.event}:`, processingError);
      await updateWebhookEvent(eventId, "failed", processingError.message);
      return res.status(500).json({ error: "Processing failed" });
    }
  } catch (error: any) {
    console.error("[razorpay-webhook] Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/test", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    message: "Razorpay webhook endpoint is active",
    supportedEvents: [
      "payment.captured",
      "payment.failed", 
      "subscription.activated",
      "subscription.charged",
      "subscription.cancelled"
    ]
  });
});

export default router;
