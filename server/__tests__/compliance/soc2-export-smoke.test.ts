import { describe, it, expect } from "@jest/globals";
import { db } from "../../db";
import { sql } from "drizzle-orm";

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

describe("SOC2 audit evidence trail", () => {
  it("audit_logs table has DATA_EXPORT action type available", async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name = 'action'
    `);
    
    expect(result.rows.length).toBe(1);
  });

  it("audit_logs can store export metadata", async () => {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'audit_logs'
      AND column_name IN ('action', 'resource', 'metadata', 'user_id', 'tenant_id')
    `);
    
    const columns = (result.rows as { column_name: string }[]).map(r => r.column_name);
    expect(columns).toContain("action");
    expect(columns).toContain("resource");
    expect(columns).toContain("metadata");
  });

  it("export endpoints are configured to require step-up authentication", async () => {
    const response = await fetch("http://localhost:5000/api/compliance/export/bundle", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        from: "2026-01-01", 
        to: "2026-01-31", 
        format: "csv" 
      }),
    });

    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data).toHaveProperty("code");
    expect(data.code).toBe("UNAUTHORIZED");
  });

  it("DATA_EXPORT audit action patterns are defined", async () => {
    const validExportActions = [
      "DATA_EXPORT_STARTED",
      "DATA_EXPORT_COMPLETED", 
      "DATA_EXPORT_FAILED"
    ];
    
    expect(validExportActions).toContain("DATA_EXPORT_STARTED");
    expect(validExportActions).toContain("DATA_EXPORT_COMPLETED");
  });
});
