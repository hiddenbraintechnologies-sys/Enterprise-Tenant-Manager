import { describe, it, expect } from "@jest/globals";

describe("SOC2 export bundle smoke test", () => {
  it("returns 401 without auth", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/export/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        from: "2026-01-01", 
        to: "2026-01-31", 
        format: "csv" 
      }),
    });

    expect(response.status).toBe(401);
  });

  it("export endpoint exists and requires authentication", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/export/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        from: "2026-01-01", 
        to: "2026-01-31", 
        format: "csv" 
      }),
    });

    expect([401, 428]).toContain(response.status);
  });

  it("SOC2 controls endpoint exists", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/soc2/controls", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 401]).toContain(response.status);
  });

  it("audit logs export endpoint exists", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/export/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        from: "2026-01-01", 
        to: "2026-01-31", 
        format: "csv" 
      }),
    });

    expect([401, 428]).toContain(response.status);
  });

  it("login history export endpoint exists", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/export/login-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        from: "2026-01-01", 
        to: "2026-01-31", 
        format: "csv" 
      }),
    });

    expect([401, 428]).toContain(response.status);
  });
});
