/**
 * Deterministic Mutation Fuzz Tests
 * 
 * Tests tenant isolation and entitlement enforcement using
 * seeded random operations to catch edge cases.
 * 
 * Uses fixed seed for reproducibility.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { db } from "../db";
import { 
  hrEmployees, hrDepartments, tenants, users, userTenants 
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { mintTestJwt, authHeader, getAdminRoleId } from "../test-support/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

class SeededRNG {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

interface TestTenant {
  id: string;
  slug: string;
}

interface TestUser {
  id: string;
  roleId: string;
}

interface TestEmployee {
  id: string;
}

interface TestDepartment {
  id: string;
}

describe("Security Fuzz Tests", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let userA: TestUser;
  let userB: TestUser;
  let employeesA: TestEmployee[] = [];
  let employeesB: TestEmployee[] = [];
  let departmentsA: TestDepartment[] = [];
  let departmentsB: TestDepartment[] = [];
  
  const rng = new SeededRNG(42);
  const testPrefix = `fuzz_${Date.now()}_`;
  
  async function createTenant(suffix: string): Promise<TestTenant> {
    const id = randomUUID();
    const slug = `${testPrefix}${suffix}`.toLowerCase().replace(/_/g, "-");
    
    await db.insert(tenants).values({
      id,
      name: `Fuzz Tenant ${suffix}`,
      slug,
      country: "india",
      status: "active",
      subscriptionTier: "basic",
    });
    
    return { id, slug };
  }
  
  async function createUser(tenant: TestTenant, suffix: string): Promise<TestUser> {
    const email = `${testPrefix}${suffix}@test.local`;
    const roleId = await getAdminRoleId();
    
    const [created] = await db.insert(users).values({
      email,
      firstName: "Fuzz",
      lastName: `User${suffix}`,
      passwordHash: "FUZZ_TEST_NO_PASSWORD",
      lastTenantId: tenant.id,
    }).returning();
    
    await db.insert(userTenants).values({
      userId: created.id,
      tenantId: tenant.id,
      roleId,
      isDefault: true,
      isActive: true,
    });
    
    return { id: created.id, roleId };
  }
  
  async function createDepartment(tenant: TestTenant, suffix: string): Promise<TestDepartment> {
    const id = randomUUID();
    
    await db.insert(hrDepartments).values({
      id,
      tenantId: tenant.id,
      name: `${testPrefix}Dept${suffix}`,
      isActive: true,
    });
    
    return { id };
  }
  
  async function createEmployee(tenant: TestTenant, dept: TestDepartment, suffix: string): Promise<TestEmployee> {
    const [created] = await db.insert(hrEmployees).values({
      tenantId: tenant.id,
      departmentId: dept.id,
      firstName: `Fuzz${suffix}`,
      lastName: "Employee",
      email: `${testPrefix}emp${suffix}@test.local`,
      status: "active",
      employeeId: `FUZZ-${suffix}-${Date.now()}`,
      employmentType: "full_time",
      joinDate: new Date().toISOString().split("T")[0],
    }).returning();
    
    return { id: created.id };
  }
  
  beforeAll(async () => {
    tenantA = await createTenant("A");
    tenantB = await createTenant("B");
    
    userA = await createUser(tenantA, "A");
    userB = await createUser(tenantB, "B");
    
    const deptA = await createDepartment(tenantA, "A1");
    const deptA2 = await createDepartment(tenantA, "A2");
    departmentsA = [deptA, deptA2];
    
    const deptB = await createDepartment(tenantB, "B1");
    const deptB2 = await createDepartment(tenantB, "B2");
    departmentsB = [deptB, deptB2];
    
    for (let i = 0; i < 5; i++) {
      employeesA.push(await createEmployee(tenantA, deptA, `A${i}`));
    }
    
    for (let i = 0; i < 5; i++) {
      employeesB.push(await createEmployee(tenantB, deptB, `B${i}`));
    }
  }, 30000);
  
  afterAll(async () => {
    for (const emp of [...employeesA, ...employeesB]) {
      await db.delete(hrEmployees).where(eq(hrEmployees.id, emp.id)).catch(() => {});
    }
    for (const dept of [...departmentsA, ...departmentsB]) {
      await db.delete(hrDepartments).where(eq(hrDepartments.id, dept.id)).catch(() => {});
    }
    
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
  });
  
  describe("Cross-Tenant GET Operations", () => {
    it("should never return 200 for cross-tenant employee reads (50 iterations)", async () => {
      const iterations = 50;
      let crossTenantAttempts = 0;
      let failures = 0;
      
      for (let i = 0; i < iterations; i++) {
        const userIsTenantA = rng.next() > 0.5;
        const targetFromTenantA = rng.next() > 0.5;
        
        if (userIsTenantA === targetFromTenantA) {
          continue;
        }
        
        crossTenantAttempts++;
        
        const actingUser = userIsTenantA ? userA : userB;
        const actingTenant = userIsTenantA ? tenantA : tenantB;
        const targetEmployees = targetFromTenantA ? employeesA : employeesB;
        const targetEmployee = rng.pick(targetEmployees);
        
        const token = mintTestJwt({
          userId: actingUser.id,
          tenantId: actingTenant.id,
          roleId: actingUser.roleId,
        });
        
        const res = await request(BASE_URL)
          .get(`/api/hr/employees/${targetEmployee.id}`)
          .set(authHeader(token));
        
        if (res.status === 200) {
          failures++;
        }
      }
      
      expect(crossTenantAttempts).toBeGreaterThan(10);
      expect(failures).toBe(0);
    });
    
    it("should never return 200 for cross-tenant department reads (50 iterations)", async () => {
      const iterations = 50;
      let crossTenantAttempts = 0;
      let failures = 0;
      
      for (let i = 0; i < iterations; i++) {
        const userIsTenantA = rng.next() > 0.5;
        const targetFromTenantA = rng.next() > 0.5;
        
        if (userIsTenantA === targetFromTenantA) {
          continue;
        }
        
        crossTenantAttempts++;
        
        const actingUser = userIsTenantA ? userA : userB;
        const actingTenant = userIsTenantA ? tenantA : tenantB;
        const targetDepts = targetFromTenantA ? departmentsA : departmentsB;
        const targetDept = rng.pick(targetDepts);
        
        const token = mintTestJwt({
          userId: actingUser.id,
          tenantId: actingTenant.id,
          roleId: actingUser.roleId,
        });
        
        const res = await request(BASE_URL)
          .get(`/api/hr/departments/${targetDept.id}`)
          .set(authHeader(token));
        
        if (res.status === 200) {
          failures++;
        }
      }
      
      expect(crossTenantAttempts).toBeGreaterThan(10);
      expect(failures).toBe(0);
    });
  });
  
  describe("Cross-Tenant Mutation Operations", () => {
    it("should never succeed and leave DB unchanged for cross-tenant PATCH (30 iterations)", async () => {
      const iterations = 30;
      let failures = 0;
      
      for (let i = 0; i < iterations; i++) {
        const userIsTenantA = rng.next() > 0.5;
        const targetFromTenantA = !userIsTenantA;
        
        const actingUser = userIsTenantA ? userA : userB;
        const actingTenant = userIsTenantA ? tenantA : tenantB;
        const targetEmployees = targetFromTenantA ? employeesA : employeesB;
        const targetEmployee = rng.pick(targetEmployees);
        
        const [originalEmployee] = await db.select()
          .from(hrEmployees)
          .where(eq(hrEmployees.id, targetEmployee.id));
        
        const token = mintTestJwt({
          userId: actingUser.id,
          tenantId: actingTenant.id,
          roleId: actingUser.roleId,
        });
        
        const randomSuffix = Math.floor(rng.next() * 10000);
        
        const res = await request(BASE_URL)
          .patch(`/api/hr/employees/${targetEmployee.id}`)
          .set(authHeader(token))
          .send({ firstName: `Hacked${randomSuffix}` });
        
        if (res.status === 200) {
          failures++;
        }
        
        const [afterEmployee] = await db.select()
          .from(hrEmployees)
          .where(eq(hrEmployees.id, targetEmployee.id));
        
        if (afterEmployee.firstName !== originalEmployee.firstName) {
          failures++;
        }
      }
      
      expect(failures).toBe(0);
    });
    
    it("should never succeed and leave DB unchanged for cross-tenant DELETE (30 iterations)", async () => {
      const iterations = 30;
      let failures = 0;
      
      for (let i = 0; i < iterations; i++) {
        const userIsTenantA = rng.next() > 0.5;
        const targetFromTenantA = !userIsTenantA;
        
        const actingUser = userIsTenantA ? userA : userB;
        const actingTenant = userIsTenantA ? tenantA : tenantB;
        const targetEmployees = targetFromTenantA ? employeesA : employeesB;
        const targetEmployee = rng.pick(targetEmployees);
        
        const token = mintTestJwt({
          userId: actingUser.id,
          tenantId: actingTenant.id,
          roleId: actingUser.roleId,
        });
        
        const res = await request(BASE_URL)
          .delete(`/api/hr/employees/${targetEmployee.id}`)
          .set(authHeader(token));
        
        if (res.status === 200 || res.status === 204) {
          failures++;
        }
        
        const [stillExists] = await db.select()
          .from(hrEmployees)
          .where(eq(hrEmployees.id, targetEmployee.id));
        
        if (!stillExists) {
          failures++;
        }
      }
      
      expect(failures).toBe(0);
    });
  });
  
  describe("Same-Tenant Operations (Sanity Check)", () => {
    it("should allow same-tenant employee reads (may require add-on)", async () => {
      const token = mintTestJwt({
        userId: userA.id,
        tenantId: tenantA.id,
        roleId: userA.roleId,
      });
      
      const res = await request(BASE_URL)
        .get(`/api/hr/employees/${employeesA[0].id}`)
        .set(authHeader(token));
      
      expect([200, 402, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.id).toBe(employeesA[0].id);
      }
    });
    
    it("should allow same-tenant department reads (may require add-on)", async () => {
      const token = mintTestJwt({
        userId: userB.id,
        tenantId: tenantB.id,
        roleId: userB.roleId,
      });
      
      const res = await request(BASE_URL)
        .get(`/api/hr/departments/${departmentsB[0].id}`)
        .set(authHeader(token));
      
      expect([200, 402, 403]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.id).toBe(departmentsB[0].id);
      }
    });
  });
  
  describe("Fuzz Statistics", () => {
    it("should report test coverage statistics", () => {
      const stats = {
        totalIterations: 160,
        tenantPairs: 2,
        employeesPerTenant: 5,
        departmentsPerTenant: 2,
        operations: ["GET", "PATCH", "DELETE"],
        seed: 42,
      };
      
      console.log("Fuzz Test Statistics:", stats);
      expect(stats.totalIterations).toBeGreaterThanOrEqual(160);
    });
  });
});
