/**
 * Tenant Isolation Test Utilities
 * 
 * Helpers for creating test tenants, users, and seeding data
 * to verify cross-tenant data isolation.
 */

import { db } from "../../db";
import { tenants, users, services } from "../../../shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface TestTenant {
  id: string;
  name: string;
  subdomain: string;
  countryCode: string;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface TestService {
  id: string;
  tenantId: string;
  name: string;
  price: string;
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
  
  return { id: created.id, name, subdomain: slug, countryCode: "IN" };
}

/**
 * Create a test service for a tenant
 */
export async function createTestService(
  tenant: TestTenant, 
  suffix: string = "1"
): Promise<TestService> {
  const id = randomUUID();
  const name = `Service${suffix}-${tenant.subdomain}`;
  const price = "100.00";
  
  await db.insert(services).values({
    id,
    tenantId: tenant.id,
    name,
    description: `Test service ${suffix}`,
    duration: 60,
    price,
    category: "general",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return { id, tenantId: tenant.id, name, price };
}

/**
 * Seed complete tenant data for isolation tests
 */
export async function seedTenantData(tenant: TestTenant): Promise<{
  services: TestService[];
}> {
  const svc1 = await createTestService(tenant, "1");
  const svc2 = await createTestService(tenant, "2");
  
  return {
    services: [svc1, svc2],
  };
}

/**
 * Clean up test tenant and all related data
 */
export async function cleanupTestTenant(tenantId: string): Promise<void> {
  // Delete in reverse order of dependencies
  await db.delete(services).where(eq(services.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}

/**
 * Verify a service exists in the database
 */
export async function verifyServiceExists(serviceId: string, tenantId: string): Promise<boolean> {
  const [record] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
    .limit(1);
  
  return !!record;
}

/**
 * Get service by ID (ignoring tenant for verification purposes)
 */
export async function getServiceDirectly(serviceId: string): Promise<any | null> {
  const [record] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  
  return record || null;
}

/**
 * Create mock request context for a tenant
 */
export function createMockContext(tenant: TestTenant, user?: TestUser) {
  return {
    tenant: { id: tenant.id, subdomain: tenant.subdomain },
    user: user ? { id: user.id, email: user.email, role: user.role } : undefined,
    tenantId: tenant.id,
  };
}
