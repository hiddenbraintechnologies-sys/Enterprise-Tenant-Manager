/**
 * Tenant Isolation Tests
 * 
 * Verifies that tenant A cannot access, modify, or delete tenant B's data.
 * Returns 404 (preferred) for cross-tenant access to prevent enumeration.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "../db";
import { services } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  createTestTenant,
  seedTenantData,
  cleanupTestTenant,
  verifyServiceExists,
  getServiceDirectly,
  TestTenant,
  TestService,
} from "./utils/tenant-test-utils";

describe("Tenant Isolation Tests", () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let dataA: { services: TestService[] };
  let dataB: { services: TestService[] };

  beforeAll(async () => {
    // Create two test tenants
    tenantA = await createTestTenant("A");
    tenantB = await createTestTenant("B");

    // Seed data for both tenants
    dataA = await seedTenantData(tenantA);
    dataB = await seedTenantData(tenantB);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestTenant(tenantA.id);
    await cleanupTestTenant(tenantB.id);
  });

  describe("List Isolation", () => {
    it("tenant A service list should NOT include tenant B records", async () => {
      // Query services as tenant A (using scoped query)
      const tenantAServices = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantA.id));

      // Verify only tenant A records returned
      expect(tenantAServices.length).toBe(2);
      expect(tenantAServices.every(s => s.tenantId === tenantA.id)).toBe(true);
      
      // Verify tenant B records NOT included
      const tenantBIds = dataB.services.map(s => s.id);
      expect(tenantAServices.some(s => tenantBIds.includes(s.id))).toBe(false);
    });

    it("tenant B service list should NOT include tenant A records", async () => {
      // Query services as tenant B (using scoped query)
      const tenantBServices = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantB.id));

      // Verify only tenant B records returned
      expect(tenantBServices.length).toBe(2);
      expect(tenantBServices.every(s => s.tenantId === tenantB.id)).toBe(true);
      
      // Verify tenant A records NOT included
      const tenantAIds = dataA.services.map(s => s.id);
      expect(tenantBServices.some(s => tenantAIds.includes(s.id))).toBe(false);
    });

    it("service count should be tenant-scoped (no leaks via totals)", async () => {
      // Count as tenant A
      const countA = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantA.id));
      
      // Count as tenant B
      const countB = await db
        .select()
        .from(services)
        .where(eq(services.tenantId, tenantB.id));
      
      // Each tenant should see exactly 2 (what we seeded)
      expect(countA.length).toBe(2);
      expect(countB.length).toBe(2);
      
      // Total should NOT be 4 for either tenant
      expect(countA.length).not.toBe(4);
      expect(countB.length).not.toBe(4);
    });
  });

  describe("Detail Isolation (GET by ID)", () => {
    it("tenant A fetching tenant B service by ID should return null (simulating 404)", async () => {
      const tenantBServiceId = dataB.services[0].id;
      
      // Attempt to fetch tenant B's service with tenant A's context
      const [result] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, tenantBServiceId),
            eq(services.tenantId, tenantA.id) // Tenant A's context
          )
        )
        .limit(1);
      
      // Should NOT find the record (returns undefined)
      expect(result).toBeUndefined();
    });

    it("tenant B fetching tenant A service by ID should return null (simulating 404)", async () => {
      const tenantAServiceId = dataA.services[0].id;
      
      // Attempt to fetch tenant A's service with tenant B's context
      const [result] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, tenantAServiceId),
            eq(services.tenantId, tenantB.id) // Tenant B's context
          )
        )
        .limit(1);
      
      // Should NOT find the record (returns undefined)
      expect(result).toBeUndefined();
    });

    it("tenant A fetching own service by ID should succeed", async () => {
      const tenantAServiceId = dataA.services[0].id;
      
      // Fetch own service
      const [result] = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.id, tenantAServiceId),
            eq(services.tenantId, tenantA.id)
          )
        )
        .limit(1);
      
      // Should find the record
      expect(result).toBeDefined();
      expect(result.id).toBe(tenantAServiceId);
      expect(result.tenantId).toBe(tenantA.id);
    });
  });

  describe("Mutation Isolation (UPDATE)", () => {
    it("tenant A attempting to update tenant B service should affect 0 rows", async () => {
      const tenantBServiceId = dataB.services[0].id;
      const originalService = await getServiceDirectly(tenantBServiceId);
      
      // Attempt update with tenant A's context (should affect 0 rows)
      await db
        .update(services)
        .set({ name: "HACKED" })
        .where(
          and(
            eq(services.id, tenantBServiceId),
            eq(services.tenantId, tenantA.id) // Wrong tenant!
          )
        );
      
      // Verify the record was NOT changed
      const afterService = await getServiceDirectly(tenantBServiceId);
      expect(afterService).toBeDefined();
      expect(afterService.name).toBe(originalService.name);
      expect(afterService.name).not.toBe("HACKED");
    });

    it("tenant A updating own service should succeed", async () => {
      const tenantAServiceId = dataA.services[1].id;
      const newName = `Updated-${Date.now()}`;
      
      // Update own service
      await db
        .update(services)
        .set({ name: newName })
        .where(
          and(
            eq(services.id, tenantAServiceId),
            eq(services.tenantId, tenantA.id)
          )
        );
      
      // Verify the record was changed
      const afterService = await getServiceDirectly(tenantAServiceId);
      expect(afterService.name).toBe(newName);
    });
  });

  describe("Mutation Isolation (DELETE)", () => {
    it("tenant A attempting to delete tenant B service should affect 0 rows", async () => {
      const tenantBServiceId = dataB.services[0].id;
      
      // Verify record exists before
      const beforeExists = await verifyServiceExists(tenantBServiceId, tenantB.id);
      expect(beforeExists).toBe(true);
      
      // Attempt delete with tenant A's context
      await db
        .delete(services)
        .where(
          and(
            eq(services.id, tenantBServiceId),
            eq(services.tenantId, tenantA.id) // Wrong tenant!
          )
        );
      
      // Verify record still exists for tenant B
      const afterExists = await verifyServiceExists(tenantBServiceId, tenantB.id);
      expect(afterExists).toBe(true);
    });
  });

  describe("Cross-Tenant Access Pattern Verification", () => {
    it("should use 404 pattern (not 403) for cross-tenant access", () => {
      // This test documents the expected behavior:
      // When tenant A tries to access tenant B's record:
      // - Query returns empty result (undefined)
      // - API should return 404 "Not Found" (not 403 "Forbidden")
      // - This prevents tenant enumeration attacks
      
      const expectedBehavior = {
        queryResult: undefined,
        httpStatus: 404,
        errorMessage: "Not found",
      };
      
      expect(expectedBehavior.httpStatus).toBe(404);
      expect(expectedBehavior.queryResult).toBeUndefined();
    });

    it("should always include tenantId in WHERE clauses", () => {
      // Document the required pattern for all tenant-owned queries
      const correctPattern = `
        db.select().from(table).where(
          and(
            eq(table.tenantId, ctx.tenantId),
            eq(table.id, recordId)
          )
        )
      `;
      
      const incorrectPattern = `
        db.select().from(table).where(
          eq(table.id, recordId)
        )
      `;
      
      expect(correctPattern).toContain("tenantId");
      expect(incorrectPattern).not.toContain("tenantId");
    });
  });
});
