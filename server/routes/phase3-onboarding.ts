import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { 
  tenants, users, userTenants, roles, tenantSubscriptions, 
  globalPricingPlans, countryPricingConfigs, planLocalPrices,
  notificationLogs
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { 
  jwtAuthService, authenticateJWT, rateLimit,
  tenantResolutionMiddleware, enforceTenantBoundary,
  featureService, auditService
} from "../core";
import { subscriptionService } from "../services/subscription";

const router = Router();

const tenantSignupSchema = z.object({
  tenantName: z.string().min(1, "Business name is required").max(200),
  domain: z.string().min(1).max(100).optional(),
  subdomain: z.string().min(2).max(50).optional(),
  businessType: z.enum([
    "clinic", "salon", "pg", "coworking", "service", 
    "real_estate", "tourism", "education", "logistics", 
    "legal", "furniture_manufacturing"
  ]),
  adminFirstName: z.string().min(1, "First name is required").max(100),
  adminLastName: z.string().min(1, "Last name is required").max(100),
  adminEmail: z.string().email("Invalid email format"),
  adminPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  country: z.enum(["india", "uae", "uk", "malaysia", "singapore", "other"]).optional().default("india"),
  phone: z.string().max(20).optional(),
});

const subscriptionSelectSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  tier: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
});

router.post("/signup", rateLimit({ windowMs: 60 * 1000, maxRequests: 5 }), async (req: Request, res: Response) => {
  try {
    const parsed = tenantSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { 
      tenantName, domain, subdomain, businessType, 
      adminFirstName, adminLastName, adminEmail, adminPassword, 
      country, phone 
    } = parsed.data;

    const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail.toLowerCase()));
    if (existingUser) {
      return res.status(409).json({ 
        error: "Email already registered",
        code: "EMAIL_EXISTS"
      });
    }

    if (subdomain) {
      const [existingTenant] = await db.select().from(tenants).where(eq(tenants.slug, subdomain.toLowerCase()));
      if (existingTenant) {
        return res.status(409).json({ 
          error: "Subdomain already taken",
          code: "SUBDOMAIN_EXISTS"
        });
      }
    }

    let [adminRole] = await db.select().from(roles).where(eq(roles.id, "role_admin"));
    if (!adminRole) {
      [adminRole] = await db.insert(roles).values({
        id: "role_admin",
        name: "Admin",
        description: "Full administrative access",
        isSystem: true,
      }).onConflictDoNothing().returning();
      
      if (!adminRole) {
        [adminRole] = await db.select().from(roles).where(eq(roles.id, "role_admin"));
      }
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const result = await db.transaction(async (tx) => {
      const [newTenant] = await tx.insert(tenants).values({
        name: tenantName,
        slug: subdomain?.toLowerCase(),
        businessType: businessType,
        country: country,
        email: adminEmail,
        phone: phone,
        status: "active",
        subscriptionTier: "free",
        onboardingCompleted: false,
      }).returning();

      const [newUser] = await tx.insert(users).values({
        email: adminEmail.toLowerCase(),
        firstName: adminFirstName,
        lastName: adminLastName,
        passwordHash,
      }).returning();

      await tx.insert(userTenants).values({
        userId: newUser.id,
        tenantId: newTenant.id,
        roleId: adminRole.id,
        isDefault: true,
        isActive: true,
      });

      return { newTenant, newUser };
    });

    const { newTenant, newUser } = result;

    const tokens = await jwtAuthService.generateTokenPair(
      newUser.id,
      newTenant.id,
      adminRole.id,
      [],
      {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || undefined,
      }
    );

    auditService.logAsync({
      tenantId: newTenant.id,
      userId: newUser.id,
      action: "create",
      resource: "tenant",
      metadata: { 
        method: "phase3_signup", 
        businessType,
        event: "tenant_created"
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    sendWelcomeNotification(newTenant.id, newUser.id, adminEmail, tenantName);
    notifyPlatformOwner(newTenant.id, tenantName, businessType, adminEmail);

    res.status(201).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
        businessType: newTenant.businessType,
        subscriptionTier: newTenant.subscriptionTier,
        onboardingCompleted: newTenant.onboardingCompleted,
      },
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
      nextStep: "/subscription/select",
    });
  } catch (error) {
    console.error("[phase3-signup] Error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/select", 
  authenticateJWT({ required: true }),
  async (req: Request, res: Response) => {
    try {
      const tokenTenantId = (req.tokenPayload as any)?.tnt || req.tokenPayload?.tenantId;
      
      const parsed = subscriptionSelectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors
        });
      }

      const { tenantId, planId, tier } = parsed.data;

      if (tokenTenantId && tokenTenantId !== tenantId) {
        return res.status(403).json({
          error: "Cross-tenant access denied",
          code: "TENANT_MISMATCH"
        });
      }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      let plan: typeof globalPricingPlans.$inferSelect | undefined;
      
      if (planId) {
        const [foundPlan] = await db.select().from(globalPricingPlans)
          .where(and(
            eq(globalPricingPlans.id, planId),
            eq(globalPricingPlans.isActive, true)
          ));
        plan = foundPlan;
      } else if (tier) {
        const [foundPlan] = await db.select().from(globalPricingPlans)
          .where(and(
            eq(globalPricingPlans.tier, tier),
            eq(globalPricingPlans.isActive, true)
          ))
          .orderBy(globalPricingPlans.sortOrder)
          .limit(1);
        plan = foundPlan;
      }

      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const [countryConfig] = await db.select().from(countryPricingConfigs)
        .where(eq(countryPricingConfigs.country, tenant.country || "india"));

      const [localPrice] = await db.select().from(planLocalPrices)
        .where(and(
          eq(planLocalPrices.planId, plan.id),
          eq(planLocalPrices.country, tenant.country || "india")
        ));

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const trialEndDate = plan.tier === "free" ? null : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const [existingSub] = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenantId));

      let subscription;
      if (existingSub) {
        [subscription] = await db.update(tenantSubscriptions)
          .set({
            planId: plan.id,
            status: trialEndDate ? "trialing" : "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            trialEndsAt: trialEndDate,
            updatedAt: now,
          })
          .where(eq(tenantSubscriptions.tenantId, tenantId))
          .returning();
      } else {
        [subscription] = await db.insert(tenantSubscriptions).values({
          tenantId,
          planId: plan.id,
          status: trialEndDate ? "trialing" : "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEndDate,
        }).returning();
      }

      await db.update(tenants)
        .set({ 
          subscriptionTier: plan.tier,
          updatedAt: now,
        })
        .where(eq(tenants.id, tenantId));

      const moduleAccess = subscriptionService.getAllModuleAccess(plan.tier);
      const includedModules = moduleAccess.filter(m => m.access === "included").map(m => m.moduleId);

      for (const moduleId of includedModules) {
        await featureService.enableFeature(tenantId, moduleId);
      }

      auditService.logAsync({
        tenantId,
        userId: req.tokenPayload?.userId,
        action: "create",
        resource: "subscription",
        metadata: { 
          planId: plan.id, 
          tier: plan.tier,
          event: "subscription_selected"
        },
      });

      const finalPrice = localPrice?.localPrice 
        ? parseFloat(localPrice.localPrice) 
        : parseFloat(plan.basePrice);
      
      const taxRate = countryConfig ? parseFloat(countryConfig.taxRate) : 0;
      const taxAmount = finalPrice * (taxRate / 100);
      const totalWithTax = finalPrice + taxAmount;

      res.json({
        subscription: {
          id: subscription.id,
          planId: subscription.planId,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          tier: plan.tier,
          basePrice: plan.basePrice,
          localPrice: localPrice?.localPrice || plan.basePrice,
          currency: countryConfig?.currency || "USD",
        },
        pricing: {
          subtotal: finalPrice.toFixed(2),
          taxName: countryConfig?.taxName || "Tax",
          taxRate: taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          total: totalWithTax.toFixed(2),
          currency: countryConfig?.currency || "USD",
        },
        enabledModules: includedModules,
        nextStep: "/dashboard",
      });
    } catch (error) {
      console.error("[subscription-select] Error:", error);
      res.status(500).json({ error: "Failed to select subscription" });
    }
  }
);

router.get("/plans-with-pricing", async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || "india";
    
    const plans = await db.select().from(globalPricingPlans)
      .where(eq(globalPricingPlans.isActive, true))
      .orderBy(globalPricingPlans.sortOrder);

    const [countryConfig] = await db.select().from(countryPricingConfigs)
      .where(eq(countryPricingConfigs.country, country as any));

    const localPrices = await db.select().from(planLocalPrices)
      .where(eq(planLocalPrices.country, country as any));

    const localPriceMap = new Map(localPrices.map(lp => [lp.planId, lp.localPrice]));

    const plansWithPricing = plans.map(plan => {
      const localPrice = localPriceMap.get(plan.id);
      const basePrice = parseFloat(plan.basePrice);
      const finalPrice = localPrice ? parseFloat(localPrice) : basePrice * parseFloat(countryConfig?.exchangeRate || "1");
      const taxRate = countryConfig ? parseFloat(countryConfig.taxRate) : 0;
      const taxAmount = finalPrice * (taxRate / 100);

      return {
        ...plan,
        moduleAccess: subscriptionService.getAllModuleAccess(plan.tier),
        subscriptionFeatures: subscriptionService.getSubscriptionFeatures(plan.tier),
        pricing: {
          basePrice: plan.basePrice,
          localPrice: finalPrice.toFixed(2),
          currency: countryConfig?.currency || "USD",
          taxName: countryConfig?.taxName || "Tax",
          taxRate: taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalWithTax: (finalPrice + taxAmount).toFixed(2),
        },
      };
    });

    res.json({ 
      plans: plansWithPricing,
      countryConfig: countryConfig ? {
        country: countryConfig.country,
        currency: countryConfig.currency,
        taxName: countryConfig.taxName,
        taxRate: countryConfig.taxRate,
      } : null,
    });
  } catch (error) {
    console.error("[plans-with-pricing] Error:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

async function sendWelcomeNotification(tenantId: string, userId: string, email: string, tenantName: string) {
  try {
    await db.insert(notificationLogs).values({
      tenantId,
      userId,
      channel: "email",
      eventType: "custom",
      recipient: email,
      subject: `Welcome to MyBizStream, ${tenantName}!`,
      body: `Your tenant account has been created successfully. Start by selecting a subscription plan to unlock all features.`,
      status: "pending",
      metadata: { type: "welcome_notification", tenantName },
    });
    console.log(`[notification] Welcome notification queued for ${email}`);
  } catch (error) {
    console.error("[notification] Failed to send welcome notification:", error);
  }
}

async function notifyPlatformOwner(tenantId: string, tenantName: string, businessType: string, adminEmail: string) {
  try {
    console.log(`[platform-notification] New tenant signup: ${tenantName} (${businessType}) - ${adminEmail}`);
    
    auditService.logAsync({
      action: "create",
      resource: "tenant",
      resourceId: tenantId,
      metadata: {
        event: "new_tenant_signup",
        tenantName,
        businessType,
        adminEmail,
        notifyPlatformOwner: true,
      },
    });
  } catch (error) {
    console.error("[notification] Failed to notify platform owner:", error);
  }
}

export default router;
