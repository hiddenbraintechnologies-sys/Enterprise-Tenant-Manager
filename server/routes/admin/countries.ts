import { Router } from "express";
import { db } from "../../db";
import { 
  platformRegionConfigs, 
  countryRolloutPolicy,
  auditLogs
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { countryRolloutService } from "../../services/country-rollout";
import { requirePlatformAdmin, authenticateJWT } from "../../core/auth-middleware";
import { z } from "zod";

const router = Router();

// List all countries with their rollout status
router.get("/", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const countries = await db.select().from(platformRegionConfigs);
    
    // Fetch rollout policies for all countries
    const policies = await db.select().from(countryRolloutPolicy);
    const policyMap = new Map(policies.map(p => [p.countryCode, p]));

    const result = countries.map(country => ({
      ...country,
      rolloutPolicy: policyMap.get(country.countryCode) || null,
    }));

    res.json(result);
  } catch (error) {
    console.error("[admin/countries] Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

// Get a single country config
router.get("/:countryCode", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const config = await countryRolloutService.getCountryConfig(countryCode);
    
    if (!config) {
      return res.status(404).json({ error: "Country not found" });
    }

    const [regionConfig] = await db
      .select()
      .from(platformRegionConfigs)
      .where(eq(platformRegionConfigs.countryCode, countryCode.toUpperCase()))
      .limit(1);

    const [policy] = await db
      .select()
      .from(countryRolloutPolicy)
      .where(eq(countryRolloutPolicy.countryCode, countryCode.toUpperCase()))
      .limit(1);

    res.json({
      regionConfig,
      rolloutPolicy: policy || null,
      effectiveConfig: config,
    });
  } catch (error) {
    console.error("[admin/countries] Error fetching country:", error);
    res.status(500).json({ error: "Failed to fetch country" });
  }
});

// Update country region config (status, signup, billing)
const updateRegionSchema = z.object({
  status: z.enum(["enabled", "disabled", "maintenance", "coming_soon"]).optional(),
  registrationEnabled: z.boolean().optional(),
  billingEnabled: z.boolean().optional(),
  allowedBusinessTypes: z.array(z.string()).optional(),
  allowedSubscriptionTiers: z.array(z.string()).optional(),
});

router.patch("/:countryCode", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const normalizedCode = countryCode.toUpperCase();
    
    const parsed = updateRegionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    // Get current state for audit
    const [before] = await db
      .select()
      .from(platformRegionConfigs)
      .where(eq(platformRegionConfigs.countryCode, normalizedCode))
      .limit(1);

    if (!before) {
      return res.status(404).json({ error: "Country not found" });
    }

    const adminId = req.platformAdminContext?.platformAdmin?.id;
    
    const [updated] = await db
      .update(platformRegionConfigs)
      .set({
        ...parsed.data,
        updatedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(platformRegionConfigs.countryCode, normalizedCode))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "update",
      resource: "platform_region_config",
      resourceId: normalizedCode,
      userId: adminId,
      metadata: {
        before,
        after: updated,
      },
      ipAddress: req.ip,
    });

    // Clear cache
    countryRolloutService.clearCache();

    res.json(updated);
  } catch (error) {
    console.error("[admin/countries] Error updating country:", error);
    res.status(500).json({ error: "Failed to update country" });
  }
});

// Update country rollout policy (business types, features, addons, plans)
const updateRolloutSchema = z.object({
  status: z.enum(["coming_soon", "beta", "live"]).optional(),
  enabledBusinessTypes: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  disabledFeatures: z.array(z.string()).optional(),
  enabledAddons: z.array(z.string()).optional(),
  enabledPlans: z.array(z.string()).optional(),
  payrollStatus: z.enum(["disabled", "beta", "live"]).optional(),
  payrollCohortTenantIds: z.array(z.string()).optional(),
  payrollDisclaimerText: z.string().nullable().optional(),
  notes: z.string().optional(),
});

router.patch("/:countryCode/rollout", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
  try {
    const { countryCode } = req.params;
    const normalizedCode = countryCode.toUpperCase();
    
    const parsed = updateRolloutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    }

    // Get current state for audit
    const before = await countryRolloutService.getCountryPolicy(normalizedCode);

    const adminId = req.platformAdminContext?.platformAdmin?.id || "system";
    
    const updated = await countryRolloutService.updateRolloutPolicy(
      normalizedCode,
      parsed.data,
      adminId
    );

    // Determine the audit action based on what was updated
    const isPayrollUpdate = parsed.data.payrollStatus !== undefined || 
                            parsed.data.payrollCohortTenantIds !== undefined ||
                            parsed.data.payrollDisclaimerText !== undefined;
    
    const auditAction = isPayrollUpdate ? "COUNTRY_PAYROLL_ROLLOUT_UPDATED" : "COUNTRY_ROLLOUT_UPDATED";
    
    // Audit log for country rollout update
    await db.insert(auditLogs).values({
      action: "update",
      resource: "country_rollout_policy",
      resourceId: normalizedCode,
      userId: adminId,
      metadata: {
        action: auditAction,
        before,
        after: updated,
        payrollChanges: isPayrollUpdate ? {
          previousStatus: before?.payrollStatus,
          newStatus: updated.payrollStatus,
          cohortChanged: JSON.stringify(before?.payrollCohortTenantIds) !== JSON.stringify(updated.payrollCohortTenantIds),
        } : undefined,
      },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error) {
    console.error("[admin/countries] Error updating rollout policy:", error);
    res.status(500).json({ error: "Failed to update rollout policy" });
  }
});

// Get available business types for reference
router.get("/meta/business-types", authenticateJWT(), requirePlatformAdmin(), async (_req, res) => {
  const businessTypes = [
    { value: "clinic", label: "Clinic / Healthcare" },
    { value: "salon", label: "Salon / Spa" },
    { value: "pg", label: "PG / Hostel" },
    { value: "coworking", label: "Coworking" },
    { value: "service", label: "General Services" },
    { value: "real_estate", label: "Real Estate" },
    { value: "tourism", label: "Tourism" },
    { value: "education", label: "Education" },
    { value: "logistics", label: "Logistics" },
    { value: "legal", label: "Legal Services" },
    { value: "furniture_manufacturing", label: "Furniture Manufacturing" },
    { value: "software_services", label: "Software Services" },
    { value: "consulting", label: "Consulting" },
  ];
  res.json(businessTypes);
});

export default router;
