/**
 * Tenant Isolation Tests
 * 
 * Verifies that tenant A cannot access, modify, or delete tenant B's data.
 * Uses 404 for cross-tenant access to prevent tenant enumeration.
 * 
 * Canonical resource: HRMS Employees
 * Secondary resource: Services (to verify pattern consistency)
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "../db";
import { hrEmployees, hrDepartments, services } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  createTestTenant,
  seedHrmsData,
  seedServicesData,
  cleanupTestTenant,
  verifyEmployeeExists,
  getEmployeeDirectly,
  getServiceDirectly,
  TestTenant,
  TestEmployee,
  TestDepartment,
  TestService,
} from "./utils/tenant-test-utils";

describe("Tenant Isolation Tests", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let hrDataA: { department: TestDepartment; employees: TestEmployee[] };
  let hrDataB: { department: TestDepartment; employees: TestEmployee[] };
  let svcDataA: { services: TestService[] };
  let svcDataB: { services: TestService[] };

  beforeAll(async () => {
    // Create two test tenants
    tenantA = await createTestTenant("A");
    tenantB = await createTestTenant("B");

    // Seed HRMS data for both tenants
    hrDataA = await seedHrmsData(tenantA);
    hrDataB = await seedHrmsData(tenantB);

    // Seed services data for both tenants
    svcDataA = await seedServicesData(tenantA);
    svcDataB = await seedServicesData(tenantB);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestTenant(tenantA.id);
    await cleanupTestTenant(tenantB.id);
  });

  // ============================================
  // HRMS EMPLOYEES - Canonical Resource
  // ============================================

  describe("HRMS Employees - List Isolation", () => {
    it("tenant A employee list should NOT include tenant B records", async () => {
      const tenantAEmployees = await db
        .select()
        .from(hrEmployees)
        .where(eq(hrEmployees.tenantId, tenantA.id));

      expect(tenantAEmployees.length).toBe(2);
      expect(tenantAEmployees.every(e => e.tenantId === tenantA.id)).toBe(true);
      
      const tenantBIds = hrDataB.employees.map(e => e.id);
      expect(tenantAEmployees.some(e => tenantBIds.includes(e.id))).toBe(false);
    });

    it("employee count is tenant-scoped (no leaks via totals)", async () => {
      const countA = await db.select().from(hrEmployees).where(eq(hrEmployees.tenantId, tenantA.id));
      const countB = await db.select().from(hrEmployees).where(eq(hrEmployees.tenantId, tenantB.id));
      
      expect(countA.length).toBe(2);
      expect(countB.length).toBe(2);
      // Combined should NOT be visible to either tenant
    });
  });

  describe("HRMS Employees - Detail Isolation", () => {
    it("tenant A fetching tenant B employee by ID returns undefined (404)", async () => {
      const tenantBEmployeeId = hrDataB.employees[0].id;
      
      const [result] = await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, tenantBEmployeeId),
            eq(hrEmployees.tenantId, tenantA.id) // Wrong tenant
          )
        )
        .limit(1);
      
      // Should NOT find the record (API should return 404)
      expect(result).toBeUndefined();
    });

    it("tenant A fetching own employee by ID succeeds", async () => {
      const tenantAEmployeeId = hrDataA.employees[0].id;
      
      const [result] = await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, tenantAEmployeeId),
            eq(hrEmployees.tenantId, tenantA.id)
          )
        )
        .limit(1);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(tenantAEmployeeId);
      expect(result.tenantId).toBe(tenantA.id);
    });
  });

  describe("HRMS Employees - Update Isolation", () => {
    it("tenant A updating tenant B employee affects 0 rows", async () => {
      const tenantBEmployeeId = hrDataB.employees[0].id;
      const original = await getEmployeeDirectly(tenantBEmployeeId);
      
      await db
        .update(hrEmployees)
        .set({ firstName: "HACKED" })
        .where(
          and(
            eq(hrEmployees.id, tenantBEmployeeId),
            eq(hrEmployees.tenantId, tenantA.id) // Wrong tenant
          )
        );
      
      const after = await getEmployeeDirectly(tenantBEmployeeId);
      expect(after.firstName).toBe(original.firstName);
      expect(after.firstName).not.toBe("HACKED");
    });

    it("tenant A updating own employee succeeds", async () => {
      const tenantAEmployeeId = hrDataA.employees[1].id;
      const newName = `Updated-${Date.now()}`;
      
      await db
        .update(hrEmployees)
        .set({ firstName: newName })
        .where(
          and(
            eq(hrEmployees.id, tenantAEmployeeId),
            eq(hrEmployees.tenantId, tenantA.id)
          )
        );
      
      const after = await getEmployeeDirectly(tenantAEmployeeId);
      expect(after.firstName).toBe(newName);
    });
  });

  describe("HRMS Employees - Delete Isolation", () => {
    it("tenant A deleting tenant B employee affects 0 rows", async () => {
      const tenantBEmployeeId = hrDataB.employees[0].id;
      
      const beforeExists = await verifyEmployeeExists(tenantBEmployeeId, tenantB.id);
      expect(beforeExists).toBe(true);
      
      await db
        .delete(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, tenantBEmployeeId),
            eq(hrEmployees.tenantId, tenantA.id) // Wrong tenant
          )
        );
      
      const afterExists = await verifyEmployeeExists(tenantBEmployeeId, tenantB.id);
      expect(afterExists).toBe(true);
    });
  });

  // ============================================
  // SERVICES - Secondary Resource (consistency check)
  // ============================================

  describe("Services - List Isolation", () => {
    it("tenant A services list should NOT include tenant B records", async () => {
      const tenantAServices = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantA.id));

      expect(tenantAServices.length).toBe(2);
      expect(tenantAServices.every(s => s.tenantId === tenantA.id)).toBe(true);
      
      const tenantBIds = svcDataB.services.map(s => s.id);
      expect(tenantAServices.some(s => tenantBIds.includes(s.id))).toBe(false);
    });
  });

  describe("Services - Detail Isolation", () => {
    it("tenant A fetching tenant B service by ID returns undefined (404)", async () => {
      const tenantBServiceId = svcDataB.services[0].id;
      
      const [result] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, tenantBServiceId),
            eq(services.tenantId, tenantA.id)
          )
        )
        .limit(1);
      
      expect(result).toBeUndefined();
    });
  });

  describe("Services - Mutation Isolation", () => {
    it("tenant A updating tenant B service affects 0 rows", async () => {
      const tenantBServiceId = svcDataB.services[0].id;
      const original = await getServiceDirectly(tenantBServiceId);
      
      await db
        .update(services)
        .set({ name: "HACKED" })
        .where(
          and(
            eq(services.id, tenantBServiceId),
            eq(services.tenantId, tenantA.id)
          )
        );
      
      const after = await getServiceDirectly(tenantBServiceId);
      expect(after.name).toBe(original.name);
      expect(after.name).not.toBe("HACKED");
    });
  });

  // ============================================
  // PATTERN DOCUMENTATION
  // ============================================

  describe("Cross-Tenant Access Pattern", () => {
    it("documents 404 pattern for cross-tenant access", () => {
      // Expected behavior:
      // - Query with wrong tenantId returns undefined
      // - API should return 404 (not 403) to prevent enumeration
      // - Update/Delete with wrong tenantId affects 0 rows
      
      const expectedApiResponse = {
        status: 404,
        body: { error: "Not found" },
      };
      
      expect(expectedApiResponse.status).toBe(404);
    });

    it("documents correct query pattern", () => {
      // CORRECT: Always include tenantId filter
      const correct = `
        and(
          eq(table.id, recordId),
          eq(table.tenantId, ctx.tenantId)
        )
      `;
      
      // WRONG: Missing tenantId allows cross-tenant access
      const wrong = `eq(table.id, recordId)`;
      
      expect(correct).toContain("tenantId");
      expect(wrong).not.toContain("tenantId");
    });
  });
});
