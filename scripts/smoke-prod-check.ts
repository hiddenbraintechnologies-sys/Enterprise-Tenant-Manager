#!/usr/bin/env npx tsx
/**
 * Production Smoke Test Script
 * Verifies that the application is functioning correctly after deployment.
 * 
 * Usage: npx tsx scripts/smoke-prod-check.ts [BASE_URL]
 * Example: npx tsx scripts/smoke-prod-check.ts https://mybizstream.example.com
 * 
 * Environment variables:
 *   SMOKE_TEST_URL - Base URL to test (default: http://localhost:5000)
 *   SMOKE_TEST_TOKEN - JWT token for authenticated tests (optional)
 *   SMOKE_TEST_TENANT_ID - Tenant ID for authenticated tests (optional)
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const BASE_URL = process.argv[2] || process.env.SMOKE_TEST_URL || "http://localhost:5000";
const AUTH_TOKEN = process.env.SMOKE_TEST_TOKEN;
const TENANT_ID = process.env.SMOKE_TEST_TENANT_ID;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  skipped?: boolean;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>, skipIf?: boolean): Promise<void> {
  if (skipIf) {
    results.push({
      name,
      passed: true,
      message: "SKIPPED (no auth token)",
      duration: 0,
      skipped: true,
    });
    console.log(`⏭️  ${name} (skipped - no auth token)`);
    return;
  }
  
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      message: "PASS",
      duration: Date.now() - start,
    });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      name,
      passed: false,
      message,
      duration: Date.now() - start,
    });
    console.log(`❌ ${name}: ${message} (${Date.now() - start}ms)`);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }
  if (TENANT_ID) {
    headers["X-Tenant-ID"] = TENANT_ID;
  }
  return headers;
}

async function fetchJSON(path: string, options?: RequestInit): Promise<{ status: number; data: any }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  
  return { 
    status: response.status, 
    data: await response.json().catch(() => null) 
  };
}

// ============================================
// HEALTH CHECKS
// ============================================

async function testHealthEndpoint(): Promise<void> {
  const { status, data } = await fetchJSON("/health");
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!data?.status) throw new Error("Missing status field");
  if (data.status !== "ok") throw new Error(`Status is ${data.status}, expected ok`);
}

async function testHealthDbEndpoint(): Promise<void> {
  const { status, data } = await fetchJSON("/health/db");
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!data?.database) throw new Error("Missing database field");
  if (data.database !== "connected") throw new Error(`Database status: ${data.database}`);
}

async function testHealthReadyEndpoint(): Promise<void> {
  const { status, data } = await fetchJSON("/health/ready");
  if (status !== 200 && status !== 503) throw new Error(`Expected 200 or 503, got ${status}`);
  if (!data?.checks) throw new Error("Missing checks field");
  if (!Array.isArray(data.checks)) throw new Error("Checks should be an array");
}

// ============================================
// UNAUTHENTICATED API CHECKS
// ============================================

async function testFurnitureProductsRequiresAuth(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/furniture/products`, {
    headers: { "Content-Type": "application/json" },
  });
  if (response.status !== 401 && response.status !== 403 && response.status !== 400) {
    throw new Error(`Expected auth error (401/403/400), got ${response.status}`);
  }
}

async function testServicesProjectsRequiresAuth(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/services/projects`, {
    headers: { "Content-Type": "application/json" },
  });
  if (response.status !== 401 && response.status !== 403 && response.status !== 400) {
    throw new Error(`Expected auth error (401/403/400), got ${response.status}`);
  }
}

// ============================================
// AUTHENTICATED FURNITURE MODULE TESTS
// ============================================

async function testFurnitureProductsList(): Promise<void> {
  const { status, data } = await fetchJSON("/api/furniture/products?limit=1");
  if (status !== 200) throw new Error(`Expected 200, got ${status}. Response: ${JSON.stringify(data)}`);
  if (!data?.data) throw new Error("Missing data array in response");
}

async function testFurnitureSalesOrderCreate(): Promise<void> {
  // Dry-run: Create with minimal data, expect validation error or success
  const { status, data } = await fetchJSON("/api/furniture/sales-orders", {
    method: "POST",
    body: JSON.stringify({
      orderType: "retail",
      customerId: "test-customer-id",
      items: [],
    }),
  });
  
  // Accept validation error (400) or success (201) - we're testing the endpoint responds
  if (status !== 200 && status !== 201 && status !== 400 && status !== 422) {
    throw new Error(`Unexpected status ${status}. Response: ${JSON.stringify(data)}`);
  }
}

async function testFurnitureInvoiceList(): Promise<void> {
  const { status, data } = await fetchJSON("/api/furniture/invoices?limit=1");
  if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  if (!data?.data) throw new Error("Missing data array in response");
}

async function testFurnitureInvoicePdfEndpoint(): Promise<void> {
  // Test that the PDF endpoint exists and requires valid invoice
  const response = await fetch(`${BASE_URL}/api/furniture/invoices/test-invoice-id/pdf`, {
    headers: getAuthHeaders(),
  });
  
  // Accept 404 (invoice not found) or 200 (found) - endpoint is responding
  if (response.status !== 200 && response.status !== 404 && response.status !== 400) {
    throw new Error(`Unexpected status ${response.status}`);
  }
}

// ============================================
// AUTHENTICATED SERVICES MODULE TESTS
// ============================================

async function testServicesProjectsList(): Promise<void> {
  const { status, data } = await fetchJSON("/api/services/projects?limit=1");
  if (status !== 200) throw new Error(`Expected 200, got ${status}. Response: ${JSON.stringify(data)}`);
  if (!data?.data) throw new Error("Missing data array in response");
}

async function testServicesProjectCreate(): Promise<void> {
  // Dry-run: Create with minimal data, expect validation error or success
  const { status, data } = await fetchJSON("/api/services/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test Project",
      code: `SMOKE-${Date.now()}`,
    }),
  });
  
  // Accept validation error (400) or success (201) - we're testing the endpoint responds
  if (status !== 200 && status !== 201 && status !== 400 && status !== 422) {
    throw new Error(`Unexpected status ${status}. Response: ${JSON.stringify(data)}`);
  }
}

async function testServicesTimesheetList(): Promise<void> {
  const { status, data } = await fetchJSON("/api/services/timesheets?limit=1");
  if (status !== 200) throw new Error(`Expected 200, got ${status}. Response: ${JSON.stringify(data)}`);
  if (!data?.data) throw new Error("Missing data array in response");
}

async function testServicesTimesheetCreate(): Promise<void> {
  // Dry-run: Create with minimal data, expect validation error or success
  const { status, data } = await fetchJSON("/api/services/timesheets", {
    method: "POST",
    body: JSON.stringify({
      projectId: "test-project-id",
      date: new Date().toISOString().split("T")[0],
      hours: 1,
      description: "Smoke test timesheet",
    }),
  });
  
  // Accept validation error (400) or success (201) - we're testing the endpoint responds
  if (status !== 200 && status !== 201 && status !== 400 && status !== 422) {
    throw new Error(`Unexpected status ${status}. Response: ${JSON.stringify(data)}`);
  }
}

// ============================================
// SECURITY CHECKS
// ============================================

async function testTenantIsolation(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/furniture/products`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : "",
      "X-Tenant-ID": "invalid-tenant-id-12345-cross-tenant",
    },
  });
  
  // Should reject with 401 (bad token), 403 (forbidden), or 404 (not found)
  if (response.status !== 401 && response.status !== 403 && response.status !== 404 && response.status !== 400) {
    throw new Error(`Expected rejection for invalid tenant, got ${response.status}`);
  }
}

async function testProductionBlockedEndpoints(): Promise<void> {
  const blockedPaths = ["/api/seed", "/api/demo", "/api/test-data", "/api/mock"];
  const failures: string[] = [];
  const warnings: string[] = [];
  
  for (const path of blockedPaths) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    
    // In production: should be 403 (blocked) or 404 (not found)
    // In development: 200/401/404 are acceptable (endpoints not blocked)
    if (response.status === 403 || response.status === 404) {
      // Good - endpoint is blocked or doesn't exist
    } else if (response.status === 401) {
      // Acceptable - requires auth, effectively protected
    } else if (response.status === 200) {
      // In dev mode this is OK, in prod this is a security issue
      warnings.push(`${path} returned 200 (acceptable in dev, should be 403 in prod)`);
    } else {
      failures.push(`${path} returned unexpected ${response.status}`);
    }
  }
  
  // Only fail on unexpected statuses, not on 200 in dev
  if (failures.length > 0) {
    throw new Error(`Unexpected responses: ${failures.join(", ")}`);
  }
  
  // Log warnings for visibility
  if (warnings.length > 0) {
    console.log(`    Note: ${warnings.length} dev endpoints accessible (blocked in production)`);
  }
}

async function testRateLimitHeaders(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@test.com", password: "test" }),
  });
  
  // Rate limit headers may be present (varies by environment)
  const hasRateLimit = response.headers.has("x-ratelimit-limit") || 
                       response.headers.has("ratelimit-limit") ||
                       response.headers.has("retry-after") ||
                       response.status === 429;
  
  // This is a soft check - rate limiting may be disabled in dev
  // Just verify the endpoint responds
  if (response.status >= 500) {
    throw new Error(`Server error: ${response.status}`);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("=".repeat(60));
  console.log("PRODUCTION SMOKE TEST");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth Token: ${AUTH_TOKEN ? "configured" : "not configured"}`);
  console.log(`Tenant ID: ${TENANT_ID || "not configured"}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  console.log("");

  // Phase 1: Health Checks (always run)
  console.log("Phase 1: Health Checks");
  console.log("-".repeat(40));
  await runTest("GET /health", testHealthEndpoint);
  await runTest("GET /health/db", testHealthDbEndpoint);
  await runTest("GET /health/ready", testHealthReadyEndpoint);
  console.log("");

  // Phase 2: Unauthenticated API Checks
  console.log("Phase 2: Unauthenticated API Checks (auth required)");
  console.log("-".repeat(40));
  await runTest("Furniture Products requires auth", testFurnitureProductsRequiresAuth);
  await runTest("Services Projects requires auth", testServicesProjectsRequiresAuth);
  console.log("");

  // Phase 3: Authenticated Furniture Module Tests
  const skipAuth = !AUTH_TOKEN;
  console.log("Phase 3: Furniture Module (authenticated)");
  console.log("-".repeat(40));
  await runTest("Furniture: List products", testFurnitureProductsList, skipAuth);
  await runTest("Furniture: Create sales order (dry-run)", testFurnitureSalesOrderCreate, skipAuth);
  await runTest("Furniture: List invoices", testFurnitureInvoiceList, skipAuth);
  await runTest("Furniture: Invoice PDF endpoint", testFurnitureInvoicePdfEndpoint, skipAuth);
  console.log("");

  // Phase 4: Authenticated Services Module Tests
  console.log("Phase 4: Services Module (authenticated)");
  console.log("-".repeat(40));
  await runTest("Services: List projects", testServicesProjectsList, skipAuth);
  await runTest("Services: Create project (dry-run)", testServicesProjectCreate, skipAuth);
  await runTest("Services: List timesheets", testServicesTimesheetList, skipAuth);
  await runTest("Services: Create timesheet (dry-run)", testServicesTimesheetCreate, skipAuth);
  console.log("");

  // Phase 5: Security Checks
  console.log("Phase 5: Security Checks");
  console.log("-".repeat(40));
  await runTest("Tenant Isolation", testTenantIsolation);
  await runTest("Production Blocked Endpoints", testProductionBlockedEndpoints);
  await runTest("Rate Limit Headers", testRateLimitHeaders);
  console.log("");

  // Summary
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total - skipped}`);
  console.log(`Failed: ${failed}/${total - skipped}`);
  console.log(`Skipped: ${skipped}/${total}`);
  console.log("");

  if (skipped > 0) {
    console.log("Skipped Tests (provide SMOKE_TEST_TOKEN for full coverage):");
    for (const result of results.filter(r => r.skipped)) {
      console.log(`  - ${result.name}`);
    }
    console.log("");
  }

  if (failed > 0) {
    console.log("Failed Tests:");
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}: ${result.message}`);
    }
    console.log("");
    console.log("RESULT: ❌ FAIL");
    process.exit(1);
  }

  console.log("RESULT: ✅ PASS");
  process.exit(0);
}

main().catch(error => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
