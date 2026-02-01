/**
 * Tenant Isolation Test Utilities
 * 
 * Helpers for creating test tenants, seeding HRMS data,
 * and verifying cross-tenant data isolation.
 */

import { db } from "../../db";
import { tenants, hrEmployees, hrDepartments, services } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
}

export interface TestDepartment {
  id: string;
  tenantId: string;
  name: string;
}

export interface TestEmployee {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
}

export interface TestService {
  id: string;
  tenantId: string;
  name: string;
}

/**
 * Create a test tenant with unique identifiers
 */
export async function createTestTenant(suffix: string): Promise<TestTenant> {
  const name = `Test Tenant ${suffix}`;
  const slug = `test-${suffix.toLowerCase()}-${Date.now()}`;
  
  const [created] = await db.insert(tenants).values({
    name,
    slug,
    country: "india",
    status: "active",
    subscriptionTier: "basic",
  }).returning({ id: tenants.id });
  
  return { id: created.id, name, slug };
}

/**
 * Create a test department for a tenant
 */
export async function createTestDepartment(
  tenant: TestTenant, 
  name: string = "Engineering"
): Promise<TestDepartment> {
  const id = randomUUID();
  
  await db.insert(hrDepartments).values({
    id,
    tenantId: tenant.id,
    name,
    isActive: true,
  });
  
  return { id, tenantId: tenant.id, name };
}

/**
 * Create a test employee for a tenant
 */
export async function createTestEmployee(
  tenant: TestTenant, 
  department: TestDepartment,
  suffix: string = "1"
): Promise<TestEmployee> {
  const firstName = `Employee${suffix}`;
  const lastName = `Test`;
  const email = `emp${suffix}-${Date.now()}@test.local`;
  
  const [created] = await db.insert(hrEmployees).values({
    tenantId: tenant.id,
    departmentId: department.id,
    firstName,
    lastName,
    email,
    status: "active",
    employeeId: `EMP-${suffix}-${Date.now()}`,
    employmentType: "full_time",
    joinDate: new Date().toISOString().split("T")[0],
  }).returning();
  
  return { id: created.id, tenantId: tenant.id, firstName, lastName, email, departmentId: department.id };
}

/**
 * Create a test service for a tenant
 */
export async function createTestService(
  tenant: TestTenant, 
  suffix: string = "1"
): Promise<TestService> {
  const id = randomUUID();
  const name = `Service${suffix}-${tenant.slug}`;
  
  await db.insert(services).values({
    id,
    tenantId: tenant.id,
    name,
    description: `Test service ${suffix}`,
    duration: 60,
    price: "100.00",
    category: "general",
    isActive: true,
  });
  
  return { id, tenantId: tenant.id, name };
}

/**
 * Seed HRMS data for isolation tests (employees + departments)
 */
export async function seedHrmsData(tenant: TestTenant): Promise<{
  department: TestDepartment;
  employees: TestEmployee[];
}> {
  const department = await createTestDepartment(tenant, `Dept-${tenant.slug}`);
  
  const emp1 = await createTestEmployee(tenant, department, "1");
  const emp2 = await createTestEmployee(tenant, department, "2");
  
  return {
    department,
    employees: [emp1, emp2],
  };
}

/**
 * Seed services data for isolation tests
 */
export async function seedServicesData(tenant: TestTenant): Promise<{
  services: TestService[];
}> {
  const svc1 = await createTestService(tenant, "1");
  const svc2 = await createTestService(tenant, "2");
  
  return { services: [svc1, svc2] };
}

/**
 * Clean up test tenant and all related data
 */
export async function cleanupTestTenant(tenantId: string): Promise<void> {
  // Delete in reverse order of dependencies
  await db.delete(hrEmployees).where(eq(hrEmployees.tenantId, tenantId));
  await db.delete(hrDepartments).where(eq(hrDepartments.tenantId, tenantId));
  await db.delete(services).where(eq(services.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}

/**
 * Verify an employee exists in the database for a specific tenant
 */
export async function verifyEmployeeExists(employeeId: string, tenantId: string): Promise<boolean> {
  const [record] = await db
    .select()
    .from(hrEmployees)
    .where(and(eq(hrEmployees.id, employeeId), eq(hrEmployees.tenantId, tenantId)))
    .limit(1);
  
  return !!record;
}

/**
 * Get employee by ID (ignoring tenant - for verification only)
 */
export async function getEmployeeDirectly(employeeId: string): Promise<any | null> {
  const [record] = await db
    .select()
    .from(hrEmployees)
    .where(eq(hrEmployees.id, employeeId))
    .limit(1);
  
  return record || null;
}

/**
 * Get service by ID (ignoring tenant - for verification only)
 */
export async function getServiceDirectly(serviceId: string): Promise<any | null> {
  const [record] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  
  return record || null;
}
