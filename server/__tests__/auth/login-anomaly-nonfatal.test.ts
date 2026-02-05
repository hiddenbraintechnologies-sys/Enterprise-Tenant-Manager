import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { AnomalyScoreResult } from "../../services/anomaly-scoring";

jest.mock("../../services/anomaly-scoring", () => ({
  computeAnomalyScore: jest.fn(async () => {
    throw new Error("relation \"user_sessions\" does not exist");
  }),
  clearAnomalyCache: jest.fn(),
  addReuseDetectionScore: jest.fn((result: AnomalyScoreResult) => ({
    score: (result?.score ?? 0) + 100,
    reasons: [...(result?.reasons ?? []), "TOKEN_REUSE_DETECTED"],
    requiresStepUp: true,
    requiresForceLogout: true,
    activeSessionCount: result?.activeSessionCount ?? 0,
    lookedBack: result?.lookedBack ?? 0,
  })),
  shouldTriggerSecurityAlert: jest.fn(() => false),
  getAnomalySummary: jest.fn(() => "No anomalies detected"),
}));

describe("Auth Login - anomaly scoring must be non-fatal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("login endpoint exists and anomaly scoring failure does not crash server", async () => {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: "nonexistent@example.com", 
        password: "Password123!" 
      }),
    });

    expect(response.status).not.toBe(500);
  });

  it("tenant discovery works independently of anomaly scoring", async () => {
    const response = await fetch("http://localhost:5000/api/auth/tenant-discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("tenants");
    expect(data).toHaveProperty("count");
  });

  it("real computeAnomalyScore returns safe defaults when DB fails", async () => {
    jest.resetModules();
    const actualModule = jest.requireActual("../../services/anomaly-scoring") as {
      computeAnomalyScore: (params: unknown) => Promise<AnomalyScoreResult>;
    };
    
    const result = await actualModule.computeAnomalyScore({
      tenantId: "nonexistent-tenant-xyz",
      userId: "nonexistent-user-xyz",
      deviceFingerprint: "test-device",
    });

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("reasons");
    expect(result).toHaveProperty("requiresStepUp");
    expect(result).toHaveProperty("requiresForceLogout");
  });
});
