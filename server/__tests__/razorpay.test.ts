import { describe, it, expect, beforeAll } from "@jest/globals";
import crypto from "crypto";

const TEST_KEY_SECRET = "test_secret_key_12345678901234567890";
const TEST_WEBHOOK_SECRET = "whsec_test_webhook_secret_123";

function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}, keySecret: string): boolean {
  if (!keySecret) {
    throw new Error("Razorpay key secret not configured");
  }
  
  const body = params.razorpay_order_id + "|" + params.razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");
  
  return expectedSignature === params.razorpay_signature;
}

function verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret) {
    console.warn("[razorpay] Webhook secret not configured");
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");
  
  return expectedSignature === signature;
}

function generateValidSignature(orderId: string, paymentId: string, keySecret: string): string {
  const body = orderId + "|" + paymentId;
  return crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");
}

function generateValidWebhookSignature(body: string, webhookSecret: string): string {
  return crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");
}

describe("Razorpay Signature Verification", () => {
  describe("verifyPaymentSignature", () => {
    it("should return true for valid signature", () => {
      const orderId = "order_test123ABC";
      const paymentId = "pay_test456XYZ";
      const validSignature = generateValidSignature(orderId, paymentId, TEST_KEY_SECRET);

      const result = verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }, TEST_KEY_SECRET);

      expect(result).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const result = verifyPaymentSignature({
        razorpay_order_id: "order_test123",
        razorpay_payment_id: "pay_test456",
        razorpay_signature: "invalid_signature_here_abc123",
      }, TEST_KEY_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for empty signature", () => {
      const result = verifyPaymentSignature({
        razorpay_order_id: "order_test123",
        razorpay_payment_id: "pay_test456",
        razorpay_signature: "",
      }, TEST_KEY_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for tampered order_id", () => {
      const orderId = "order_original";
      const paymentId = "pay_test456";
      const validSignature = generateValidSignature(orderId, paymentId, TEST_KEY_SECRET);

      const result = verifyPaymentSignature({
        razorpay_order_id: "order_tampered",
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }, TEST_KEY_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for tampered payment_id", () => {
      const orderId = "order_test123";
      const paymentId = "pay_original";
      const validSignature = generateValidSignature(orderId, paymentId, TEST_KEY_SECRET);

      const result = verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_tampered",
        razorpay_signature: validSignature,
      }, TEST_KEY_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for wrong key secret", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const validSignature = generateValidSignature(orderId, paymentId, TEST_KEY_SECRET);

      const result = verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }, "wrong_secret_key_completely_different");

      expect(result).toBe(false);
    });

    it("should throw error when key secret is not configured", () => {
      expect(() => {
        verifyPaymentSignature({
          razorpay_order_id: "order_123",
          razorpay_payment_id: "pay_456",
          razorpay_signature: "some_signature",
        }, "");
      }).toThrow("Razorpay key secret not configured");
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should return true for valid webhook signature", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" }}}});
      const validSignature = generateValidWebhookSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const result = verifyWebhookSignature(webhookBody, validSignature, TEST_WEBHOOK_SECRET);

      expect(result).toBe(true);
    });

    it("should return false for invalid webhook signature", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });

      const result = verifyWebhookSignature(webhookBody, "invalid_signature_xyz", TEST_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for empty webhook signature", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });

      const result = verifyWebhookSignature(webhookBody, "", TEST_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });

    it("should return false for tampered webhook body", () => {
      const originalBody = JSON.stringify({ event: "payment.captured", amount: 10000 });
      const validSignature = generateValidWebhookSignature(originalBody, TEST_WEBHOOK_SECRET);

      const tamperedBody = JSON.stringify({ event: "payment.captured", amount: 1 });
      const result = verifyWebhookSignature(tamperedBody, validSignature, TEST_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });

    it("should return false when webhook secret is not configured", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });
      const signature = generateValidWebhookSignature(webhookBody, TEST_WEBHOOK_SECRET);
      
      const result = verifyWebhookSignature(webhookBody, signature, "");

      expect(result).toBe(false);
    });

    it("should return false for wrong webhook secret", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });
      const validSignature = generateValidWebhookSignature(webhookBody, TEST_WEBHOOK_SECRET);

      const result = verifyWebhookSignature(webhookBody, validSignature, "wrong_secret");

      expect(result).toBe(false);
    });
  });

  describe("signature format validation", () => {
    it("should verify signature uses HMAC-SHA256", () => {
      const orderId = "order_ABC123";
      const paymentId = "pay_XYZ789";
      const body = orderId + "|" + paymentId;
      
      const manualHmac = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(body)
        .digest("hex");
      
      const generatedSignature = generateValidSignature(orderId, paymentId, TEST_KEY_SECRET);
      
      expect(generatedSignature).toBe(manualHmac);
      expect(generatedSignature).toHaveLength(64);
    });

    it("should use pipe separator for order and payment id concatenation", () => {
      const orderId = "order_test";
      const paymentId = "pay_test";
      
      const signatureWithPipe = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(orderId + "|" + paymentId)
        .digest("hex");
      
      const signatureWithoutPipe = crypto
        .createHmac("sha256", TEST_KEY_SECRET)
        .update(orderId + paymentId)
        .digest("hex");
      
      expect(signatureWithPipe).not.toBe(signatureWithoutPipe);
      
      const result = verifyPaymentSignature({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signatureWithPipe,
      }, TEST_KEY_SECRET);
      
      expect(result).toBe(true);
    });
  });
});
