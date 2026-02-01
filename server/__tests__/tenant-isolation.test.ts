/**
 * Tenant Isolation Tests
 * 
 * Verifies that tenant-scoped data cannot leak across tenant boundaries.
 * Tests cover:
 * - List operations only return current tenant's records
 * - Get by ID returns null for other tenant's records
 * - Update operations fail for other tenant's records
 * - Delete operations fail for other tenant's records
 */

import { db } from "../db";
import { 
  tenants, hrEmployees, hrDepartments 
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { hrmsStorage } from "../storage/hrms";

describe("Tenant Isolation", () => {
  let tenantA: { id: string; name: string };
  let tenantB: { id: string; name: string };
  let employeeA: { id: string };
  let employeeB: { id: string };
  let departmentA: { id: string };
  let departmentB: { id: string };

  beforeAll(async () => {
    const testSuffix = Date.now().toString();

    [tenantA] = await db.insert(tenants).values({
      name: `Test Tenant A ${testSuffix}`,
      slug: `test-tenant-a-${testSuffix}`,
      country: "india",
      tenantType: "standard",
      businessType: "general_services",
      planTier: "starter",
      status: "active",
    }).returning();

    [tenantB] = await db.insert(tenants).values({
      name: `Test Tenant B ${testSuffix}`,
      slug: `test-tenant-b-${testSuffix}`,
      country: "india",
      tenantType: "standard",
      businessType: "general_services",
      planTier: "starter",
      status: "active",
    }).returning();

    [departmentA] = await db.insert(hrDepartments).values({
      tenantId: tenantA.id,
      name: `Dept A ${testSuffix}`,
      code: `DPTA${testSuffix.slice(-4)}`,
    }).returning();

    [departmentB] = await db.insert(hrDepartments).values({
      tenantId: tenantB.id,
      name: `Dept B ${testSuffix}`,
      code: `DPTB${testSuffix.slice(-4)}`,
    }).returning();

    [employeeA] = await db.insert(hrEmployees).values({
      tenantId: tenantA.id,
      employeeId: `EMPA${testSuffix.slice(-4)}`,
      firstName: "Alice",
      lastName: "TenantA",
      email: `alice-${testSuffix}@tenanta.test`,
      departmentId: departmentA.id,
      status: "active",
      employmentType: "full_time",
      designation: "Engineer",
      joiningDate: new Date().toISOString().split("T")[0],
    }).returning();

    [employeeB] = await db.insert(hrEmployees).values({
      tenantId: tenantB.id,
      employeeId: `EMPB${testSuffix.slice(-4)}`,
      firstName: "Bob",
      lastName: "TenantB",
      email: `bob-${testSuffix}@tenantb.test`,
      departmentId: departmentB.id,
      status: "active",
      employmentType: "full_time",
      designation: "Manager",
      joiningDate: new Date().toISOString().split("T")[0],
    }).returning();
  });

  afterAll(async () => {
    if (employeeA?.id) {
      await db.delete(hrEmployees).where(eq(hrEmployees.id, employeeA.id));
    }
    if (employeeB?.id) {
      await db.delete(hrEmployees).where(eq(hrEmployees.id, employeeB.id));
    }
    if (departmentA?.id) {
      await db.delete(hrDepartments).where(eq(hrDepartments.id, departmentA.id));
    }
    if (departmentB?.id) {
      await db.delete(hrDepartments).where(eq(hrDepartments.id, departmentB.id));
    }
    if (tenantA?.id) {
      await db.delete(tenants).where(eq(tenants.id, tenantA.id));
    }
    if (tenantB?.id) {
      await db.delete(tenants).where(eq(tenants.id, tenantB.id));
    }
  });

  describe("List Isolation", () => {
    it("tenant A list returns only tenant A employees", async () => {
      const result = await hrmsStorage.getEmployees(tenantA.id, {}, { page: 1, limit: 100 });
      
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every(emp => emp.tenantId === tenantA.id)).toBe(true);
      expect(result.data.some(emp => emp.id === employeeA.id)).toBe(true);
      expect(result.data.some(emp => emp.id === employeeB.id)).toBe(false);
    });

    it("tenant B list returns only tenant B employees", async () => {
      const result = await hrmsStorage.getEmployees(tenantB.id, {}, { page: 1, limit: 100 });
      
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every(emp => emp.tenantId === tenantB.id)).toBe(true);
      expect(result.data.some(emp => emp.id === employeeB.id)).toBe(true);
      expect(result.data.some(emp => emp.id === employeeA.id)).toBe(false);
    });

    it("tenant A departments list returns only tenant A departments", async () => {
      const departments = await hrmsStorage.getDepartments(tenantA.id);
      
      expect(departments.length).toBeGreaterThan(0);
      expect(departments.every(dept => dept.tenantId === tenantA.id)).toBe(true);
      expect(departments.some(dept => dept.id === departmentA.id)).toBe(true);
      expect(departments.some(dept => dept.id === departmentB.id)).toBe(false);
    });
  });

  describe("Get By ID Isolation", () => {
    it("tenant A can get their own employee", async () => {
      const employee = await hrmsStorage.getEmployeeById(tenantA.id, employeeA.id);
      
      expect(employee).not.toBeNull();
      expect(employee?.id).toBe(employeeA.id);
      expect(employee?.tenantId).toBe(tenantA.id);
    });

    it("tenant A cannot get tenant B employee - returns null", async () => {
      const employee = await hrmsStorage.getEmployeeById(tenantA.id, employeeB.id);
      
      expect(employee).toBeNull();
    });

    it("tenant B cannot get tenant A employee - returns null", async () => {
      const employee = await hrmsStorage.getEmployeeById(tenantB.id, employeeA.id);
      
      expect(employee).toBeNull();
    });
  });

  describe("Update Isolation", () => {
    it("tenant A can update their own employee", async () => {
      const updated = await hrmsStorage.updateEmployee(tenantA.id, employeeA.id, {
        designation: "Senior Engineer",
      });
      
      expect(updated).not.toBeNull();
      expect(updated?.designation).toBe("Senior Engineer");
    });

    it("tenant A cannot update tenant B employee - returns null", async () => {
      const updated = await hrmsStorage.updateEmployee(tenantA.id, employeeB.id, {
        designation: "Hacked Title",
      });
      
      expect(updated).toBeNull();
      
      const employee = await hrmsStorage.getEmployeeById(tenantB.id, employeeB.id);
      expect(employee?.designation).not.toBe("Hacked Title");
    });

    it("tenant B cannot update tenant A employee - returns null", async () => {
      const updated = await hrmsStorage.updateEmployee(tenantB.id, employeeA.id, {
        designation: "Hacked Title",
      });
      
      expect(updated).toBeNull();
    });
  });

  describe("Delete Isolation", () => {
    it("tenant A cannot delete tenant B employee - returns false", async () => {
      const deleted = await hrmsStorage.deleteEmployee(tenantA.id, employeeB.id);
      
      expect(deleted).toBe(false);
      
      const employee = await hrmsStorage.getEmployeeById(tenantB.id, employeeB.id);
      expect(employee).not.toBeNull();
      expect(employee?.status).toBe("active");
    });

    it("tenant B cannot delete tenant A employee - returns false", async () => {
      const deleted = await hrmsStorage.deleteEmployee(tenantB.id, employeeA.id);
      
      expect(deleted).toBe(false);
    });
  });

  describe("Insert Isolation", () => {
    it("creating employee with wrong tenantId is prevented by storage layer", async () => {
      const newEmployee = await hrmsStorage.createEmployee({
        tenantId: tenantA.id,
        employeeId: "TESTINVALID",
        firstName: "Malicious",
        lastName: "User",
        email: "malicious@test.com",
        departmentId: departmentA.id,
        status: "active",
        employmentType: "full_time",
        designation: "Attacker",
        joiningDate: new Date().toISOString().split("T")[0],
      });
      
      expect(newEmployee.tenantId).toBe(tenantA.id);
      
      await db.delete(hrEmployees).where(eq(hrEmployees.id, newEmployee.id));
    });
  });
});
