import request from "supertest";
import { createTestApp } from "../test-app";
import type { Express } from "express";
import type { Server } from "http";

async function runSmokeTest() {
  console.log("=== Services Module Smoke Test ===\n");
  
  let app: Express;
  let httpServer: Server;
  const testTenantId = `smoke-test-tenant-${Date.now()}`;
  const headers = { "X-Tenant-ID": testTenantId };
  
  const results: { test: string; status: "PASS" | "FAIL"; message?: string }[] = [];
  
  try {
    console.log("Setting up test application...");
    const testApp = await createTestApp();
    app = testApp.app;
    httpServer = testApp.httpServer;
    console.log("Test application ready.\n");
  } catch (error) {
    console.error("Failed to create test application:", error);
    process.exit(1);
  }
  
  async function runTest(name: string, testFn: () => Promise<void>) {
    try {
      await testFn();
      results.push({ test: name, status: "PASS" });
      console.log(`✓ ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ test: name, status: "FAIL", message });
      console.log(`✗ ${name}: ${message}`);
    }
  }
  
  console.log("--- Health Checks ---");
  
  await runTest("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.status !== "ok") throw new Error(`Expected status 'ok', got '${res.body.status}'`);
  });
  
  await runTest("GET /health/db returns status", async () => {
    const res = await request(app).get("/health/db");
    if (![200, 503].includes(res.status)) throw new Error(`Expected 200 or 503, got ${res.status}`);
    if (!res.body.status) throw new Error("Missing status in response");
  });
  
  console.log("\n--- Projects API ---");
  
  await runTest("GET /api/services/projects returns list format", async () => {
    const res = await request(app).get("/api/services/projects").set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.data) throw new Error("Missing 'data' in response");
    if (!res.body.meta) throw new Error("Missing 'meta' in response");
    if (!Array.isArray(res.body.data)) throw new Error("data should be an array");
  });
  
  await runTest("Projects pagination works", async () => {
    const res = await request(app)
      .get("/api/services/projects?page=1&limit=5")
      .set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.meta.page !== 1) throw new Error(`Expected page 1, got ${res.body.meta.page}`);
    if (res.body.meta.limit !== 5) throw new Error(`Expected limit 5, got ${res.body.meta.limit}`);
  });
  
  await runTest("Projects status filter works", async () => {
    const res = await request(app)
      .get("/api/services/projects?status=active")
      .set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  await runTest("Projects search filter works", async () => {
    const res = await request(app)
      .get("/api/services/projects?search=test")
      .set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  console.log("\n--- Timesheets API ---");
  
  await runTest("GET /api/services/timesheets returns list format", async () => {
    const res = await request(app).get("/api/services/timesheets").set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body.data) throw new Error("Missing 'data' in response");
    if (!res.body.meta) throw new Error("Missing 'meta' in response");
  });
  
  await runTest("Timesheets date range filter works", async () => {
    const res = await request(app)
      .get("/api/services/timesheets?startDate=2026-01-01&endDate=2026-12-31")
      .set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  await runTest("Timesheets status filter works", async () => {
    const res = await request(app)
      .get("/api/services/timesheets?status=draft")
      .set(headers);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  console.log("\n--- Tenant Isolation ---");
  
  await runTest("Cross-tenant project access returns 404", async () => {
    const res = await request(app)
      .get("/api/services/projects/fake-project-id")
      .set({ "X-Tenant-ID": "different-tenant" });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });
  
  await runTest("Cross-tenant task access returns 404", async () => {
    const res = await request(app)
      .get("/api/services/tasks/fake-task-id")
      .set({ "X-Tenant-ID": "different-tenant" });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });
  
  await runTest("Cross-tenant timesheet access returns 404", async () => {
    const res = await request(app)
      .get("/api/services/timesheets/fake-timesheet-id")
      .set({ "X-Tenant-ID": "different-tenant" });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });
  
  console.log("\n--- Error Handling ---");
  
  await runTest("Missing tenant returns consistent error format", async () => {
    const res = await request(app).get("/api/services/projects");
    if (![400, 401].includes(res.status)) throw new Error(`Expected 400 or 401, got ${res.status}`);
    if (!res.body.message) throw new Error("Missing 'message' in error response");
  });
  
  await runTest("404 returns consistent error format", async () => {
    const res = await request(app)
      .get("/api/services/projects/non-existent")
      .set(headers);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    if (!res.body.message) throw new Error("Missing 'message' in error response");
  });
  
  console.log("\n=== Smoke Test Summary ===");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`);
    });
  }
  
  httpServer.close();
  
  return { passed, failed, total: results.length, results };
}

if (require.main === module) {
  runSmokeTest()
    .then(({ failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Smoke test failed:", error);
      process.exit(1);
    });
}

export { runSmokeTest };
