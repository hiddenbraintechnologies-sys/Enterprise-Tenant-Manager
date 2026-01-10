import { db } from "../db";
import { roles, globalPricingPlans, countryPricingConfigs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface TestBootstrapResult {
  dbConnected: boolean;
  rolesSeeded: boolean;
  plansSeeded: boolean;
  errors: string[];
}

export async function checkDatabaseHealth(timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    await db.execute(sql`SELECT 1`);
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error("[test-bootstrap] Database health check failed:", error);
    return false;
  }
}

export async function seedRoles(): Promise<{ success: boolean; error?: string }> {
  try {
    const requiredRoles = [
      { id: "role_admin", name: "Admin", description: "Full administrative access", isSystem: true },
      { id: "role_manager", name: "Manager", description: "Manager access", isSystem: true },
      { id: "role_staff", name: "Staff", description: "Staff access", isSystem: true },
      { id: "role_customer", name: "Customer", description: "Customer access", isSystem: true },
    ];

    for (const role of requiredRoles) {
      const [existing] = await db.select().from(roles).where(eq(roles.id, role.id));
      if (!existing) {
        await db.insert(roles).values(role).onConflictDoNothing();
      }
    }

    console.log("[test-bootstrap] Roles seeded successfully");
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-bootstrap] Failed to seed roles:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function seedPricingPlans(): Promise<{ success: boolean; error?: string }> {
  try {
    const requiredPlans: Array<typeof globalPricingPlans.$inferInsert> = [
      {
        id: "plan_free",
        code: "FREE",
        name: "Free",
        tier: "free",
        basePrice: "0",
        billingCycle: "monthly",
        maxUsers: 2,
        maxCustomers: 50,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: "plan_starter",
        code: "STARTER",
        name: "Starter",
        tier: "starter",
        basePrice: "29",
        billingCycle: "monthly",
        maxUsers: 5,
        maxCustomers: 500,
        isActive: true,
        sortOrder: 2,
      },
      {
        id: "plan_pro",
        code: "PRO",
        name: "Professional",
        tier: "pro",
        basePrice: "99",
        billingCycle: "monthly",
        maxUsers: 25,
        maxCustomers: 5000,
        isActive: true,
        sortOrder: 3,
      },
      {
        id: "plan_enterprise",
        code: "ENTERPRISE",
        name: "Enterprise",
        tier: "enterprise",
        basePrice: "299",
        billingCycle: "monthly",
        maxUsers: -1,
        maxCustomers: -1,
        isActive: true,
        sortOrder: 4,
      },
    ];

    for (const plan of requiredPlans) {
      const [existing] = await db.select().from(globalPricingPlans).where(eq(globalPricingPlans.id, plan.id!));
      if (!existing) {
        await db.insert(globalPricingPlans).values(plan).onConflictDoNothing();
      }
    }

    const requiredCountryConfigs: Array<typeof countryPricingConfigs.$inferInsert> = [
      { country: "india", currency: "INR", taxName: "GST", taxRate: "18.00", primaryGateway: "razorpay" },
      { country: "uae", currency: "AED", taxName: "VAT", taxRate: "5.00", primaryGateway: "stripe" },
      { country: "uk", currency: "GBP", taxName: "VAT", taxRate: "20.00", primaryGateway: "stripe" },
      { country: "malaysia", currency: "MYR", taxName: "SST", taxRate: "6.00", primaryGateway: "stripe" },
      { country: "singapore", currency: "SGD", taxName: "GST", taxRate: "8.00", primaryGateway: "stripe" },
      { country: "other", currency: "USD", taxName: "Tax", taxRate: "0.00", primaryGateway: "stripe" },
    ];

    for (const config of requiredCountryConfigs) {
      const [existing] = await db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.country, config.country));
      if (!existing) {
        await db.insert(countryPricingConfigs).values(config).onConflictDoNothing();
      }
    }

    console.log("[test-bootstrap] Pricing plans and country configs seeded successfully");
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-bootstrap] Failed to seed pricing plans:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function runTestBootstrap(): Promise<TestBootstrapResult> {
  const result: TestBootstrapResult = {
    dbConnected: false,
    rolesSeeded: false,
    plansSeeded: false,
    errors: [],
  };

  console.log("[test-bootstrap] Starting test environment bootstrap...");

  result.dbConnected = await checkDatabaseHealth();
  if (!result.dbConnected) {
    result.errors.push("Database connection failed - integration tests will be skipped");
    return result;
  }

  const rolesResult = await seedRoles();
  result.rolesSeeded = rolesResult.success;
  if (!rolesResult.success && rolesResult.error) {
    result.errors.push(`Roles seeding failed: ${rolesResult.error}`);
  }

  const plansResult = await seedPricingPlans();
  result.plansSeeded = plansResult.success;
  if (!plansResult.success && plansResult.error) {
    result.errors.push(`Plans seeding failed: ${plansResult.error}`);
  }

  if (result.errors.length === 0) {
    console.log("[test-bootstrap] Test environment ready!");
  } else {
    console.warn("[test-bootstrap] Completed with errors:", result.errors);
  }

  return result;
}

export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
}
