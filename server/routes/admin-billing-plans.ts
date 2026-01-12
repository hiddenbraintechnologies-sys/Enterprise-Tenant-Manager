import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { globalPricingPlans, planLocalPrices, insertGlobalPricingPlanSchema } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { authenticateJWT, requirePlatformAdmin } from "../core/auth-middleware";
import { requirePermission, getScopeContext } from "../rbac/guards";
import { Permissions } from "@shared/rbac/permissions";
import { auditService } from "../core";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });

const COUNTRY_PLAN_PREFIXES: Record<string, string> = {
  "IN": "india_",
  "GB": "uk_",
  "AE": "ae_",
  "SG": "sg_",
  "MY": "my_",
  "US": "us_",
};

function getCountryFromPlanCode(planCode: string): string | null {
  for (const [countryCode, prefix] of Object.entries(COUNTRY_PLAN_PREFIXES)) {
    if (planCode.startsWith(prefix)) {
      return countryCode;
    }
  }
  return null;
}

function canAdminManagePlan(req: Request, planCode: string): boolean {
  const scopeContext = getScopeContext(req);
  
  if (!scopeContext) {
    return false;
  }
  
  if (scopeContext.isSuperAdmin || scopeContext.scopeType === "GLOBAL") {
    return true;
  }
  
  const planCountry = getCountryFromPlanCode(planCode);
  if (!planCountry) {
    return false;
  }
  
  return scopeContext.allowedCountryIds?.includes(planCountry) || false;
}

function getAdminInfo(req: Request): { adminId: string; adminEmail: string } {
  const admin = req.platformAdminContext?.platformAdmin;
  return {
    adminId: admin?.id || "unknown",
    adminEmail: admin?.email || "unknown",
  };
}

const createPlanSchema = insertGlobalPricingPlanSchema.extend({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  tier: z.enum(["free", "starter", "pro", "enterprise"]),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  localPrices: z.array(z.object({
    country: z.string(),
    localPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  })).optional(),
});

const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  tier: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
  basePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxUsers: z.number().int().positive().optional(),
  maxCustomers: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  localPrices: z.array(z.object({
    country: z.string(),
    localPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  })).optional(),
});

router.get(
  "/plans",
  requiredAuth,
  requirePlatformAdmin(),
  async (req: Request, res: Response) => {
    try {
      const scopeContext = getScopeContext(req);
      
      const allPlans = await db.select().from(globalPricingPlans).orderBy(globalPricingPlans.sortOrder);
      
      let filteredPlans = allPlans;
      if (scopeContext && !scopeContext.isSuperAdmin && scopeContext.scopeType !== "GLOBAL") {
        const allowedCountries = scopeContext.allowedCountryIds || [];
        const allowedPrefixes = allowedCountries
          .map(c => COUNTRY_PLAN_PREFIXES[c])
          .filter(Boolean);
        
        filteredPlans = allPlans.filter(plan => 
          allowedPrefixes.some(prefix => plan.code.startsWith(prefix))
        );
      }
      
      const planIds = filteredPlans.map(p => p.id);
      let localPricesMap: Record<string, any[]> = {};
      
      if (planIds.length > 0) {
        const localPricesData = await db.select()
          .from(planLocalPrices)
          .where(inArray(planLocalPrices.planId, planIds));
        
        for (const lp of localPricesData) {
          if (!localPricesMap[lp.planId]) {
            localPricesMap[lp.planId] = [];
          }
          localPricesMap[lp.planId].push(lp);
        }
      }
      
      const plansWithLocalPrices = filteredPlans.map(plan => ({
        ...plan,
        localPrices: localPricesMap[plan.id] || [],
      }));
      
      res.json({ plans: plansWithLocalPrices });
    } catch (error) {
      console.error("[admin-billing-plans] Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  }
);

router.post(
  "/plans",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const data = createPlanSchema.parse(req.body);
      const { localPrices, ...planData } = data;
      
      if (!canAdminManagePlan(req, data.code)) {
        return res.status(403).json({
          code: "COUNTRY_SCOPE_VIOLATION",
          message: "You do not have permission to create plans for this country",
        });
      }
      
      const existingPlan = await db.select()
        .from(globalPricingPlans)
        .where(eq(globalPricingPlans.code, data.code))
        .limit(1);
      
      if (existingPlan.length > 0) {
        return res.status(400).json({
          code: "PLAN_CODE_EXISTS",
          message: "A plan with this code already exists",
        });
      }
      
      const [newPlan] = await db.insert(globalPricingPlans)
        .values({
          ...planData,
          isActive: true,
        })
        .returning();
      
      if (localPrices && localPrices.length > 0) {
        await db.insert(planLocalPrices)
          .values(localPrices.map(lp => ({
            planId: newPlan.id,
            country: lp.country as any,
            localPrice: lp.localPrice,
          })));
      }
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "create",
        resource: "pricing_plan",
        resourceId: newPlan.id,
        newValue: { ...newPlan, localPrices },
        metadata: {
          adminEmail,
          planCode: newPlan.code,
          planName: newPlan.name,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-plans] Plan created: ${newPlan.code} by ${adminEmail}`);
      
      res.status(201).json({ plan: newPlan });
    } catch (error) {
      console.error("[admin-billing-plans] Error creating plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create plan" });
    }
  }
);

router.patch(
  "/plans/:id",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updatePlanSchema.parse(req.body);
      const { localPrices, ...updateData } = data;
      
      const [existingPlan] = await db.select()
        .from(globalPricingPlans)
        .where(eq(globalPricingPlans.id, id))
        .limit(1);
      
      if (!existingPlan) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Plan not found",
        });
      }
      
      if (!canAdminManagePlan(req, existingPlan.code)) {
        return res.status(403).json({
          code: "COUNTRY_SCOPE_VIOLATION",
          message: "You do not have permission to update plans for this country",
        });
      }
      
      const [updatedPlan] = await db.update(globalPricingPlans)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.id, id))
        .returning();
      
      if (localPrices) {
        await db.delete(planLocalPrices)
          .where(eq(planLocalPrices.planId, id));
        
        if (localPrices.length > 0) {
          await db.insert(planLocalPrices)
            .values(localPrices.map(lp => ({
              planId: id,
              country: lp.country as any,
              localPrice: lp.localPrice,
            })));
        }
      }
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "update",
        resource: "pricing_plan",
        resourceId: id,
        oldValue: existingPlan,
        newValue: { ...updatedPlan, localPrices },
        metadata: {
          adminEmail,
          planCode: updatedPlan.code,
          planName: updatedPlan.name,
          changedFields: Object.keys(updateData),
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-plans] Plan updated: ${updatedPlan.code} by ${adminEmail}`);
      
      res.json({ plan: updatedPlan });
    } catch (error) {
      console.error("[admin-billing-plans] Error updating plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update plan" });
    }
  }
);

router.post(
  "/plans/:id/activate",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [existingPlan] = await db.select()
        .from(globalPricingPlans)
        .where(eq(globalPricingPlans.id, id))
        .limit(1);
      
      if (!existingPlan) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Plan not found",
        });
      }
      
      if (!canAdminManagePlan(req, existingPlan.code)) {
        return res.status(403).json({
          code: "COUNTRY_SCOPE_VIOLATION",
          message: "You do not have permission to activate plans for this country",
        });
      }
      
      if (existingPlan.isActive) {
        return res.status(400).json({
          code: "PLAN_ALREADY_ACTIVE",
          message: "Plan is already active",
        });
      }
      
      const [updatedPlan] = await db.update(globalPricingPlans)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.id, id))
        .returning();
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "update",
        resource: "pricing_plan",
        resourceId: id,
        oldValue: { isActive: false },
        newValue: { isActive: true },
        metadata: {
          adminEmail,
          planCode: updatedPlan.code,
          planName: updatedPlan.name,
          operation: "activate",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-plans] Plan activated: ${updatedPlan.code} by ${adminEmail}`);
      
      res.json({ plan: updatedPlan, message: "Plan activated successfully" });
    } catch (error) {
      console.error("[admin-billing-plans] Error activating plan:", error);
      res.status(500).json({ error: "Failed to activate plan" });
    }
  }
);

router.post(
  "/plans/:id/deactivate",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [existingPlan] = await db.select()
        .from(globalPricingPlans)
        .where(eq(globalPricingPlans.id, id))
        .limit(1);
      
      if (!existingPlan) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Plan not found",
        });
      }
      
      if (!canAdminManagePlan(req, existingPlan.code)) {
        return res.status(403).json({
          code: "COUNTRY_SCOPE_VIOLATION",
          message: "You do not have permission to deactivate plans for this country",
        });
      }
      
      if (!existingPlan.isActive) {
        return res.status(400).json({
          code: "PLAN_ALREADY_INACTIVE",
          message: "Plan is already inactive",
        });
      }
      
      const [updatedPlan] = await db.update(globalPricingPlans)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(globalPricingPlans.id, id))
        .returning();
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "update",
        resource: "pricing_plan",
        resourceId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        metadata: {
          adminEmail,
          planCode: updatedPlan.code,
          planName: updatedPlan.name,
          operation: "deactivate",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-plans] Plan deactivated: ${updatedPlan.code} by ${adminEmail}`);
      
      res.json({ plan: updatedPlan, message: "Plan deactivated successfully" });
    } catch (error) {
      console.error("[admin-billing-plans] Error deactivating plan:", error);
      res.status(500).json({ error: "Failed to deactivate plan" });
    }
  }
);

router.get(
  "/plans/:id",
  requiredAuth,
  requirePlatformAdmin(),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [plan] = await db.select()
        .from(globalPricingPlans)
        .where(eq(globalPricingPlans.id, id))
        .limit(1);
      
      if (!plan) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Plan not found",
        });
      }
      
      if (!canAdminManagePlan(req, plan.code)) {
        return res.status(404).json({
          code: "PLAN_NOT_FOUND",
          message: "Plan not found",
        });
      }
      
      const localPricesData = await db.select()
        .from(planLocalPrices)
        .where(eq(planLocalPrices.planId, id));
      
      res.json({ plan: { ...plan, localPrices: localPricesData } });
    } catch (error) {
      console.error("[admin-billing-plans] Error fetching plan:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  }
);

export default router;
