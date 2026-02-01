import { describe, it, expect } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

describe("Security Headers", () => {
  it("should return X-Content-Type-Options header", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("should return Referrer-Policy header", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("should return X-Frame-Options header", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("should return Permissions-Policy header", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const policy = response.headers.get("permissions-policy");
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });

  it("should return CSP header (report-only mode)", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const csp = response.headers.get("content-security-policy-report-only");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://checkout.razorpay.com");
    expect(csp).toContain("https://api.razorpay.com");
  });

  it("should not block webhook endpoint", async () => {
    const response = await fetch(`${BASE_URL}/api/webhooks/razorpay-marketplace`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "invalid",
      },
      body: JSON.stringify({ event: "test" }),
    });
    expect(response.status).toBe(500);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
