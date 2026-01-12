import { describe, it, expect } from "@jest/globals";
import crypto from "crypto";

describe("Razorpay Signature Verification", () => {
  const TEST_KEY_SECRET = "test_secret_key_123";

  function verifyPaymentSignature(params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }, keySecret: string): boolean {
    const body = params.razorpay_order_id + "|" + params.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");
    
    return expectedSignature === params.razorpay_signature;
  }

  function generateValidSignature(orderId: string, paymentId: string, keySecret: string): string {
    const body = orderId + "|" + paymentId;
    return crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");
  }

  describe("verifyPaymentSignature", () => {
    it("should return true for valid signature", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
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
        razorpay_signature: "invalid_signature_here",
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
      }, "wrong_secret_key");

      expect(result).toBe(false);
    });
  });

  describe("webhook signature verification", () => {
    function verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      return expectedSignature === signature;
    }

    it("should return true for valid webhook signature", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });
      const webhookSecret = "whsec_test123";
      const validSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(webhookBody)
        .digest("hex");

      const result = verifyWebhookSignature(webhookBody, validSignature, webhookSecret);

      expect(result).toBe(true);
    });

    it("should return false for invalid webhook signature", () => {
      const webhookBody = JSON.stringify({ event: "payment.captured" });
      const webhookSecret = "whsec_test123";

      const result = verifyWebhookSignature(webhookBody, "invalid_signature", webhookSecret);

      expect(result).toBe(false);
    });

    it("should return false for tampered webhook body", () => {
      const originalBody = JSON.stringify({ event: "payment.captured" });
      const webhookSecret = "whsec_test123";
      const validSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(originalBody)
        .digest("hex");

      const tamperedBody = JSON.stringify({ event: "payment.failed" });
      const result = verifyWebhookSignature(tamperedBody, validSignature, webhookSecret);

      expect(result).toBe(false);
    });
  });
});
