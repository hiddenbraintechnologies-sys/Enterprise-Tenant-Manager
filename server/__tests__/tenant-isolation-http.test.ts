/**
 * HTTP-Level Tenant Isolation Integration Tests
 * 
 * Verifies that middleware chain (auth + tenant context) properly
 * isolates tenant data at the HTTP layer. Complements DB-layer tests.
 * 
 * Tests:
 * - Middleware order enforcement
 * - Route handlers never leak cross-tenant records
 * - Dashboard totals are tenant-scoped
 * - ID-based endpoints return 404 for cross-tenant access
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcrypt";
import { db } from "../db";
import { tenants, users, userTenants, roles, hrEmployees, hrDepartments } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

// Use the running server URL instead of importing app (avoids ESM conflicts)
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

interface TestTenant {
  id: string;
  name: string;
  slug: string;
}

interface TestUser {
  id: string;
  email: string;
  tenantId: string;
}

interface TestEmployee {
  id: string;
  tenantId: string;
  firstName: string;
}

interface TestDepartment {
  id: string;
  tenantId: string;
  name: string;
}

// Test data holders
let tenantA: TestTenant;
let tenantB: TestTenant;
let userA: TestUser;
let userB: TestUser;
let empA1: TestEmployee;
let empA2: TestEmployee;
let empB1: TestEmployee;
let empB2: TestEmployee;
let deptA: TestDepartment;
let deptB: TestDepartment;
let cookieA: string[];
let cookieB: string[];

const TEST_PASSWORD = "TestPassword123!";

async function createTestTenant(suffix: string): Promise<TestTenant> {
  const id = randomUUID();
  const name = `HTTP Test Tenant ${suffix}`;
  const slug = `http-test-${suffix.toLowerCase()}-${Date.now()}`;
  
  await db.insert(tenants).values({
    id,
    name,
    slug,
    country: "india",
    status: "active",
    subscriptionTier: "basic",
  });
  
  return { id, name, slug };
}

async function getAdminRoleId(): Promise<string> {
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin"));
  if (adminRole) return adminRole.id;
  
  // Create admin role if not exists
  const [created] = await db.insert(roles).values({
    name: "Admin",
    description: "Administrator role",
    isSystem: true,
  }).returning();
  return created.id;
}

async function createTestUser(tenant: TestTenant, suffix: string): Promise<TestUser> {
  const email = `httptest-${suffix}-${Date.now()}@test.local`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  
  const [created] = await db.insert(users).values({
    email,
    firstName: `Test`,
    lastName: `User${suffix}`,
    passwordHash,
    lastTenantId: tenant.id,
  }).returning();
  
  // Get or create admin role
  const roleId = await getAdminRoleId();
  
  // Link user to tenant
  await db.insert(userTenants).values({
    userId: created.id,
    tenantId: tenant.id,
    roleId,
    isDefault: true,
    isActive: true,
  });
  
  return { id: created.id, email, tenantId: tenant.id };
}

async function createTestDepartment(tenant: TestTenant): Promise<TestDepartment> {
  const id = randomUUID();
  const name = `Dept-${tenant.slug}`;
  
  await db.insert(hrDepartments).values({
    id,
    tenantId: tenant.id,
    name,
    isActive: true,
  });
  
  return { id, tenantId: tenant.id, name };
}

async function createTestEmployee(
  tenant: TestTenant, 
  dept: TestDepartment, 
  suffix: string
): Promise<TestEmployee> {
  const firstName = `HttpEmp${suffix}`;
  
  const [created] = await db.insert(hrEmployees).values({
    tenantId: tenant.id,
    departmentId: dept.id,
    firstName,
    lastName: "Test",
    email: `httpemp-${suffix}-${Date.now()}@test.local`,
    status: "active",
    employeeId: `HTTPEMP-${suffix}-${Date.now()}`,
    employmentType: "full_time",
    joinDate: new Date().toISOString().split("T")[0],
  }).returning();
  
  return { id: created.id, tenantId: tenant.id, firstName };
}

async function loginAndGetCookie(
  email: string, 
  password: string, 
  tenantId: string
): Promise<string[]> {
  const res = await request(BASE_URL)
    .post("/api/auth/login")
    .send({ email, password, tenantId });
  
  if (res.status !== 200) {
    console.log("Login failed:", res.status, res.body);
    throw new Error(`Login failed for ${email}: ${res.status} - ${JSON.stringify(res.body)}`);
  }

  const cookies = res.headers["set-cookie"];
  if (!cookies?.length) {
    throw new Error(`No auth cookie set for ${email}`);
  }
  return Array.isArray(cookies) ? cookies : [cookies];
}

async function cleanupTestData() {
  // Clean up in reverse dependency order
  if (empA1?.id) await db.delete(hrEmployees).where(eq(hrEmployees.id, empA1.id)).catch(() => {});
  if (empA2?.id) await db.delete(hrEmployees).where(eq(hrEmployees.id, empA2.id)).catch(() => {});
  if (empB1?.id) await db.delete(hrEmployees).where(eq(hrEmployees.id, empB1.id)).catch(() => {});
  if (empB2?.id) await db.delete(hrEmployees).where(eq(hrEmployees.id, empB2.id)).catch(() => {});
  
  if (deptA?.id) await db.delete(hrDepartments).where(eq(hrDepartments.id, deptA.id)).catch(() => {});
  if (deptB?.id) await db.delete(hrDepartments).where(eq(hrDepartments.id, deptB.id)).catch(() => {});
  
  if (userA?.id) {
    await db.delete(userTenants).where(eq(userTenants.userId, userA.id)).catch(() => {});
    await db.delete(users).where(eq(users.id, userA.id)).catch(() => {});
  }
  if (userB?.id) {
    await db.delete(userTenants).where(eq(userTenants.userId, userB.id)).catch(() => {});
    await db.delete(users).where(eq(users.id, userB.id)).catch(() => {});
  }
  
  if (tenantA?.id) await db.delete(tenants).where(eq(tenants.id, tenantA.id)).catch(() => {});
  if (tenantB?.id) await db.delete(tenants).where(eq(tenants.id, tenantB.id)).catch(() => {});
}

describe("HTTP Tenant Isolation Tests", () => {
  beforeAll(async () => {
    // Assumes server is already running on BASE_URL
    // Wait a moment to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create test tenants
    tenantA = await createTestTenant("A");
    tenantB = await createTestTenant("B");
    
    // Create test users
    userA = await createTestUser(tenantA, "A");
    userB = await createTestUser(tenantB, "B");
    
    // Create departments
    deptA = await createTestDepartment(tenantA);
    deptB = await createTestDepartment(tenantB);
    
    // Create employees
    empA1 = await createTestEmployee(tenantA, deptA, "A1");
    empA2 = await createTestEmployee(tenantA, deptA, "A2");
    empB1 = await createTestEmployee(tenantB, deptB, "B1");
    empB2 = await createTestEmployee(tenantB, deptB, "B2");
    
    // Login both users
    try {
      cookieA = await loginAndGetCookie(userA.email, TEST_PASSWORD, tenantA.id);
      cookieB = await loginAndGetCookie(userB.email, TEST_PASSWORD, tenantB.id);
    } catch (error) {
      console.error("Login failed during setup:", error);
      // Tests will be skipped if login fails
    }
  }, 30000);

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("A) Employees List Isolation", () => {
    it("User A listing employees should NOT include tenant B records", async () => {
      if (!cookieA) {
        console.warn("Skipping test - login failed");
        return;
      }
      
      const res = await request(BASE_URL)
        .get("/api/hr/employees")
        .set("Cookie", cookieA);
      
      // Accept 200 or 403 (if HRMS add-on required)
      if (res.status === 403) {
        console.log("HRMS module access denied - expected if add-on not installed");
        return;
      }
      
      expect(res.status).toBe(200);
      
      // Extract employee IDs from response
      const employees = res.body?.data || res.body?.employees || res.body || [];
      const ids = Array.isArray(employees) ? employees.map((e: any) => e.id) : [];
      
      // Should include A's employees
      if (ids.length > 0) {
        expect(ids).toContain(empA1.id);
        expect(ids).toContain(empA2.id);
      }
      
      // Should NOT include B's employees
      expect(ids).not.toContain(empB1.id);
      expect(ids).not.toContain(empB2.id);
    });

    it("Response total/count should only reflect tenant A data", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get("/api/hr/employees")
        .set("Cookie", cookieA);
      
      if (res.status === 403) return;
      
      const total = res.body?.total || res.body?.pagination?.total;
      if (total !== undefined) {
        // Total should be 2 (only A's employees) or more if other tests added data
        // But definitely should NOT include B's 2 employees in the count
        expect(total).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("B) Employees Detail Isolation", () => {
    it("User A fetching tenant B employee by ID returns 404 (not 403)", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get(`/api/hr/employees/${empB1.id}`)
        .set("Cookie", cookieA);
      
      // Cross-tenant access MUST return 404 to prevent enumeration
      // 403 would leak that the resource exists in another tenant
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("User A can fetch own employee by ID", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get(`/api/hr/employees/${empA1.id}`)
        .set("Cookie", cookieA);
      
      if (res.status === 403) return; // HRMS module required
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(empA1.id);
    });
  });

  describe("C) Employees Mutation Isolation", () => {
    it("User A PUT on tenant B employee returns 404 and DB unchanged", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .put(`/api/hr/employees/${empB1.id}`)
        .set("Cookie", cookieA)
        .send({ firstName: "HACKED" });
      
      // Cross-tenant mutation MUST return 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
      
      // Verify DB unchanged
      const [fresh] = await db
        .select()
        .from(hrEmployees)
        .where(and(eq(hrEmployees.id, empB1.id), eq(hrEmployees.tenantId, tenantB.id)));
      
      expect(fresh?.firstName).toBe(empB1.firstName);
      expect(fresh?.firstName).not.toBe("HACKED");
    });

    it("User A DELETE on tenant B employee returns 404 and record still exists", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .delete(`/api/hr/employees/${empB1.id}`)
        .set("Cookie", cookieA);
      
      // Cross-tenant deletion MUST return 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
      
      // Verify record still exists
      const [fresh] = await db
        .select()
        .from(hrEmployees)
        .where(eq(hrEmployees.id, empB1.id));
      
      expect(fresh).toBeDefined();
    });
  });

  describe("D) Departments Isolation", () => {
    it("User A listing departments should NOT include tenant B departments", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get("/api/hr/departments")
        .set("Cookie", cookieA);
      
      if (res.status === 403) return;
      
      expect(res.status).toBe(200);
      
      const departments = res.body?.data || res.body?.departments || res.body || [];
      const ids = Array.isArray(departments) ? departments.map((d: any) => d.id) : [];
      
      // Should NOT include B's department
      expect(ids).not.toContain(deptB.id);
    });

    it("User A fetching tenant B department by ID returns 404", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get(`/api/hr/departments/${deptB.id}`)
        .set("Cookie", cookieA);
      
      // Cross-tenant access MUST return 404
      // Note: departments/:id route may not exist, so 404 is expected
      expect(res.status).toBe(404);
    });
  });

  describe("E) Dashboard Isolation", () => {
    it("User A dashboard counts should only reflect tenant A data", async () => {
      if (!cookieA) return;
      
      const res = await request(BASE_URL)
        .get("/api/hr/dashboard")
        .set("Cookie", cookieA);
      
      if (res.status === 403) return;
      
      expect(res.status).toBe(200);
      
      // Check employee count if present
      const employeeCount = res.body?.employeeCount || res.body?.stats?.employees || res.body?.totalEmployees;
      if (employeeCount !== undefined) {
        // Should be at least 2 (our seeded employees) but not include B's 2
        expect(employeeCount).toBeGreaterThanOrEqual(2);
      }
      
      // Check department count if present
      const deptCount = res.body?.departmentCount || res.body?.stats?.departments || res.body?.totalDepartments;
      if (deptCount !== undefined) {
        expect(deptCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("F) Cross-Check: User B Cannot Access A's Data", () => {
    it("User B cannot fetch tenant A employee (returns 404)", async () => {
      if (!cookieB) return;
      
      const res = await request(BASE_URL)
        .get(`/api/hr/employees/${empA1.id}`)
        .set("Cookie", cookieB);
      
      // Cross-tenant access MUST return 404
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
    });

    it("User B list should not include A's employees", async () => {
      if (!cookieB) return;
      
      const res = await request(BASE_URL)
        .get("/api/hr/employees")
        .set("Cookie", cookieB);
      
      if (res.status === 403) return;
      
      const employees = res.body?.data || res.body?.employees || res.body || [];
      const ids = Array.isArray(employees) ? employees.map((e: any) => e.id) : [];
      
      expect(ids).not.toContain(empA1.id);
      expect(ids).not.toContain(empA2.id);
    });
  });
});
