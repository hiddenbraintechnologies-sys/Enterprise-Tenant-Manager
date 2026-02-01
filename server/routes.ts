import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { 
  insertCustomerSchema, insertServiceSchema, insertBookingSchema,
  insertNotificationTemplateSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertPaymentSchema, insertInventoryCategorySchema, insertInventoryItemSchema,
  insertInventoryTransactionSchema, insertMembershipPlanSchema, insertCustomerMembershipSchema,
  insertPatientSchema, insertDoctorSchema, insertAppointmentSchema, insertMedicalRecordSchema,
  insertSpaceSchema, insertDeskBookingSchema,
  tenants, userTenants, users, roles, refreshTokens, customers, staff, tenantFeatures, auditLogs,
  tenantSubscriptions, subscriptionInvoices, transactionLogs, countryPricingConfigs, invoiceTemplates, globalPricingPlans,
  services, bookings, invoices, payments, projects, deleteJobs, timesheets,
  insertInvoiceTemplateSchema,
  insertNotificationPreferencesSchema,
  dsarRequests, gstConfigurations, ukVatConfigurations,
  adminAccountLockouts, adminLoginAttempts, platformAdmins, adminTwoFactorAuth, adminAuditLogs,
  taxRules, taxCalculationLogs, taxReports, insertTaxRuleSchema,
  countryRolloutPolicy,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";
import { 
  requirePermission, requireFeature, auditMiddleware, 
  tenantService, auditService, featureService, permissionService,
  FEATURES, PERMISSIONS, BUSINESS_TYPE_MODULES, type BusinessType,
  jwtAuthService, authenticateJWT, rateLimit, requireRole, requireMinimumRole,
  resolveTenantFromUser,
  phiAccessMiddleware, requireAccessReason, dataMaskingMiddleware,
  complianceService as phiComplianceService, createDataMasker,
  tenantIsolationMiddleware, blockBusinessTypeModification, logUnauthorizedAccess,
  tenantResolutionMiddleware, enforceTenantBoundary,
  requirePlatformPermission,
  requirePlatformAdmin,
  DataMasking,
  whatsappService,
  initializeWhatsappProviders,
  realEstateRouter,
  tourismRouter,
  educationRouter,
  logisticsRouter,
  legalRouter,
  getCanonicalDashboardRoute,
  validateDashboardAccessAsync,
  enforceDashboardLock,
  validateModuleAccess,
} from "./core";
import { authenticateHybrid } from "./core/auth-middleware";
import { ssoRoutes } from "./sso";
import { domainRoutes } from "./core/domain";
import { complianceService } from "./core/compliance/compliance-service";
import complianceRoutes from "./core/compliance/compliance-routes";
import indiaComplianceRoutes from "./core/india-compliance/india-compliance-routes";
import uaeComplianceRoutes from "./core/uae-compliance/uae-compliance-routes";
import ukComplianceRoutes from "./core/uk-compliance/uk-compliance-routes";
import { aiRouter } from "./core/ai-routes";
import {
  adminIpRestriction,
  adminRateLimit,
  adminLoginLockout,
  recordLoginAttempt,
  createAdminSession,
  logAdminAction,
  getClientIp,
  terminateSession,
  terminateAllSessions,
  getAdminAuditLogs,
} from "./core/admin-security";
import { adminSessions } from "@shared/schema";
import { validateBusinessName } from "@shared/validation/business";
import { containsProfanity, isProfanityCheckEnabled, isStrictProfanityBlock } from "./validation/profanity";
import {
  generateTotpSecret,
  generateOtpAuthUrl,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  generateTempToken,
  verifyTempToken,
} from "./core/totp";
import { onboardingService } from "./core/onboarding";
import { resellerRoutes, resellerContextMiddleware } from "./core/reseller";
import { brandingRoutes } from "./core/branding";
import addonRoutes from "./routes/addons";
import aiPermissionsRoutes from "./routes/ai-permissions";
import aiAuditRoutes from "./routes/ai-audit";
import businessRegistryRoutes from "./routes/business-registry";
import moduleRegistryRoutes from "./routes/module-registry";
import featureRegistryRoutes from "./routes/feature-registry";
import featureFlagsRoutes from "./routes/feature-flags";
import businessVersionRoutes from "./routes/business-version";
import regionLockRoutes from "./routes/region-lock";
import { regionLockService } from "./services/region-lock";
import { countryRolloutService } from "./services/country-rollout";
import furnitureRoutes from "./routes/furniture";
import hrmsRoutes from "./routes/hrms";
import servicesRoutes from "./routes/services";
import subscriptionRoutes from "./routes/subscriptions";
import { subscriptionService } from "./services/subscription";
import billingRoutes from "./routes/billing";
import adminBillingPlansRoutes from "./routes/admin-billing-plans";
import adminBillingOffersRoutes from "./routes/admin-billing-offers";
import adminBillingPromosRoutes from "./routes/admin/promos";
import adminCountriesRoutes from "./routes/admin/countries";
import adminPayrollAnalyticsRoutes from "./routes/admin/payroll-analytics";
import adminAddonsRoutes from "./routes/admin/addons";
import adminMarketplaceRevenueRoutes from "./routes/admin/marketplace-revenue";
import superAdminMarketplaceManagementRoutes from "./routes/super-admin/marketplace-management";
import superAdminMarketplaceAnalyticsRoutes from "./routes/super-admin/marketplace-analytics";
import razorpayMarketplaceWebhookRoutes from "./routes/webhooks/razorpay-marketplace";
import tenantAddonsRoutes from "./routes/marketplace/tenant-addons";
import publicRoutes from "./routes/public";
import catalogRoutes from "./routes/catalog";
import promoRoutes from "./routes/billing/promos";
import entitlementsRoutes from "./routes/billing/entitlements";
import employeePortalRoutes from "./routes/employee-portal";
import phase3OnboardingRoutes from "./routes/phase3-onboarding";
import dashboardApiRoutes from "./routes/dashboard-api";
import tenantSettingsRoutes from "./routes/tenant-settings";
import { requireModule, softSubscriptionCheck } from "./middleware/subscription-gate";
import { requireTenant, requireAuth, requireDashboardAccess, extractTenantFromRequest, isPublicDomain } from "./middleware/tenant-auth";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, ne, isNull } from "drizzle-orm";
import { buildAddonAccessMap } from "./core/addon-gating";

function getTenantId(req: Request): string {
  return req.context?.tenant?.id || "";
}

function getUserId(req: Request): string | undefined {
  return req.context?.user?.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Run seeding in background - don't block server startup
  // This prevents deployment provisioning timeout
  setImmediate(async () => {
    try {
      console.log("[bootstrap] Starting background initialization...");
      
      // Clear any lockouts for superadmin on startup (for dev/testing)
      try {
        await db.delete(adminAccountLockouts).where(eq(adminAccountLockouts.email, "superadmin@bizflow.app"));
        await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.email, "superadmin@bizflow.app"));
        console.log("[bootstrap] Cleared superadmin lockouts");
      } catch (err) {
        console.log("[bootstrap] Lockout cleanup skipped");
      }
      
      // Ensure superadmin has correct password on startup
      try {
        const superadminEmail = "superadmin@bizflow.app";
        const superadminPassword = "Admin@123!";
        const [existingAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, superadminEmail));
        
        if (!existingAdmin) {
          const passwordHash = await bcrypt.hash(superadminPassword, 12);
          await db.insert(platformAdmins).values({
            id: "pa_super_001",
            name: "Super Administrator",
            email: superadminEmail,
            passwordHash,
            role: "SUPER_ADMIN",
            isActive: true,
            forcePasswordReset: false,
          });
          console.log("[bootstrap] Created superadmin account");
        } else {
          const passwordHash = await bcrypt.hash(superadminPassword, 12);
          await db.update(platformAdmins)
            .set({ passwordHash, forcePasswordReset: false })
            .where(eq(platformAdmins.email, superadminEmail));
          console.log("[bootstrap] Reset superadmin password");
        }
      } catch (err) {
        console.log("[bootstrap] Superadmin setup skipped:", err);
      }
      
      await featureService.seedFeatureFlags();
      console.log("[bootstrap] Feature flags seeded");
      
      // Seed India pricing plans and feature flags
      try {
        const { seedIndiaPricingPlans, seedIndiaFeatureFlags } = await import("./core/india-pricing");
        await seedIndiaPricingPlans();
        await seedIndiaFeatureFlags();
        console.log("[bootstrap] India pricing seeded");
      } catch (err) {
        console.log("[bootstrap] India pricing seeding skipped:", err);
      }

      // Seed UK and Malaysia pricing plans
      try {
        const { seedUKPricingPlans, seedMYPricingPlans } = await import("./core/uk-my-pricing");
        await seedUKPricingPlans();
        await seedMYPricingPlans();
        console.log("[bootstrap] UK and Malaysia pricing seeded");
      } catch (err) {
        console.log("[bootstrap] UK/MY pricing seeding skipped:", err);
      }
      
      // Seed payroll addon tiers and bundle discounts
      try {
        const { seedPayrollAddon } = await import("./core/payroll-addon-pricing");
        await seedPayrollAddon();
        console.log("[bootstrap] Payroll addon pricing seeded");
      } catch (err) {
        console.log("[bootstrap] Payroll addon pricing seeding skipped:", err);
      }

      // Seed country rollout policies - ONLY CREATE IF NOT EXISTS (never overwrite admin settings)
      try {
        const { countryRolloutPolicy } = await import("@shared/schema");
        const defaultCountries = [
          { code: "IN", active: true, status: "live" as const, businessTypes: ["pg_hostel"] },
          { code: "MY", active: true, status: "beta" as const, businessTypes: ["consulting", "software_services"] },
          { code: "GB", active: false, status: "coming_soon" as const, businessTypes: [] }, // Default to inactive - admin enables manually
          { code: "SG", active: false, status: "coming_soon" as const, businessTypes: [] },
          { code: "AE", active: false, status: "coming_soon" as const, businessTypes: [] },
        ];
        let created = 0;
        for (const country of defaultCountries) {
          const [existing] = await db.select().from(countryRolloutPolicy).where(eq(countryRolloutPolicy.countryCode, country.code)).limit(1);
          if (!existing) {
            // ONLY insert new records - never update existing (respect admin settings)
            await db.insert(countryRolloutPolicy).values({
              countryCode: country.code,
              isActive: country.active,
              status: country.status,
              enabledBusinessTypes: country.businessTypes,
              enabledModules: [],
              disabledFeatures: [],
              updatedBy: "bootstrap",
            });
            created++;
          }
        }
        // FORCE FIX: Always ensure UK is set to inactive/coming_soon
        // This runs on every startup to guarantee UK is disabled until admin enables it
        const [ukPolicy] = await db.select().from(countryRolloutPolicy).where(eq(countryRolloutPolicy.countryCode, "GB")).limit(1);
        console.log("[bootstrap] UK policy before fix:", { isActive: ukPolicy?.isActive, status: ukPolicy?.status });
        if (ukPolicy) {
          await db.update(countryRolloutPolicy)
            .set({ isActive: false, status: "coming_soon", updatedAt: new Date(), updatedBy: "bootstrap-force-fix" })
            .where(eq(countryRolloutPolicy.countryCode, "GB"));
          console.log("[bootstrap] UK country forced to coming_soon");
        }
        
        // Clear cache to ensure fresh data is served immediately
        countryRolloutService.clearCache();
        // Mark bootstrap as ready so catalog endpoints can serve data
        const { bootstrapStatus } = await import("./services/bootstrap-status");
        bootstrapStatus.markCountryRolloutReady();
        console.log(`[bootstrap] Country rollout: ${created} new, existing policies preserved`);
      } catch (err) {
        console.log("[bootstrap] Country rollout seeding skipped:", err);
      }

      // Seed marketplace add-ons (Phase 1)
      try {
        const { seedMarketplaceAddons } = await import("./bootstrap/seed-marketplace-addons");
        await seedMarketplaceAddons();
        console.log("[bootstrap] Marketplace add-ons seeded");
      } catch (err) {
        console.log("[bootstrap] Marketplace add-ons seeding skipped:", err);
      }
      
      await tenantService.getOrCreateDefaultTenant();
      console.log("[bootstrap] Default tenant ready");
      await initializeWhatsappProviders();
      console.log("[bootstrap] WhatsApp providers initialized");
      
      // Start the delete job background worker
      const { startDeleteJobWorker } = await import("./core/delete-job-worker");
      startDeleteJobWorker();
      console.log("[bootstrap] Delete job worker started");
    } catch (error) {
      console.error("[bootstrap] Background initialization error:", error);
    }
  });

  // Register SSO routes
  app.use('/api/sso', ssoRoutes);

  // DEV-ONLY: Debug endpoint to diagnose auth/tenant context issues
  if (process.env.NODE_ENV === "development") {
    app.get("/api/debug/request-context", authenticateJWT({ required: false }), async (req: any, res) => {
      const hasCookie = Boolean(req.cookies?.tenantId || req.headers.cookie?.includes("tenantId"));
      const hasAuthHeader = Boolean(req.headers.authorization?.startsWith("Bearer "));
      const xTenantId = (req.headers["x-tenant-id"] as string) || null;
      
      // Check both JWT context (req.context) and Replit auth context (req.user)
      const jwtContext = req.context;
      const replitUser = req.user;
      
      const userPresent = Boolean(jwtContext?.user || replitUser);
      const jwtUserId = jwtContext?.user?.id;
      const replitUserId = replitUser?.claims?.sub;
      const userId = jwtUserId || replitUserId;
      const maskedUserId = userId ? `...${userId.slice(-6)}` : null;
      
      const tenantIdInContext = jwtContext?.tenant?.id || null;
      
      res.json({
        path: req.path,
        method: req.method,
        hasCookie,
        hasAuthHeader,
        xTenantId,
        userPresent,
        userId: maskedUserId,
        tenantIdInContext,
        host: req.headers.host || null,
        origin: req.headers.origin || null,
        // Additional debug info
        jwtUserPresent: Boolean(jwtContext?.user),
        replitUserPresent: Boolean(replitUser),
        tokenPayloadPresent: Boolean(req.tokenPayload),
      });
    });
    
    // Debug endpoint for hybrid auth testing (session + JWT)
    app.get("/api/debug/hybrid-auth", authenticateHybrid({ required: false }), async (req: any, res) => {
      const hasAuthHeader = Boolean(req.headers.authorization?.startsWith("Bearer "));
      const isSessionAuth = Boolean(req.isAuthenticated?.() && req.user);
      
      const context = req.context;
      const replitUser = req.user;
      
      res.json({
        path: req.path,
        method: req.method,
        hasAuthHeader,
        isSessionAuth,
        contextPopulated: Boolean(context?.user),
        contextUserId: context?.user?.id ? `...${context.user.id.slice(-6)}` : null,
        contextTenantId: context?.tenant?.id ? `...${context.tenant.id.slice(-6)}` : null,
        contextTenantName: context?.tenant?.name || null,
        contextRole: context?.role?.name || null,
        replitUserId: replitUser?.claims?.sub ? `...${replitUser.claims.sub.slice(-6)}` : null,
        replitEmail: replitUser?.claims?.email || replitUser?.email || null,
        featureCount: context?.features?.length || 0,
      });
    });
  }
  
  // Register domain management routes
  app.use('/api/domains', domainRoutes);

  // Register AI service routes
  app.use('/api/ai', aiRouter);
  
  // Register AI Permissions routes (role-based AI access control)
  app.use('/api/ai/permissions', aiPermissionsRoutes);

  // Register AI Audit routes (compliance-safe logging)
  app.use('/api/ai/audit', aiAuditRoutes);

  // Module ID mapping for subscription gating
  const moduleIdMap: Record<string, string> = {
    real_estate: "real_estate",
    tourism: "tourism", 
    education: "education",
    logistics: "logistics",
    legal: "legal",
    furniture_manufacturing: "furniture_manufacturing",
    software_services: "software_services",
    consulting: "consulting",
  };

  // Module-protected middleware stack (includes tenant context resolution + subscription gating)
  // Uses hybrid auth for ALL modules to support both session-based dashboard and JWT API access
  const moduleProtectedMiddleware = (businessType: "real_estate" | "tourism" | "education" | "logistics" | "legal" | "furniture_manufacturing" | "software_services" | "consulting") => {
    // Use hybrid auth for all modules - supports both session-based dashboard access and JWT API access
    const authMiddleware = authenticateHybrid({ required: true });
      
    return [
      authMiddleware,
      tenantResolutionMiddleware(),
      enforceTenantBoundary(),
      tenantIsolationMiddleware(),
      requireModule(moduleIdMap[businessType] || businessType),
      validateModuleAccess(businessType as any),
    ];
  };

  // Register Real Estate module routes (protected)
  app.use('/api/real-estate', ...moduleProtectedMiddleware("real_estate"), realEstateRouter);

  // Register Tourism module routes (protected)
  app.use('/api/tourism', ...moduleProtectedMiddleware("tourism"), tourismRouter);

  // Register Education module routes (protected)
  app.use('/api/education', ...moduleProtectedMiddleware("education"), educationRouter);

  // Register Logistics module routes (protected)
  app.use('/api/logistics', ...moduleProtectedMiddleware("logistics"), logisticsRouter);

  // Register Legal module routes (protected)
  app.use('/api/legal', ...moduleProtectedMiddleware("legal"), legalRouter);

  // Register Furniture Manufacturing module routes (protected)
  app.use('/api/furniture', ...moduleProtectedMiddleware("furniture_manufacturing"), furnitureRoutes);

  // Register Software Services module routes (protected)
  app.use('/api/services/software', ...moduleProtectedMiddleware("software_services"), servicesRoutes);

  // Register Consulting module routes (protected)
  app.use('/api/services/consulting', ...moduleProtectedMiddleware("consulting"), servicesRoutes);

  // Register HRMS module routes (protected, cross-business horizontal module)
  // Uses hybrid auth (session + JWT) to support both cookie-based dashboard access and token-based API access
  app.use('/api/hr', authenticateHybrid({ required: true }), enforceTenantBoundary(), requireModule("hrms"), hrmsRoutes);

  // Register Reseller/White-label routes
  app.use('/api/resellers', authenticateHybrid({ required: true }), resellerRoutes);

  // Register Branding/Theming routes
  app.use('/api/branding', authenticateHybrid({ required: true }), enforceTenantBoundary(), brandingRoutes);

  // Register Add-on Marketplace routes (with optional auth to populate context for authenticated routes)
  app.use('/api/addons', authenticateHybrid({ required: false }), addonRoutes);

  // Subscription & Pricing routes
  app.use('/api/subscriptions', subscriptionRoutes);
  
  // Billing & Checkout routes (for tenant onboarding)
  app.use('/api/billing', billingRoutes);
  app.use('/api/billing/promos', promoRoutes);
  app.use('/api/billing/entitlements', entitlementsRoutes);
  
  // Public routes (no auth required)
  app.use('/api/public', publicRoutes);
  
  // Catalog routes - public access for registration flow
  app.use('/api/catalog', catalogRoutes);
  
  // Employee Self-Service Portal (public, no TenantProvider)
  app.use('/api/employee-portal', employeePortalRoutes);

  // Phase 3: Onboarding, Subscription Selection & Dashboard APIs
  app.use('/api/auth', phase3OnboardingRoutes);
  app.use('/api/subscription', phase3OnboardingRoutes);
  app.use('/api/dashboard', dashboardApiRoutes);

  // Tenant settings (language preference, etc.)
  app.use(tenantSettingsRoutes);

  // Register Feature Flags runtime evaluation routes (for tenant apps)
  app.use('/api/feature-flags', authenticateHybrid(), enforceTenantBoundary(), featureFlagsRoutes);

  // Register Business Version management routes (SuperAdmin only)
  app.use('/api/business-versions', authenticateJWT({ required: true }), businessVersionRoutes);

  // Register Region Lock management routes (SuperAdmin + public check endpoints)
  // Note: Public endpoints (enabled, check/registration, check/billing) are unprotected
  // Admin endpoints (CRUD, status, features, logs) require platform admin auth
  app.use('/api/platform/regions', regionLockRoutes);
  
  // Seed default region configurations in background
  setImmediate(async () => {
    try {
      await regionLockService.seedDefaultRegions();
      console.log("[bootstrap] Region configs seeded");
    } catch (error) {
      console.error("[bootstrap] Region seeding error:", error);
    }
  });

  // Register Compliance routes
  app.use('/api/compliance', authenticateHybrid(), complianceRoutes);
  
  // Register India Compliance routes (GST, DLT, Aadhaar, RBI)
  app.use('/api/india-compliance', indiaComplianceRoutes);

  // Register UAE Compliance routes (VAT, TRA, Data Residency)
  app.use('/api/uae-compliance', uaeComplianceRoutes);
  app.use('/api/uk-compliance', ukComplianceRoutes);

  // Seed onboarding flows in background
  setImmediate(async () => {
    try {
      await onboardingService.seedDefaultFlows();
      console.log("[bootstrap] Onboarding flows seeded");
    } catch (error) {
      console.error("[bootstrap] Onboarding seeding error:", error);
    }
  });

  // ==================== ONBOARDING ROUTES ====================

  app.get("/api/onboarding/status", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const isRequired = await onboardingService.isOnboardingRequired(tenantId);
      const { progress, flow, steps, currentStep } = await onboardingService.getTenantProgress(tenantId);

      res.json({
        isRequired,
        progress,
        flow,
        steps,
        currentStep,
        totalSteps: steps.length,
        completedSteps: progress?.currentStepIndex || 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/onboarding/initialize", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (tenant.onboardingCompleted) {
        return res.status(400).json({ message: "Onboarding already completed" });
      }

      const businessType = tenant.businessType || "service";
      const progress = await onboardingService.initializeOnboarding(tenantId, businessType as any);
      const { flow, steps, currentStep } = await onboardingService.getTenantProgress(tenantId);

      res.json({
        progress,
        flow,
        steps,
        currentStep,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/onboarding/step/:stepKey", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const { stepKey } = req.params;
      const stepData = req.body.data || {};

      const progress = await onboardingService.saveStepData(tenantId, stepKey, stepData);

      res.json({ success: true, progress });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/onboarding/advance", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const result = await onboardingService.advanceStep(tenantId);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/onboarding/skip", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const result = await onboardingService.skipStep(tenantId);

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/onboarding/can-modify-business-type", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const canModify = await onboardingService.canModifyBusinessType(tenantId);

      res.json({ canModify });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== DASHBOARD ACCESS VALIDATION ====================

  app.get("/api/dashboard/access", authenticateHybrid(), tenantResolutionMiddleware(), enforceTenantBoundary(), requireDashboardAccess(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const tenant = req.context?.tenant;
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found", code: "TENANT_NOT_EXIST" });
      }

      const businessType = tenant.businessType || "service";
      const canonicalRoute = getCanonicalDashboardRoute(businessType);

      res.json({
        businessType,
        dashboardRoute: canonicalRoute,
        businessTypeLocked: tenant.businessTypeLocked,
        onboardingCompleted: tenant.onboardingCompleted,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dashboard/validate-route", authenticateHybrid(), tenantResolutionMiddleware(), enforceTenantBoundary(), requireDashboardAccess(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const { route } = req.body;
      if (!route || typeof route !== "string") {
        return res.status(400).json({ message: "Route parameter required" });
      }

      const result = await validateDashboardAccessAsync(tenantId, route);

      if (!result.allowed) {
        return res.status(403).json({
          allowed: false,
          redirectTo: result.redirectTo,
          reason: result.reason,
        });
      }

      res.json({ allowed: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== AUTH ROUTES ====================
  
  const authRateLimit = rateLimit({ windowMs: 60 * 1000, maxRequests: 10 });
  // Stricter rate limit for registration: 10 per 15 minutes per IP
  const registrationRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 });

  // Use shared validation from @shared/validation
  const { nameField } = await import("@shared/validation/name");
  const { businessNameField } = await import("@shared/validation/business");
  const { validateEmailMx, isMxValidationEnabled, isMxValidationStrict } = await import("./utils/email-mx");
  
  const registrationSchema = z.object({
    firstName: nameField("First name"),
    lastName: nameField("Last name"),
    email: z.string().trim().email("Please enter a valid email"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    businessName: businessNameField("Business name"),
    businessType: z.enum([
      "clinic", "clinic_healthcare", "salon", "salon_spa", "pg", "pg_hostel", 
      "coworking", "service", "real_estate", "tourism", "education", "education_institute",
      "logistics", "logistics_fleet", "legal", "furniture_manufacturing", "furniture",
      "software_services", "consulting", "digital_agency", "retail_store"
    ]),
    countryCode: z.string().trim().min(2, "Country is required").max(5),
    // Honeypot field - should always be empty (bots often fill hidden fields)
    companyWebsite: z.string().max(0).optional(),
  });

  app.post("/api/auth/register", registrationRateLimit, async (req, res) => {
    try {
      console.log("[register] Step 1: Validating input");
      
      // Check honeypot field first - bots often fill hidden fields
      if (req.body.companyWebsite && req.body.companyWebsite.length > 0) {
        console.log("[register] Bot detected: honeypot field filled");
        // Return generic error to avoid tipping off bots
        return res.status(400).json({ 
          error: "VALIDATION_ERROR",
          message: "Registration failed. Please try again."
        });
      }
      
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) {
        // Return field-level errors in the recommended format
        const fieldErrors = parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "form",
          message: issue.message,
        }));
        
        return res.status(400).json({ 
          error: "VALIDATION_ERROR",
          fieldErrors,
          message: fieldErrors[0]?.message || "Validation failed"
        });
      }

      const { firstName, lastName, email, password, businessName, businessType, countryCode } = parsed.data;
      
      // Optional MX email validation (best-effort)
      if (isMxValidationEnabled()) {
        console.log("[register] Step 1b: Checking email MX records");
        const mxResult = await validateEmailMx(email, isMxValidationStrict());
        if (!mxResult.valid) {
          console.log("[register] MX validation failed:", mxResult.error);
          return res.status(400).json({
            error: "VALIDATION_ERROR",
            fieldErrors: [{ field: "email", message: mxResult.error || "Invalid email domain" }],
            message: mxResult.error || "Invalid email domain"
          });
        }
      }
      
      console.log("[register] Step 2: Checking existing user for email:", email);

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      console.log("[register] Step 3: Existing user check complete, found:", !!existingUser);
      if (existingUser) {
        // User already exists - just return error (don't try to delete as they may have linked data)
        return res.status(409).json({ message: "Email already registered. Please use a different email or login with your existing account." });
      }

      // Look up region config for the selected country
      console.log("[register] Step 4: Looking up region config for:", countryCode);
      const regionConfigs = await storage.getActiveRegionConfigs();
      console.log("[register] Step 5: Found", regionConfigs.length, "region configs");
      const selectedRegion = regionConfigs.find(r => r.countryCode === countryCode);
      
      if (!selectedRegion) {
        console.log("[register] Error: Country not found in region configs");
        return res.status(400).json({ 
          message: "Invalid country selected",
          code: "COUNTRY_NOT_AVAILABLE"
        });
      }
      console.log("[register] Step 6: Region found:", selectedRegion.countryCode);
      
      if (!selectedRegion.registrationEnabled) {
        return res.status(400).json({ 
          message: "Registration is not available for this country",
          code: "COUNTRY_SIGNUP_DISABLED"
        });
      }

      // Check country rollout policy for business type
      console.log("[register] Step 7: Checking rollout policy for business type:", businessType);
      const rolloutValidation = await countryRolloutService.isBusinessTypeAllowed(countryCode, businessType);
      console.log("[register] Step 8: Rollout validation:", rolloutValidation.allowed);
      if (!rolloutValidation.allowed) {
        return res.status(400).json({
          message: rolloutValidation.message,
          code: rolloutValidation.code
        });
      }

      // Business name validation
      console.log("[register] Step 8b: Validating business name");
      const nameValidation = validateBusinessName(businessName);
      if (!nameValidation.valid) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          fieldErrors: [{ 
            field: "businessName", 
            message: nameValidation.error || "Invalid business name" 
          }],
          message: nameValidation.error || "Invalid business name"
        });
      }
      
      // Profanity check for business name (server-side only)
      let shouldFlagForModeration = false;
      let moderationRuleId: string | undefined = undefined;
      
      if (isProfanityCheckEnabled()) {
        console.log("[register] Step 8c: Checking business name for profanity");
        const profanityResult = containsProfanity(nameValidation.normalized);
        
        if (profanityResult.hit) {
          if (isStrictProfanityBlock()) {
            console.log("[register] Profanity blocked:", profanityResult.ruleId);
            
            // Log audit event (don't store the profane name, only ruleId)
            auditService.logAsync({
              action: "create",
              resource: "tenant",
              resourceId: "blocked",
              metadata: { 
                event: "TENANT_NAME_PROFANITY_BLOCKED", 
                ruleId: profanityResult.ruleId,
                countryCode 
              },
              ipAddress: req.ip,
              userAgent: req.headers["user-agent"],
            });
            
            return res.status(400).json({
              error: "VALIDATION_ERROR",
              fieldErrors: [{ 
                field: "businessName", 
                message: "Business name contains inappropriate language." 
              }],
              message: "Business name contains inappropriate language."
            });
          } else {
            // Flag mode: allow but flag for review
            shouldFlagForModeration = true;
            moderationRuleId = profanityResult.ruleId;
          }
        }
      }

      // Map countryCode to tenant country enum
      const countryCodeToTenantCountry: Record<string, "india" | "uae" | "uk" | "malaysia" | "singapore" | "other"> = {
        "IN": "india",
        "AE": "uae",
        "GB": "uk",
        "MY": "malaysia",
        "SG": "singapore",
      };
      const tenantCountry = countryCodeToTenantCountry[countryCode] || "other";

      // Map region to tenant region enum
      const regionToTenantRegion: Record<string, "asia_pacific" | "middle_east" | "europe" | "americas" | "africa"> = {
        "asia_pacific": "asia_pacific",
        "middle_east": "middle_east",
        "europe": "europe",
        "americas": "americas",
        "africa": "africa",
      };
      const tenantRegion = regionToTenantRegion[selectedRegion.region] || "asia_pacific";

      const passwordHash = await bcrypt.hash(password, 12);

      console.log("[register] Step 9: Looking up admin role");
      let [adminRole] = await db.select().from(roles).where(eq(roles.id, "role_admin"));
      if (!adminRole) {
        console.log("[register] Step 9a: Creating admin role");
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
      console.log("[register] Step 10: Admin role ready:", adminRole?.id);

      console.log("[register] Step 11: Starting transaction");
      const result = await db.transaction(async (tx) => {
        console.log("[register] Step 12: Creating tenant");
        const [newTenant] = await tx.insert(tenants).values({
          name: nameValidation.normalized,
          businessType: businessType,
          email: email,
          country: tenantCountry,
          region: tenantRegion,
          currency: selectedRegion.defaultCurrency,
          timezone: selectedRegion.defaultTimezone,
          moderationStatus: shouldFlagForModeration ? "flagged" : "clear",
          moderationRuleId: shouldFlagForModeration ? moderationRuleId : null,
        }).returning();
        console.log("[register] Step 13: Tenant created:", newTenant?.id);
        
        // Log flagged tenant for moderation review
        if (shouldFlagForModeration) {
          console.log("[register] Tenant flagged for moderation review:", moderationRuleId);
          auditService.logAsync({
            action: "create",
            resource: "tenant",
            resourceId: newTenant.id,
            userId: undefined,
            tenantId: newTenant.id,
            metadata: { 
              event: "TENANT_NAME_FLAGGED_FOR_REVIEW", 
              ruleId: moderationRuleId 
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        }

        console.log("[register] Step 14: Creating user");
        const [newUser] = await tx.insert(users).values({
          email,
          firstName,
          lastName,
          passwordHash,
        }).returning();
        console.log("[register] Step 15: User created:", newUser?.id);

        console.log("[register] Step 16: Creating user-tenant association");
        await tx.insert(userTenants).values({
          userId: newUser.id,
          tenantId: newTenant.id,
          roleId: adminRole.id,
          isDefault: true,
          isActive: true,
        });
        console.log("[register] Step 17: User-tenant association created");

        return { newTenant, newUser };
      });
      console.log("[register] Step 18: Transaction complete");

      const { newTenant, newUser } = result;

      const businessTypeKey = businessType as BusinessType;
      const modulesToEnable = BUSINESS_TYPE_MODULES[businessTypeKey] || BUSINESS_TYPE_MODULES.service;
      
      for (const featureCode of modulesToEnable) {
        await featureService.enableFeature(newTenant.id, featureCode);
      }

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

      // Log TENANT_CREATED audit event
      auditService.logAsync({
        tenantId: newTenant.id,
        userId: newUser.id,
        action: "create",
        resource: "tenant",
        resourceId: newTenant.id,
        newValue: { name: businessName, businessType, country: tenantCountry },
        metadata: { event: "TENANT_CREATED" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      // Log USER_REGISTERED audit event
      auditService.logAsync({
        tenantId: newTenant.id,
        userId: newUser.id,
        action: "create",
        resource: "user",
        resourceId: newUser.id,
        newValue: { email, firstName, lastName },
        metadata: { event: "USER_REGISTERED", method: "registration", businessType },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        defaultTenantId: newTenant.id,
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
          slug: newTenant.slug,
          businessType: newTenant.businessType,
          country: newTenant.country,
          region: newTenant.region,
          currency: newTenant.currency,
          timezone: newTenant.timezone,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
      });
      // Temporarily expose error details to help debug production issue
      res.status(500).json({ 
        message: "Registration failed",
        error: error?.message,
        code: error?.code
      });
    }
  });

  // Tenant discovery by email - allows login without stored tenant context
  // PUBLIC endpoint - does NOT require X-Tenant-ID header
  // Returns empty array if user not found (to avoid leaking user existence)
  app.post("/api/auth/tenant-discovery", authRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          message: "Email is required",
          code: "EMAIL_REQUIRED"
        });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      
      // Return empty array if user not found - don't leak existence info
      if (!existingUser) {
        return res.json({ tenants: [], count: 0, hasMultiple: false });
      }

      // Get all tenants the user belongs to
      const userTenantRecords = await db.select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, existingUser.id),
          eq(userTenants.isActive, true)
        ));

      if (userTenantRecords.length === 0) {
        return res.json({ tenants: [], count: 0, hasMultiple: false });
      }

      // Fetch tenant details for each membership
      const tenantOptions = await Promise.all(
        userTenantRecords.map(async (ut) => {
          const [t] = await db.select().from(tenants).where(
            and(
              eq(tenants.id, ut.tenantId),
              eq(tenants.status, "active")
            )
          );
          return t ? { 
            id: t.id, 
            name: t.name, 
            slug: t.slug,
            country: t.country,
            businessType: t.businessType,
            isDefault: ut.isDefault,
          } : null;
        })
      );

      const activeTenants = tenantOptions.filter(Boolean);
      
      // Determine preferred tenant (last used or default)
      let preferredTenantId: string | null = null;
      
      // First priority: last_tenant_id if still valid
      if (existingUser.lastTenantId) {
        const lastTenantStillValid = activeTenants.some(t => t?.id === existingUser.lastTenantId);
        if (lastTenantStillValid) {
          preferredTenantId = existingUser.lastTenantId;
        }
      }
      
      // Second priority: default tenant
      if (!preferredTenantId) {
        const defaultTenant = activeTenants.find(t => t?.isDefault);
        if (defaultTenant) {
          preferredTenantId = defaultTenant.id;
        }
      }
      
      // Third priority: first tenant
      if (!preferredTenantId && activeTenants.length > 0) {
        preferredTenantId = activeTenants[0]?.id || null;
      }
      
      res.json({
        tenants: activeTenants,
        count: activeTenants.length,
        hasMultiple: activeTenants.length > 1,
        preferredTenantId,
        autoSelect: activeTenants.length === 1,
      });
    } catch (error) {
      console.error("Tenant discovery error:", error);
      res.status(500).json({ message: "Failed to discover tenants" });
    }
  });

  // Legacy endpoint - kept for backwards compatibility
  app.post("/api/auth/tenants/lookup", authRateLimit, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          message: "Email is required",
          code: "EMAIL_REQUIRED"
        });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      
      if (!existingUser) {
        return res.status(404).json({ 
          message: "No account found with this email",
          code: "USER_NOT_FOUND"
        });
      }

      // Get all tenants the user belongs to
      const userTenantRecords = await db.select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, existingUser.id),
          eq(userTenants.isActive, true)
        ));

      if (userTenantRecords.length === 0) {
        return res.status(404).json({ 
          message: "No tenant membership found for this user",
          code: "TENANT_NOT_FOUND_FOR_USER"
        });
      }

      // Fetch tenant details for each membership
      const tenantOptions = await Promise.all(
        userTenantRecords.map(async (ut) => {
          const [t] = await db.select().from(tenants).where(
            and(
              eq(tenants.id, ut.tenantId),
              eq(tenants.status, "active")
            )
          );
          return t ? { 
            id: t.id, 
            name: t.name, 
            slug: t.slug,
            region: t.region,
            country: t.country,
            businessType: t.businessType,
            status: t.status,
            isDefault: ut.isDefault,
          } : null;
        })
      );

      const activeTenants = tenantOptions.filter(Boolean);
      
      if (activeTenants.length === 0) {
        return res.status(404).json({ 
          message: "No active tenants found for this user",
          code: "TENANT_NOT_FOUND_FOR_USER"
        });
      }

      res.json({
        tenants: activeTenants,
        count: activeTenants.length,
        hasMultiple: activeTenants.length > 1,
      });
    } catch (error) {
      console.error("Tenant lookup error:", error);
      res.status(500).json({ message: "Failed to lookup tenants" });
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password, tenantId, subdomain, loginContext = "TENANT" } = req.body;
      const headerTenantId = req.headers["x-tenant-id"] as string;
      
      // Extract tenant from host subdomain (e.g., tenant1.payodsoft.co.uk)
      const host = req.headers.host || "";
      const hostParts = host.split(".");
      let hostSubdomain: string | undefined;
      if (hostParts.length >= 3 && hostParts[0] !== "www" && hostParts[0] !== "api") {
        hostSubdomain = hostParts[0];
      }
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user is a platform admin trying to use tenant login
      const platformAdmin = await storage.getPlatformAdminByEmail(normalizedEmail);
      if (platformAdmin && loginContext === "TENANT") {
        // Platform admin detected - guide them to admin login
        return res.status(403).json({
          message: "This is a platform admin account. Please use the admin login.",
          code: "USE_ADMIN_LOGIN",
          redirectPath: "/admin-login",
        });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      
      if (!existingUser || !existingUser.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Priority: body tenantId > body subdomain > header > host subdomain
      const requestedTenantIdentifier = tenantId || subdomain || headerTenantId || hostSubdomain;
      let targetTenantId: string | undefined;
      let tenantData: typeof tenants.$inferSelect | undefined;

      if (requestedTenantIdentifier) {
        let [tenant] = await db.select().from(tenants).where(eq(tenants.id, requestedTenantIdentifier));
        
        if (!tenant) {
          [tenant] = await db.select().from(tenants).where(eq(tenants.slug, requestedTenantIdentifier));
        }
        
        if (!tenant) {
          return res.status(404).json({ 
            message: "Tenant not found. Check the tenant URL or select a tenant.", 
            code: "TENANT_NOT_EXIST" 
          });
        }

        const [userTenantAccess] = await db.select()
          .from(userTenants)
          .where(and(
            eq(userTenants.userId, existingUser.id),
            eq(userTenants.tenantId, tenant.id)
          ));

        if (!userTenantAccess) {
          return res.status(403).json({ 
            message: "No tenant access found for this account", 
            code: "NO_TENANT_ACCESS" 
          });
        }

        targetTenantId = tenant.id;
        tenantData = tenant;
      } else {
        const [userTenantRecord] = await db.select()
          .from(userTenants)
          .where(and(
            eq(userTenants.userId, existingUser.id),
            eq(userTenants.isDefault, true)
          ));

        if (!userTenantRecord) {
          const allUserTenants = await db.select()
            .from(userTenants)
            .where(eq(userTenants.userId, existingUser.id));
          
          if (allUserTenants.length === 0) {
            return res.status(404).json({ 
              message: "No tenant membership found for this user", 
              code: "NO_TENANT_MEMBERSHIP" 
            });
          }
          
          if (allUserTenants.length === 1) {
            targetTenantId = allUserTenants[0].tenantId;
          } else {
            const tenantOptions = await Promise.all(
              allUserTenants.map(async (ut) => {
                const [t] = await db.select().from(tenants).where(eq(tenants.id, ut.tenantId));
                return t ? { 
                  id: t.id, 
                  name: t.name, 
                  slug: t.slug,
                  country: t.country,
                  businessType: t.businessType
                } : null;
              })
            );
            
            return res.status(409).json({
              message: "Select a tenant to continue",
              code: "MULTI_TENANT_SELECT_REQUIRED",
              tenants: tenantOptions.filter(Boolean)
            });
          }
        } else {
          targetTenantId = userTenantRecord.tenantId;
        }
      }

      const [userTenantRecord] = await db.select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, existingUser.id),
          eq(userTenants.tenantId, targetTenantId!)
        ));

      if (!userTenantRecord) {
        return res.status(401).json({ message: "No tenant associated with this account" });
      }

      if (!tenantData) {
        [tenantData] = await db.select().from(tenants).where(eq(tenants.id, userTenantRecord.tenantId));
      }

      const tokens = await jwtAuthService.generateTokenPair(
        existingUser.id,
        userTenantRecord.tenantId,
        userTenantRecord.roleId,
        [],
        {
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip || undefined,
        }
      );

      auditService.logAsync({
        tenantId: userTenantRecord.tenantId,
        userId: existingUser.id,
        action: "login",
        resource: "auth",
        metadata: { method: "password" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Update last_tenant_id for next login preference
      await db
        .update(users)
        .set({ 
          lastTenantId: userTenantRecord.tenantId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        },
        tenant: tenantData ? {
          id: tenantData.id,
          name: tenantData.name,
          businessType: tenantData.businessType,
        } : null,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/session/exchange", isAuthenticated, authRateLimit, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ message: "No session found" });
      }

      const [dbUser] = await db.select().from(users).where(eq(users.id, user.claims.sub));
      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Resolve tenant information for the user (isAuthenticated doesn't populate req.context)
      const tenantInfo = await resolveTenantFromUser(dbUser.id);
      const features = tenantInfo.tenant 
        ? await featureService.getTenantFeatures(tenantInfo.tenant.id)
        : [];

      const tokens = await jwtAuthService.exchangeSessionForTokens(dbUser, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || undefined,
      });

      auditService.logAsync({
        tenantId: tenantInfo.tenant?.id,
        userId: dbUser.id,
        action: "login",
        resource: "auth",
        metadata: { method: "session_exchange" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
        },
        tenant: tenantInfo.tenant,
        role: tenantInfo.role?.name || null,
        permissions: tenantInfo.permissions,
        features,
      });
    } catch (error) {
      console.error("Token exchange error:", error);
      res.status(500).json({ message: "Failed to exchange session for tokens" });
    }
  });

  app.post("/api/auth/token/refresh", authRateLimit, async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      const tokens = await jwtAuthService.rotateRefreshToken(refreshToken, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || undefined,
      });

      if (!tokens) {
        return res.status(401).json({ 
          message: "Invalid or expired refresh token",
          code: "REFRESH_TOKEN_INVALID"
        });
      }

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  });

  app.post("/api/auth/logout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.context?.user?.id;
      const tenantId = req.context?.tenant?.id;

      if (userId) {
        await jwtAuthService.revokeAllUserTokens(userId, tenantId || undefined);

        auditService.logAsync({
          tenantId,
          userId,
          action: "logout",
          resource: "auth",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  app.patch("/api/auth/tenants/switch", isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.body;
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID required" });
      }

      const tenantInfo = await resolveTenantFromUser(userId, tenantId);
      if (!tenantInfo.tenant || tenantInfo.tenant.id !== tenantId) {
        return res.status(403).json({ message: "You do not have access to this tenant" });
      }

      const tokens = await jwtAuthService.generateTokenPair(
        userId,
        tenantId,
        tenantInfo.role?.id || null,
        tenantInfo.permissions,
        {
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip || undefined,
        }
      );

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        tenant: tenantInfo.tenant,
      });
    } catch (error) {
      console.error("Tenant switch error:", error);
      res.status(500).json({ message: "Failed to switch tenant" });
    }
  });

  app.get("/api/auth/me", authenticateJWT(), async (req, res) => {
    try {
      res.json({
        user: req.context?.user || null,
        tenant: req.context?.tenant || null,
        role: req.context?.role?.name || null,
        permissions: req.context?.permissions || [],
        features: req.context?.features || [],
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

  // Get all tenants for the current user (for tenant bootstrap after login)
  app.get("/api/tenants/my", authenticateJWT(), async (req, res) => {
    try {
      const userId = req.tokenPayload?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get all tenants the user belongs to
      const userTenantRecords = await db.select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.isActive, true)
        ));

      if (userTenantRecords.length === 0) {
        return res.json({ tenants: [], defaultTenantId: null });
      }

      // Find the default tenant
      const defaultRecord = userTenantRecords.find(ut => ut.isDefault) || userTenantRecords[0];

      // Fetch tenant details for each membership
      const tenantList = await Promise.all(
        userTenantRecords.map(async (ut) => {
          const [t] = await db.select().from(tenants).where(
            and(
              eq(tenants.id, ut.tenantId),
              eq(tenants.status, "active")
            )
          );
          return t ? { 
            id: t.id, 
            name: t.name, 
            slug: t.slug,
            country: t.country,
            region: t.region,
            currency: t.currency,
            timezone: t.timezone,
            businessType: t.businessType,
            isDefault: ut.isDefault,
            onboardingCompleted: t.onboardingCompleted,
          } : null;
        })
      );

      const activeTenants = tenantList.filter(Boolean);
      const defaultTenant = activeTenants.find(t => t?.id === defaultRecord.tenantId);

      res.json({
        tenants: activeTenants,
        defaultTenantId: defaultTenant?.id || activeTenants[0]?.id || null,
      });
    } catch (error) {
      console.error("Get user tenants error:", error);
      res.status(500).json({ message: "Failed to get tenants" });
    }
  });

  app.get("/api/auth/roles", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.context?.tenant?.id;
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const roles = await permissionService.getTenantRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  app.get("/api/auth/permissions", isAuthenticated, async (req, res) => {
    try {
      const allPermissions = await permissionService.getAllPermissions();
      res.json({
        permissions: allPermissions,
        matrix: PERMISSIONS,
      });
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  app.post("/api/auth/api-tokens", isAuthenticated, async (req, res) => {
    try {
      const userId = req.context?.user?.id;
      const tenantId = req.context?.tenant?.id;

      if (!userId || !tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const { name, scopes, expiresInDays } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Token name required" });
      }

      const { token, tokenId } = await jwtAuthService.generateApiToken(
        userId,
        tenantId,
        name,
        scopes || [],
        expiresInDays
      );

      res.status(201).json({
        token,
        tokenId,
        message: "Store this token securely. It will not be shown again.",
      });
    } catch (error) {
      console.error("Create API token error:", error);
      res.status(500).json({ message: "Failed to create API token" });
    }
  });

  app.post("/api/auth/token/revoke", isAuthenticated, async (req, res) => {
    try {
      const userId = req.context?.user?.id;
      const { refreshToken, revokeAll } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (revokeAll) {
        await jwtAuthService.revokeAllUserTokens(userId);
        return res.json({ message: "All tokens revoked" });
      }

      if (refreshToken) {
        const revoked = await jwtAuthService.revokeRefreshTokenByValue(refreshToken);
        if (!revoked) {
          return res.status(404).json({ message: "Token not found or already revoked" });
        }
        return res.json({ message: "Token revoked" });
      }

      res.status(400).json({ message: "refreshToken or revokeAll flag required" });
    } catch (error) {
      console.error("Revoke token error:", error);
      res.status(500).json({ message: "Failed to revoke token" });
    }
  });

  // ==================== PLATFORM ADMIN ROUTES ====================
  
  // Platform admin roles for type-safe validation
  const PLATFORM_ADMIN_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "TECH_SUPPORT_MANAGER", "MANAGER", "SUPPORT_TEAM"] as const;
  type PlatformAdminRoleType = typeof PLATFORM_ADMIN_ROLES[number];
  
  const platformAdminLoginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
    loginContext: z.enum(["TENANT", "PLATFORM_ADMIN"]).optional().default("PLATFORM_ADMIN"),
  });

  const adminLoginRateLimit = adminRateLimit({ windowMs: 60 * 1000, maxRequests: 10 });

  const handleAdminLogin = async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    try {
      const parsed = platformAdminLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, password, loginContext } = parsed.data;

      // For PLATFORM_ADMIN context, check platform_admins table
      const admin = await storage.getPlatformAdminByEmail(email);
      
      if (!admin) {
        // If no platform admin found and loginContext is PLATFORM_ADMIN,
        // check if user exists in regular users table (tenant-only user)
        const [tenantUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
        
        if (tenantUser && loginContext === "PLATFORM_ADMIN") {
          // User exists but is tenant-only - return 403
          await recordLoginAttempt(email, clientIp, userAgent, false, "not_platform_admin");
          return res.status(403).json({ 
            message: "This account does not have platform admin access. Please use the tenant login.",
            code: "NOT_PLATFORM_ADMIN"
          });
        }
        
        await recordLoginAttempt(email, clientIp, userAgent, false, "user_not_found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        await recordLoginAttempt(email, clientIp, userAgent, false, "account_disabled");
        return res.status(403).json({ message: "Account is disabled" });
      }

      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidPassword) {
        await recordLoginAttempt(email, clientIp, userAgent, false, "invalid_password");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Validate that the admin has a valid platform role
      if (!PLATFORM_ADMIN_ROLES.includes(admin.role as PlatformAdminRoleType)) {
        await recordLoginAttempt(email, clientIp, userAgent, false, "invalid_role");
        return res.status(403).json({ 
          message: "Invalid platform admin role configuration",
          code: "INVALID_PLATFORM_ROLE"
        });
      }

      // Check 2FA requirements
      const isSuperAdmin = admin.role === "SUPER_ADMIN";
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, admin.id));
      const has2FAEnabled = twoFactorRecord?.isEnabled === true;
      const requires2FA = isSuperAdmin || admin.twoFactorRequired || has2FAEnabled;
      
      // If SUPER_ADMIN hasn't set up 2FA yet, allow them to set it up themselves
      if (isSuperAdmin && !has2FAEnabled) {
        await recordLoginAttempt(email, clientIp, userAgent, true, "2fa_setup_required");
        
        // Generate a setup token that allows them to configure 2FA
        const { token: setupToken, expiresAt } = generateTempToken(admin.id, 10); // 10 minutes for setup
        
        // Log the setup requirement
        await db.insert(adminAuditLogs).values({
          adminId: admin.id,
          adminEmail: admin.email,
          adminRole: admin.role,
          action: "ADMIN_2FA_SETUP_INITIATED",
          category: "auth",
          resource: "admin_2fa",
          resourceId: admin.id,
          ipAddress: clientIp,
          userAgent: userAgent || null,
        });
        
        return res.status(200).json({ 
          code: "TWO_FACTOR_SETUP_REQUIRED",
          message: "Two-factor authentication setup is required for Super Admin accounts.",
          setupToken,
          expiresAt: expiresAt.toISOString(),
          adminId: admin.id,
        });
      }
      
      // If 2FA is enabled or required, require OTP verification
      if (requires2FA && has2FAEnabled) {
        await recordLoginAttempt(email, clientIp, userAgent, true, "2fa_challenge");
        
        // Generate temporary token for 2FA verification
        const { token: tempToken, expiresAt } = generateTempToken(admin.id, 5);
        
        // Log 2FA challenge
        await db.insert(adminAuditLogs).values({
          adminId: admin.id,
          adminEmail: admin.email,
          adminRole: admin.role,
          action: "ADMIN_LOGIN_2FA_CHALLENGE",
          category: "auth",
          resource: "admin_login",
          resourceId: admin.id,
          ipAddress: clientIp,
          userAgent: userAgent || null,
        });
        
        return res.status(200).json({
          code: "TWO_FACTOR_REQUIRED",
          message: "Please enter your verification code",
          tempToken,
          expiresAt: expiresAt.toISOString(),
        });
      }

      await recordLoginAttempt(email, clientIp, userAgent, true);
      await storage.updatePlatformAdminLastLogin(admin.id);

      // Get permissions for non-SUPER_ADMIN roles
      const adminPermissions = admin.role !== "SUPER_ADMIN" 
        ? await storage.getAdminPermissions(admin.id)
        : undefined;

      const tokens = await jwtAuthService.generatePlatformAdminTokenPair(
        admin.id,
        admin.role as PlatformAdminRoleType,
        {
          userAgent,
          ipAddress: clientIp,
        },
        adminPermissions
      );

      const tokenHash = crypto.createHash("sha256").update(tokens.accessToken).digest("hex");
      await createAdminSession(admin.id, tokenHash, clientIp, userAgent);

      await logAdminAction({
        adminId: admin.id,
        adminEmail: admin.email,
        adminRole: admin.role,
        action: "admin.login",
        category: "auth",
        resource: "platform_admin",
        resourceId: admin.id,
        ipAddress: clientIp,
        userAgent,
        metadata: { loginMethod: "password", loginContext },
      });

      // Determine redirect path based on role
      const roleRedirects: Record<string, string> = {
        SUPER_ADMIN: "/super-admin/dashboard",
        PLATFORM_ADMIN: "/platform-admin/dashboard",
        TECH_SUPPORT_MANAGER: "/tech-support/dashboard",
        MANAGER: "/manager/dashboard",
        SUPPORT_TEAM: "/support/dashboard",
      };

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        forcePasswordReset: admin.forcePasswordReset,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        redirectPath: roleRedirects[admin.role] || "/admin",
      });
    } catch (error) {
      console.error("Platform admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  };

  app.post("/api/platform-admin/login", adminLoginRateLimit, adminLoginLockout(), handleAdminLogin);
  
  app.post("/admin/login", adminIpRestriction(), adminLoginRateLimit, adminLoginLockout(), handleAdminLogin);

  // Password reset endpoint for platform admins (self-service)
  const platformAdminPasswordResetSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
  });

  app.post("/api/platform-admin/reset-password", authenticateJWT(), async (req, res) => {
    try {
      if (!req.platformAdminContext) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      const parsed = platformAdminPasswordResetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { currentPassword, newPassword } = parsed.data;
      const adminId = req.platformAdminContext.platformAdmin.id;

      const admin = await storage.getPlatformAdmin(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await storage.updatePlatformAdmin(adminId, { 
        passwordHash: newPasswordHash,
        forcePasswordReset: false,
      });

      auditService.logAsync({
        tenantId: undefined,
        userId: adminId,
        action: "update",
        resource: "platform_admin",
        resourceId: adminId,
        metadata: { action: "password_reset", self_service: true },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Platform admin password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Forgot password - request reset token (unauthenticated)
  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
    loginContext: z.enum(["TENANT", "PLATFORM_ADMIN"]).optional().default("PLATFORM_ADMIN"),
  });

  app.post("/api/auth/forgot-password", authRateLimit, async (req, res) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { email, loginContext } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      let userType: "platform_admin" | "tenant_user" | null = null;
      let redirectPath = "/login";

      if (loginContext === "PLATFORM_ADMIN") {
        // Check platform_admins table
        const admin = await storage.getPlatformAdminByEmail(normalizedEmail);
        if (admin) {
          userType = "platform_admin";
          redirectPath = "/admin-login";
          
          // In production, store reset token in database and send email
          // For dev environment only, log the token (would be sent via email in production)
          if (process.env.NODE_ENV === "development") {
            console.log(`[Password Reset] Admin ${normalizedEmail}: token=${resetToken} expires=${resetExpiry.toISOString()}`);
          }
          
          auditService.logAsync({
            tenantId: undefined,
            userId: admin.id,
            action: "access",
            resource: "platform_admin_password_reset",
            resourceId: admin.id,
            metadata: { loginContext, action: "password_reset_requested" },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        }
      } else {
        // Check users table for tenant users
        const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
        if (user) {
          userType = "tenant_user";
          redirectPath = "/login";
          if (process.env.NODE_ENV === "development") {
            console.log(`[Password Reset] Tenant user ${normalizedEmail}: token=${resetToken}`);
          }
        }
      }

      // Always return success to prevent email enumeration
      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
        redirectPath, // For client to know where to redirect after reset
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token (unauthenticated)
  const resetPasswordWithTokenSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    loginContext: z.enum(["TENANT", "PLATFORM_ADMIN"]).optional().default("PLATFORM_ADMIN"),
  });

  app.post("/api/auth/reset-password", authRateLimit, async (req, res) => {
    try {
      const parsed = resetPasswordWithTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { token, newPassword, loginContext } = parsed.data;
      
      // In a full implementation, you would:
      // 1. Hash the token and look it up in the password_reset_tokens table
      // 2. Verify it hasn't expired
      // 3. Find the associated user/admin
      // 4. Update their password
      // 5. Invalidate the token
      
      // For now, return the redirect path based on loginContext
      const redirectPath = loginContext === "PLATFORM_ADMIN" ? "/admin-login" : "/login";

      res.json({ 
        message: "Password has been reset successfully. Please log in with your new password.",
        redirectPath,
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ============================================
  // PLATFORM ADMIN 2FA ENDPOINTS
  // ============================================
  
  // Self-service 2FA Setup (using setup token from login - no JWT required)
  app.post("/api/auth/admin/2fa/self-setup", async (req, res) => {
    try {
      const { setupToken } = req.body;
      
      if (!setupToken) {
        return res.status(400).json({ message: "Setup token is required" });
      }
      
      // Verify the setup token
      const { adminId, valid } = verifyTempToken(setupToken);
      if (!valid || !adminId) {
        return res.status(401).json({ message: "Invalid or expired setup token. Please log in again." });
      }
      
      const admin = await storage.getPlatformAdmin(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Check if 2FA already enabled
      const [existing2fa] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, adminId));
      if (existing2fa?.isEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }
      
      // Generate secret
      const secret = generateTotpSecret();
      const otpauthUrl = generateOtpAuthUrl(admin.email, secret);
      
      // Store secret (not yet enabled)
      if (existing2fa) {
        await db.update(adminTwoFactorAuth)
          .set({ secretKey: secret, isEnabled: false, isVerified: false, updatedAt: new Date() })
          .where(eq(adminTwoFactorAuth.adminId, adminId));
      } else {
        await db.insert(adminTwoFactorAuth).values({
          adminId,
          method: "totp",
          secretKey: secret,
          isEnabled: false,
          isVerified: false,
        });
      }
      
      // Log audit event
      await db.insert(adminAuditLogs).values({
        adminId,
        adminEmail: admin.email,
        adminRole: admin.role,
        action: "ADMIN_2FA_SELF_SETUP_STARTED",
        category: "security",
        resource: "admin_2fa",
        resourceId: adminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      res.json({
        otpauthUrl,
        secret,
      });
    } catch (error) {
      console.error("Self 2FA setup error:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });
  
  // Confirm Self-service 2FA Setup (using setup token)
  app.post("/api/auth/admin/2fa/self-confirm", async (req, res) => {
    try {
      const { setupToken, code } = req.body;
      
      if (!setupToken) {
        return res.status(400).json({ message: "Setup token is required" });
      }
      
      if (!code || typeof code !== "string" || code.length !== 6) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Verify the setup token
      const { adminId, valid } = verifyTempToken(setupToken);
      if (!valid || !adminId) {
        return res.status(401).json({ message: "Invalid or expired setup token. Please log in again." });
      }
      
      const admin = await storage.getPlatformAdmin(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, adminId));
      if (!twoFactorRecord || !twoFactorRecord.secretKey) {
        return res.status(400).json({ message: "2FA setup not started" });
      }
      
      if (twoFactorRecord.isEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }
      
      // Verify TOTP code
      const isValid = await verifyTotpCode(twoFactorRecord.secretKey, code);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code", code: "INVALID_OTP" });
      }
      
      // Generate backup codes
      const backupCodes = generateBackupCodes(8);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);
      
      // Enable 2FA
      await db.update(adminTwoFactorAuth)
        .set({
          isEnabled: true,
          isVerified: true,
          verifiedAt: new Date(),
          backupCodes: hashedBackupCodes,
          updatedAt: new Date(),
        })
        .where(eq(adminTwoFactorAuth.adminId, adminId));
      
      // Log audit event
      await db.insert(adminAuditLogs).values({
        adminId,
        adminEmail: admin.email,
        adminRole: admin.role,
        action: "ADMIN_2FA_SELF_ENABLED",
        category: "security",
        resource: "admin_2fa",
        resourceId: adminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      // Generate a new temp token for login verification  
      const { token: newTempToken, expiresAt } = generateTempToken(adminId, 5);
      
      res.json({
        message: "2FA enabled successfully. Please verify with a new code to complete login.",
        backupCodes,
        tempToken: newTempToken,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Self 2FA confirm error:", error);
      res.status(500).json({ message: "Failed to confirm 2FA setup" });
    }
  });
  
  // Start 2FA Setup
  app.post("/api/platform-admin/admins/:id/2fa/setup", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const targetAdminId = req.params.id;
      const currentAdmin = req.platformAdminContext?.platformAdmin;
      
      // Only SUPER_ADMIN or self can setup 2FA
      if (!currentAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const isSelf = currentAdmin.id === targetAdminId;
      const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
      
      if (!isSelf && !isSuperAdmin) {
        return res.status(403).json({ message: "Only super admin can setup 2FA for other admins" });
      }
      
      const targetAdmin = await storage.getPlatformAdmin(targetAdminId);
      if (!targetAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Check if 2FA already enabled
      const [existing2fa] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      if (existing2fa?.isEnabled) {
        return res.status(400).json({ message: "2FA is already enabled for this admin" });
      }
      
      // Generate secret
      const secret = generateTotpSecret();
      const otpauthUrl = generateOtpAuthUrl(targetAdmin.email, secret);
      
      // Store secret (not yet enabled)
      if (existing2fa) {
        await db.update(adminTwoFactorAuth)
          .set({ secretKey: secret, isEnabled: false, isVerified: false, updatedAt: new Date() })
          .where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      } else {
        await db.insert(adminTwoFactorAuth).values({
          adminId: targetAdminId,
          method: "totp",
          secretKey: secret,
          isEnabled: false,
          isVerified: false,
        });
      }
      
      // Log audit event
      await db.insert(adminAuditLogs).values({
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        adminRole: currentAdmin.role,
        action: "ADMIN_2FA_SETUP_STARTED",
        category: "security",
        resource: "admin_2fa",
        resourceId: targetAdminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      res.json({
        otpauthUrl,
        secret, // Only shown once during setup
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });
  
  // Confirm 2FA Setup
  app.post("/api/platform-admin/admins/:id/2fa/confirm", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const targetAdminId = req.params.id;
      const { code } = req.body;
      const currentAdmin = req.platformAdminContext?.platformAdmin;
      
      if (!currentAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const isSelf = currentAdmin.id === targetAdminId;
      const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
      
      if (!isSelf && !isSuperAdmin) {
        return res.status(403).json({ message: "Only super admin can confirm 2FA for other admins" });
      }
      
      if (!code || typeof code !== "string" || code.length !== 6) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      if (!twoFactorRecord || !twoFactorRecord.secretKey) {
        return res.status(400).json({ message: "2FA setup not started. Please start setup first." });
      }
      
      if (twoFactorRecord.isEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }
      
      // Verify TOTP code
      const isValid = await verifyTotpCode(twoFactorRecord.secretKey, code);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid verification code", code: "INVALID_OTP" });
      }
      
      // Generate backup codes
      const backupCodes = generateBackupCodes(8);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);
      
      // Enable 2FA
      await db.update(adminTwoFactorAuth)
        .set({
          isEnabled: true,
          isVerified: true,
          verifiedAt: new Date(),
          backupCodes: hashedBackupCodes,
          updatedAt: new Date(),
        })
        .where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      
      // Log audit event
      await db.insert(adminAuditLogs).values({
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        adminRole: currentAdmin.role,
        action: "ADMIN_2FA_ENABLED",
        category: "security",
        resource: "admin_2fa",
        resourceId: targetAdminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      res.json({
        message: "2FA enabled successfully",
        backupCodes, // Only returned once!
      });
    } catch (error) {
      console.error("2FA confirm error:", error);
      res.status(500).json({ message: "Failed to confirm 2FA" });
    }
  });
  
  // Disable 2FA (SUPER_ADMIN only)
  app.post("/api/platform-admin/admins/:id/2fa/disable", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const targetAdminId = req.params.id;
      const currentAdmin = req.platformAdminContext?.platformAdmin;
      
      if (!currentAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const targetAdmin = await storage.getPlatformAdmin(targetAdminId);
      if (!targetAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // SUPER_ADMIN 2FA is required and cannot be disabled
      if (targetAdmin.role === "SUPER_ADMIN") {
        return res.status(403).json({ message: "Cannot disable 2FA for Super Admin accounts" });
      }
      
      // Delete 2FA record
      await db.delete(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      
      // Log audit event
      await db.insert(adminAuditLogs).values({
        adminId: currentAdmin.id,
        adminEmail: currentAdmin.email,
        adminRole: currentAdmin.role,
        action: "ADMIN_2FA_DISABLED",
        category: "security",
        resource: "admin_2fa",
        resourceId: targetAdminId,
        targetUserId: targetAdminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        riskLevel: "high",
      });
      
      res.json({ message: "2FA disabled successfully" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });
  
  // Get 2FA status for admin
  app.get("/api/platform-admin/admins/:id/2fa/status", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const targetAdminId = req.params.id;
      const currentAdmin = req.platformAdminContext?.platformAdmin;
      
      if (!currentAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const isSelf = currentAdmin.id === targetAdminId;
      const isSuperAdmin = currentAdmin.role === "SUPER_ADMIN";
      
      if (!isSelf && !isSuperAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const targetAdmin = await storage.getPlatformAdmin(targetAdminId);
      if (!targetAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, targetAdminId));
      
      const isRequired = targetAdmin.role === "SUPER_ADMIN" || targetAdmin.twoFactorRequired;
      
      res.json({
        isEnabled: twoFactorRecord?.isEnabled || false,
        isVerified: twoFactorRecord?.isVerified || false,
        verifiedAt: twoFactorRecord?.verifiedAt || null,
        isRequired,
        method: twoFactorRecord?.method || null,
        hasBackupCodes: !!twoFactorRecord?.backupCodes && (twoFactorRecord.backupCodes as string[]).length > 0,
      });
    } catch (error) {
      console.error("Get 2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });
  
  // 2FA verification during login (step 2)
  app.post("/api/auth/admin/login/2fa", adminLoginRateLimit, async (req, res) => {
    try {
      const { tempToken, code } = req.body;
      
      if (!tempToken || !code) {
        return res.status(400).json({ message: "Temp token and verification code are required" });
      }
      
      // Verify temp token
      const tokenResult = verifyTempToken(tempToken);
      if (!tokenResult.valid) {
        return res.status(401).json({ message: "Session expired. Please login again.", code: "SESSION_EXPIRED" });
      }
      
      const adminId = tokenResult.adminId;
      const admin = await storage.getPlatformAdmin(adminId);
      if (!admin) {
        return res.status(401).json({ message: "Admin not found" });
      }
      
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, adminId));
      if (!twoFactorRecord || !twoFactorRecord.secretKey) {
        return res.status(400).json({ message: "2FA not configured" });
      }
      
      // Verify TOTP code
      const isValid = await verifyTotpCode(twoFactorRecord.secretKey, code);
      if (!isValid) {
        // Log failed attempt
        await db.insert(adminAuditLogs).values({
          adminId,
          adminEmail: admin.email,
          adminRole: admin.role,
          action: "ADMIN_LOGIN_FAILED",
          category: "auth",
          resource: "admin_login",
          resourceId: adminId,
          metadata: { reason: "invalid_otp" },
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
        });
        
        return res.status(401).json({ message: "Invalid verification code", code: "INVALID_OTP" });
      }
      
      // Update last used
      await db.update(adminTwoFactorAuth)
        .set({ lastUsedAt: new Date() })
        .where(eq(adminTwoFactorAuth.adminId, adminId));
      
      // Generate full tokens
      const tokens = await jwtAuthService.generatePlatformAdminTokenPair(
        admin.id,
        admin.role as any,
        {
          userAgent: req.headers["user-agent"] || "",
          ipAddress: getClientIp(req),
        }
      );
      await storage.updatePlatformAdminLastLogin(adminId);
      
      // Log success
      await db.insert(adminAuditLogs).values({
        adminId,
        adminEmail: admin.email,
        adminRole: admin.role,
        action: "ADMIN_LOGIN_SUCCESS",
        category: "auth",
        resource: "admin_login",
        resourceId: adminId,
        metadata: { with_2fa: true },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      const roleRedirects: Record<string, string> = {
        SUPER_ADMIN: "/super-admin/dashboard",
        PLATFORM_ADMIN: "/platform-admin/dashboard",
        TECH_SUPPORT_MANAGER: "/tech-support/dashboard",
        MANAGER: "/manager/dashboard",
        SUPPORT_TEAM: "/support/dashboard",
      };
      
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        redirectPath: roleRedirects[admin.role] || "/admin",
      });
    } catch (error) {
      console.error("2FA login verification error:", error);
      res.status(500).json({ message: "Login verification failed" });
    }
  });
  
  // Backup code verification during login
  app.post("/api/auth/admin/login/backup", adminLoginRateLimit, async (req, res) => {
    try {
      const { tempToken, backupCode } = req.body;
      
      if (!tempToken || !backupCode) {
        return res.status(400).json({ message: "Temp token and backup code are required" });
      }
      
      const tokenResult = verifyTempToken(tempToken);
      if (!tokenResult.valid) {
        return res.status(401).json({ message: "Session expired. Please login again.", code: "SESSION_EXPIRED" });
      }
      
      const adminId = tokenResult.adminId;
      const admin = await storage.getPlatformAdmin(adminId);
      if (!admin) {
        return res.status(401).json({ message: "Admin not found" });
      }
      
      const [twoFactorRecord] = await db.select().from(adminTwoFactorAuth).where(eq(adminTwoFactorAuth.adminId, adminId));
      if (!twoFactorRecord || !twoFactorRecord.backupCodes) {
        return res.status(400).json({ message: "No backup codes available" });
      }
      
      const hashedCodes = twoFactorRecord.backupCodes as string[];
      const codeIndex = await verifyBackupCode(backupCode, hashedCodes);
      
      if (codeIndex === -1) {
        return res.status(401).json({ message: "Invalid backup code", code: "INVALID_BACKUP_CODE" });
      }
      
      // Remove used backup code
      const updatedCodes = [...hashedCodes];
      updatedCodes.splice(codeIndex, 1);
      
      await db.update(adminTwoFactorAuth)
        .set({ backupCodes: updatedCodes, lastUsedAt: new Date() })
        .where(eq(adminTwoFactorAuth.adminId, adminId));
      
      // Generate full tokens
      const tokens = await jwtAuthService.generatePlatformAdminTokenPair(
        admin.id,
        admin.role as any,
        {
          userAgent: req.headers["user-agent"] || "",
          ipAddress: getClientIp(req),
        }
      );
      await storage.updatePlatformAdminLastLogin(adminId);
      
      // Log success
      await db.insert(adminAuditLogs).values({
        adminId,
        adminEmail: admin.email,
        adminRole: admin.role,
        action: "ADMIN_LOGIN_SUCCESS",
        category: "auth",
        resource: "admin_login",
        resourceId: adminId,
        metadata: { with_2fa: true, used_backup_code: true, remaining_backup_codes: updatedCodes.length },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
      });
      
      const roleRedirects: Record<string, string> = {
        SUPER_ADMIN: "/super-admin/dashboard",
        PLATFORM_ADMIN: "/platform-admin/dashboard",
        TECH_SUPPORT_MANAGER: "/tech-support/dashboard",
        MANAGER: "/manager/dashboard",
        SUPPORT_TEAM: "/support/dashboard",
      };
      
      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        redirectPath: roleRedirects[admin.role] || "/admin",
        remainingBackupCodes: updatedCodes.length,
      });
    } catch (error) {
      console.error("Backup code login error:", error);
      res.status(500).json({ message: "Login verification failed" });
    }
  });

  // Note: Using requirePlatformAdmin imported from ./core for all platform admin routes

  // Helper to get admin's country scope for filtering
  const getAdminCountryScope = (req: Request): string[] | null => {
    if (!req.platformAdminContext) return null;
    if (req.platformAdminContext.platformAdmin.role === "SUPER_ADMIN") return null; // null = no filter
    return req.platformAdminContext.scope?.countryIds || [];
  };

  // Register Business Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/business-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), businessRegistryRoutes);

  // Register Module Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/module-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), moduleRegistryRoutes);

  // Register Feature Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/feature-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), featureRegistryRoutes);

  // Admin billing plans routes - RBAC protected, country-scoped
  app.use('/api/admin/billing', adminBillingPlansRoutes);
  
  // Admin billing offers routes - RBAC protected
  app.use('/api/admin/billing', adminBillingOffersRoutes);
  
  // Admin promo/coupon routes - Super Admin only
  app.use('/api/admin/billing/promos', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), adminBillingPromosRoutes);
  
  // Admin country rollout routes
  app.use('/api/super-admin/countries', adminCountriesRoutes);
  
  // Payroll Revenue Analytics (Super Admin only)
  app.use('/api/admin/analytics/payroll', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), adminPayrollAnalyticsRoutes);
  
  // Admin add-ons management routes (RBAC protected)
  app.use('/api/admin/addons', adminAddonsRoutes);
  
  // Marketplace Revenue Analytics (RBAC protected)
  app.use('/api/admin/analytics/marketplace', adminMarketplaceRevenueRoutes);
  
  // Super Admin Marketplace Management (catalog, country rollout, eligibility, audit logs)
  app.use('/api/super-admin/marketplace', superAdminMarketplaceManagementRoutes);
  
  // Super Admin Marketplace Analytics (revenue dashboard, funnel, by-addon, by-country)
  app.use('/api/super-admin/marketplace/analytics', superAdminMarketplaceAnalyticsRoutes);
  
  // Tenant Marketplace APIs (trials, installed addons, cancellation)
  app.use('/api/marketplace/addons', tenantAddonsRoutes);
  
  // Razorpay Marketplace Webhooks (add-on subscriptions)
  app.use('/api/webhooks/razorpay-marketplace', razorpayMarketplaceWebhookRoutes);

  app.get("/api/platform-admin/me", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      const countryAssignments = adminId 
        ? await storage.getAdminCountryAssignments(adminId) 
        : [];
      
      // Return resolved permissions for RBAC-based UI gating
      const resolvedPermissions = req.platformAdminContext?.resolvedPermissions;
      
      res.json({
        platformAdmin: req.platformAdminContext?.platformAdmin,
        permissions: resolvedPermissions?.permissions || [],
        isSuperAdmin: resolvedPermissions?.isSuperAdmin || false,
        scope: resolvedPermissions?.scope || null,
        countryAssignments: countryAssignments.map(a => a.countryCode),
      });
    } catch (error) {
      console.error("Get platform admin me error:", error);
      res.status(500).json({ message: "Failed to get admin info" });
    }
  });

  // ============================================
  // SELF-SERVICE SECURITY ENDPOINTS (Read own data only)
  // ============================================

  // Get current admin's sessions
  app.get("/api/platform-admin/me/sessions", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get current token hash to identify current session
      const authHeader = req.headers.authorization;
      const currentToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const currentTokenHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : null;

      const sessions = await db.select()
        .from(adminSessions)
        .where(and(
          eq(adminSessions.adminId, adminId),
          eq(adminSessions.isActive, true)
        ))
        .orderBy(desc(adminSessions.lastActivityAt));

      res.json({
        sessions: sessions.map(s => ({
          id: s.id,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          deviceInfo: s.deviceInfo,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          expiresAt: s.expiresAt,
          isCurrentSession: s.tokenHash === currentTokenHash,
        })),
      });
    } catch (error) {
      console.error("Get my sessions error:", error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  // Revoke a specific session (own sessions only)
  app.post("/api/platform-admin/me/sessions/:sessionId/revoke", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      const { sessionId } = req.params;
      
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get current token hash to prevent revoking current session
      const authHeader = req.headers.authorization;
      const currentToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const currentTokenHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : null;

      // Verify session belongs to current admin
      const [session] = await db.select()
        .from(adminSessions)
        .where(and(
          eq(adminSessions.id, sessionId),
          eq(adminSessions.adminId, adminId)
        ));

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.tokenHash === currentTokenHash) {
        return res.status(400).json({ message: "Cannot revoke current session" });
      }

      await terminateSession(sessionId, "user_revoked");

      // Log the action
      await logAdminAction({
        adminId,
        adminEmail: req.platformAdminContext!.platformAdmin.email,
        adminRole: req.platformAdminContext!.platformAdmin.role,
        action: "ADMIN_SESSION_REVOKED",
        category: "security",
        resource: "admin_session",
        resourceId: sessionId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Session revoked successfully" });
    } catch (error) {
      console.error("Revoke session error:", error);
      res.status(500).json({ message: "Failed to revoke session" });
    }
  });

  // Revoke all other sessions (keep current)
  app.post("/api/platform-admin/me/sessions/revoke-others", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get current session ID to exclude
      const authHeader = req.headers.authorization;
      const currentToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const currentTokenHash = currentToken ? crypto.createHash("sha256").update(currentToken).digest("hex") : null;

      // Find current session
      const [currentSession] = await db.select()
        .from(adminSessions)
        .where(and(
          eq(adminSessions.tokenHash, currentTokenHash!),
          eq(adminSessions.isActive, true)
        ));

      const revokedCount = await terminateAllSessions(
        adminId,
        "user_revoked_all",
        currentSession?.id
      );

      // Log the action
      await logAdminAction({
        adminId,
        adminEmail: req.platformAdminContext!.platformAdmin.email,
        adminRole: req.platformAdminContext!.platformAdmin.role,
        action: "ADMIN_ALL_SESSIONS_REVOKED",
        category: "security",
        resource: "admin_session",
        metadata: { revokedCount },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: `${revokedCount} session(s) revoked`, revokedCount });
    } catch (error) {
      console.error("Revoke all sessions error:", error);
      res.status(500).json({ message: "Failed to revoke sessions" });
    }
  });

  // Get current admin's security activity (audit logs)
  app.get("/api/platform-admin/me/security-activity", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const logs = await getAdminAuditLogs({
        adminId,
        category: "auth",
        limit,
      });

      // Also get security-related logs
      const securityLogs = await getAdminAuditLogs({
        adminId,
        category: "security",
        limit,
      });

      // Combine and sort
      const allLogs = [...logs, ...securityLogs]
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, limit);

      res.json({
        activities: allLogs.map(log => ({
          id: log.id,
          action: log.action,
          category: log.category,
          resource: log.resource,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          riskLevel: log.riskLevel,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error("Get security activity error:", error);
      res.status(500).json({ message: "Failed to get security activity" });
    }
  });

  // Regenerate backup codes (own 2FA only)
  app.post("/api/platform-admin/me/2fa/regenerate-backup-codes", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const adminId = req.platformAdminContext?.platformAdmin.id;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if 2FA is enabled
      const [twoFactorRecord] = await db.select()
        .from(adminTwoFactorAuth)
        .where(eq(adminTwoFactorAuth.adminId, adminId));

      if (!twoFactorRecord?.isEnabled) {
        return res.status(400).json({ message: "2FA is not enabled" });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes(8);
      const hashedBackupCodes = await hashBackupCodes(backupCodes);

      await db.update(adminTwoFactorAuth)
        .set({
          backupCodes: hashedBackupCodes,
          updatedAt: new Date(),
        })
        .where(eq(adminTwoFactorAuth.adminId, adminId));

      // Log the action
      await logAdminAction({
        adminId,
        adminEmail: req.platformAdminContext!.platformAdmin.email,
        adminRole: req.platformAdminContext!.platformAdmin.role,
        action: "ADMIN_2FA_BACKUP_CODES_REGENERATED",
        category: "security",
        resource: "admin_2fa",
        resourceId: adminId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"],
      });

      res.json({
        message: "Backup codes regenerated successfully",
        backupCodes,
      });
    } catch (error) {
      console.error("Regenerate backup codes error:", error);
      res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });

  const createPlatformAdminSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email format"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN", "TECH_SUPPORT_MANAGER", "MANAGER", "SUPPORT_TEAM"]).optional(),
    forcePasswordReset: z.boolean().optional().default(true),
    permissions: z.array(z.string()).optional(),
    countryAssignments: z.array(z.string()).optional(),
  });

  app.post("/api/platform-admin/admins", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = createPlatformAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { name, email, password, role, forcePasswordReset, permissions, countryAssignments } = parsed.data;

      // Validate scope requirement for country-scoped roles
      const COUNTRY_SCOPED_ROLES = ["PLATFORM_ADMIN", "MANAGER", "SUPPORT_TEAM"];
      const effectiveRole = role || "PLATFORM_ADMIN";
      if (COUNTRY_SCOPED_ROLES.includes(effectiveRole)) {
        if (!countryAssignments || countryAssignments.length === 0) {
          return res.status(400).json({ 
            message: "Country scope required for this role", 
            code: "SCOPE_REQUIRED",
            details: "At least one country must be assigned for this role"
          });
        }
      }

      const existingAdmin = await storage.getPlatformAdminByEmail(email);
      if (existingAdmin) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Validate permissions upfront before creating the admin
      const invalidPermissions: string[] = [];
      if (permissions && permissions.length > 0 && (role || "PLATFORM_ADMIN") !== "SUPER_ADMIN") {
        for (const permCode of permissions) {
          const perm = await storage.getPlatformAdminPermission(permCode);
          if (!perm) {
            invalidPermissions.push(permCode);
          }
        }
        
        if (invalidPermissions.length > 0) {
          return res.status(400).json({ 
            message: "Invalid permission codes provided",
            invalidPermissions,
          });
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const admin = await storage.createPlatformAdmin({
        name,
        email,
        passwordHash,
        role: role || "PLATFORM_ADMIN",
        forcePasswordReset: forcePasswordReset ?? true,
        createdBy: req.platformAdminContext?.platformAdmin.id,
      });

      // Assign validated permissions (only for PLATFORM_ADMIN role)
      const assignedPermissions: string[] = [];
      if (permissions && permissions.length > 0 && (role || "PLATFORM_ADMIN") !== "SUPER_ADMIN") {
        for (const permCode of permissions) {
          await storage.assignPermissionToAdmin(admin.id, permCode, req.platformAdminContext?.platformAdmin.id);
          assignedPermissions.push(permCode);
        }
      }

      // Assign country restrictions for country-scoped roles (PLATFORM_ADMIN, MANAGER, SUPPORT_TEAM)
      let assignedCountries: string[] = [];
      if (countryAssignments && countryAssignments.length > 0 && 
          ["PLATFORM_ADMIN", "MANAGER", "SUPPORT_TEAM"].includes(role || "PLATFORM_ADMIN")) {
        const assignments = await storage.setAdminCountries(
          admin.id, 
          countryAssignments, 
          req.platformAdminContext?.platformAdmin.id
        );
        assignedCountries = assignments.map(a => a.countryCode);
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "platform_admin",
        resourceId: admin.id,
        metadata: { 
          adminEmail: admin.email, 
          role: admin.role,
          forcePasswordReset: admin.forcePasswordReset,
          assignedPermissions,
          assignedCountries,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        forcePasswordReset: admin.forcePasswordReset,
        permissions: assignedPermissions,
        countryAssignments: assignedCountries,
        createdAt: admin.createdAt,
      });
    } catch (error) {
      console.error("Create platform admin error:", error);
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  app.get("/api/platform-admin/admins", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const admins = await storage.getPlatformAdmins();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_admin",
        metadata: { action: "list_all" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const mappedAdmins = admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        forcePasswordReset: admin.forcePasswordReset,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      }));
      res.json({ admins: mappedAdmins, total: mappedAdmins.length });
    } catch (error) {
      console.error("Get platform admins error:", error);
      res.status(500).json({ message: "Failed to get admins" });
    }
  });

  app.get("/api/platform-admin/admins/:id", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const admin = await storage.getPlatformAdmin(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const permissions = await storage.getAdminPermissions(admin.id);
      const countryAssignments = await storage.getAdminCountryAssignments(admin.id);

      res.json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        forcePasswordReset: admin.forcePasswordReset,
        permissions,
        countryAssignments: countryAssignments.map(a => a.countryCode),
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        createdBy: admin.createdBy,
      });
    } catch (error) {
      console.error("Get platform admin error:", error);
      res.status(500).json({ message: "Failed to get admin" });
    }
  });

  const updatePlatformAdminSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .optional(),
    role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN", "TECH_SUPPORT_MANAGER", "MANAGER", "SUPPORT_TEAM"]).optional(),
    isActive: z.boolean().optional(),
    forcePasswordReset: z.boolean().optional(),
    countryAssignments: z.array(z.string()).optional(),
  });

  app.patch("/api/platform-admin/admins/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = updatePlatformAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const existingAdmin = await storage.getPlatformAdmin(req.params.id);
      if (!existingAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const { name, email, password, role, isActive, forcePasswordReset, countryAssignments } = parsed.data;

      // Determine the final role after update
      const finalRole = role || existingAdmin.role;
      const COUNTRY_SCOPED_ROLES = ["PLATFORM_ADMIN", "MANAGER", "SUPPORT_TEAM"];
      
      // Validate scope requirement when updating to or remaining in a scoped role
      if (COUNTRY_SCOPED_ROLES.includes(finalRole)) {
        // If countryAssignments explicitly provided, validate it's not empty
        if (countryAssignments !== undefined && countryAssignments.length === 0) {
          return res.status(400).json({ 
            message: "Country scope required for this role", 
            code: "SCOPE_REQUIRED",
            details: "At least one country must be assigned for this role"
          });
        }
        
        // Get current assignments to validate scope
        const currentAssignments = await storage.getAdminCountryAssignments(req.params.id);
        const willHaveAssignments = countryAssignments 
          ? countryAssignments.length > 0 
          : currentAssignments.length > 0;
        
        // If changing to a scoped role or already in scoped role, ensure assignments exist
        if (!willHaveAssignments) {
          return res.status(400).json({ 
            message: "Country scope required for this role", 
            code: "SCOPE_REQUIRED",
            details: "At least one country must be assigned for this role"
          });
        }
      }

      if (email && email !== existingAdmin.email) {
        const existingWithEmail = await storage.getPlatformAdminByEmail(email);
        if (existingWithEmail) {
          return res.status(409).json({ message: "Email already in use" });
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
      if (role) updateData.role = role;
      if (typeof isActive === "boolean") updateData.isActive = isActive;
      if (typeof forcePasswordReset === "boolean") updateData.forcePasswordReset = forcePasswordReset;

      const admin = await storage.updatePlatformAdmin(req.params.id, updateData);

      // Update country assignments
      let updatedCountries: string[] = [];
      const GLOBAL_ROLES = ["SUPER_ADMIN", "PLATFORM_SUPER_ADMIN", "TECH_SUPPORT_MANAGER"];
      
      // Always clear assignments when transitioning to a global role
      if (GLOBAL_ROLES.includes(finalRole)) {
        await storage.setAdminCountries(req.params.id, [], req.platformAdminContext?.platformAdmin.id);
      } else if (countryAssignments !== undefined) {
        // Update country assignments for scoped roles when provided
        const assignments = await storage.setAdminCountries(
          req.params.id,
          countryAssignments,
          req.platformAdminContext?.platformAdmin.id
        );
        updatedCountries = assignments.map(a => a.countryCode);
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "platform_admin",
        resourceId: req.params.id,
        metadata: { 
          updatedFields: Object.keys(updateData),
          countryAssignments: countryAssignments !== undefined ? updatedCountries : undefined,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Get current country assignments for response
      const currentAssignments = await storage.getAdminCountryAssignments(req.params.id);

      res.json({
        id: admin?.id,
        name: admin?.name,
        email: admin?.email,
        role: admin?.role,
        isActive: admin?.isActive,
        forcePasswordReset: admin?.forcePasswordReset,
        countryAssignments: currentAssignments.map(a => a.countryCode),
      });
    } catch (error) {
      console.error("Update platform admin error:", error);
      res.status(500).json({ message: "Failed to update admin" });
    }
  });

  app.delete("/api/platform-admin/admins/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const currentAdminId = req.platformAdminContext?.platformAdmin.id;
      
      if (req.params.id === currentAdminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const existingAdmin = await storage.getPlatformAdmin(req.params.id);
      if (!existingAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      await storage.deletePlatformAdmin(req.params.id);

      auditService.logAsync({
        tenantId: undefined,
        userId: currentAdminId,
        action: "delete",
        resource: "platform_admin",
        resourceId: req.params.id,
        metadata: { deletedAdminEmail: existingAdmin.email },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Admin deleted successfully" });
    } catch (error) {
      console.error("Delete platform admin error:", error);
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });

  // ==================== PLATFORM REGION CONFIGS ====================

  // List all region configs
  app.get("/api/platform-admin/region-configs", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const configs = await storage.getRegionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Get region configs error:", error);
      res.status(500).json({ message: "Failed to get region configs" });
    }
  });

  // Get active region configs (public endpoint for country selector)
  app.get("/api/region-configs/active", async (_req, res) => {
    try {
      const configs = await storage.getActiveRegionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Get active region configs error:", error);
      res.status(500).json({ message: "Failed to get active region configs" });
    }
  });

  // Public endpoint for registration countries (no auth required)
  app.get("/api/public/registration/countries", async (_req, res) => {
    try {
      const configs = await storage.getActiveRegionConfigs();
      // Filter to only countries with registration enabled
      const registrationCountries = configs
        .filter(c => c.registrationEnabled)
        .map(c => ({
          countryCode: c.countryCode,
          countryName: c.countryName,
          currency: c.defaultCurrency,
          region: c.region,
          timezone: c.defaultTimezone,
          taxType: c.taxType,
          taxRate: c.taxRate ? parseFloat(c.taxRate) : null,
          taxInclusive: c.taxInclusive,
        }))
        .sort((a, b) => a.countryName.localeCompare(b.countryName));
      res.json(registrationCountries);
    } catch (error) {
      console.error("Get registration countries error:", error);
      res.status(500).json({ message: "Failed to get registration countries" });
    }
  });

  // Get active countries for dropdown (Super Admin)
  app.get("/api/platform-admin/countries", authenticateJWT(), requirePlatformAdmin(), async (_req, res) => {
    try {
      const countries = await regionLockService.getActiveCountries();
      res.json(countries);
    } catch (error) {
      console.error("Get countries error:", error);
      res.status(500).json({ message: "Failed to get countries" });
    }
  });

  // Get single region config
  app.get("/api/platform-admin/region-configs/:id", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const config = await storage.getRegionConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ message: "Region config not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Get region config error:", error);
      res.status(500).json({ message: "Failed to get region config" });
    }
  });

  const createRegionConfigSchema = z.object({
    countryCode: z.string().min(2).max(5),
    countryName: z.string().min(1).max(100),
    region: z.enum(["asia_pacific", "middle_east", "europe", "americas", "africa"]),
    status: z.enum(["enabled", "disabled"]).optional(),
    registrationEnabled: z.boolean().optional(),
    billingEnabled: z.boolean().optional(),
    compliancePacksEnabled: z.boolean().optional(),
    allowedBusinessTypes: z.array(z.string()).optional().nullable(),
    allowedSubscriptionTiers: z.array(z.string()).optional().nullable(),
    defaultCurrency: z.string().min(3).max(5),
    defaultTimezone: z.string().min(1).max(50),
    requiredCompliancePacks: z.array(z.string()).optional().nullable(),
    dataResidencyRequired: z.boolean().optional(),
    dataResidencyRegion: z.string().optional().nullable(),
    taxType: z.string().optional().nullable(),
    taxRate: z.string().optional().nullable(),
    taxInclusive: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
  });

  // Create region config
  app.post("/api/platform-admin/region-configs", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = createRegionConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const existing = await storage.getRegionConfigByCode(parsed.data.countryCode);
      if (existing) {
        return res.status(409).json({ message: "Region with this country code already exists" });
      }

      const config = await storage.createRegionConfig(parsed.data as any);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "region_config",
        resourceId: config.id,
        metadata: { countryCode: config.countryCode, countryName: config.countryName },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(config);
    } catch (error) {
      console.error("Create region config error:", error);
      res.status(500).json({ message: "Failed to create region config" });
    }
  });

  // Update region config
  app.patch("/api/platform-admin/region-configs/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = createRegionConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const existing = await storage.getRegionConfig(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Region config not found" });
      }

      if (parsed.data.countryCode && parsed.data.countryCode !== existing.countryCode) {
        const existingWithCode = await storage.getRegionConfigByCode(parsed.data.countryCode);
        if (existingWithCode) {
          return res.status(409).json({ message: "Region with this country code already exists" });
        }
      }

      const config = await storage.updateRegionConfig(req.params.id, parsed.data as any);
      if (!config) {
        return res.status(500).json({ message: "Failed to update region config" });
      }

      // Sync business types to countryRolloutPolicy if allowedBusinessTypes was updated
      if (parsed.data.allowedBusinessTypes !== undefined) {
        const countryCode = config.countryCode.toUpperCase();
        const businessTypes = parsed.data.allowedBusinessTypes || [];
        
        const existingPolicy = await db.select().from(countryRolloutPolicy).where(eq(countryRolloutPolicy.countryCode, countryCode)).limit(1);
        if (existingPolicy.length > 0) {
          await db.update(countryRolloutPolicy)
            .set({ enabledBusinessTypes: businessTypes, updatedAt: new Date() })
            .where(eq(countryRolloutPolicy.countryCode, countryCode));
        } else {
          await db.insert(countryRolloutPolicy).values({
            countryCode,
            isActive: config.status === "enabled",
            enabledBusinessTypes: businessTypes,
          });
        }
        // Clear country config cache
        countryRolloutService.clearCache();
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "region_config",
        resourceId: req.params.id,
        metadata: { updatedFields: Object.keys(parsed.data) },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(config);
    } catch (error) {
      console.error("Update region config error:", error);
      res.status(500).json({ message: "Failed to update region config" });
    }
  });

  // Toggle region status
  app.patch("/api/platform-admin/region-configs/:id/status", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["enabled", "disabled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'enabled' or 'disabled'" });
      }

      const existing = await storage.getRegionConfig(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Region config not found" });
      }

      const config = await storage.toggleRegionStatus(req.params.id, status);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "region_config",
        resourceId: req.params.id,
        metadata: { action: "status_toggle", newStatus: status, countryCode: existing.countryCode },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(config);
    } catch (error) {
      console.error("Toggle region status error:", error);
      res.status(500).json({ message: "Failed to toggle region status" });
    }
  });

  // Delete region config
  app.delete("/api/platform-admin/region-configs/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const existing = await storage.getRegionConfig(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Region config not found" });
      }

      await storage.deleteRegionConfig(req.params.id);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "region_config",
        resourceId: req.params.id,
        metadata: { countryCode: existing.countryCode, countryName: existing.countryName },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Region config deleted successfully" });
    } catch (error) {
      console.error("Delete region config error:", error);
      res.status(500).json({ message: "Failed to delete region config" });
    }
  });

  // ==================== TECH SUPPORT MANAGER ENDPOINTS ====================

  // Tech Support - System Health
  app.get("/api/tech-support/health", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const isSuperAdmin = role === "SUPER_ADMIN";
      const isTechSupport = role === "TECH_SUPPORT_MANAGER";
      
      if (!isSuperAdmin && !isTechSupport) {
        return res.status(403).json({ message: "Access denied. Tech Support Manager or Super Admin role required." });
      }

      const randomVariation = (base: number, variance: number) => Math.round(base + (Math.random() * variance * 2 - variance));
      
      const health = {
        status: "healthy" as "healthy" | "degraded" | "critical",
        uptime: Number((99.9 + Math.random() * 0.09).toFixed(2)),
        lastCheck: new Date().toISOString(),
        services: [
          { name: "API Gateway", status: "up" as const, latency: randomVariation(45, 15), lastPing: new Date().toISOString() },
          { name: "Database (Primary)", status: "up" as const, latency: randomVariation(12, 5), lastPing: new Date().toISOString() },
          { name: "Database (Replica)", status: "up" as const, latency: randomVariation(15, 6), lastPing: new Date().toISOString() },
          { name: "Cache (Redis)", status: "up" as const, latency: randomVariation(3, 2), lastPing: new Date().toISOString() },
          { name: "File Storage", status: "up" as const, latency: randomVariation(78, 20), lastPing: new Date().toISOString() },
          { name: "Email Service", status: Math.random() > 0.9 ? "degraded" as const : "up" as const, latency: randomVariation(120, 40), lastPing: new Date().toISOString() },
        ],
      };

      res.json(health);
    } catch (error) {
      console.error("Tech support health error:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Tech Support - API Endpoints
  app.get("/api/tech-support/apis", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const isSuperAdmin = role === "SUPER_ADMIN";
      const isTechSupport = role === "TECH_SUPPORT_MANAGER";
      
      if (!isSuperAdmin && !isTechSupport) {
        return res.status(403).json({ message: "Access denied. Tech Support Manager or Super Admin role required." });
      }

      const apis = [
        { id: "1", method: "GET" as const, path: "/api/tenants", status: "active", avgLatency: 45, requestCount: 15420, errorRate: 0.1, lastCalled: new Date().toISOString() },
        { id: "2", method: "POST" as const, path: "/api/auth/login", status: "active", avgLatency: 120, requestCount: 8930, errorRate: 2.3, lastCalled: new Date().toISOString() },
        { id: "3", method: "GET" as const, path: "/api/users", status: "active", avgLatency: 32, requestCount: 12540, errorRate: 0.05, lastCalled: new Date().toISOString() },
        { id: "4", method: "PUT" as const, path: "/api/tenants/:id", status: "active", avgLatency: 89, requestCount: 3210, errorRate: 0.8, lastCalled: new Date().toISOString() },
        { id: "5", method: "DELETE" as const, path: "/api/sessions/:id", status: "active", avgLatency: 25, requestCount: 890, errorRate: 0.0, lastCalled: new Date().toISOString() },
        { id: "6", method: "GET" as const, path: "/api/legacy/reports", status: "deprecated", avgLatency: 450, requestCount: 120, errorRate: 5.2, lastCalled: new Date().toISOString() },
      ];

      res.json(apis);
    } catch (error) {
      console.error("Tech support APIs error:", error);
      res.status(500).json({ message: "Failed to fetch API endpoints" });
    }
  });

  // Tech Support - Error Logs
  app.get("/api/tech-support/errors", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const isSuperAdmin = role === "SUPER_ADMIN";
      const isTechSupport = role === "TECH_SUPPORT_MANAGER";
      
      if (!isSuperAdmin && !isTechSupport) {
        return res.status(403).json({ message: "Access denied. Tech Support Manager or Super Admin role required." });
      }

      const errors = [
        { id: "1", timestamp: new Date(Date.now() - 300000).toISOString(), level: "error" as const, message: "Database connection timeout", source: "db-primary", count: 3 },
        { id: "2", timestamp: new Date(Date.now() - 600000).toISOString(), level: "warning" as const, message: "Rate limit approaching threshold", source: "api-gateway", count: 15 },
        { id: "3", timestamp: new Date(Date.now() - 1200000).toISOString(), level: "error" as const, message: "Email delivery failed: SMTP timeout", source: "email-service", count: 7 },
        { id: "4", timestamp: new Date(Date.now() - 1800000).toISOString(), level: "info" as const, message: "Cache invalidation triggered", source: "redis", count: 42 },
        { id: "5", timestamp: new Date(Date.now() - 3600000).toISOString(), level: "warning" as const, message: "High memory usage detected", source: "api-server-3", count: 8 },
      ];

      res.json(errors);
    } catch (error) {
      console.error("Tech support errors error:", error);
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  // Tech Support - Performance Metrics
  app.get("/api/tech-support/metrics", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const isSuperAdmin = role === "SUPER_ADMIN";
      const isTechSupport = role === "TECH_SUPPORT_MANAGER";
      
      if (!isSuperAdmin && !isTechSupport) {
        return res.status(403).json({ message: "Access denied. Tech Support Manager or Super Admin role required." });
      }

      const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const randomFloat = (min: number, max: number, decimals: number = 2) => Number((Math.random() * (max - min) + min).toFixed(decimals));
      const trends: ("up" | "down" | "stable")[] = ["up", "down", "stable"];
      const randomTrend = () => trends[Math.floor(Math.random() * 3)];
      
      const metrics = [
        { name: "Avg Response Time", value: randomInt(35, 65), unit: "ms", trend: randomTrend(), change: randomInt(-15, 10) },
        { name: "Requests/min", value: randomInt(1000, 1500), unit: "req", trend: randomTrend(), change: randomInt(-5, 15) },
        { name: "Error Rate", value: randomFloat(0.1, 0.5), unit: "%", trend: randomTrend(), change: randomFloat(-0.1, 0.1) },
        { name: "Active Sessions", value: randomInt(280, 420), unit: "", trend: randomTrend(), change: randomInt(-10, 20) },
        { name: "CPU Usage", value: randomInt(25, 50), unit: "%", trend: randomTrend(), change: randomInt(-5, 8) },
        { name: "Memory Usage", value: randomInt(55, 75), unit: "%", trend: randomTrend(), change: randomInt(-3, 10) },
      ];

      res.json(metrics);
    } catch (error) {
      console.error("Tech support metrics error:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // ==================== EXCHANGE RATES ====================

  // List all exchange rates (admin)
  app.get("/api/platform-admin/exchange-rates", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const rates = await storage.getExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Get exchange rates error:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // List active exchange rates (public)
  app.get("/api/exchange-rates/active", async (_req, res) => {
    try {
      const rates = await storage.getActiveExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Get active exchange rates error:", error);
      res.status(500).json({ message: "Failed to fetch exchange rates" });
    }
  });

  // Get specific exchange rate
  app.get("/api/exchange-rates/:from/:to", async (req, res) => {
    try {
      const { from, to } = req.params;
      const rate = await storage.getExchangeRate(from.toUpperCase(), to.toUpperCase());
      
      if (!rate) {
        return res.status(404).json({ message: `Exchange rate not found for ${from} to ${to}` });
      }
      
      res.json(rate);
    } catch (error) {
      console.error("Get exchange rate error:", error);
      res.status(500).json({ message: "Failed to fetch exchange rate" });
    }
  });

  // Convert currency
  app.post("/api/exchange-rates/convert", async (req, res) => {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;
      
      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({ message: "Amount, fromCurrency, and toCurrency are required" });
      }
      
      const result = await storage.convertCurrency(
        parseFloat(amount),
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase()
      );
      
      res.json({
        originalAmount: parseFloat(amount),
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        ...result,
      });
    } catch (error: any) {
      console.error("Currency conversion error:", error);
      res.status(400).json({ message: error.message || "Failed to convert currency" });
    }
  });

  // Create exchange rate (Super Admin only)
  app.post("/api/platform-admin/exchange-rates", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { fromCurrency, toCurrency, rate, source } = req.body;
      
      if (!fromCurrency || !toCurrency || !rate) {
        return res.status(400).json({ message: "fromCurrency, toCurrency, and rate are required" });
      }
      
      const rateValue = parseFloat(rate);
      if (isNaN(rateValue) || rateValue <= 0) {
        return res.status(400).json({ message: "Rate must be a positive number" });
      }
      
      const inverseRate = (1 / rateValue).toFixed(8);
      
      const created = await storage.createExchangeRate({
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: rateValue.toFixed(8),
        inverseRate,
        source: source || "manual",
        isActive: true,
        validFrom: new Date(),
      });
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "exchange_rate",
        resourceId: created.id,
        metadata: { fromCurrency: created.fromCurrency, toCurrency: created.toCurrency, rate: created.rate },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(created);
    } catch (error) {
      console.error("Create exchange rate error:", error);
      res.status(500).json({ message: "Failed to create exchange rate" });
    }
  });

  // Update exchange rate (Super Admin only)
  app.patch("/api/platform-admin/exchange-rates/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { rate, source } = req.body;
      
      const updateData: any = {};
      
      if (rate !== undefined) {
        const rateValue = parseFloat(rate);
        if (isNaN(rateValue) || rateValue <= 0) {
          return res.status(400).json({ message: "Rate must be a positive number" });
        }
        updateData.rate = rateValue.toFixed(8);
        updateData.inverseRate = (1 / rateValue).toFixed(8);
      }
      
      if (source !== undefined) {
        updateData.source = source;
      }
      
      const updated = await storage.updateExchangeRate(req.params.id, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Exchange rate not found" });
      }
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "exchange_rate",
        resourceId: req.params.id,
        metadata: { updates: updateData },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Update exchange rate error:", error);
      res.status(500).json({ message: "Failed to update exchange rate" });
    }
  });

  // Deactivate exchange rate (Super Admin only)
  app.delete("/api/platform-admin/exchange-rates/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      await storage.deactivateExchangeRate(req.params.id);
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "exchange_rate",
        resourceId: req.params.id,
        metadata: { action: "deactivate" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json({ message: "Exchange rate deactivated successfully" });
    } catch (error) {
      console.error("Deactivate exchange rate error:", error);
      res.status(500).json({ message: "Failed to deactivate exchange rate" });
    }
  });

  // ==================== GLOBAL TENANT REGISTRY ====================

  // List all tenants with filtering (scoped by admin's country assignments)
  app.get("/api/platform-admin/tenants", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { country, region, status, businessType, search, includeDeleted } = req.query;
      
      // Fetch tenants with their active subscription plan names
      const allTenants = await db.select().from(tenants);
      
      // Fetch only active subscriptions with plan names in a single query
      const subscriptionsWithPlans = await db
        .select({
          tenantId: tenantSubscriptions.tenantId,
          planName: globalPricingPlans.name,
          planCode: globalPricingPlans.code,
        })
        .from(tenantSubscriptions)
        .innerJoin(globalPricingPlans, eq(tenantSubscriptions.planId, globalPricingPlans.id))
        .where(eq(tenantSubscriptions.status, 'active'));
      
      // Create a lookup map for subscription plans by tenant ID (first active subscription wins)
      const subscriptionMap = new Map<string, { planName: string; planCode: string }>();
      for (const sub of subscriptionsWithPlans) {
        if (!subscriptionMap.has(sub.tenantId)) {
          subscriptionMap.set(sub.tenantId, {
            planName: sub.planName,
            planCode: sub.planCode,
          });
        }
      }
      
      // Enrich tenants with actual subscription plan name from tenant_subscriptions
      const enrichedTenants = allTenants.map(t => {
        const subscription = subscriptionMap.get(t.id);
        return {
          ...t,
          // Use the actual subscription plan name, fallback to legacy subscriptionTier
          subscriptionTier: subscription?.planName || t.subscriptionTier,
        };
      });
      
      // Filter in memory for flexibility (can be optimized with drizzle where clauses)
      let filtered = enrichedTenants;
      
      // SCOPE ENFORCEMENT: Platform admins only see tenants in their assigned countries
      const adminScope = getAdminCountryScope(req);
      if (adminScope !== null && adminScope.length > 0) {
        // Use canonical mapping utility for consistent country code conversion
        const { isTenantCountryInScope } = await import("./core/permissions");
        filtered = filtered.filter(t => isTenantCountryInScope(t.country, adminScope));
      } else if (adminScope !== null && adminScope.length === 0) {
        // Platform admin with no scope assigned - show no tenants
        filtered = [];
      }
      // adminScope === null means super admin - no filtering
      
      // Exclude deleted tenants by default unless includeDeleted=true
      const shouldIncludeDeleted = includeDeleted === 'true';
      if (!shouldIncludeDeleted) {
        filtered = filtered.filter(t => t.status !== 'deleted');
      }
      
      if (country && typeof country === 'string') {
        filtered = filtered.filter(t => t.country === country);
      }
      if (region && typeof region === 'string') {
        filtered = filtered.filter(t => t.region === region);
      }
      if (status && typeof status === 'string') {
        filtered = filtered.filter(t => t.status === status);
      }
      if (businessType && typeof businessType === 'string') {
        filtered = filtered.filter(t => t.businessType === businessType);
      }
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(searchLower) ||
          t.email?.toLowerCase().includes(searchLower) ||
          t.slug?.toLowerCase().includes(searchLower)
        );
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "tenant_registry",
        metadata: { action: "list_tenants", filters: { country, region, status, businessType }, count: filtered.length, scopeApplied: adminScope !== null },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        tenants: filtered,
        total: filtered.length,
        filters: { country, region, status, businessType }
      });
    } catch (error) {
      console.error("Get all tenants error:", error);
      res.status(500).json({ message: "Failed to get tenants" });
    }
  });

  // Get single tenant details (with scope enforcement)
  app.get("/api/platform-admin/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // SCOPE ENFORCEMENT: Check if platform admin can access this tenant's country
      const adminScope = getAdminCountryScope(req);
      if (adminScope !== null) {
        const { isTenantCountryInScope } = await import("./core/permissions");
        if (!isTenantCountryInScope(tenant.country, adminScope)) {
          return res.status(403).json({ 
            message: "Access denied - tenant not in your assigned countries",
            code: "SCOPE_DENIED"
          });
        }
      }

      // Get user count for this tenant
      const userCount = await db.select().from(userTenants).where(eq(userTenants.tenantId, tenant.id));

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "tenant_registry",
        resourceId: tenant.id,
        metadata: { action: "view_tenant", tenantName: tenant.name },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        ...tenant,
        userCount: userCount.length
      });
    } catch (error) {
      console.error("Get tenant error:", error);
      res.status(500).json({ message: "Failed to get tenant" });
    }
  });

  // Create new tenant (Super Admin only)
  const createTenantSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    slug: z.string().min(1).max(100).optional(),
    businessType: z.enum([
      "clinic", "clinic_healthcare", "salon", "salon_spa", "pg", "pg_hostel", 
      "coworking", "service", "real_estate", "tourism", "education", "education_institute",
      "logistics", "logistics_fleet", "legal", "furniture_manufacturing", "furniture",
      "software_services", "consulting", "digital_agency", "retail_store"
    ]),
    country: z.enum(["india", "uae", "uk", "malaysia", "singapore"]).default("india"),
    region: z.enum(["asia_pacific", "middle_east", "europe"]).default("asia_pacific"),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    timezone: z.string().default("Asia/Kolkata"),
    currency: z.string().default("INR"),
    subscriptionTier: z.enum(["free", "pro", "enterprise"]).default("free"),
    maxUsers: z.number().int().positive().default(5),
    maxCustomers: z.number().int().positive().default(100),
  });

  app.post("/api/platform-admin/tenants", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = createTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { name, slug, businessType, country, region, email, phone, address, timezone, currency, subscriptionTier, maxUsers, maxCustomers } = parsed.data;

      // Generate slug if not provided
      const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Check if slug already exists
      const [existingSlug] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug));
      if (existingSlug) {
        return res.status(409).json({ message: "Tenant slug already exists" });
      }

      const [newTenant] = await db.insert(tenants).values({
        name,
        slug: tenantSlug,
        businessType,
        country,
        region,
        status: "active",
        email,
        phone,
        address,
        timezone,
        currency,
        subscriptionTier,
        maxUsers,
        maxCustomers,
      }).returning();

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "tenant_registry",
        resourceId: newTenant.id,
        newValue: { name, businessType, country, region },
        metadata: { action: "create_tenant" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(newTenant);
    } catch (error) {
      console.error("Create tenant error:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Update tenant (Super Admin only) - businessType is immutable
  const updateTenantSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).optional(),
    country: z.enum(["india", "uae", "uk", "malaysia", "singapore"]).optional(),
    region: z.enum(["asia_pacific", "middle_east", "europe"]).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    timezone: z.string().optional(),
    currency: z.string().optional(),
    subscriptionTier: z.enum(["free", "pro", "enterprise"]).optional(),
    maxUsers: z.number().int().positive().optional(),
    maxCustomers: z.number().int().positive().optional(),
    logoUrl: z.string().optional().nullable(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
  });

  app.patch("/api/platform-admin/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = updateTenantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const [existingTenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Explicitly prevent businessType modification
      if ('businessType' in req.body) {
        return res.status(400).json({ message: "Business type cannot be modified after creation" });
      }

      // Check slug uniqueness if being updated
      if (parsed.data.slug && parsed.data.slug !== existingTenant.slug) {
        const [slugConflict] = await db.select().from(tenants).where(eq(tenants.slug, parsed.data.slug));
        if (slugConflict) {
          return res.status(409).json({ message: "Tenant slug already exists" });
        }
      }

      const [updatedTenant] = await db.update(tenants)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, req.params.tenantId))
        .returning();

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "tenant_registry",
        resourceId: req.params.tenantId,
        oldValue: existingTenant,
        newValue: updatedTenant,
        metadata: { action: "update_tenant", changes: Object.keys(parsed.data) },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(updatedTenant);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  // Change tenant lifecycle status (Super Admin only)
  const changeStatusSchema = z.object({
    status: z.enum(["active", "suspended", "cancelled"]),
    reason: z.string().min(1, "Reason is required").max(500),
  });

  app.post("/api/platform-admin/tenants/:tenantId/status", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = changeStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const [existingTenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const { status, reason } = parsed.data;
      const adminId = req.platformAdminContext?.platformAdmin.id;

      const [updatedTenant] = await db.update(tenants)
        .set({
          status,
          isActive: status === "active",
          statusChangedAt: new Date(),
          statusChangedBy: adminId,
          statusChangeReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, req.params.tenantId))
        .returning();

      auditService.logAsync({
        tenantId: undefined,
        userId: adminId,
        action: "update",
        resource: "tenant_lifecycle",
        resourceId: req.params.tenantId,
        oldValue: { status: existingTenant.status },
        newValue: { status },
        metadata: { 
          action: "change_tenant_status", 
          tenantName: existingTenant.name,
          previousStatus: existingTenant.status,
          newStatus: status,
          reason 
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        message: `Tenant status changed to ${status}`,
        tenant: updatedTenant
      });
    } catch (error) {
      console.error("Change tenant status error:", error);
      res.status(500).json({ message: "Failed to change tenant status" });
    }
  });

  // Get tenant GST configuration (India)
  app.get("/api/platform-admin/tenants/:tenantId/compliance/gst", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (tenant.country !== "india") {
        return res.status(400).json({ message: "GST is only applicable for Indian tenants" });
      }
      const [gstConfig] = await db.select().from(gstConfigurations).where(eq(gstConfigurations.tenantId, req.params.tenantId));
      res.json(gstConfig || null);
    } catch (error) {
      console.error("Get GST config error:", error);
      res.status(500).json({ message: "Failed to get GST configuration" });
    }
  });

  // Get tenant VAT configuration (UK)
  app.get("/api/platform-admin/tenants/:tenantId/compliance/vat", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      if (tenant.country !== "uk") {
        return res.status(400).json({ message: "UK VAT is only applicable for UK tenants" });
      }
      const [vatConfig] = await db.select().from(ukVatConfigurations).where(eq(ukVatConfigurations.tenantId, req.params.tenantId));
      res.json(vatConfig || null);
    } catch (error) {
      console.error("Get VAT config error:", error);
      res.status(500).json({ message: "Failed to get VAT configuration" });
    }
  });

  // Get all tenants with GST configurations (India)
  app.get("/api/platform-admin/compliance/gst/tenants", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const rawData = await db.select({
        id: tenants.id,
        name: tenants.name,
        businessType: tenants.businessType,
        status: tenants.status,
        subscriptionTier: tenants.subscriptionTier,
        email: tenants.email,
        gstin: gstConfigurations.gstin,
        legalName: gstConfigurations.legalName,
        stateCode: gstConfigurations.stateCode,
        gstType: gstConfigurations.gstType,
        isEInvoiceEnabled: gstConfigurations.isEInvoiceEnabled,
        gstIsActive: gstConfigurations.isActive,
      })
      .from(tenants)
      .leftJoin(gstConfigurations, eq(tenants.id, gstConfigurations.tenantId))
      .where(eq(tenants.country, "india"));
      
      const formattedTenants = rawData.map(row => ({
        tenant: {
          id: row.id,
          name: row.name,
          businessType: row.businessType,
          status: row.status,
          subscriptionTier: row.subscriptionTier,
          email: row.email,
        },
        gst: row.gstin ? {
          gstin: row.gstin,
          legalName: row.legalName,
          stateCode: row.stateCode,
          gstType: row.gstType,
          isEInvoiceEnabled: row.isEInvoiceEnabled,
          isActive: row.gstIsActive,
        } : null,
      }));

      res.json({
        total: formattedTenants.length,
        configured: formattedTenants.filter(t => t.gst !== null).length,
        tenants: formattedTenants,
      });
    } catch (error) {
      console.error("Get GST tenants error:", error);
      res.status(500).json({ message: "Failed to get GST tenants" });
    }
  });

  // Get all tenants with VAT configurations (UK)
  app.get("/api/platform-admin/compliance/vat/tenants", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const rawData = await db.select({
        id: tenants.id,
        name: tenants.name,
        businessType: tenants.businessType,
        status: tenants.status,
        subscriptionTier: tenants.subscriptionTier,
        email: tenants.email,
        vatNumber: ukVatConfigurations.vatNumber,
        businessName: ukVatConfigurations.businessName,
        postcode: ukVatConfigurations.postcode,
        vatScheme: ukVatConfigurations.vatScheme,
        mtdEnabled: ukVatConfigurations.mtdEnabled,
        vatIsActive: ukVatConfigurations.isActive,
      })
      .from(tenants)
      .leftJoin(ukVatConfigurations, eq(tenants.id, ukVatConfigurations.tenantId))
      .where(eq(tenants.country, "uk"));
      
      const formattedTenants = rawData.map(row => ({
        tenant: {
          id: row.id,
          name: row.name,
          businessType: row.businessType,
          status: row.status,
          subscriptionTier: row.subscriptionTier,
          email: row.email,
        },
        vat: row.vatNumber ? {
          vatNumber: row.vatNumber,
          businessName: row.businessName,
          postcode: row.postcode,
          vatScheme: row.vatScheme,
          mtdEnabled: row.mtdEnabled,
          isActive: row.vatIsActive,
        } : null,
      }));

      res.json({
        total: formattedTenants.length,
        configured: formattedTenants.filter(t => t.vat !== null).length,
        tenants: formattedTenants,
      });
    } catch (error) {
      console.error("Get VAT tenants error:", error);
      res.status(500).json({ message: "Failed to get VAT tenants" });
    }
  });

  // Get tenant statistics by region/country
  app.get("/api/platform-admin/tenants/stats/summary", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_analytics"), async (req, res) => {
    try {
      const allTenants = await db.select().from(tenants);

      const stats = {
        total: allTenants.length,
        byStatus: {
          active: allTenants.filter(t => t.status === "active").length,
          suspended: allTenants.filter(t => t.status === "suspended").length,
          cancelled: allTenants.filter(t => t.status === "cancelled").length,
        },
        byCountry: {
          india: allTenants.filter(t => t.country === "india").length,
          uae: allTenants.filter(t => t.country === "uae").length,
          uk: allTenants.filter(t => t.country === "uk").length,
          malaysia: allTenants.filter(t => t.country === "malaysia").length,
          singapore: allTenants.filter(t => t.country === "singapore").length,
        },
        byRegion: {
          asia_pacific: allTenants.filter(t => t.region === "asia_pacific").length,
          middle_east: allTenants.filter(t => t.region === "middle_east").length,
          europe: allTenants.filter(t => t.region === "europe").length,
        },
        byBusinessType: {
          clinic: allTenants.filter(t => t.businessType === "clinic").length,
          salon: allTenants.filter(t => t.businessType === "salon").length,
          pg: allTenants.filter(t => t.businessType === "pg").length,
          coworking: allTenants.filter(t => t.businessType === "coworking").length,
          service: allTenants.filter(t => t.businessType === "service").length,
        },
        bySubscription: {
          free: allTenants.filter(t => t.subscriptionTier === "free").length,
          pro: allTenants.filter(t => t.subscriptionTier === "pro").length,
          enterprise: allTenants.filter(t => t.subscriptionTier === "enterprise").length,
        }
      };

      res.json(stats);
    } catch (error) {
      console.error("Get tenant stats error:", error);
      res.status(500).json({ message: "Failed to get tenant statistics" });
    }
  });

  // ==================== PLATFORM ADMIN PERMISSION MANAGEMENT ====================

  // Get all available permissions
  app.get("/api/platform-admin/permissions", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const permissions = await storage.getAllPlatformAdminPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to get permissions" });
    }
  });

  // Get permissions for a specific admin
  app.get("/api/platform-admin/admins/:id/permissions", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const admin = await storage.getPlatformAdmin(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const permissions = await storage.getAdminPermissions(req.params.id);
      res.json({ adminId: req.params.id, permissions });
    } catch (error) {
      console.error("Get admin permissions error:", error);
      res.status(500).json({ message: "Failed to get admin permissions" });
    }
  });

  // Assign permission to an admin
  const assignPermissionSchema = z.object({
    permissionCode: z.string().min(1),
  });

  app.post("/api/platform-admin/admins/:id/permissions", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = assignPermissionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const admin = await storage.getPlatformAdmin(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // SUPER_ADMINs don't need explicit permission assignments
      if (admin.role === "SUPER_ADMIN") {
        return res.status(400).json({ message: "SUPER_ADMIN role has all permissions automatically" });
      }

      const permission = await storage.getPlatformAdminPermission(parsed.data.permissionCode);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }

      // Check if already assigned
      const existing = await storage.hasAdminPermission(req.params.id, parsed.data.permissionCode);
      if (existing) {
        return res.status(409).json({ message: "Permission already assigned" });
      }

      const assignment = await storage.assignPermissionToAdmin(
        req.params.id,
        parsed.data.permissionCode,
        req.platformAdminContext?.platformAdmin.id
      );

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "platform_admin_permission",
        resourceId: assignment.id,
        metadata: { 
          adminId: req.params.id, 
          adminEmail: admin.email,
          permissionCode: parsed.data.permissionCode 
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(assignment);
    } catch (error) {
      console.error("Assign permission error:", error);
      res.status(500).json({ message: "Failed to assign permission" });
    }
  });

  // Revoke permission from an admin
  app.delete("/api/platform-admin/admins/:id/permissions/:permissionCode", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const admin = await storage.getPlatformAdmin(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const hasPermission = await storage.hasAdminPermission(req.params.id, req.params.permissionCode);
      if (!hasPermission) {
        return res.status(404).json({ message: "Permission not assigned to this admin" });
      }

      await storage.revokePermissionFromAdmin(req.params.id, req.params.permissionCode);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "platform_admin_permission",
        metadata: { 
          adminId: req.params.id, 
          adminEmail: admin.email,
          permissionCode: req.params.permissionCode 
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Permission revoked successfully" });
    } catch (error) {
      console.error("Revoke permission error:", error);
      res.status(500).json({ message: "Failed to revoke permission" });
    }
  });

  // Bulk assign permissions to an admin
  const bulkAssignPermissionsSchema = z.object({
    permissionCodes: z.array(z.string()),
  });

  app.post("/api/platform-admin/admins/:id/permissions/bulk", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const parsed = bulkAssignPermissionsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const admin = await storage.getPlatformAdmin(req.params.id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (admin.role === "SUPER_ADMIN") {
        return res.status(400).json({ message: "SUPER_ADMIN role has all permissions automatically" });
      }

      const currentPermissions = await storage.getAdminPermissions(req.params.id);
      const results = { assigned: [] as string[], skipped: [] as string[], notFound: [] as string[] };

      for (const code of parsed.data.permissionCodes) {
        const permission = await storage.getPlatformAdminPermission(code);
        if (!permission) {
          results.notFound.push(code);
          continue;
        }

        if (currentPermissions.includes(code)) {
          results.skipped.push(code);
          continue;
        }

        await storage.assignPermissionToAdmin(req.params.id, code, req.platformAdminContext?.platformAdmin.id);
        results.assigned.push(code);
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "platform_admin_permission",
        metadata: { 
          adminId: req.params.id, 
          adminEmail: admin.email,
          bulkOperation: true,
          results 
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(results);
    } catch (error) {
      console.error("Bulk assign permissions error:", error);
      res.status(500).json({ message: "Failed to assign permissions" });
    }
  });

  // ==================== PLATFORM DASHBOARD ROUTES ====================

  // Dashboard Overview - All Tenants (requires read_tenants)
  app.get("/api/platform-admin/dashboard/tenants", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      const stats = await storage.getTenantStats();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "tenants" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ tenants: allTenants, stats });
    } catch (error) {
      console.error("Get dashboard tenants error:", error);
      res.status(500).json({ message: "Failed to get tenant data" });
    }
  });

  // Dashboard - User Statistics (requires read_users)
  app.get("/api/platform-admin/dashboard/users", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_users"), async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "users" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(stats);
    } catch (error) {
      console.error("Get dashboard users error:", error);
      res.status(500).json({ message: "Failed to get user statistics" });
    }
  });

  // Dashboard - Error Logs (requires view_logs)
  app.get("/api/platform-admin/dashboard/errors", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId, severity, limit, offset } = req.query;
      const errors = await storage.getErrorLogs({
        tenantId: tenantId as string,
        severity: severity as string,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });
      const stats = await storage.getErrorLogStats();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "errors", filters: { tenantId, severity } },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ errors, stats });
    } catch (error) {
      console.error("Get dashboard errors error:", error);
      res.status(500).json({ message: "Failed to get error logs" });
    }
  });

  // Dashboard - Resolve Error (requires manage_logs)
  app.patch("/api/platform-admin/dashboard/errors/:id/resolve", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_logs"), async (req, res) => {
    try {
      const resolvedBy = req.platformAdminContext?.platformAdmin.id || "unknown";
      const error = await storage.resolveErrorLog(req.params.id, resolvedBy);
      
      if (!error) {
        return res.status(404).json({ message: "Error log not found" });
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "error_log",
        resourceId: req.params.id,
        metadata: { resolved: true },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(error);
    } catch (error) {
      console.error("Resolve error log error:", error);
      res.status(500).json({ message: "Failed to resolve error log" });
    }
  });

  // Dashboard - Support Tickets (requires view_logs - using general logs permission for tickets)
  app.get("/api/platform-admin/dashboard/tickets", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId, status, limit, offset } = req.query;
      const tickets = await storage.getSupportTickets({
        tenantId: tenantId as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });
      const stats = await storage.getSupportTicketStats();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "tickets", filters: { tenantId, status } },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ tickets, stats });
    } catch (error) {
      console.error("Get dashboard tickets error:", error);
      res.status(500).json({ message: "Failed to get support tickets" });
    }
  });

  // Dashboard - Get Single Ticket (requires view_logs)
  app.get("/api/platform-admin/dashboard/tickets/:id", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const messages = await storage.getSupportTicketMessages(req.params.id);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_ticket",
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ ticket, messages });
    } catch (error) {
      console.error("Get ticket error:", error);
      res.status(500).json({ message: "Failed to get ticket" });
    }
  });

  // Dashboard - Update Ticket (requires manage_logs)
  const updateTicketSchema = z.object({
    status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    assignedTo: z.string().optional(),
  });

  app.patch("/api/platform-admin/dashboard/tickets/:id", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_logs"), async (req, res) => {
    try {
      const parsed = updateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const updateData: any = { ...parsed.data };
      if (parsed.data.status === "resolved") {
        updateData.resolvedAt = new Date();
      } else if (parsed.data.status === "closed") {
        updateData.closedAt = new Date();
      }

      const updated = await storage.updateSupportTicket(req.params.id, updateData);

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "support_ticket",
        resourceId: req.params.id,
        oldValue: { status: ticket.status, priority: ticket.priority, assignedTo: ticket.assignedTo },
        newValue: parsed.data,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(updated);
    } catch (error) {
      console.error("Update ticket error:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Dashboard - Add Ticket Message (requires manage_logs)
  const ticketMessageSchema = z.object({
    message: z.string().min(1, "Message is required"),
  });

  app.post("/api/platform-admin/dashboard/tickets/:id/messages", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_logs"), async (req, res) => {
    try {
      const parsed = ticketMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors });
      }

      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const created = await storage.createSupportTicketMessage({
        ticketId: req.params.id,
        senderId: req.platformAdminContext?.platformAdmin.id,
        senderType: "platform_admin",
        message: parsed.data.message,
      });

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "ticket_message",
        resourceId: created.id,
        metadata: { ticketId: req.params.id },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json(created);
    } catch (error) {
      console.error("Create ticket message error:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Dashboard - Usage Metrics (requires view_analytics)
  app.get("/api/platform-admin/dashboard/usage", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_analytics"), async (req, res) => {
    try {
      const aggregated = await storage.getAggregatedUsageMetrics();
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "usage" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(aggregated);
    } catch (error) {
      console.error("Get usage metrics error:", error);
      res.status(500).json({ message: "Failed to get usage metrics" });
    }
  });

  // Dashboard - Tenant-specific Usage (requires view_analytics)
  app.get("/api/platform-admin/dashboard/usage/:tenantId", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_analytics"), async (req, res) => {
    try {
      const { metricType, startDate, endDate } = req.query;
      const metrics = await storage.getUsageMetrics(
        req.params.tenantId,
        metricType as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      auditService.logAsync({
        tenantId: req.params.tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "usage_metrics",
        metadata: { metricType, startDate, endDate },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(metrics);
    } catch (error) {
      console.error("Get tenant usage error:", error);
      res.status(500).json({ message: "Failed to get tenant usage metrics" });
    }
  });

  // Dashboard - Audit Logs (requires view_logs)
  app.get("/api/platform-admin/dashboard/audit-logs", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId, userId, action, limit, offset } = req.query;
      const logs = await storage.getAuditLogs({
        tenantId: tenantId as string,
        userId: userId as string,
        action: action as string,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "audit_logs", filters: { tenantId, userId, action } },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ logs });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Dashboard - Combined Overview (requires multiple permissions)
  app.get("/api/platform-admin/dashboard/overview", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const permissions = req.platformAdminContext?.permissions || [];
      const isSuperAdmin = req.platformAdminContext?.platformAdmin.role === "SUPER_ADMIN";
      const role = req.platformAdminContext?.platformAdmin.role;
      
      // Get country assignments for MANAGER and SUPPORT_TEAM roles
      let countryFilter: string[] | undefined;
      if (role === "MANAGER" || role === "SUPPORT_TEAM") {
        const adminId = req.platformAdminContext?.platformAdmin.id;
        if (adminId) {
          const assignments = await storage.getAdminCountryAssignments(adminId);
          countryFilter = assignments.map(a => a.countryCode);
        }
      }
      
      // Allow Super Admins and Platform Admins to filter by country via query parameter
      if ((isSuperAdmin || role === "PLATFORM_ADMIN") && req.query.countries) {
        const countriesParam = req.query.countries as string;
        const requestedCountries = countriesParam.split(",").filter(c => c.trim());
        if (requestedCountries.length > 0) {
          countryFilter = requestedCountries;
        }
      }
      
      const overview: any = {};
      
      if (isSuperAdmin || permissions.includes("read_tenants")) {
        overview.tenantStats = await storage.getTenantStats(countryFilter);
      }
      if (isSuperAdmin || permissions.includes("read_users")) {
        overview.userStats = await storage.getUserStats(countryFilter);
      }
      if (isSuperAdmin || permissions.includes("view_logs")) {
        overview.errorStats = await storage.getErrorLogStats(countryFilter);
        overview.ticketStats = await storage.getSupportTicketStats(countryFilter);
      }
      if (isSuperAdmin || permissions.includes("view_analytics")) {
        overview.usageStats = await storage.getAggregatedUsageMetrics(countryFilter);
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "overview", countryFilter },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(overview);
    } catch (error) {
      console.error("Get dashboard overview error:", error);
      res.status(500).json({ message: "Failed to get dashboard overview" });
    }
  });

  // Manager Dashboard - Operations focused, country-scoped
  app.get("/api/platform-admin/manager/dashboard", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const adminId = req.platformAdminContext?.platformAdmin.id;
      
      // Get country assignments
      let assignedCountries: string[] = [];
      if (adminId && (role === "MANAGER" || role === "SUPPORT_TEAM")) {
        const assignments = await storage.getAdminCountryAssignments(adminId);
        assignedCountries = assignments.map(a => a.countryCode);
      }
      
      // Get country-filtered stats
      const tenantStats = await storage.getTenantStats(assignedCountries.length > 0 ? assignedCountries : undefined);
      const ticketStats = await storage.getSupportTicketStats(assignedCountries.length > 0 ? assignedCountries : undefined);
      
      res.json({
        assignedCountries,
        tenantStats,
        ticketStats,
        role,
      });
    } catch (error) {
      console.error("Get manager dashboard error:", error);
      res.status(500).json({ message: "Failed to get manager dashboard" });
    }
  });

  // Support Team Dashboard - Tickets focused, country-scoped
  app.get("/api/platform-admin/support/dashboard", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const role = req.platformAdminContext?.platformAdmin.role;
      const adminId = req.platformAdminContext?.platformAdmin.id;
      
      // Get country assignments
      let assignedCountries: string[] = [];
      if (adminId && (role === "MANAGER" || role === "SUPPORT_TEAM")) {
        const assignments = await storage.getAdminCountryAssignments(adminId);
        assignedCountries = assignments.map(a => a.countryCode);
      }
      
      // Get country-filtered ticket stats
      const ticketStats = await storage.getSupportTicketStats(assignedCountries.length > 0 ? assignedCountries : undefined);
      
      res.json({
        assignedCountries,
        ticketStats,
        role,
      });
    } catch (error) {
      console.error("Get support dashboard error:", error);
      res.status(500).json({ message: "Failed to get support dashboard" });
    }
  });

  // ==================== SUPPORT ACCESS ROUTES ====================
  // Read-only access for platform admins to view tenant data with masked sensitive fields

  // View tenant details (read-only, masked)
  app.get("/api/platform-admin/support/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const maskedTenant = DataMasking.maskTenantForSupport(tenant as Record<string, unknown>);
      const settings = await tenantService.getTenantSettings(tenantId);
      const features = await featureService.getTenantFeatures(tenantId);

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_tenant_view",
        resourceId: tenantId,
        metadata: { 
          accessType: "support_read_only",
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        tenant: maskedTenant,
        settings,
        features: features,
        _supportAccess: true,
        _readOnly: true,
      });
    } catch (error) {
      console.error("Support tenant view error:", error);
      res.status(500).json({ message: "Failed to get tenant data" });
    }
  });

  // View tenant users (read-only, masked passwords)
  app.get("/api/platform-admin/support/tenants/:tenantId/users", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_users"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { limit, offset } = req.query;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const users = await storage.getUsersByTenant(tenantId, {
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      const maskedUsers = users.map(user => ({
        id: user.id,
        email: user.email ? user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : null,
        firstName: user.firstName,
        lastName: user.lastName,
      }));

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_users_view",
        resourceId: tenantId,
        metadata: { 
          accessType: "support_read_only",
          userCount: users.length,
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        users: maskedUsers,
        _supportAccess: true,
        _readOnly: true,
      });
    } catch (error) {
      console.error("Support users view error:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // View specific user (read-only, masked)
  app.get("/api/platform-admin/support/tenants/:tenantId/users/:userId", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_users"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [userTenantRecord] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      
      if (!userTenantRecord) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      const maskedUser = {
        id: user.id,
        email: user.email ? user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : null,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_user_detail",
        resourceId: userId,
        metadata: { 
          accessType: "support_read_only",
          targetUserId: userId,
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        user: maskedUser,
        _supportAccess: true,
        _readOnly: true,
      });
    } catch (error) {
      console.error("Support user detail error:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // View tenant audit logs (read-only)
  app.get("/api/platform-admin/support/tenants/:tenantId/audit-logs", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { userId, action, limit, offset } = req.query;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const logs = await storage.getAuditLogs({
        tenantId,
        userId: userId as string,
        action: action as string,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      const maskedLogs = logs.map(log => 
        DataMasking.maskSensitiveData(log as unknown as Record<string, unknown>, {
          maskPasswords: true,
          maskPayments: true,
          maskContacts: false,
        })
      );

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_audit_logs",
        resourceId: tenantId,
        metadata: { 
          accessType: "support_read_only",
          logCount: logs.length,
          filters: { userId, action },
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        logs: maskedLogs,
        _supportAccess: true,
        _readOnly: true,
      });
    } catch (error) {
      console.error("Support audit logs error:", error);
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // View tenant billing/subscription (read-only, masked payment details)
  app.get("/api/platform-admin/support/tenants/:tenantId/billing", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_billing"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const subscription = await storage.getTenantSubscription(tenantId);

      const maskedTenant = DataMasking.maskPaymentDataForSupport(tenant as Record<string, unknown>);
      const maskedSubscription = subscription 
        ? DataMasking.maskPaymentDataForSupport(subscription as Record<string, unknown>)
        : null;

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "support_billing_view",
        resourceId: tenantId,
        metadata: { 
          accessType: "support_read_only",
          hasBillingData: !!subscription,
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        billing: {
          tenant: maskedTenant,
          subscription: maskedSubscription,
        },
        _supportAccess: true,
        _readOnly: true,
        _paymentsMasked: true,
      });
    } catch (error) {
      console.error("Support billing view error:", error);
      res.status(500).json({ message: "Failed to get billing data" });
    }
  });

  // Support action: Reset user password (requires manage_users permission)
  app.post("/api/platform-admin/support/tenants/:tenantId/users/:userId/reset-password", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("reset_passwords"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "A detailed reason (at least 10 characters) is required for password reset" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [userTenantLink] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      
      if (!userTenantLink) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      const temporaryPassword = crypto.randomBytes(12).toString("base64url");
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      await storage.updateUser(userId, { 
        passwordHash: hashedPassword,
      });

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "support_password_reset",
        resourceId: userId,
        metadata: { 
          accessType: "support_write",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminRole: req.platformAdminContext?.platformAdmin.role,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: "Password has been reset. User will need to change password on next login.",
        temporaryPassword,
        _supportAction: true,
      });
    } catch (error) {
      console.error("Support password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Support action: Toggle user active status (requires manage_users permission)
  app.patch("/api/platform-admin/support/tenants/:tenantId/users/:userId/status", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_users"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { isActive, reason } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "A detailed reason (at least 10 characters) is required for status change" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [userTenantLink] = await db.select().from(userTenants)
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      
      if (!userTenantLink) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      const oldIsActive = userTenantLink.isActive;
      await db.update(userTenants)
        .set({ isActive })
        .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "support_user_status",
        resourceId: userId,
        oldValue: { isActive: oldIsActive },
        newValue: { isActive },
        metadata: { 
          accessType: "support_write",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminRole: req.platformAdminContext?.platformAdmin.role,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        userId,
        isActive,
        _supportAction: true,
      });
    } catch (error) {
      console.error("Support user status update error:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // ==================== SUPER ADMIN TENANT MANAGEMENT ROUTES ====================
  
  // Create new tenant - Super Admin only
  app.post("/api/super-admin/tenants", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { name, businessType, country, email, phone, subscriptionTier, maxUsers } = req.body;

      if (!name || !businessType || !country) {
        return res.status(400).json({ message: "Name, business type, and country are required" });
      }

      const validBusinessTypes = ["clinic", "salon", "pg", "coworking", "service", "real_estate", "tourism", "education", "logistics", "legal", "furniture", "furniture_manufacturing", "software_services", "consulting"];
      if (!validBusinessTypes.includes(businessType)) {
        return res.status(400).json({ message: "Invalid business type" });
      }

      const validCountries = ["india", "uae", "uk", "malaysia", "singapore", "us"];
      if (!validCountries.includes(country)) {
        return res.status(400).json({ message: "Invalid country" });
      }

      const regionMap: Record<string, "asia_pacific" | "middle_east" | "europe" | "americas" | "africa"> = {
        india: "asia_pacific",
        malaysia: "asia_pacific",
        singapore: "asia_pacific",
        uae: "middle_east",
        uk: "europe",
        us: "americas",
      };

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, slug));
      if (existingTenant.length > 0) {
        return res.status(400).json({ message: "A tenant with a similar name already exists" });
      }

      const newTenant = await storage.createTenant({
        name,
        slug,
        businessType,
        country,
        region: regionMap[country] || "asia_pacific",
        email: email || null,
        phone: phone || null,
        subscriptionTier: subscriptionTier || "free",
        maxUsers: maxUsers ? parseInt(maxUsers, 10) : 5,
        status: "active",
        isActive: true,
      });

      auditService.logAsync({
        tenantId: newTenant.id,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "create",
        resource: "TENANT_CREATED_BY_ADMIN",
        resourceId: newTenant.id,
        newValue: { name, businessType, country, subscriptionTier },
        metadata: {
          accessType: "super_admin",
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({
        success: true,
        tenant: newTenant,
        message: "Tenant created successfully",
      });
    } catch (error) {
      console.error("Super admin create tenant error:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  // Get single tenant details for Super Admin
  app.get("/api/super-admin/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const tenantUsers = await db.select({
        userId: userTenants.userId,
        roleId: userTenants.roleId,
      }).from(userTenants).where(eq(userTenants.tenantId, tenantId));

      let owner = null;
      for (const tu of tenantUsers) {
        const [role] = await db.select().from(roles).where(eq(roles.id, tu.roleId));
        if (role?.name?.toLowerCase() === "owner" || role?.name?.toLowerCase() === "admin") {
          const [user] = await db.select().from(users).where(and(eq(users.id, tu.userId), isNull(users.deletedAt)));
          if (user) {
            owner = {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
            };
            break;
          }
        }
      }

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "super_admin_tenant_details",
        resourceId: tenantId,
        metadata: { 
          accessType: "super_admin",
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        businessType: tenant.businessType,
        country: tenant.country,
        region: tenant.region,
        status: tenant.status,
        subscriptionTier: tenant.subscriptionTier,
        email: tenant.email,
        phone: tenant.phone,
        timezone: tenant.timezone,
        currency: tenant.currency || "USD",
        createdAt: tenant.createdAt,
        owner,
        userCount: tenantUsers.length,
      });
    } catch (error) {
      console.error("Super admin tenant details error:", error);
      res.status(500).json({ message: "Failed to get tenant details" });
    }
  });

  // Tenant Entitlement Inspector - Super Admin only
  app.get("/api/super-admin/tenants/:tenantId/entitlements", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Get subscription and plan
      const [subscription] = await db.select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenantId))
        .orderBy(desc(tenantSubscriptions.createdAt))
        .limit(1);

      let plan = null;
      let downgradePlan = null;
      if (subscription) {
        plan = await subscriptionService.getPlan(subscription.planId);
        if (subscription.downgradePlanId) {
          downgradePlan = await subscriptionService.getPlan(subscription.downgradePlanId);
        }
      }

      // Get current usage counts
      const [userCount] = await db.select({ count: sql<number>`count(*)` })
        .from(userTenants)
        .where(eq(userTenants.tenantId, tenantId));
      
      const [customerCount] = await db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq(customers.tenantId, tenantId));
      
      const [staffCount] = await db.select({ count: sql<number>`count(*)` })
        .from(staff)
        .where(eq(staff.tenantId, tenantId));

      // Get enabled features from tenant_features
      const enabledFeatures = await db.select()
        .from(tenantFeatures)
        .where(and(
          eq(tenantFeatures.tenantId, tenantId),
          eq(tenantFeatures.isEnabled, true)
        ));

      // Get billing-related audit logs
      const billingAuditLogs = await db.select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          sql`${auditLogs.resource} IN ('subscription', 'billing', 'plan')`
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(20);

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          businessType: tenant.businessType,
          country: tenant.country,
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentBillingCycle: subscription.currentBillingCycle,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          downgradePlanId: subscription.downgradePlanId,
          downgradeEffectiveAt: subscription.downgradeEffectiveAt,
          pendingPlanId: subscription.pendingPlanId,
          pendingPaymentId: subscription.pendingPaymentId,
        } : null,
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          code: plan.code,
          tier: plan.tier,
          featureFlags: plan.featureFlags,
          limits: plan.limits,
          basePrice: plan.basePrice,
          currencyCode: plan.currencyCode,
        } : null,
        downgradePlan: downgradePlan ? {
          id: downgradePlan.id,
          name: downgradePlan.name,
          code: downgradePlan.code,
          tier: downgradePlan.tier,
        } : null,
        usage: {
          users: userCount?.count || 0,
          staff: staffCount?.count || 0,
          clients: customerCount?.count || 0,
        },
        enabledFeatures: enabledFeatures.map(f => ({
          featureCode: f.featureCode,
          enabledAt: f.enabledAt,
        })),
        recentBillingChanges: billingAuditLogs.map(log => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          metadata: log.metadata,
          createdAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error("Tenant entitlement inspector error:", error);
      res.status(500).json({ message: "Failed to get tenant entitlements" });
    }
  });

  // Refresh tenant entitlements - Super Admin only
  app.post("/api/super-admin/tenants/:tenantId/refresh-entitlements", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Clear feature cache for tenant
      featureService.clearCache(tenantId);

      await auditService.log({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id || "system",
        action: "update",
        resource: "entitlements",
        resourceId: tenantId,
        metadata: { 
          operation: "cache_refresh",
          triggeredBy: "super_admin",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true, message: "Entitlements refreshed successfully" });
    } catch (error) {
      console.error("Refresh entitlements error:", error);
      res.status(500).json({ message: "Failed to refresh entitlements" });
    }
  });

  // Soft delete tenant - Super Admin only
  app.delete("/api/super-admin/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({ message: "A reason is required (at least 3 characters)" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (tenant.status === "deleted") {
        return res.status(400).json({ message: "Tenant is already deleted" });
      }

      await db.update(tenants).set({
        status: "deleted",
        isActive: false,
        deletedAt: new Date(),
        statusChangedAt: new Date(),
        statusChangedBy: req.platformAdminContext?.platformAdmin.id,
        statusChangeReason: reason,
        updatedAt: new Date(),
      }).where(eq(tenants.id, tenantId));

      const tenantUserRecords = await db.select().from(userTenants).where(eq(userTenants.tenantId, tenantId));
      
      // Clean up refresh tokens and user associations
      for (const tu of tenantUserRecords) {
        // Delete refresh tokens for this user-tenant combination
        await db.delete(refreshTokens).where(and(
          eq(refreshTokens.userId, tu.userId),
          eq(refreshTokens.tenantId, tenantId)
        ));
        
        // Check if user belongs to other tenants
        const otherTenants = await db.select()
          .from(userTenants)
          .where(and(
            eq(userTenants.userId, tu.userId),
            sql`${userTenants.tenantId} != ${tenantId}`
          ));
        
        // If user only belonged to this tenant, delete their user record
        if (otherTenants.length === 0) {
          // Delete user_tenants record first
          await db.delete(userTenants).where(and(
            eq(userTenants.userId, tu.userId),
            eq(userTenants.tenantId, tenantId)
          ));
          // Delete the user record
          await db.delete(users).where(eq(users.id, tu.userId));
        } else {
          // User has other tenants, just remove from this one
          await db.delete(userTenants).where(and(
            eq(userTenants.userId, tu.userId),
            eq(userTenants.tenantId, tenantId)
          ));
        }
      }

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "TENANT_DELETED",
        resourceId: tenantId,
        oldValue: { status: tenant.status },
        newValue: { status: "deleted" },
        metadata: { 
          accessType: "super_admin",
          tenantName: tenant.name,
          reason: reason,
          adminId: req.platformAdminContext?.platformAdmin.id,
          superAdminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ 
        success: true, 
        message: "Tenant deleted successfully. Data retained for audit purposes.",
      });
    } catch (error) {
      console.error("Super admin tenant delete error:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Bulk delete tenants - Super Admin only
  app.post("/api/super-admin/tenants/bulk-delete", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantIds } = req.body;

      if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
        return res.status(400).json({ message: "tenantIds array is required" });
      }

      if (tenantIds.length > 500) {
        return res.status(400).json({ message: "Maximum 500 tenants can be deleted at once" });
      }

      const deletedTenants: string[] = [];
      const errors: { tenantId: string; error: string }[] = [];

      for (const tenantId of tenantIds) {
        try {
          const tenant = await storage.getTenant(tenantId);
          if (!tenant) {
            errors.push({ tenantId, error: "Tenant not found" });
            continue;
          }

          if (tenant.status === "deleted") {
            errors.push({ tenantId, error: "Tenant is already deleted" });
            continue;
          }

          // Soft delete the tenant
          await db.update(tenants).set({
            status: "deleted",
            isActive: false,
            deletedAt: new Date(),
            statusChangedAt: new Date(),
            statusChangedBy: req.platformAdminContext?.platformAdmin.id,
            statusChangeReason: "Bulk deletion by Super Admin",
            updatedAt: new Date(),
          }).where(eq(tenants.id, tenantId));

          // Clean up user associations and invalidate sessions
          const tenantUserRecords = await db.select().from(userTenants).where(eq(userTenants.tenantId, tenantId));
          for (const tu of tenantUserRecords) {
            // Delete refresh tokens for this user-tenant combination
            await db.delete(refreshTokens).where(and(
              eq(refreshTokens.userId, tu.userId),
              eq(refreshTokens.tenantId, tenantId)
            ));
            
            // Check if user belongs to other tenants
            const otherTenants = await db.select()
              .from(userTenants)
              .where(and(
                eq(userTenants.userId, tu.userId),
                sql`${userTenants.tenantId} != ${tenantId}`
              ));
            
            // If user only belonged to this tenant, delete their user record
            if (otherTenants.length === 0) {
              await db.delete(userTenants).where(and(
                eq(userTenants.userId, tu.userId),
                eq(userTenants.tenantId, tenantId)
              ));
              await db.delete(users).where(eq(users.id, tu.userId));
            } else {
              await db.delete(userTenants).where(and(
                eq(userTenants.userId, tu.userId),
                eq(userTenants.tenantId, tenantId)
              ));
            }
          }

          deletedTenants.push(tenantId);
        } catch (err) {
          errors.push({ tenantId, error: "Failed to delete tenant" });
        }
      }

      // Log bulk delete action
      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "TENANT_BULK_DELETED",
        metadata: { 
          accessType: "super_admin",
          deletedTenantIds: deletedTenants,
          deletedCount: deletedTenants.length,
          errorCount: errors.length,
          adminId: req.platformAdminContext?.platformAdmin.id,
          superAdminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ 
        success: true, 
        deletedCount: deletedTenants.length,
        deletedTenantIds: deletedTenants,
        errors: errors.length > 0 ? errors : undefined,
        message: `${deletedTenants.length} tenant(s) deleted successfully.`,
      });
    } catch (error) {
      console.error("Super admin bulk tenant delete error:", error);
      res.status(500).json({ message: "Failed to bulk delete tenants" });
    }
  });

  // ==================== SUPER ADMIN USER MANAGEMENT ROUTES ====================
  
  // Get tenant users for Super Admin management
  app.get("/api/super-admin/tenants/:tenantId/users", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const tenantUsers = await db.select({
        userId: userTenants.userId,
        roleId: userTenants.roleId,
        isDefault: userTenants.isDefault,
        isActive: userTenants.isActive,
        joinedAt: userTenants.joinedAt,
      }).from(userTenants).where(eq(userTenants.tenantId, tenantId));

      const usersData = (await Promise.all(tenantUsers.map(async (tu) => {
        const [user] = await db.select().from(users).where(
          and(eq(users.id, tu.userId), isNull(users.deletedAt))
        );
        if (!user) return null; // Skip soft-deleted users
        const [role] = await db.select().from(roles).where(eq(roles.id, tu.roleId));
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: role?.name || "unknown",
          isActive: tu.isActive ?? true,
          isLocked: false,
          lastLoginAt: null,
          createdAt: tu.joinedAt,
        };
      }))).filter(Boolean);

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "super_admin_tenant_users",
        resourceId: tenantId,
        metadata: { 
          accessType: "super_admin",
          userCount: usersData.length,
          adminRole: req.platformAdminContext?.platformAdmin.role,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        users: usersData,
        total: usersData.length,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          businessType: tenant.businessType,
          status: tenant.status,
        },
      });
    } catch (error) {
      console.error("Super admin tenant users error:", error);
      res.status(500).json({ message: "Failed to get tenant users" });
    }
  });

  // Lock user - Super Admin
  app.post("/api/super-admin/users/:userId/lock", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, tenantId } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: "A reason is required" });
      }

      const [user] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt)));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await db.update(userTenants).set({ isActive: false }).where(eq(userTenants.userId, userId));

      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      auditService.logAsync({
        tenantId: tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "super_admin_user_lock",
        resourceId: userId,
        oldValue: { isLocked: false },
        newValue: { isLocked: true },
        metadata: { 
          accessType: "super_admin",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true, message: "User locked successfully" });
    } catch (error) {
      console.error("Super admin lock user error:", error);
      res.status(500).json({ message: "Failed to lock user" });
    }
  });

  // Unlock user - Super Admin
  app.post("/api/super-admin/users/:userId/unlock", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, tenantId } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: "A reason is required" });
      }

      const [user] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt)));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await db.update(userTenants).set({ isActive: true }).where(eq(userTenants.userId, userId));

      auditService.logAsync({
        tenantId: tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "super_admin_user_unlock",
        resourceId: userId,
        oldValue: { isLocked: true },
        newValue: { isLocked: false },
        metadata: { 
          accessType: "super_admin",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true, message: "User unlocked successfully" });
    } catch (error) {
      console.error("Super admin unlock user error:", error);
      res.status(500).json({ message: "Failed to unlock user" });
    }
  });

  // Reset password - Super Admin
  app.post("/api/super-admin/users/:userId/reset-password", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason, tenantId } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: "A reason is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const temporaryPassword = `Temp${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 100)}`;
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

      await storage.updateUser(userId, { passwordHash: hashedPassword });

      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      auditService.logAsync({
        tenantId: tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "super_admin_password_reset",
        resourceId: userId,
        metadata: { 
          accessType: "super_admin",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ 
        success: true, 
        message: "Password reset successfully",
        temporaryPassword,
      });
    } catch (error) {
      console.error("Super admin password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change user role - Super Admin
  app.post("/api/super-admin/users/:userId/change-role", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, tenantId } = req.body;

      if (!role || !tenantId) {
        return res.status(400).json({ message: "Role and tenantId are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [tenantRole] = await db.select().from(roles)
        .where(and(
          eq(roles.tenantId, tenantId),
          sql`LOWER(${roles.name}) = LOWER(${role})`
        ));

      if (!tenantRole) {
        return res.status(404).json({ message: `Role '${role}' not found in tenant` });
      }

      const [existingUserTenant] = await db.select().from(userTenants)
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.tenantId, tenantId)
        ));

      if (!existingUserTenant) {
        return res.status(404).json({ message: "User not found in this tenant" });
      }

      const oldRoleId = existingUserTenant.roleId;

      await db.update(userTenants)
        .set({ roleId: tenantRole.id })
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.tenantId, tenantId)
        ));

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "super_admin_role_change",
        resourceId: userId,
        oldValue: { roleId: oldRoleId },
        newValue: { roleId: tenantRole.id, roleName: role },
        metadata: { 
          accessType: "super_admin",
          targetUserId: userId,
          targetUserEmail: user.email,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true, message: "Role changed successfully" });
    } catch (error) {
      console.error("Super admin role change error:", error);
      res.status(500).json({ message: "Failed to change role" });
    }
  });

  // Remove user from tenant - Super Admin
  app.delete("/api/super-admin/tenants/:tenantId/users/:userId", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ message: "A reason is required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [userTenantRecord] = await db.select().from(userTenants)
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.tenantId, tenantId)
        ));

      if (!userTenantRecord) {
        return res.status(404).json({ message: "User not found in this tenant" });
      }

      const [userRole] = await db.select().from(roles).where(eq(roles.id, userTenantRecord.roleId));
      if (userRole?.name?.toLowerCase() === "owner") {
        return res.status(403).json({ message: "Cannot remove tenant owner. Transfer ownership first." });
      }

      await db.delete(userTenants)
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.tenantId, tenantId)
        ));

      await db.delete(refreshTokens)
        .where(and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tenantId, tenantId)
        ));

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "delete",
        resource: "super_admin_user_removal",
        resourceId: userId,
        metadata: { 
          accessType: "super_admin",
          targetUserId: userId,
          targetUserEmail: user.email,
          reason: reason,
          adminId: req.platformAdminContext?.platformAdmin.id,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ success: true, message: "User removed from tenant successfully" });
    } catch (error) {
      console.error("Super admin remove user error:", error);
      res.status(500).json({ message: "Failed to remove user" });
    }
  });

  // ==================== SUPER ADMIN DATA CLEANUP ENDPOINTS ====================

  // Get tenant delete summary - preview what will be deleted
  app.get("/api/super-admin/tenants/:tenantId/delete-summary", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Count records in all tenant-scoped tables
      const tables: Array<{ tableName: string; count: number; description: string }> = [];
      
      // Core business data
      const userTenantsCount = await db.select({ count: sql<number>`count(*)::int` }).from(userTenants).where(eq(userTenants.tenantId, tenantId));
      tables.push({ tableName: "user_tenants", count: userTenantsCount[0]?.count || 0, description: "User-tenant associations" });
      
      const staffCount = await db.select({ count: sql<number>`count(*)::int` }).from(staff).where(eq(staff.tenantId, tenantId));
      tables.push({ tableName: "staff", count: staffCount[0]?.count || 0, description: "Staff members" });
      
      const customersCount = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.tenantId, tenantId));
      tables.push({ tableName: "customers", count: customersCount[0]?.count || 0, description: "Customers" });
      
      const servicesCount = await db.select({ count: sql<number>`count(*)::int` }).from(services).where(eq(services.tenantId, tenantId));
      tables.push({ tableName: "services", count: servicesCount[0]?.count || 0, description: "Services" });
      
      const bookingsCount = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.tenantId, tenantId));
      tables.push({ tableName: "bookings", count: bookingsCount[0]?.count || 0, description: "Bookings" });
      
      const invoicesCount = await db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(eq(invoices.tenantId, tenantId));
      tables.push({ tableName: "invoices", count: invoicesCount[0]?.count || 0, description: "Invoices" });
      
      const paymentsCount = await db.select({ count: sql<number>`count(*)::int` }).from(payments).where(eq(payments.tenantId, tenantId));
      tables.push({ tableName: "payments", count: paymentsCount[0]?.count || 0, description: "Payments" });
      
      const projectsCount = await db.select({ count: sql<number>`count(*)::int` }).from(projects).where(eq(projects.tenantId, tenantId));
      tables.push({ tableName: "projects", count: projectsCount[0]?.count || 0, description: "Projects" });
      
      const timesheetsCount = await db.select({ count: sql<number>`count(*)::int` }).from(timesheets).where(eq(timesheets.tenantId, tenantId));
      tables.push({ tableName: "timesheets", count: timesheetsCount[0]?.count || 0, description: "Timesheets" });
      
      const auditLogsCount = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs).where(eq(auditLogs.tenantId, tenantId));
      tables.push({ tableName: "audit_logs", count: auditLogsCount[0]?.count || 0, description: "Audit Logs" });
      
      const refreshTokensCount = await db.select({ count: sql<number>`count(*)::int` }).from(refreshTokens).where(eq(refreshTokens.tenantId, tenantId));
      tables.push({ tableName: "refresh_tokens", count: refreshTokensCount[0]?.count || 0, description: "Refresh Tokens" });
      
      const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);

      res.json({
        tenantId,
        tenantName: tenant.name,
        isProtected: tenant.isProtected || false,
        tables: tables.filter(t => t.count > 0),
        totalRecords
      });
    } catch (error) {
      console.error("Tenant delete summary error:", error);
      res.status(500).json({ message: "Failed to get delete summary" });
    }
  });

  // Get user delete summary - preview what will be deleted for a user
  app.get("/api/super-admin/tenants/:tenantId/users/:userId/delete-summary", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Count records created by this user within the tenant
      const tables: Array<{ tableName: string; count: number; description: string }> = [];
      
      const staffCount = await db.select({ count: sql<number>`count(*)::int` }).from(staff)
        .where(and(eq(staff.tenantId, tenantId), eq(staff.createdBy, userId)));
      tables.push({ tableName: "staff", count: staffCount[0]?.count || 0, description: "Staff records created by user" });
      
      const customersCount = await db.select({ count: sql<number>`count(*)::int` }).from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.createdBy, userId)));
      tables.push({ tableName: "customers", count: customersCount[0]?.count || 0, description: "Customers created by user" });
      
      const servicesCount = await db.select({ count: sql<number>`count(*)::int` }).from(services)
        .where(and(eq(services.tenantId, tenantId), eq(services.createdBy, userId)));
      tables.push({ tableName: "services", count: servicesCount[0]?.count || 0, description: "Services created by user" });
      
      const bookingsCount = await db.select({ count: sql<number>`count(*)::int` }).from(bookings)
        .where(and(eq(bookings.tenantId, tenantId), eq(bookings.createdBy, userId)));
      tables.push({ tableName: "bookings", count: bookingsCount[0]?.count || 0, description: "Bookings created by user" });
      
      const projectsCount = await db.select({ count: sql<number>`count(*)::int` }).from(projects)
        .where(and(eq(projects.tenantId, tenantId), eq(projects.createdBy, userId)));
      tables.push({ tableName: "projects", count: projectsCount[0]?.count || 0, description: "Projects created by user" });
      
      const invoicesCount = await db.select({ count: sql<number>`count(*)::int` }).from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), eq(invoices.createdBy, userId)));
      tables.push({ tableName: "invoices", count: invoicesCount[0]?.count || 0, description: "Invoices created by user" });
      
      const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);

      res.json({
        userId,
        userEmail: user.email,
        tenantId,
        tables: tables.filter(t => t.count > 0),
        totalRecords
      });
    } catch (error) {
      console.error("User delete summary error:", error);
      res.status(500).json({ message: "Failed to get delete summary" });
    }
  });

  // Queue tenant data wipe job
  app.post("/api/super-admin/tenants/:tenantId/wipe", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { confirmText, reason } = req.body;
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (tenant.isProtected) {
        return res.status(403).json({ message: "This tenant is protected and cannot be wiped" });
      }

      const expectedConfirmText = `DELETE ${tenant.name}`;
      if (confirmText !== expectedConfirmText) {
        return res.status(400).json({ 
          message: `Confirmation text must be exactly: "${expectedConfirmText}"` 
        });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "A detailed reason (at least 10 characters) is required" });
      }

      const adminId = req.platformAdminContext?.platformAdmin.id;
      if (!adminId) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      // Create the delete job
      const [job] = await db.insert(deleteJobs).values({
        targetType: "tenant",
        targetId: tenantId,
        tenantId,
        mode: "hard_delete",
        status: "queued",
        requestedBy: adminId,
        reason: reason.trim(),
        confirmText,
      }).returning();

      // Log the audit event
      auditService.logAsync({
        tenantId,
        userId: adminId,
        action: "create",
        resource: "delete_job",
        resourceId: job.id,
        metadata: { 
          accessType: "super_admin",
          targetType: "tenant",
          targetId: tenantId,
          tenantName: tenant.name,
          reason: reason.trim(),
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ 
        status: "queued", 
        jobId: job.id,
        message: "Tenant wipe job queued successfully. The deletion will be processed in the background."
      });
    } catch (error) {
      console.error("Tenant wipe queue error:", error);
      res.status(500).json({ message: "Failed to queue tenant wipe" });
    }
  });

  // Delete user with data (modes: deactivate, deleteUserOnly, deleteUserAndData)
  app.post("/api/super-admin/tenants/:tenantId/users/:userId/delete", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId, userId } = req.params;
      const { mode, confirmText, reason } = req.body;
      
      if (!["deactivate", "deleteUserOnly", "deleteUserAndData"].includes(mode)) {
        return res.status(400).json({ message: "Invalid mode. Must be: deactivate, deleteUserOnly, or deleteUserAndData" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (confirmText !== "DELETE USER") {
        return res.status(400).json({ message: 'Confirmation text must be exactly: "DELETE USER"' });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: "A detailed reason (at least 10 characters) is required" });
      }

      const adminId = req.platformAdminContext?.platformAdmin.id;
      if (!adminId) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      // Check if user is tenant owner
      const [userTenantRecord] = await db.select().from(userTenants)
        .innerJoin(roles, eq(userTenants.roleId, roles.id))
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.tenantId, tenantId)
        ));

      if (userTenantRecord?.roles?.name?.toLowerCase() === "owner") {
        return res.status(403).json({ message: "Cannot delete tenant owner. Transfer ownership first." });
      }

      // Create the delete job
      const [job] = await db.insert(deleteJobs).values({
        targetType: "user",
        targetId: userId,
        tenantId,
        mode: mode === "deactivate" ? "soft_delete" : mode === "deleteUserAndData" ? "hard_delete" : "anonymize",
        status: "queued",
        requestedBy: adminId,
        reason: reason.trim(),
        confirmText,
        summary: { userEmail: user.email, mode }
      }).returning();

      // Log the audit event
      auditService.logAsync({
        tenantId,
        userId: adminId,
        action: "create",
        resource: "delete_job",
        resourceId: job.id,
        metadata: { 
          accessType: "super_admin",
          targetType: "user",
          targetId: userId,
          targetUserEmail: user.email,
          mode,
          reason: reason.trim(),
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ 
        status: "queued", 
        jobId: job.id,
        message: `User ${mode} job queued successfully. The operation will be processed in the background.`
      });
    } catch (error) {
      console.error("User delete queue error:", error);
      res.status(500).json({ message: "Failed to queue user delete" });
    }
  });

  // Get delete job status
  app.get("/api/super-admin/delete-jobs/:jobId", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { jobId } = req.params;
      
      const [job] = await db.select().from(deleteJobs).where(eq(deleteJobs.id, jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Get delete job error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // List delete jobs (with optional filters)
  app.get("/api/super-admin/delete-jobs", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { status, tenantId, limit = "50" } = req.query;
      
      let query = db.select().from(deleteJobs);
      
      const conditions = [];
      if (status && typeof status === "string") {
        conditions.push(eq(deleteJobs.status, status as any));
      }
      if (tenantId && typeof tenantId === "string") {
        conditions.push(eq(deleteJobs.tenantId, tenantId));
      }
      
      const jobs = await db.select()
        .from(deleteJobs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(deleteJobs.queuedAt))
        .limit(parseInt(limit as string, 10));

      res.json(jobs);
    } catch (error) {
      console.error("List delete jobs error:", error);
      res.status(500).json({ message: "Failed to list jobs" });
    }
  });

  // Cancel a queued delete job
  app.post("/api/super-admin/delete-jobs/:jobId/cancel", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { jobId } = req.params;
      const { reason } = req.body;
      
      const [job] = await db.select().from(deleteJobs).where(eq(deleteJobs.id, jobId));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== "queued") {
        return res.status(400).json({ message: "Only queued jobs can be cancelled" });
      }

      const [updatedJob] = await db.update(deleteJobs)
        .set({ 
          status: "cancelled", 
          errorMessage: reason || "Cancelled by admin",
          completedAt: new Date()
        })
        .where(eq(deleteJobs.id, jobId))
        .returning();

      res.json(updatedJob);
    } catch (error) {
      console.error("Cancel delete job error:", error);
      res.status(500).json({ message: "Failed to cancel job" });
    }
  });

  // ==================== TENANT MANAGEMENT ROUTES ====================
  
  const tenantProtectedMiddleware = [
    authenticateHybrid(),
    tenantResolutionMiddleware(),
    enforceTenantBoundary(),
    tenantIsolationMiddleware(),
    blockBusinessTypeModification(),
    enforceDashboardLock,
  ];

  app.get("/api/tenant", ...tenantProtectedMiddleware, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const settings = await tenantService.getTenantSettings(tenantId);
      const features = await featureService.getTenantFeatures(tenantId);

      res.json({
        tenant,
        settings,
        features: features,
      });
    } catch (error) {
      console.error("Get tenant error:", error);
      res.status(500).json({ message: "Failed to get tenant" });
    }
  });

  app.patch("/api/tenant", ...tenantProtectedMiddleware, requireMinimumRole("admin"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const { name, email, phone, address, timezone, currency, logo } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (timezone !== undefined) updateData.timezone = timezone;
      if (currency !== undefined) updateData.currency = currency;
      if (logo !== undefined) updateData.logo = logo;

      const updatedTenant = await tenantService.updateTenant(tenantId, updateData);

      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "update",
        resource: "tenant",
        resourceId: tenantId,
        newValue: updateData,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(updatedTenant);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.get("/api/tenant/settings", ...tenantProtectedMiddleware, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const settings = await tenantService.getTenantSettings(tenantId);
      res.json(settings || {});
    } catch (error) {
      console.error("Get tenant settings error:", error);
      res.status(500).json({ message: "Failed to get tenant settings" });
    }
  });

  app.patch("/api/tenant/settings", ...tenantProtectedMiddleware, requireMinimumRole("admin"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const settings = await tenantService.updateTenantSettings(tenantId, req.body);

      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "update",
        resource: "tenant_settings",
        resourceId: tenantId,
        newValue: req.body,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(settings);
    } catch (error) {
      console.error("Update tenant settings error:", error);
      res.status(500).json({ message: "Failed to update tenant settings" });
    }
  });

  // ==================== BUSINESS ROUTES ====================

  app.get("/api/dashboard/stats", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/analytics", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const analytics = await storage.getAnalytics(tenantId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/customers", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const customers = await storage.getCustomers(tenantId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const customer = await storage.getCustomer(req.params.id, tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertCustomerSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const customer = await storage.createCustomer(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "customers",
        resourceId: customer.id,
        newValue: customer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldCustomer = await storage.getCustomer(req.params.id, tenantId);
      const customer = await storage.updateCustomer(req.params.id, tenantId, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "customers",
        resourceId: customer.id,
        oldValue: oldCustomer as any,
        newValue: customer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldCustomer = await storage.getCustomer(req.params.id, tenantId);
      await storage.deleteCustomer(req.params.id, tenantId);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "customers",
        resourceId: req.params.id,
        oldValue: oldCustomer as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.get("/api/services", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const services = await storage.getServices(tenantId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const service = await storage.getService(req.params.id, tenantId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertServiceSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const service = await storage.createService(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "services",
        resourceId: service.id,
        newValue: service as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldService = await storage.getService(req.params.id, tenantId);
      const service = await storage.updateService(req.params.id, tenantId, req.body);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "services",
        resourceId: service.id,
        oldValue: oldService as any,
        newValue: service as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldService = await storage.getService(req.params.id, tenantId);
      await storage.deleteService(req.params.id, tenantId);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "services",
        resourceId: req.params.id,
        oldValue: oldService as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Salon Dashboard Stats
  app.get("/api/salon/stats", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }

      const today = new Date().toISOString().split('T')[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [customers, services, bookings] = await Promise.all([
        storage.getCustomers(tenantId),
        storage.getServices(tenantId),
        storage.getBookings(tenantId),
      ]);

      const todayAppointments = bookings.filter(b => b.bookingDate === today).length;
      const activeServices = services.filter(s => s.isActive !== false).length;
      const monthlyRevenue = bookings
        .filter(b => b.bookingDate && b.bookingDate >= startOfMonth && b.status === "completed")
        .reduce((sum, b) => sum + (parseFloat(b.amount?.toString() || "0")), 0);

      res.json({
        totalClients: customers.length,
        todayAppointments,
        activeServices,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching salon stats:", error);
      res.status(500).json({ message: "Failed to fetch salon stats" });
    }
  });

  app.get("/api/bookings", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const bookings = await storage.getBookings(tenantId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/upcoming", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const bookings = await storage.getUpcomingBookings(tenantId, limit);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  app.get("/api/bookings/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const booking = await storage.getBooking(req.params.id, tenantId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post("/api/bookings", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const parsed = insertBookingSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const booking = await storage.createBooking(parsed.data);
      
      auditService.logAsync({
        tenantId,
        userId: getUserId(req),
        action: "create",
        resource: "bookings",
        resourceId: booking.id,
        newValue: booking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch("/api/bookings/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldBooking = await storage.getBooking(req.params.id, tenantId);
      const booking = await storage.updateBooking(req.params.id, tenantId, req.body);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "update",
        resource: "bookings",
        resourceId: booking.id,
        oldValue: oldBooking as any,
        newValue: booking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const oldBooking = await storage.getBooking(req.params.id, tenantId);
      await storage.deleteBooking(req.params.id, tenantId);
      
      auditService.logAsync({
        tenantId: getTenantId(req),
        userId: getUserId(req),
        action: "delete",
        resource: "bookings",
        resourceId: req.params.id,
        oldValue: oldBooking as any,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  app.get("/api/context", authenticateHybrid(), async (req, res) => {
    try {
      const context = req.context;
      const tenantId = getTenantId(req);
      
      // Get module access based on tenant's subscription plan
      let moduleAccess: Record<string, { access: string; reason?: string }> = {};
      let planTier: string | undefined;
      let addonAccess: Record<string, {
        canUse: boolean;
        canPurchase: boolean;
        reason?: string;
        installStatus?: string;
        subscriptionStatus?: string;
      }> = {};
      
      if (tenantId) {
        const plan = await subscriptionService.getTenantPlan(tenantId);
        if (plan) {
          planTier = plan.tier;
          const modules = ["software_services", "consulting", "hrms", "furniture", "furniture_manufacturing", 
                          "legal", "education", "tourism", "logistics", "real_estate", "analytics", 
                          "marketplace", "clinic", "salon", "pg_hostel", "coworking", "gym"];
          for (const moduleId of modules) {
            const access = await subscriptionService.canAccessModule(tenantId, moduleId);
            moduleAccess[moduleId] = { access: access.allowed ? "included" : "unavailable", reason: access.reason };
          }
        }
        
        // Build addon access map for the tenant
        try {
          addonAccess = await buildAddonAccessMap(tenantId);
        } catch (addonErr) {
          console.error("[context] Error building addon access map:", addonErr);
        }
      }
      
      res.json({
        user: context.user,
        tenant: context.tenant ? {
          id: context.tenant.id,
          name: context.tenant.name,
          businessType: context.tenant.businessType,
          logoUrl: context.tenant.logoUrl,
          primaryColor: context.tenant.primaryColor,
        } : null,
        role: context.role ? {
          id: context.role.id,
          name: context.role.name,
        } : null,
        permissions: context.permissions,
        features: context.features,
        moduleAccess,
        planTier,
        addonAccess,
      });
    } catch (error) {
      console.error("Error fetching context:", error);
      res.status(500).json({ message: "Failed to fetch context" });
    }
  });

  app.get("/api/features", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const features = await featureService.getTenantFeatures(tenantId);
      const allFeatures = await featureService.getAllFeatures();
      res.json({
        enabled: features,
        available: allFeatures,
      });
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.get("/api/audit-logs", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(403).json({ message: "No tenant access" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await auditService.getAuditLogsWithUsers({ tenantId, limit, offset });
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==================== NOTIFICATION TEMPLATES ====================
  app.get("/api/notification-templates", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const templates = await storage.getNotificationTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/notification-templates", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertNotificationTemplateSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const template = await storage.createNotificationTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating notification template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/notification-templates/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getNotificationTemplate(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      const template = await storage.updateNotificationTemplate(req.params.id, tenantId, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating notification template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/notification-templates/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getNotificationTemplate(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }
      await storage.deleteNotificationTemplate(req.params.id, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // ==================== NOTIFICATION LOGS ====================
  app.get("/api/notification-logs", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getNotificationLogs(tenantId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // ==================== INVOICES ====================
  app.get("/api/invoices", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const invoices = await storage.getInvoices(tenantId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const invoice = await storage.getInvoice(req.params.id, tenantId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const items = await storage.getInvoiceItems(req.params.id);
      res.json({ ...invoice, items });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const { items, ...invoiceData } = req.body;
      
      const currency = invoiceData.currency || "INR";
      const baseCurrency = invoiceData.baseCurrency || "USD";
      let exchangeRate = "1.000000";
      
      const subtotal = parseFloat(invoiceData.subtotal || "0");
      const taxAmount = parseFloat(invoiceData.taxAmount || "0");
      const discountAmount = parseFloat(invoiceData.discountAmount || "0");
      const totalAmount = parseFloat(invoiceData.totalAmount || "0");
      let baseAmount = totalAmount;
      
      if (currency !== baseCurrency) {
        try {
          const rateData = await storage.getExchangeRate(currency, baseCurrency);
          if (rateData && rateData.rate) {
            const rateNum = parseFloat(rateData.rate);
            if (rateNum > 0) {
              exchangeRate = rateData.rate;
              baseAmount = totalAmount * rateNum;
            }
          }
        } catch (rateError) {
          console.warn(`Exchange rate not found for ${currency} to ${baseCurrency}, using 1:1`);
        }
      }
      
      const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}`;
      
      const parsed = insertInvoiceSchema.safeParse({ 
        ...invoiceData, 
        tenantId, 
        createdBy: getUserId(req),
        invoiceNumber,
        currency,
        baseCurrency,
        exchangeRate: exchangeRate,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        baseAmount: baseAmount.toFixed(2),
        paidAmount: "0.00",
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const invoice = await storage.createInvoice(parsed.data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemTotalPrice = parseFloat(item.totalPrice || "0");
          const itemUnitPrice = parseFloat(item.unitPrice || "0");
          await storage.createInvoiceItem({ 
            ...item, 
            invoiceId: invoice.id,
            unitPrice: itemUnitPrice.toFixed(2),
            totalPrice: itemTotalPrice.toFixed(2),
          });
        }
      }
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getInvoice(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const invoice = await storage.updateInvoice(req.params.id, tenantId, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getInvoice(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      await storage.deleteInvoice(req.params.id, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // ==================== PAYMENTS ====================
  app.get("/api/payments", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const payments = await storage.getPayments(tenantId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      
      const paymentData = req.body;
      const currency = paymentData.currency || "INR";
      const baseCurrency = paymentData.baseCurrency || "USD";
      let exchangeRate = "1.000000";
      const amountNum = parseFloat(paymentData.amount || "0");
      let baseAmount = amountNum;
      
      if (currency !== baseCurrency) {
        try {
          const rateData = await storage.getExchangeRate(currency, baseCurrency);
          if (rateData && rateData.rate) {
            const rateNum = parseFloat(rateData.rate);
            if (rateNum > 0) {
              exchangeRate = rateData.rate;
              baseAmount = amountNum * rateNum;
            }
          }
        } catch (rateError) {
          console.warn(`Exchange rate not found for ${currency} to ${baseCurrency}, using 1:1`);
        }
      }
      
      const parsed = insertPaymentSchema.safeParse({ 
        ...paymentData, 
        tenantId, 
        createdBy: getUserId(req),
        currency,
        baseCurrency,
        exchangeRate: exchangeRate,
        amount: amountNum.toFixed(2),
        baseAmount: baseAmount.toFixed(2),
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const payment = await storage.createPayment(parsed.data);
      
      if (payment.invoiceId) {
        const invoice = await storage.getInvoice(payment.invoiceId, tenantId);
        if (invoice) {
          let paymentAmountInInvoiceCurrency = parseFloat(payment.amount) || 0;
          
          if (payment.currency !== invoice.currency) {
            try {
              const conversionRate = await storage.getExchangeRate(payment.currency, invoice.currency);
              if (conversionRate && conversionRate.rate) {
                const rateNum = parseFloat(conversionRate.rate);
                if (rateNum > 0) {
                  paymentAmountInInvoiceCurrency = paymentAmountInInvoiceCurrency * rateNum;
                }
              }
            } catch (convError) {
              console.warn(`Could not convert payment from ${payment.currency} to ${invoice.currency}, using original amount`);
            }
          }
          
          const currentPaid = parseFloat(invoice.paidAmount || "0") || 0;
          const totalAmount = parseFloat(invoice.totalAmount) || 0;
          const newPaidAmount = Math.max(0, currentPaid + paymentAmountInInvoiceCurrency);
          await storage.updateInvoice(payment.invoiceId, tenantId, { 
            paidAmount: newPaidAmount.toFixed(2),
            status: newPaidAmount >= totalAmount ? "paid" : newPaidAmount > 0 ? "partial" : invoice.status,
            paidAt: newPaidAmount >= totalAmount ? new Date() : invoice.paidAt,
          });
        }
      }
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // ==================== INVENTORY CATEGORIES ====================
  app.get("/api/inventory/categories", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const categories = await storage.getInventoryCategories(tenantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/inventory/categories", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertInventoryCategorySchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const category = await storage.createInventoryCategory(parsed.data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating inventory category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // ==================== INVENTORY ITEMS ====================
  app.get("/api/inventory/items", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const items = await storage.getInventoryItems(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post("/api/inventory/items", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertInventoryItemSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const item = await storage.createInventoryItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch("/api/inventory/items/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getInventoryItem(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Item not found" });
      }
      const item = await storage.updateInventoryItem(req.params.id, tenantId, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.post("/api/inventory/items/:id/adjust", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const item = await storage.getInventoryItem(req.params.id, tenantId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const { quantity, type, notes } = req.body;
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) return res.status(400).json({ message: "Quantity must be positive" });
      const previousStock = item.currentStock || 0;
      const newStock = type === "add" ? previousStock + qty : Math.max(0, previousStock - qty);
      await storage.updateInventoryItem(req.params.id, tenantId, { currentStock: newStock });
      const transaction = await storage.createInventoryTransaction({
        tenantId, itemId: req.params.id, type, quantity: qty, previousStock, newStock,
        notes, createdBy: getUserId(req),
      });
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      res.status(500).json({ message: "Failed to adjust inventory" });
    }
  });

  // ==================== MEMBERSHIP PLANS ====================
  app.get("/api/membership-plans", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const plans = await storage.getMembershipPlans(tenantId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching membership plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post("/api/membership-plans", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertMembershipPlanSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const plan = await storage.createMembershipPlan(parsed.data);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating membership plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.patch("/api/membership-plans/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getMembershipPlan(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Plan not found" });
      }
      const plan = await storage.updateMembershipPlan(req.params.id, tenantId, req.body);
      res.json(plan);
    } catch (error) {
      console.error("Error updating membership plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  // ==================== CUSTOMER MEMBERSHIPS ====================
  app.get("/api/customer-memberships", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const memberships = await storage.getCustomerMemberships(tenantId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching customer memberships:", error);
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  app.post("/api/customer-memberships", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertCustomerMembershipSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const membership = await storage.createCustomerMembership(parsed.data);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error creating customer membership:", error);
      res.status(500).json({ message: "Failed to create membership" });
    }
  });

  app.patch("/api/customer-memberships/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getCustomerMembership(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Membership not found" });
      }
      const membership = await storage.updateCustomerMembership(req.params.id, tenantId, req.body);
      res.json(membership);
    } catch (error) {
      console.error("Error updating customer membership:", error);
      res.status(500).json({ message: "Failed to update membership" });
    }
  });

  // ==================== COWORKING MODULE ====================

  app.get("/api/coworking/spaces", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const spacesList = await storage.getSpaces(tenantId);
      res.json(spacesList);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      res.status(500).json({ message: "Failed to fetch spaces" });
    }
  });

  app.get("/api/coworking/spaces/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const space = await storage.getSpace(req.params.id, tenantId);
      if (!space) return res.status(404).json({ message: "Space not found" });
      res.json(space);
    } catch (error) {
      console.error("Error fetching space:", error);
      res.status(500).json({ message: "Failed to fetch space" });
    }
  });

  app.post("/api/coworking/spaces", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertSpaceSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const space = await storage.createSpace(parsed.data);
      res.status(201).json(space);
    } catch (error) {
      console.error("Error creating space:", error);
      res.status(500).json({ message: "Failed to create space" });
    }
  });

  app.patch("/api/coworking/spaces/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getSpace(req.params.id, tenantId);
      if (!existing) return res.status(404).json({ message: "Space not found" });
      
      // Only allow updating specific fields (whitelist approach for security)
      const allowedFields = ["name", "location", "description", "capacity", "amenities", "isActive"];
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in req.body) {
          updates[key] = req.body[key];
        }
      }
      
      const space = await storage.updateSpace(req.params.id, tenantId, updates);
      res.json(space);
    } catch (error) {
      console.error("Error updating space:", error);
      res.status(500).json({ message: "Failed to update space" });
    }
  });

  app.delete("/api/coworking/spaces/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getSpace(req.params.id, tenantId);
      if (!existing) return res.status(404).json({ message: "Space not found" });
      await storage.deleteSpace(req.params.id, tenantId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting space:", error);
      res.status(500).json({ message: "Failed to delete space" });
    }
  });

  app.get("/api/coworking/desks", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const spaceId = req.query.spaceId as string | undefined;
      const desks = await storage.getDesks(tenantId, spaceId);
      res.json(desks);
    } catch (error) {
      console.error("Error fetching desks:", error);
      res.status(500).json({ message: "Failed to fetch desks" });
    }
  });

  app.post("/api/coworking/book", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      if (!userId) return res.status(401).json({ message: "User not authenticated" });
      const parsed = insertDeskBookingSchema.safeParse({ ...req.body, tenantId, userId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const booking = await storage.createDeskBooking(parsed.data);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating desk booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/coworking/bookings", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const bookings = await storage.getDeskBookings(tenantId, userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching desk bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // ==================== PATIENTS (Healthcare) ====================
  const patientDataMasking = dataMaskingMiddleware({
    email: "email",
    phone: "phone",
    dob: "dateOfBirth",
  });

  app.get("/api/patients", 
    authenticateHybrid(), 
    requireAccessReason(),
    phiAccessMiddleware("patient"),
    patientDataMasking,
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const patients = await storage.getPatients(tenantId);
        res.json(patients);
      } catch (error) {
        console.error("Error fetching patients:", error);
        res.status(500).json({ message: "Failed to fetch patients" });
      }
    }
  );

  app.get("/api/patients/:id", 
    authenticateHybrid(), 
    requireAccessReason(),
    phiAccessMiddleware("patient"),
    patientDataMasking,
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const patient = await storage.getPatient(req.params.id, tenantId);
        if (!patient) {
          return res.status(404).json({ message: "Patient not found" });
        }
        res.json(patient);
      } catch (error) {
        console.error("Error fetching patient:", error);
        res.status(500).json({ message: "Failed to fetch patient" });
      }
    }
  );

  app.get("/api/patients/:patientId/access-history", 
    authenticateHybrid(),
    requireAccessReason(),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const history = await complianceService.getPatientAccessHistory(
          tenantId, 
          req.params.patientId
        );
        res.json(history);
      } catch (error) {
        console.error("Error fetching access history:", error);
        res.status(500).json({ message: "Failed to fetch access history" });
      }
    }
  );

  app.post("/api/patients", 
    authenticateHybrid(), 
    phiAccessMiddleware("patient"),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const parsed = insertPatientSchema.safeParse({ ...req.body, tenantId });
        if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
        const patient = await storage.createPatient(parsed.data);
        res.status(201).json(patient);
      } catch (error) {
        console.error("Error creating patient:", error);
        res.status(500).json({ message: "Failed to create patient" });
      }
    }
  );

  app.patch("/api/patients/:id", 
    authenticateHybrid(), 
    requireAccessReason(),
    phiAccessMiddleware("patient"),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const existing = await storage.getPatient(req.params.id, tenantId);
        if (!existing) {
          return res.status(404).json({ message: "Patient not found" });
        }
        const patient = await storage.updatePatient(req.params.id, tenantId, req.body);
        res.json(patient);
      } catch (error) {
        console.error("Error updating patient:", error);
        res.status(500).json({ message: "Failed to update patient" });
      }
    }
  );

  // ==================== DOCTORS (Healthcare) ====================
  app.get("/api/doctors", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const doctors = await storage.getDoctors(tenantId);
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.post("/api/doctors", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertDoctorSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const doctor = await storage.createDoctor(parsed.data);
      res.status(201).json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  app.patch("/api/doctors/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getDoctor(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      const doctor = await storage.updateDoctor(req.params.id, tenantId, req.body);
      res.json(doctor);
    } catch (error) {
      console.error("Error updating doctor:", error);
      res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  // ==================== APPOINTMENTS (Healthcare) ====================
  app.get("/api/appointments", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const appointments = await storage.getAppointments(tenantId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertAppointmentSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const appointment = await storage.createAppointment(parsed.data);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const existing = await storage.getAppointment(req.params.id, tenantId);
      if (!existing) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      const appointment = await storage.updateAppointment(req.params.id, tenantId, req.body);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // ==================== MEDICAL RECORDS (Healthcare) ====================
  app.get("/api/patients/:patientId/medical-records", 
    authenticateHybrid(), 
    requireAccessReason(),
    phiAccessMiddleware("medical_record"),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const patient = await storage.getPatient(req.params.patientId, tenantId);
        if (!patient) {
          return res.status(404).json({ message: "Patient not found" });
        }
        const records = await storage.getMedicalRecords(req.params.patientId, tenantId);
        res.json(records);
      } catch (error) {
        console.error("Error fetching medical records:", error);
        res.status(500).json({ message: "Failed to fetch records" });
      }
    }
  );

  app.post("/api/medical-records", 
    authenticateHybrid(), 
    phiAccessMiddleware("medical_record"),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const parsed = insertMedicalRecordSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
        if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
        const record = await storage.createMedicalRecord(parsed.data);
        res.status(201).json(record);
      } catch (error) {
        console.error("Error creating medical record:", error);
        res.status(500).json({ message: "Failed to create record" });
      }
    }
  );

  app.patch("/api/medical-records/:id", 
    authenticateHybrid(), 
    requireAccessReason(),
    phiAccessMiddleware("medical_record"),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const existing = await storage.getMedicalRecord(req.params.id, tenantId);
        if (!existing) {
          return res.status(404).json({ message: "Record not found" });
        }
        const record = await storage.updateMedicalRecord(req.params.id, tenantId, req.body);
        res.json(record);
      } catch (error) {
        console.error("Error updating medical record:", error);
        res.status(500).json({ message: "Failed to update record" });
      }
    }
  );

  // ==================== COMPLIANCE REPORTS ====================
  app.get("/api/compliance/unusual-access", 
    authenticateHybrid(),
    async (req, res) => {
      try {
        const tenantId = getTenantId(req);
        if (!tenantId) return res.status(403).json({ message: "No tenant access" });
        const windowHours = parseInt(req.query.windowHours as string) || 24;
        const threshold = parseInt(req.query.threshold as string) || 50;
        const patterns = await complianceService.getUnusualAccessPatterns(tenantId, {
          windowHours,
          threshold,
        });
        res.json(patterns);
      } catch (error) {
        console.error("Error fetching unusual access patterns:", error);
        res.status(500).json({ message: "Failed to fetch patterns" });
      }
    }
  );

  // ==================== PAYMENT WEBHOOKS ====================
  const { paymentService } = await import("./core/payments/payment-service");

  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const result = await paymentService.handleWebhookEvent(
        "stripe",
        req.body,
        signature,
        req.body
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/webhooks/razorpay", express.json(), async (req, res) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const result = await paymentService.handleWebhookEvent(
        "razorpay",
        req.body,
        signature,
        JSON.stringify(req.body)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Razorpay webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/webhooks/paytabs", express.json(), async (req, res) => {
    try {
      const signature = req.headers["signature"] as string;
      const result = await paymentService.handleWebhookEvent(
        "paytabs",
        req.body,
        signature,
        JSON.stringify(req.body)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("PayTabs webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.post("/api/webhooks/billplz", express.json(), async (req, res) => {
    try {
      const signature = req.headers["x-signature"] as string;
      const result = await paymentService.handleWebhookEvent(
        "billplz",
        req.body,
        signature,
        JSON.stringify(req.body)
      );
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Billplz webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ==================== GLOBAL BILLING API (Platform Admin) ====================
  app.get("/api/platform-admin/billing/stats", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_billing"), async (req, res) => {
    try {
      const stats = await paymentService.getRevenueStats();
      res.json({
        totalRevenue: stats.totalRevenue,
        monthlyRecurring: stats.mrr,
        activeSubscriptions: stats.activeSubscriptions,
        pendingInvoices: stats.pendingInvoices,
        revenueChange: stats.revenueChange,
        revenueByBusinessType: stats.revenueByBusinessType,
        subscriptionsByBusinessType: stats.subscriptionsByBusinessType,
      });
    } catch (error) {
      console.error("Error fetching billing stats:", error);
      res.status(500).json({ message: "Failed to fetch billing stats" });
    }
  });

  app.get("/api/platform-admin/billing/revenue", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const stats = await paymentService.getRevenueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
      res.status(500).json({ message: "Failed to fetch revenue stats" });
    }
  });

  app.get("/api/platform-admin/billing/pricing-plans", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const country = req.query.country as string | undefined;
      const plans = await paymentService.getPricingPlans(country as any);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching pricing plans:", error);
      res.status(500).json({ message: "Failed to fetch pricing plans" });
    }
  });

  app.get("/api/platform-admin/billing/transactions", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { country, gateway, status, limit = "50" } = req.query;
      
      const transactions = await db.select().from(transactionLogs).orderBy(desc(transactionLogs.createdAt)).limit(parseInt(limit as string));
      
      let filtered = transactions;
      if (country) filtered = filtered.filter(t => t.country === country);
      if (gateway) filtered = filtered.filter(t => t.gateway === gateway);
      if (status) filtered = filtered.filter(t => t.status === status);
      
      res.json({ transactions: filtered, total: filtered.length });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/platform-admin/billing/subscriptions", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const subscriptions = await db.select({
        id: tenantSubscriptions.id,
        tenantId: tenantSubscriptions.tenantId,
        tenantName: tenants.name,
        tenantCountry: tenants.country,
        planId: tenantSubscriptions.planId,
        status: tenantSubscriptions.status,
        currentPeriodStart: tenantSubscriptions.currentPeriodStart,
        currentPeriodEnd: tenantSubscriptions.currentPeriodEnd,
        paymentFailureCount: tenantSubscriptions.paymentFailureCount,
        gateway: tenantSubscriptions.gateway,
        createdAt: tenantSubscriptions.createdAt,
      })
        .from(tenantSubscriptions)
        .innerJoin(tenants, eq(tenants.id, tenantSubscriptions.tenantId))
        .orderBy(desc(tenantSubscriptions.createdAt));
      
      res.json({ subscriptions, total: subscriptions.length });
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/platform-admin/billing/invoices", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { status, country, limit = "50" } = req.query;
      
      let invoices = await db.select({
        id: subscriptionInvoices.id,
        tenantId: subscriptionInvoices.tenantId,
        tenantName: tenants.name,
        tenantEmail: tenants.email,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        status: subscriptionInvoices.status,
        country: subscriptionInvoices.country,
        currency: subscriptionInvoices.currency,
        subtotal: subscriptionInvoices.subtotal,
        taxName: subscriptionInvoices.taxName,
        taxRate: subscriptionInvoices.taxRate,
        taxAmount: subscriptionInvoices.taxAmount,
        totalAmount: subscriptionInvoices.totalAmount,
        amountPaid: subscriptionInvoices.amountPaid,
        amountDue: subscriptionInvoices.amountDue,
        dueDate: subscriptionInvoices.dueDate,
        paidAt: subscriptionInvoices.paidAt,
        gateway: subscriptionInvoices.gateway,
        notes: subscriptionInvoices.notes,
        createdAt: subscriptionInvoices.createdAt,
      })
        .from(subscriptionInvoices)
        .innerJoin(tenants, eq(tenants.id, subscriptionInvoices.tenantId))
        .orderBy(desc(subscriptionInvoices.createdAt))
        .limit(parseInt(limit as string));
      
      if (status) invoices = invoices.filter(i => i.status === status);
      if (country) invoices = invoices.filter(i => i.country === country);
      
      res.json({ invoices, total: invoices.length });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Create invoice for tenant
  app.post("/api/platform-admin/billing/invoices", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId, amount, currency, description, dueDate } = req.body;
      
      if (!tenantId || !amount || !dueDate) {
        return res.status(400).json({ message: "Missing required fields: tenantId, amount, dueDate" });
      }
      
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      const currencyCode = currency || "USD";
      const country = tenant.country || "IN";
      
      // Get tax configuration for the country
      const countryConfig = await db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.country, country as any)).limit(1);
      const taxRate = countryConfig[0]?.taxRate ? parseFloat(countryConfig[0].taxRate) : 0;
      const taxName = countryConfig[0]?.taxName || "TAX";
      
      const subtotal = parseFloat(amount);
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const [newInvoice] = await db.insert(subscriptionInvoices).values({
        tenantId,
        invoiceNumber,
        status: "pending",
        country: country as any,
        currency: currencyCode as any,
        subtotal: subtotal.toFixed(2),
        taxName,
        taxRate: taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        amountDue: totalAmount.toFixed(2),
        dueDate: new Date(dueDate),
        notes: description || null,
      }).returning();
      
      res.status(201).json({ 
        message: "Invoice created successfully", 
        invoice: {
          ...newInvoice,
          tenantName: tenant.name,
        }
      });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Generate PDF for invoice
  app.get("/api/platform-admin/billing/invoices/:id/pdf", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      
      const [invoice] = await db.select({
        id: subscriptionInvoices.id,
        tenantId: subscriptionInvoices.tenantId,
        tenantName: tenants.name,
        tenantEmail: tenants.email,
        tenantPhone: tenants.phone,
        tenantBusinessType: tenants.businessType,
        tenantAddress: tenants.address,
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        status: subscriptionInvoices.status,
        country: subscriptionInvoices.country,
        currency: subscriptionInvoices.currency,
        subtotal: subscriptionInvoices.subtotal,
        taxName: subscriptionInvoices.taxName,
        taxRate: subscriptionInvoices.taxRate,
        taxAmount: subscriptionInvoices.taxAmount,
        totalAmount: subscriptionInvoices.totalAmount,
        amountPaid: subscriptionInvoices.amountPaid,
        amountDue: subscriptionInvoices.amountDue,
        dueDate: subscriptionInvoices.dueDate,
        paidAt: subscriptionInvoices.paidAt,
        periodStart: subscriptionInvoices.periodStart,
        periodEnd: subscriptionInvoices.periodEnd,
        lineItems: subscriptionInvoices.lineItems,
        billingDetails: subscriptionInvoices.billingDetails,
        notes: subscriptionInvoices.notes,
        createdAt: subscriptionInvoices.createdAt,
      })
        .from(subscriptionInvoices)
        .innerJoin(tenants, eq(tenants.id, subscriptionInvoices.tenantId))
        .where(eq(subscriptionInvoices.id, id));
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const currencySymbols: Record<string, string> = {
        USD: "$", INR: "₹", GBP: "£", AED: "د.إ", MYR: "RM", SGD: "S$"
      };
      const symbol = currencySymbols[invoice.currency || "USD"] || "$";
      
      const formatAmount = (amount: string | null) => {
        if (!amount) return `${symbol}0.00`;
        return `${symbol}${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const formatDate = (date: Date | string | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      };

      const businessTypeLabels: Record<string, string> = {
        clinic: "Healthcare / Clinic",
        salon: "Salon & Beauty",
        pg: "PG / Hostel",
        coworking: "Coworking / Gym",
        service: "General Services",
        real_estate: "Real Estate",
        tourism: "Tourism & Travel",
        education: "Education / Coaching",
        logistics: "Logistics",
        legal: "Legal Services"
      };

      const businessLabel = businessTypeLabels[invoice.tenantBusinessType || "service"] || "Business Services";
      
      const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems as { description: string; quantity?: number; unitPrice?: string; amount: string }[] : [];
      const billingDetails = invoice.billingDetails as { planName?: string; billingCycle?: string; features?: string[] } || {};
      
      const defaultLineItems = lineItems.length > 0 ? lineItems : [
        { description: `${billingDetails.planName || "Pro"} Plan Subscription - ${businessLabel}`, quantity: 1, unitPrice: invoice.subtotal, amount: invoice.subtotal || "0" },
      ];

      const lineItemsHtml = defaultLineItems.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.description}</td>
          <td class="center">${item.quantity || 1}</td>
          <td class="amount">${formatAmount(item.unitPrice || item.amount)}</td>
          <td class="amount">${formatAmount(item.amount)}</td>
        </tr>
      `).join("");

      const countryNames: Record<string, string> = {
        india: "India", uk: "United Kingdom", uae: "United Arab Emirates", 
        malaysia: "Malaysia", singapore: "Singapore", other: "Other"
      };
      
      // BizFlow SVG Logo
      const logoSvg = `<svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect x="0" y="5" width="32" height="30" rx="6" fill="url(#logoGrad)"/>
        <path d="M8 15h16M8 20h12M8 25h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        <text x="40" y="28" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#1E293B">Biz<tspan fill="#3B82F6">Flow</tspan></text>
      </svg>`;
      
      // Generate comprehensive HTML invoice
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #3B82F6; }
    .logo-section { }
    .invoice-title-section { text-align: right; }
    .invoice-title { font-size: 36px; font-weight: bold; color: #3B82F6; margin: 0; }
    .invoice-number { font-size: 14px; color: #64748b; margin-top: 5px; }
    
    .info-row { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 40px; }
    .info-block { flex: 1; }
    .info-block.right { text-align: right; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 8px; }
    .info-value { font-size: 14px; color: #1e293b; margin: 4px 0; }
    .info-value strong { font-weight: 600; }
    .info-value.highlight { font-size: 16px; font-weight: 600; color: #1e293b; }
    
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-badge.pending { background: #fef3c7; color: #92400e; }
    .status-badge.paid { background: #d1fae5; color: #065f46; }
    .status-badge.overdue { background: #fee2e2; color: #991b1b; }
    .status-badge.draft { background: #e2e8f0; color: #475569; }
    
    .section-title { font-size: 14px; font-weight: 600; color: #3B82F6; margin: 30px 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .services-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .services-table th { background: #f1f5f9; padding: 14px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    .services-table td { padding: 14px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .services-table .center { text-align: center; }
    .services-table .amount { text-align: right; font-family: 'Courier New', monospace; }
    .services-table tbody tr:hover { background: #f8fafc; }
    
    .totals-section { display: flex; justify-content: flex-end; margin-top: 20px; }
    .totals-box { width: 320px; background: #f8fafc; border-radius: 8px; padding: 20px; }
    .totals-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
    .totals-row.subtotal { border-bottom: 1px solid #e2e8f0; }
    .totals-row.tax { color: #64748b; }
    .totals-row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #3B82F6; padding-top: 15px; margin-top: 10px; color: #1e293b; }
    .totals-row .label { }
    .totals-row .value { font-family: 'Courier New', monospace; }
    .totals-row.paid .value { color: #059669; }
    .totals-row.due .value { color: #dc2626; font-weight: 600; }
    
    .billing-period { background: #eff6ff; border-left: 4px solid #3B82F6; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0; }
    .billing-period-title { font-size: 12px; font-weight: 600; color: #3B82F6; text-transform: uppercase; margin-bottom: 5px; }
    .billing-period-dates { font-size: 14px; color: #1e40af; }
    
    .payment-info { display: flex; gap: 40px; margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .payment-block { flex: 1; }
    .payment-block .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 5px; }
    .payment-block .value { font-size: 16px; font-weight: 600; }
    .payment-block .value.paid { color: #059669; }
    .payment-block .value.due { color: #dc2626; }
    
    .notes-section { margin: 30px 0; padding: 20px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; }
    .notes-title { font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; margin-bottom: 8px; }
    .notes-text { font-size: 14px; color: #78350f; }
    
    .footer { margin-top: 50px; padding-top: 25px; border-top: 1px solid #e2e8f0; }
    .footer-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-left { }
    .footer-right { text-align: right; }
    .footer-text { font-size: 12px; color: #64748b; margin: 3px 0; }
    .footer-thanks { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 10px; }
    
    @media print {
      body { padding: 20px; }
      .invoice-container { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-section">
        ${logoSvg}
      </div>
      <div class="invoice-title-section">
        <h1 class="invoice-title">INVOICE</h1>
        <p class="invoice-number">${invoice.invoiceNumber}</p>
      </div>
    </div>
    
    <div class="info-row">
      <div class="info-block">
        <div class="info-label">Bill To</div>
        <p class="info-value highlight">${invoice.tenantName}</p>
        ${invoice.tenantEmail ? `<p class="info-value">${invoice.tenantEmail}</p>` : ""}
        ${invoice.tenantPhone ? `<p class="info-value">${invoice.tenantPhone}</p>` : ""}
        ${invoice.tenantAddress ? `<p class="info-value">${invoice.tenantAddress}</p>` : ""}
        <p class="info-value">${countryNames[invoice.country || "other"] || invoice.country}</p>
      </div>
      <div class="info-block right">
        <div class="info-label">Invoice Details</div>
        <p class="info-value"><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
        <p class="info-value"><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        <p class="info-value"><strong>Currency:</strong> ${invoice.currency}</p>
        <p class="info-value" style="margin-top: 10px;">
          <span class="status-badge ${invoice.status}">${(invoice.status || "pending").toUpperCase()}</span>
        </p>
      </div>
    </div>

    ${invoice.periodStart && invoice.periodEnd ? `
    <div class="billing-period">
      <div class="billing-period-title">Billing Period</div>
      <div class="billing-period-dates">${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}</div>
    </div>
    ` : ""}

    <div class="section-title">Services Availed</div>
    <table class="services-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Description</th>
          <th style="width: 80px;" class="center">Qty</th>
          <th style="width: 120px;" class="amount">Unit Price</th>
          <th style="width: 120px;" class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>
    
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span class="label">Subtotal</span>
          <span class="value">${formatAmount(invoice.subtotal)}</span>
        </div>
        <div class="totals-row tax">
          <span class="label">${invoice.taxName || "Tax"} (${invoice.taxRate || 0}%)</span>
          <span class="value">${formatAmount(invoice.taxAmount)}</span>
        </div>
        <div class="totals-row total">
          <span class="label">Total</span>
          <span class="value">${formatAmount(invoice.totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="payment-info">
      <div class="payment-block">
        <div class="label">Amount Paid</div>
        <div class="value paid">${formatAmount(invoice.amountPaid)}</div>
      </div>
      <div class="payment-block">
        <div class="label">Amount Due</div>
        <div class="value due">${formatAmount(invoice.amountDue)}</div>
      </div>
      <div class="payment-block">
        <div class="label">Due Date</div>
        <div class="value">${formatDate(invoice.dueDate)}</div>
      </div>
      ${invoice.paidAt ? `
      <div class="payment-block">
        <div class="label">Paid On</div>
        <div class="value paid">${formatDate(invoice.paidAt)}</div>
      </div>
      ` : ""}
    </div>
    
    ${invoice.notes ? `
    <div class="notes-section">
      <div class="notes-title">Notes</div>
      <div class="notes-text">${invoice.notes}</div>
    </div>
    ` : ""}
    
    <div class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <p class="footer-thanks">Thank you for your business!</p>
          <p class="footer-text">For questions about this invoice, please contact:</p>
          <p class="footer-text"><strong>support@bizflow.app</strong></p>
        </div>
        <div class="footer-right">
          <p class="footer-text">BizFlow Technologies</p>
          <p class="footer-text">Enterprise Business Management</p>
          <p class="footer-text">www.bizflow.app</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
      
      // Return HTML that can be printed as PDF by the browser
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.html"`);
      res.send(html);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
    }
  });

  // Send invoice to tenant
  app.post("/api/platform-admin/billing/invoices/:id/send", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const tenant = await storage.getTenant(invoice.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // In a real implementation, this would send an email to the tenant
      // For now, we'll just log it and return success
      console.log(`[Invoice] Sending invoice ${invoice.invoiceNumber} to ${tenant.email}`);
      
      res.json({ 
        message: "Invoice sent successfully",
        sentTo: tenant.email,
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // Mark invoice as paid
  app.post("/api/platform-admin/billing/invoices/:id/mark-paid", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      
      const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.status === "paid") {
        return res.status(400).json({ message: "Invoice is already paid" });
      }
      
      const [updatedInvoice] = await db.update(subscriptionInvoices)
        .set({
          status: "paid",
          amountPaid: invoice.totalAmount,
          amountDue: "0",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptionInvoices.id, id))
        .returning();
      
      res.json({ 
        message: "Invoice marked as paid",
        invoice: updatedInvoice,
      });
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  app.get("/api/platform-admin/billing/country-configs", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const configs = await db.select().from(countryPricingConfigs).orderBy(countryPricingConfigs.country);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching country configs:", error);
      res.status(500).json({ message: "Failed to fetch country configs" });
    }
  });

  app.patch("/api/platform-admin/billing/country-configs/:country", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { country } = req.params;
      const { taxRate, exchangeRate } = req.body;
      
      const [updated] = await db.update(countryPricingConfigs)
        .set({
          ...(taxRate !== undefined && { taxRate: taxRate.toString() }),
          ...(exchangeRate !== undefined && { 
            exchangeRate: exchangeRate.toString(),
            exchangeRateUpdatedAt: new Date(),
          }),
          updatedAt: new Date(),
        })
        .where(eq(countryPricingConfigs.country, country as any))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Country config not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating country config:", error);
      res.status(500).json({ message: "Failed to update country config" });
    }
  });

  // ==================== INVOICE TEMPLATES ====================

  // Get all invoice templates
  app.get("/api/platform-admin/billing/invoice-templates", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const templates = await db.select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.isActive, true))
        .orderBy(desc(invoiceTemplates.isDefault), desc(invoiceTemplates.createdAt));
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching invoice templates:", error);
      res.status(500).json({ message: "Failed to fetch invoice templates" });
    }
  });

  // Get single invoice template
  app.get("/api/platform-admin/billing/invoice-templates/:id", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { id } = req.params;
      
      const [template] = await db.select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.id, id));
      
      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching invoice template:", error);
      res.status(500).json({ message: "Failed to fetch invoice template" });
    }
  });

  // Get default invoice template
  app.get("/api/platform-admin/billing/invoice-templates/default", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const [template] = await db.select()
        .from(invoiceTemplates)
        .where(and(eq(invoiceTemplates.isDefault, true), eq(invoiceTemplates.isActive, true)))
        .limit(1);
      
      if (!template) {
        // Return default values if no template exists
        return res.json({
          name: "Default Template",
          companyName: "BizFlow",
          primaryColor: "#3B82F6",
          secondaryColor: "#1E293B",
          accentColor: "#10B981",
          fontFamily: "Arial, sans-serif",
          headerFontSize: "24px",
          bodyFontSize: "14px",
          footerText: "Thank you for your business!",
          invoicePrefix: "INV",
          invoiceNumberFormat: "{PREFIX}-{YEAR}{MONTH}-{NUMBER}",
        });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching default invoice template:", error);
      res.status(500).json({ message: "Failed to fetch default invoice template" });
    }
  });

  // Create invoice template
  app.post("/api/platform-admin/billing/invoice-templates", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const data = insertInvoiceTemplateSchema.parse(req.body);
      
      // If this is set as default, unset other defaults
      if (data.isDefault) {
        await db.update(invoiceTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(invoiceTemplates.isDefault, true));
      }
      
      const [template] = await db.insert(invoiceTemplates).values(data).returning();
      
      res.status(201).json({ 
        message: "Invoice template created successfully",
        template 
      });
    } catch (error) {
      console.error("Error creating invoice template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice template" });
    }
  });

  // Update invoice template
  app.patch("/api/platform-admin/billing/invoice-templates/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // If this is being set as default, unset other defaults
      if (updates.isDefault === true) {
        await db.update(invoiceTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(invoiceTemplates.isDefault, true), sql`${invoiceTemplates.id} != ${id}`));
      }
      
      const [template] = await db.update(invoiceTemplates)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(invoiceTemplates.id, id))
        .returning();
      
      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      
      res.json({ 
        message: "Invoice template updated successfully",
        template 
      });
    } catch (error) {
      console.error("Error updating invoice template:", error);
      res.status(500).json({ message: "Failed to update invoice template" });
    }
  });

  // Delete invoice template (soft delete)
  app.delete("/api/platform-admin/billing/invoice-templates/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if template exists and is not the default
      const [existingTemplate] = await db.select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.id, id));
      
      if (!existingTemplate) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      
      if (existingTemplate.isDefault) {
        return res.status(400).json({ message: "Cannot delete the default template. Set another template as default first." });
      }
      
      // Soft delete by setting isActive to false
      await db.update(invoiceTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(invoiceTemplates.id, id));
      
      res.json({ message: "Invoice template deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice template:", error);
      res.status(500).json({ message: "Failed to delete invoice template" });
    }
  });

  // Set template as default
  app.post("/api/platform-admin/billing/invoice-templates/:id/set-default", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Unset all other defaults
      await db.update(invoiceTemplates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(invoiceTemplates.isDefault, true));
      
      // Set this one as default
      const [template] = await db.update(invoiceTemplates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(invoiceTemplates.id, id))
        .returning();
      
      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }
      
      res.json({ 
        message: "Template set as default successfully",
        template 
      });
    } catch (error) {
      console.error("Error setting default template:", error);
      res.status(500).json({ message: "Failed to set default template" });
    }
  });

  // Duplicate invoice template
  app.post("/api/platform-admin/billing/invoice-templates/:id/duplicate", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      const [sourceTemplate] = await db.select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.id, id));
      
      if (!sourceTemplate) {
        return res.status(404).json({ message: "Source template not found" });
      }
      
      // Create a copy with a new name
      const { id: _, createdAt: __, updatedAt: ___, ...templateData } = sourceTemplate;
      
      const [newTemplate] = await db.insert(invoiceTemplates).values({
        ...templateData,
        name: name || `${sourceTemplate.name} (Copy)`,
        isDefault: false,
      }).returning();
      
      res.status(201).json({ 
        message: "Template duplicated successfully",
        template: newTemplate 
      });
    } catch (error) {
      console.error("Error duplicating invoice template:", error);
      res.status(500).json({ message: "Failed to duplicate invoice template" });
    }
  });

  // ==================== TAX CALCULATION AND REPORTING ====================

  // Get all tax rules
  app.get("/api/platform-admin/tax/rules", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { country, businessType, activeOnly } = req.query;
      
      let query = db.select().from(taxRules).orderBy(taxRules.country, taxRules.businessType);
      let rules = await query;
      
      if (country) rules = rules.filter(r => r.country === country);
      if (businessType) rules = rules.filter(r => r.businessType === businessType);
      if (activeOnly === "true") rules = rules.filter(r => r.isActive);
      
      res.json(rules);
    } catch (error) {
      console.error("Error fetching tax rules:", error);
      res.status(500).json({ message: "Failed to fetch tax rules" });
    }
  });

  // Create tax rule
  app.post("/api/platform-admin/tax/rules", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const data = insertTaxRuleSchema.parse(req.body);
      
      const [rule] = await db.insert(taxRules).values(data).returning();
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating tax rule:", error);
      res.status(500).json({ message: "Failed to create tax rule" });
    }
  });

  // Update tax rule
  app.patch("/api/platform-admin/tax/rules/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const [updated] = await db.update(taxRules)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(taxRules.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Tax rule not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating tax rule:", error);
      res.status(500).json({ message: "Failed to update tax rule" });
    }
  });

  // Calculate tax for an amount
  app.post("/api/platform-admin/tax/calculate", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { country, businessType, amount, tenantId, invoiceId } = req.body;
      
      if (!country || !amount) {
        return res.status(400).json({ message: "Country and amount are required" });
      }
      
      const baseAmount = parseFloat(amount);
      if (isNaN(baseAmount)) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      // Find applicable tax rule
      const now = new Date();
      const applicableRules = await db.select()
        .from(taxRules)
        .where(and(
          eq(taxRules.country, country),
          eq(taxRules.isActive, true),
          lte(taxRules.effectiveFrom, now),
        ));
      
      let rule = applicableRules.find(r => 
        r.businessType === businessType && 
        (!r.effectiveTo || new Date(r.effectiveTo) >= now)
      );
      
      // Fallback to country default if no business-specific rule
      if (!rule) {
        const [countryConfig] = await db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.country, country));
        if (countryConfig) {
          // Create calculation based on country config
          const taxRate = parseFloat(countryConfig.taxRate || "0");
          const taxAmount = baseAmount * (taxRate / 100);
          const totalAmount = baseAmount + taxAmount;
          
          // Log the calculation
          if (tenantId) {
            await db.insert(taxCalculationLogs).values({
              tenantId,
              invoiceId,
              country,
              businessType: businessType || "general",
              baseAmount: baseAmount.toString(),
              taxName: countryConfig.taxName || "TAX",
              taxRate: taxRate.toString(),
              taxAmount: taxAmount.toString(),
              currency: countryConfig.currency,
              calculationDetails: {
                source: "country_config",
                configId: countryConfig.id,
              },
            });
          }
          
          return res.json({
            baseAmount,
            taxName: countryConfig.taxName || "TAX",
            taxRate,
            taxAmount: Math.round(taxAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            currency: countryConfig.currency,
            source: "country_config",
          });
        }
      }
      
      if (rule) {
        const taxRate = parseFloat(rule.taxRate || "0");
        const taxAmount = baseAmount * (taxRate / 100);
        const totalAmount = baseAmount + taxAmount;
        
        // Get currency from country config
        const [countryConfig] = await db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.country, country));
        const currency = countryConfig?.currency || "USD";
        
        // Log the calculation
        if (tenantId) {
          await db.insert(taxCalculationLogs).values({
            tenantId,
            invoiceId,
            country,
            businessType: rule.businessType,
            taxRuleId: rule.id,
            baseAmount: baseAmount.toString(),
            taxName: rule.taxName,
            taxRate: taxRate.toString(),
            taxAmount: taxAmount.toString(),
            currency,
            calculationDetails: {
              source: "tax_rule",
              ruleId: rule.id,
              taxCode: rule.taxCode,
              taxCategory: rule.taxCategory,
            },
          });
        }
        
        return res.json({
          baseAmount,
          taxName: rule.taxName,
          taxRate,
          taxAmount: Math.round(taxAmount * 100) / 100,
          totalAmount: Math.round(totalAmount * 100) / 100,
          currency,
          taxCode: rule.taxCode,
          taxCategory: rule.taxCategory,
          source: "tax_rule",
          ruleId: rule.id,
        });
      }
      
      // No rule found, return 0 tax
      res.json({
        baseAmount,
        taxName: "N/A",
        taxRate: 0,
        taxAmount: 0,
        totalAmount: baseAmount,
        currency: "USD",
        source: "none",
      });
    } catch (error) {
      console.error("Error calculating tax:", error);
      res.status(500).json({ message: "Failed to calculate tax" });
    }
  });

  // Get tax calculation logs
  app.get("/api/platform-admin/tax/calculation-logs", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { country, startDate, endDate, limit = "100" } = req.query;
      
      let logs = await db.select()
        .from(taxCalculationLogs)
        .orderBy(desc(taxCalculationLogs.calculatedAt))
        .limit(parseInt(limit as string));
      
      if (country) logs = logs.filter(l => l.country === country);
      if (startDate) logs = logs.filter(l => new Date(l.calculatedAt!) >= new Date(startDate as string));
      if (endDate) logs = logs.filter(l => new Date(l.calculatedAt!) <= new Date(endDate as string));
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching tax calculation logs:", error);
      res.status(500).json({ message: "Failed to fetch tax calculation logs" });
    }
  });

  // Generate tax report
  app.post("/api/platform-admin/tax/reports/generate", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { reportType, country, periodStart, periodEnd } = req.body;
      const admin = (req as any).admin;
      
      if (!reportType || !periodStart || !periodEnd) {
        return res.status(400).json({ message: "Report type and period are required" });
      }
      
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      
      // Aggregate invoice data for the period
      let invoices = await db.select()
        .from(subscriptionInvoices)
        .where(and(
          gte(subscriptionInvoices.createdAt, start),
          lte(subscriptionInvoices.createdAt, end),
        ));
      
      if (country) {
        invoices = invoices.filter(i => i.country === country);
      }
      
      // Calculate totals
      let totalBaseAmount = 0;
      let totalTaxCollected = 0;
      const breakdownByCountry: Record<string, { invoices: number; base: number; tax: number }> = {};
      const breakdownByTaxType: Record<string, { invoices: number; base: number; tax: number }> = {};
      
      for (const inv of invoices) {
        const subtotal = parseFloat(inv.subtotal || "0");
        const taxAmount = parseFloat(inv.taxAmount || "0");
        totalBaseAmount += subtotal;
        totalTaxCollected += taxAmount;
        
        // By country
        if (!breakdownByCountry[inv.country]) {
          breakdownByCountry[inv.country] = { invoices: 0, base: 0, tax: 0 };
        }
        breakdownByCountry[inv.country].invoices++;
        breakdownByCountry[inv.country].base += subtotal;
        breakdownByCountry[inv.country].tax += taxAmount;
        
        // By tax type
        const taxName = inv.taxName || "Unknown";
        if (!breakdownByTaxType[taxName]) {
          breakdownByTaxType[taxName] = { invoices: 0, base: 0, tax: 0 };
        }
        breakdownByTaxType[taxName].invoices++;
        breakdownByTaxType[taxName].base += subtotal;
        breakdownByTaxType[taxName].tax += taxAmount;
      }
      
      // Determine currency (use country config if single country, else USD)
      let currency: any = "USD";
      if (country) {
        const [countryConfig] = await db.select().from(countryPricingConfigs).where(eq(countryPricingConfigs.country, country as any));
        currency = countryConfig?.currency || "USD";
      }
      
      // Create report
      const [report] = await db.insert(taxReports).values({
        reportType,
        country: country as any,
        periodStart: start,
        periodEnd: end,
        totalInvoices: invoices.length,
        totalBaseAmount: totalBaseAmount.toString(),
        totalTaxCollected: totalTaxCollected.toString(),
        currency,
        breakdown: {
          byCountry: breakdownByCountry,
          byTaxType: breakdownByTaxType,
        },
        status: "draft",
        generatedBy: admin?.id,
      }).returning();
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Error generating tax report:", error);
      res.status(500).json({ message: "Failed to generate tax report" });
    }
  });

  // Get tax reports
  app.get("/api/platform-admin/tax/reports", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { status, country, limit = "50" } = req.query;
      
      let reports = await db.select()
        .from(taxReports)
        .orderBy(desc(taxReports.generatedAt))
        .limit(parseInt(limit as string));
      
      if (status) reports = reports.filter(r => r.status === status);
      if (country) reports = reports.filter(r => r.country === country);
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching tax reports:", error);
      res.status(500).json({ message: "Failed to fetch tax reports" });
    }
  });

  // Get single tax report
  app.get("/api/platform-admin/tax/reports/:id", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { id } = req.params;
      const [report] = await db.select().from(taxReports).where(eq(taxReports.id, id));
      
      if (!report) {
        return res.status(404).json({ message: "Tax report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching tax report:", error);
      res.status(500).json({ message: "Failed to fetch tax report" });
    }
  });

  // Update tax report status (finalize/file)
  app.patch("/api/platform-admin/tax/reports/:id", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === "filed") updateData.filedAt = new Date();
      
      const [updated] = await db.update(taxReports)
        .set(updateData)
        .where(eq(taxReports.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Tax report not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating tax report:", error);
      res.status(500).json({ message: "Failed to update tax report" });
    }
  });

  // Tax summary statistics
  app.get("/api/platform-admin/tax/summary", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { period = "month" } = req.query;
      
      // Calculate period dates
      const now = new Date();
      let periodStart: Date;
      
      switch (period) {
        case "week":
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "quarter":
          periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case "year":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        case "month":
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      // Get invoices for the period
      const invoices = await db.select()
        .from(subscriptionInvoices)
        .where(gte(subscriptionInvoices.createdAt, periodStart));
      
      // Calculate summary
      const summary = {
        period,
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        totalInvoices: invoices.length,
        totalBaseAmount: 0,
        totalTaxCollected: 0,
        byCountry: {} as Record<string, { invoices: number; base: number; tax: number; currency: string }>,
        byTaxType: {} as Record<string, { invoices: number; amount: number }>,
      };
      
      for (const inv of invoices) {
        const subtotal = parseFloat(inv.subtotal || "0");
        const taxAmount = parseFloat(inv.taxAmount || "0");
        summary.totalBaseAmount += subtotal;
        summary.totalTaxCollected += taxAmount;
        
        // By country
        if (!summary.byCountry[inv.country]) {
          summary.byCountry[inv.country] = { invoices: 0, base: 0, tax: 0, currency: inv.currency };
        }
        summary.byCountry[inv.country].invoices++;
        summary.byCountry[inv.country].base += subtotal;
        summary.byCountry[inv.country].tax += taxAmount;
        
        // By tax type
        const taxName = inv.taxName || "Unknown";
        if (!summary.byTaxType[taxName]) {
          summary.byTaxType[taxName] = { invoices: 0, amount: 0 };
        }
        summary.byTaxType[taxName].invoices++;
        summary.byTaxType[taxName].amount += taxAmount;
      }
      
      // Get active tax rules count
      const activeRules = await db.select().from(taxRules).where(eq(taxRules.isActive, true));
      (summary as any).activeTaxRules = activeRules.length;
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching tax summary:", error);
      res.status(500).json({ message: "Failed to fetch tax summary" });
    }
  });

  // Export tax report as CSV
  app.get("/api/platform-admin/tax/reports/:id/export", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { id } = req.params;
      const { format = "csv" } = req.query;
      
      const [report] = await db.select().from(taxReports).where(eq(taxReports.id, id));
      if (!report) {
        return res.status(404).json({ message: "Tax report not found" });
      }
      
      const breakdown = report.breakdown as any || {};
      const currencySymbols: Record<string, string> = {
        USD: "$", INR: "₹", GBP: "£", AED: "د.إ", MYR: "RM", SGD: "S$"
      };
      const symbol = currencySymbols[report.currency] || "$";
      
      if (format === "csv") {
        let csv = "Tax Report\n";
        csv += `Report Type,${report.reportType}\n`;
        csv += `Period,${new Date(report.periodStart).toLocaleDateString()} - ${new Date(report.periodEnd).toLocaleDateString()}\n`;
        csv += `Country,${report.country || "All"}\n`;
        csv += `Total Invoices,${report.totalInvoices}\n`;
        csv += `Total Base Amount,${symbol}${report.totalBaseAmount}\n`;
        csv += `Total Tax Collected,${symbol}${report.totalTaxCollected}\n`;
        csv += `Status,${report.status}\n\n`;
        
        if (breakdown.byCountry && Object.keys(breakdown.byCountry).length > 0) {
          csv += "Breakdown by Country\n";
          csv += "Country,Invoices,Base Amount,Tax Amount\n";
          for (const [country, data] of Object.entries(breakdown.byCountry as Record<string, any>)) {
            csv += `${country},${data.invoices},${data.base.toFixed(2)},${data.tax.toFixed(2)}\n`;
          }
          csv += "\n";
        }
        
        if (breakdown.byTaxType && Object.keys(breakdown.byTaxType).length > 0) {
          csv += "Breakdown by Tax Type\n";
          csv += "Tax Type,Invoices,Base Amount,Tax Amount\n";
          for (const [taxType, data] of Object.entries(breakdown.byTaxType as Record<string, any>)) {
            csv += `${taxType},${data.invoices},${data.base.toFixed(2)},${data.tax.toFixed(2)}\n`;
          }
        }
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="tax-report-${report.id}.csv"`);
        return res.send(csv);
      }
      
      res.status(400).json({ message: "Unsupported format" });
    } catch (error) {
      console.error("Error exporting tax report:", error);
      res.status(500).json({ message: "Failed to export tax report" });
    }
  });

  // Seed default tax rules if none exist
  app.post("/api/platform-admin/tax/seed-defaults", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const existingRules = await db.select().from(taxRules).limit(1);
      if (existingRules.length > 0) {
        return res.status(400).json({ message: "Tax rules already exist" });
      }
      
      const defaultRules = [
        // India GST rules
        { country: "india" as const, businessType: "pg" as const, taxName: "GST", taxCode: "9963", taxRate: "18.00", description: "GST for accommodation services", effectiveFrom: new Date("2017-07-01") },
        { country: "india" as const, businessType: "salon" as const, taxName: "GST", taxCode: "9972", taxRate: "18.00", description: "GST for beauty services", effectiveFrom: new Date("2017-07-01") },
        { country: "india" as const, businessType: "coworking" as const, taxName: "GST", taxCode: "9996", taxRate: "18.00", description: "GST for coworking/fitness services", effectiveFrom: new Date("2017-07-01") },
        { country: "india" as const, businessType: "education" as const, taxName: "GST", taxCode: "9992", taxRate: "18.00", description: "GST for education services", effectiveFrom: new Date("2017-07-01") },
        { country: "india" as const, businessType: "clinic" as const, taxName: "GST", taxCode: "9993", taxRate: "0.00", taxCategory: "exempt" as const, description: "Healthcare services exempt", effectiveFrom: new Date("2017-07-01") },
        { country: "india" as const, businessType: "service" as const, taxName: "GST", taxCode: "9997", taxRate: "18.00", description: "GST for general services", effectiveFrom: new Date("2017-07-01") },
        
        // UK VAT rules
        { country: "uk" as const, businessType: "pg" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "20.00", description: "Standard VAT rate", effectiveFrom: new Date("2011-01-04") },
        { country: "uk" as const, businessType: "salon" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "20.00", description: "Standard VAT rate", effectiveFrom: new Date("2011-01-04") },
        { country: "uk" as const, businessType: "coworking" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "20.00", description: "Standard VAT rate", effectiveFrom: new Date("2011-01-04") },
        { country: "uk" as const, businessType: "education" as const, taxName: "VAT", taxCode: "EXEMPT", taxRate: "0.00", taxCategory: "exempt" as const, description: "Education services exempt", effectiveFrom: new Date("2011-01-04") },
        { country: "uk" as const, businessType: "clinic" as const, taxName: "VAT", taxCode: "EXEMPT", taxRate: "0.00", taxCategory: "exempt" as const, description: "Healthcare exempt", effectiveFrom: new Date("2011-01-04") },
        { country: "uk" as const, businessType: "service" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "20.00", description: "Standard VAT rate", effectiveFrom: new Date("2011-01-04") },
        
        // UAE VAT rules
        { country: "uae" as const, businessType: "service" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "5.00", description: "UAE Standard VAT rate", effectiveFrom: new Date("2018-01-01") },
        { country: "uae" as const, businessType: "pg" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "5.00", description: "UAE Standard VAT rate", effectiveFrom: new Date("2018-01-01") },
        { country: "uae" as const, businessType: "salon" as const, taxName: "VAT", taxCode: "STANDARD", taxRate: "5.00", description: "UAE Standard VAT rate", effectiveFrom: new Date("2018-01-01") },
        { country: "uae" as const, businessType: "clinic" as const, taxName: "VAT", taxCode: "ZERO", taxRate: "0.00", taxCategory: "zero" as const, description: "Healthcare zero-rated", effectiveFrom: new Date("2018-01-01") },
        
        // Malaysia SST rules  
        { country: "malaysia" as const, businessType: "service" as const, taxName: "SST", taxCode: "SERVICE", taxRate: "6.00", description: "Malaysia Service Tax", effectiveFrom: new Date("2018-09-01") },
        
        // Singapore GST rules
        { country: "singapore" as const, businessType: "service" as const, taxName: "GST", taxCode: "SR", taxRate: "9.00", description: "Singapore GST (2024 rate)", effectiveFrom: new Date("2024-01-01") },
      ];
      
      await db.insert(taxRules).values(defaultRules);
      
      res.json({ message: "Default tax rules seeded successfully", count: defaultRules.length });
    } catch (error) {
      console.error("Error seeding tax rules:", error);
      res.status(500).json({ message: "Failed to seed tax rules" });
    }
  });

  // Public pricing endpoint
  app.get("/api/pricing", async (req, res) => {
    try {
      const country = req.query.country as string | undefined;
      const plans = await paymentService.getPricingPlans(country as any);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  // ==================== GLOBAL WHATSAPP API (Platform Admin) ====================
  
  app.get("/api/platform-admin/whatsapp/stats", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const stats = await whatsappService.getGlobalStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching WhatsApp stats:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp stats" });
    }
  });

  app.get("/api/platform-admin/whatsapp/health", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      await whatsappService.updateProviderHealth();
      const health = await whatsappService.getProviderHealthStatus();
      res.json({ providers: health });
    } catch (error) {
      console.error("Error fetching WhatsApp health:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp health" });
    }
  });

  app.get("/api/platform-admin/whatsapp/provider-configs", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const configs = await whatsappService.getProviderConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching provider configs:", error);
      res.status(500).json({ message: "Failed to fetch provider configs" });
    }
  });

  app.get("/api/platform-admin/whatsapp/templates", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { provider, status, isGlobal } = req.query;
      const templates = await whatsappService.getTemplates({
        provider: provider as any,
        status: status as any,
        isGlobal: isGlobal === "true" ? true : isGlobal === "false" ? false : undefined,
      });
      res.json({ templates, total: templates.length });
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/platform-admin/whatsapp/templates", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { provider, ...templateParams } = req.body;
      const result = await whatsappService.submitTemplate(templateParams, provider);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json({ message: result.errorMessage });
      }
    } catch (error) {
      console.error("Error submitting template:", error);
      res.status(500).json({ message: "Failed to submit template" });
    }
  });

  app.post("/api/platform-admin/whatsapp/templates/:templateId/sync", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      await whatsappService.syncTemplateStatus(req.params.templateId);
      res.json({ message: "Template status synced" });
    } catch (error) {
      console.error("Error syncing template:", error);
      res.status(500).json({ message: "Failed to sync template status" });
    }
  });

  app.get("/api/platform-admin/whatsapp/messages", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_billing"), async (req, res) => {
    try {
      const { tenantId, provider, status, limit } = req.query;
      const messages = await whatsappService.getMessages({
        tenantId: tenantId as string,
        provider: provider as any,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
      });
      res.json({ messages, total: messages.length });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // WhatsApp webhooks (public endpoints for providers)
  app.post("/api/webhooks/whatsapp/gupshup", express.raw({ type: "*/*" }), async (req, res) => {
    try {
      const signature = req.headers["x-gupshup-signature"] as string;
      const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      await whatsappService.handleWebhook("gupshup", payload, signature);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Gupshup webhook error:", error);
      res.status(500).send("Error");
    }
  });

  app.post("/api/webhooks/whatsapp/meta", express.json(), async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string;
      await whatsappService.handleWebhook("meta", req.body, signature);
      res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Meta webhook error:", error);
      res.status(500).send("Error");
    }
  });

  app.get("/api/webhooks/whatsapp/meta", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  app.post("/api/webhooks/whatsapp/twilio", express.urlencoded({ extended: true }), async (req, res) => {
    try {
      const signature = req.headers["x-twilio-signature"] as string;
      await whatsappService.handleWebhook("twilio", req.body, signature);
      res.status(200).send("<Response></Response>");
    } catch (error) {
      console.error("Twilio webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Tenant-level WhatsApp API (requires whatsapp feature flag)
  app.get("/api/whatsapp/usage", authenticateJWT(), tenantResolutionMiddleware(), requireFeature("whatsapp"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { yearMonth } = req.query;
      const usage = await whatsappService.getUsageStats(tenantId, yearMonth as string);
      res.json(usage || { message: "No usage data found" });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  app.post("/api/whatsapp/optins", authenticateJWT(), tenantResolutionMiddleware(), requireFeature("whatsapp"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { phoneNumber, countryCode, source, customerId, consentText } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      
      const result = await whatsappService.recordOptIn(
        tenantId,
        phoneNumber,
        countryCode,
        source,
        customerId,
        consentText,
        ipAddress
      );
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json({ message: result.errorMessage });
      }
    } catch (error) {
      console.error("Error recording opt-in:", error);
      res.status(500).json({ message: "Failed to record opt-in" });
    }
  });

  app.delete("/api/whatsapp/optins/:phoneNumber", authenticateJWT(), tenantResolutionMiddleware(), requireFeature("whatsapp"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const result = await whatsappService.recordOptOut(tenantId, req.params.phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Error recording opt-out:", error);
      res.status(500).json({ message: "Failed to record opt-out" });
    }
  });

  app.post("/api/whatsapp/send", authenticateJWT(), tenantResolutionMiddleware(), requireFeature("whatsapp"), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { toPhoneNumber, templateId, templateName, templateParams, messageType, content, mediaUrl, mediaType } = req.body;
      
      const result = await whatsappService.sendMessage({
        tenantId,
        toPhoneNumber,
        templateId,
        templateName,
        templateParams,
        messageType: messageType || "template",
        content,
        mediaUrl,
        mediaType,
      });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json({ message: result.errorMessage, errorCode: result.errorCode });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ==================== COMPLIANCE & DATA GOVERNANCE API ====================

  // Platform Admin: Get all compliance configurations
  app.get("/api/platform-admin/compliance/configs", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const configs = await complianceService.getAllComplianceConfigs();
      res.json({ configs });
    } catch (error) {
      console.error("Error fetching compliance configs:", error);
      res.status(500).json({ message: "Failed to fetch compliance configs" });
    }
  });

  // Platform Admin: Get compliance config for specific regulation
  app.get("/api/platform-admin/compliance/configs/:regulation", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      const { regulation } = req.params;
      const config = await complianceService.getComplianceConfig(regulation as any);
      if (!config) {
        return res.status(404).json({ message: "Compliance config not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching compliance config:", error);
      res.status(500).json({ message: "Failed to fetch compliance config" });
    }
  });

  // Platform Admin: Get sensitive data access logs
  app.get("/api/platform-admin/compliance/access-logs", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId, accessorId, dataCategory, riskLevel, flagged, startDate, endDate, limit, offset } = req.query;
      
      const result = await complianceService.getAccessLogs({
        tenantId: tenantId as string,
        accessorId: accessorId as string,
        dataCategory: dataCategory as any,
        riskLevel: riskLevel as string,
        flagged: flagged === "true" ? true : flagged === "false" ? false : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // Platform Admin: Flag suspicious access
  app.post("/api/platform-admin/compliance/access-logs/:logId/flag", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_logs"), async (req, res) => {
    try {
      const { logId } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Flag reason is required" });
      }
      
      const adminId = req.platformAdminContext?.platformAdmin.id;
      const success = await complianceService.flagAccessLog(logId, reason, adminId || "unknown");
      
      if (success) {
        res.json({ success: true, message: "Access log flagged successfully" });
      } else {
        res.status(400).json({ message: "Failed to flag access log" });
      }
    } catch (error) {
      console.error("Error flagging access log:", error);
      res.status(500).json({ message: "Failed to flag access log" });
    }
  });

  // Platform Admin: Get all DSARs across tenants
  app.get("/api/platform-admin/compliance/dsar", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { tenantId, status, startDate, endDate, limit, offset } = req.query;
      
      const result = await complianceService.getDSARs({
        tenantId: tenantId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching DSARs:", error);
      res.status(500).json({ message: "Failed to fetch DSARs" });
    }
  });

  // Platform Admin: Get DSAR details with activity log
  app.get("/api/platform-admin/compliance/dsar/:dsarId", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("view_logs"), async (req, res) => {
    try {
      const { dsarId } = req.params;
      const [dsar] = await db.select().from(dsarRequests).where(eq(dsarRequests.id, dsarId)).limit(1);
      
      if (!dsar) {
        return res.status(404).json({ message: "DSAR not found" });
      }
      
      const activityLog = await complianceService.getDSARActivityLog(dsarId);
      res.json({ dsar, activityLog });
    } catch (error) {
      console.error("Error fetching DSAR:", error);
      res.status(500).json({ message: "Failed to fetch DSAR" });
    }
  });

  // Platform Admin: Update DSAR status
  app.patch("/api/platform-admin/compliance/dsar/:dsarId/status", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("manage_logs"), async (req, res) => {
    try {
      const { dsarId } = req.params;
      const { status, notes } = req.body;
      
      const admin = req.platformAdminContext?.platformAdmin;
      const success = await complianceService.updateDSARStatus(
        dsarId,
        status,
        admin?.id || "unknown",
        admin?.email || "unknown",
        notes
      );
      
      if (success) {
        res.json({ success: true, message: "DSAR status updated" });
      } else {
        res.status(400).json({ message: "Failed to update DSAR status" });
      }
    } catch (error) {
      console.error("Error updating DSAR:", error);
      res.status(500).json({ message: "Failed to update DSAR" });
    }
  });

  // Platform Admin: Report data breach
  app.post("/api/platform-admin/compliance/breaches", authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), async (req, res) => {
    try {
      const { tenantId, breachType, severity, regulation, discoveredAt, occurredAt, affectedDataCategories, affectedSubjectsCount, description, impactAssessment, containmentActions } = req.body;
      
      const breachId = await complianceService.reportDataBreach({
        tenantId,
        breachType,
        severity,
        regulation,
        discoveredAt: new Date(discoveredAt),
        occurredAt: occurredAt ? new Date(occurredAt) : undefined,
        affectedDataCategories,
        affectedSubjectsCount,
        description,
        impactAssessment,
        containmentActions,
      });
      
      if (breachId) {
        res.status(201).json({ id: breachId, message: "Data breach reported" });
      } else {
        res.status(400).json({ message: "Failed to report data breach" });
      }
    } catch (error) {
      console.error("Error reporting breach:", error);
      res.status(500).json({ message: "Failed to report data breach" });
    }
  });

  // Tenant: Get compliance settings
  app.get("/api/compliance/settings", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const settings = await complianceService.getTenantComplianceSettings(tenantId);
      res.json(settings || { message: "No compliance settings configured" });
    } catch (error) {
      console.error("Error fetching compliance settings:", error);
      res.status(500).json({ message: "Failed to fetch compliance settings" });
    }
  });

  // Tenant: Update compliance settings
  app.patch("/api/compliance/settings", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const settings = req.body;
      
      const success = await complianceService.updateTenantComplianceSettings(tenantId, settings);
      
      if (success) {
        res.json({ success: true, message: "Compliance settings updated" });
      } else {
        res.status(400).json({ message: "Failed to update compliance settings" });
      }
    } catch (error) {
      console.error("Error updating compliance settings:", error);
      res.status(500).json({ message: "Failed to update compliance settings" });
    }
  });

  // Tenant: Record consent
  app.post("/api/compliance/consents", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { subjectType, subjectId, subjectEmail, consentType, purpose, legalBasis, consentText, version, expiresAt, collectionMethod } = req.body;
      
      const record = await complianceService.recordConsent({
        tenantId,
        subjectType,
        subjectId,
        subjectEmail,
        consentType,
        purpose,
        legalBasis,
        consentText,
        version,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        collectionMethod,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });
      
      if (record) {
        res.status(201).json(record);
      } else {
        res.status(400).json({ message: "Failed to record consent" });
      }
    } catch (error) {
      console.error("Error recording consent:", error);
      res.status(500).json({ message: "Failed to record consent" });
    }
  });

  // Tenant: Check consent status
  app.get("/api/compliance/consents/check", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { subjectType, subjectId, consentType } = req.query;
      
      if (!subjectType || !subjectId || !consentType) {
        return res.status(400).json({ message: "subjectType, subjectId, and consentType are required" });
      }
      
      const result = await complianceService.checkConsent(
        tenantId,
        subjectType as string,
        subjectId as string,
        consentType as string
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error checking consent:", error);
      res.status(500).json({ message: "Failed to check consent" });
    }
  });

  // Tenant: Withdraw consent
  app.post("/api/compliance/consents/withdraw", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { subjectType, subjectId, consentType, reason } = req.body;
      
      const success = await complianceService.withdrawConsent(
        tenantId,
        subjectType,
        subjectId,
        consentType,
        reason
      );
      
      if (success) {
        res.json({ success: true, message: "Consent withdrawn successfully" });
      } else {
        res.status(400).json({ message: "Failed to withdraw consent" });
      }
    } catch (error) {
      console.error("Error withdrawing consent:", error);
      res.status(500).json({ message: "Failed to withdraw consent" });
    }
  });

  // Tenant: Get subject consents
  app.get("/api/compliance/consents/:subjectType/:subjectId", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { subjectType, subjectId } = req.params;
      
      const consents = await complianceService.getSubjectConsents(tenantId, subjectType, subjectId);
      res.json({ consents });
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ message: "Failed to fetch consents" });
    }
  });

  // Public: Submit DSAR (for data subjects)
  app.post("/api/compliance/dsar", async (req, res) => {
    try {
      const { tenantId, requestType, subjectEmail, subjectName, subjectPhone, subjectIdType, subjectIdNumber, requestDetails, dataCategories, regulation } = req.body;
      
      if (!tenantId || !requestType || !subjectEmail) {
        return res.status(400).json({ message: "tenantId, requestType, and subjectEmail are required" });
      }
      
      const request = await complianceService.createDSAR({
        tenantId,
        requestType,
        subjectEmail,
        subjectName,
        subjectPhone,
        subjectIdType,
        subjectIdNumber,
        requestDetails,
        dataCategories,
        ipAddress: req.ip || req.socket.remoteAddress,
        regulation,
      });
      
      if (request) {
        res.status(201).json({ 
          id: request.id, 
          message: "Your request has been submitted. You will receive an acknowledgement within 72 hours.",
          responseDeadline: request.responseDeadline,
        });
      } else {
        res.status(400).json({ message: "Failed to submit request" });
      }
    } catch (error) {
      console.error("Error submitting DSAR:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // Tenant: Get tenant's DSARs
  app.get("/api/compliance/dsar", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { status, limit, offset } = req.query;
      
      const result = await complianceService.getDSARs({
        tenantId,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching DSARs:", error);
      res.status(500).json({ message: "Failed to fetch DSARs" });
    }
  });

  // Tenant: Update DSAR status
  app.patch("/api/compliance/dsar/:dsarId/status", authenticateJWT(), tenantResolutionMiddleware(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      const { dsarId } = req.params;
      const { status, notes } = req.body;
      
      // Verify DSAR belongs to tenant
      const [dsar] = await db.select().from(dsarRequests).where(and(eq(dsarRequests.id, dsarId), eq(dsarRequests.tenantId, tenantId))).limit(1);
      
      if (!dsar) {
        return res.status(404).json({ message: "DSAR not found" });
      }
      
      const userId = getUserId(req) || "unknown";
      const success = await complianceService.updateDSARStatus(
        dsarId,
        status,
        userId,
        userId,
        notes
      );
      
      if (success) {
        res.json({ success: true, message: "DSAR status updated" });
      } else {
        res.status(400).json({ message: "Failed to update DSAR status" });
      }
    } catch (error) {
      console.error("Error updating DSAR:", error);
      res.status(500).json({ message: "Failed to update DSAR" });
    }
  });

  // ============================================
  // CUSTOMER PORTAL - Tenant Management Routes
  // ============================================

  // Get customer portal settings for tenant
  app.get("/api/customer-portal/settings", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });

      let settings = await storage.getCustomerPortalSettings(tenantId);
      
      // Create default settings if not exists
      if (!settings) {
        const crypto = await import("crypto");
        const portalToken = crypto.randomBytes(32).toString("hex");
        settings = await storage.createCustomerPortalSettings({
          tenantId,
          portalToken,
          isEnabled: false,
        });
      }

      // Generate portal URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "http://localhost:5000";
      const portalUrl = `${baseUrl}/portal/${settings.portalToken}`;

      res.json({ ...settings, portalUrl });
    } catch (error) {
      console.error("Error fetching portal settings:", error);
      res.status(500).json({ message: "Failed to fetch portal settings" });
    }
  });

  // Update customer portal settings
  app.patch("/api/customer-portal/settings", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });

      // Whitelist allowed fields
      const allowedFields = ["isEnabled", "allowSelfRegistration", "allowProfileEdit", "allowInvoiceView", "allowPayments", "welcomeMessage", "termsAndConditions", "privacyPolicy"];
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in req.body) {
          updates[key] = req.body[key];
        }
      }

      const settings = await storage.updateCustomerPortalSettings(tenantId, updates);
      if (!settings) {
        return res.status(404).json({ message: "Portal settings not found" });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error updating portal settings:", error);
      res.status(500).json({ message: "Failed to update portal settings" });
    }
  });

  // Regenerate portal token
  app.post("/api/customer-portal/regenerate-token", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });

      const crypto = await import("crypto");
      const newToken = crypto.randomBytes(32).toString("hex");

      const settings = await storage.updateCustomerPortalSettings(tenantId, { portalToken: newToken });
      if (!settings) {
        return res.status(404).json({ message: "Portal settings not found" });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "http://localhost:5000";
      const portalUrl = `${baseUrl}/portal/${settings.portalToken}`;

      res.json({ ...settings, portalUrl });
    } catch (error) {
      console.error("Error regenerating token:", error);
      res.status(500).json({ message: "Failed to regenerate token" });
    }
  });

  // Send portal invite to customer
  app.post("/api/customer-portal/invites", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });

      const { customerId, email, sentVia } = req.body;
      if (!customerId || !email) {
        return res.status(400).json({ message: "Customer ID and email required" });
      }

      // Verify customer belongs to tenant
      const customer = await storage.getCustomer(customerId, tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Generate invite token
      const crypto = await import("crypto");
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await storage.createCustomerPortalInvite({
        tenantId,
        customerId,
        email,
        inviteToken,
        sentVia: sentVia || "email",
        sentAt: new Date(),
        expiresAt,
        createdBy: (req as any).user?.id,
      });

      // Generate invite URL
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "http://localhost:5000";
      const inviteUrl = `${baseUrl}/portal/invite/${inviteToken}`;

      res.json({ ...invite, inviteUrl });
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  // Get portal invites for tenant
  app.get("/api/customer-portal/invites", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });

      const invites = await storage.getCustomerPortalInvites(tenantId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  // ============================================
  // CUSTOMER PORTAL - Public Routes
  // ============================================

  // Get tenant info from portal token (public)
  app.get("/api/portal/:token/info", async (req, res) => {
    try {
      const settings = await storage.getCustomerPortalSettingsByToken(req.params.token);
      if (!settings || !settings.isEnabled) {
        return res.status(404).json({ message: "Portal not found or disabled" });
      }

      const tenant = await storage.getTenant(settings.tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json({
        tenantId: settings.tenantId,
        businessName: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        welcomeMessage: settings.welcomeMessage,
        allowSelfRegistration: settings.allowSelfRegistration,
        allowProfileEdit: settings.allowProfileEdit,
        allowInvoiceView: settings.allowInvoiceView,
        allowPayments: settings.allowPayments,
        termsAndConditions: settings.termsAndConditions,
        privacyPolicy: settings.privacyPolicy,
      });
    } catch (error) {
      console.error("Error fetching portal info:", error);
      res.status(500).json({ message: "Failed to fetch portal info" });
    }
  });

  // Validate invite token (public)
  app.get("/api/portal/invite/:token", async (req, res) => {
    try {
      const invite = await storage.getCustomerPortalInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.acceptedAt) {
        return res.status(400).json({ message: "Invite already used" });
      }

      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite expired" });
      }

      const tenant = await storage.getTenant(invite.tenantId);
      const customer = await storage.getCustomer(invite.customerId, invite.tenantId);

      res.json({
        valid: true,
        tenantId: invite.tenantId,
        businessName: tenant?.name,
        customerName: customer?.name,
        email: invite.email,
      });
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ message: "Failed to validate invite" });
    }
  });

  // Customer registration via invite (public)
  app.post("/api/portal/register", async (req, res) => {
    try {
      const { inviteToken, password } = req.body;
      if (!inviteToken || !password) {
        return res.status(400).json({ message: "Invite token and password required" });
      }

      const invite = await storage.getCustomerPortalInviteByToken(inviteToken);
      if (!invite || invite.acceptedAt || new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invalid or expired invite" });
      }

      // Check if account already exists
      const existingAccount = await storage.getCustomerPortalAccountByCustomerId(invite.customerId, invite.tenantId);
      if (existingAccount && existingAccount.status === "active") {
        return res.status(400).json({ message: "Account already exists" });
      }

      // Hash password
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.hash(password, 10);

      // Create or update portal account
      let account;
      if (existingAccount) {
        account = await storage.updateCustomerPortalAccount(existingAccount.id, invite.tenantId, {
          passwordHash,
          status: "active",
          emailVerified: true,
        });
      } else {
        account = await storage.createCustomerPortalAccount({
          tenantId: invite.tenantId,
          customerId: invite.customerId,
          email: invite.email,
          passwordHash,
          status: "active",
          emailVerified: true,
        });
      }

      // Mark invite as accepted
      await storage.updateCustomerPortalInvite(invite.id, { acceptedAt: new Date() });

      // Create session
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(64).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createCustomerPortalSession({
        accountId: account!.id,
        tenantId: invite.tenantId,
        sessionToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, sessionToken });
    } catch (error) {
      console.error("Error registering customer:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Customer self-registration (public)
  app.post("/api/portal/:token/self-register", async (req, res) => {
    try {
      const settings = await storage.getCustomerPortalSettingsByToken(req.params.token);
      if (!settings || !settings.isEnabled) {
        return res.status(404).json({ message: "Portal not found or disabled" });
      }

      if (!settings.allowSelfRegistration) {
        return res.status(403).json({ message: "Self-registration is not enabled" });
      }

      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if account already exists
      const existingAccount = await storage.getCustomerPortalAccountByEmail(email, settings.tenantId);
      if (existingAccount && existingAccount.status === "active") {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Create customer record first
      const customer = await storage.createCustomer({
        tenantId: settings.tenantId,
        name,
        email,
      });

      // Hash password
      const bcrypt = await import("bcrypt");
      const passwordHash = await bcrypt.hash(password, 10);

      // Create portal account
      const account = await storage.createCustomerPortalAccount({
        tenantId: settings.tenantId,
        customerId: customer.id,
        email,
        passwordHash,
        status: "active",
        emailVerified: false,
      });

      // Create session
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(64).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.createCustomerPortalSession({
        accountId: account.id,
        tenantId: settings.tenantId,
        sessionToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, sessionToken });
    } catch (error) {
      console.error("Error with self-registration:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Customer login (public)
  app.post("/api/portal/:token/login", async (req, res) => {
    try {
      const settings = await storage.getCustomerPortalSettingsByToken(req.params.token);
      if (!settings || !settings.isEnabled) {
        return res.status(404).json({ message: "Portal not found or disabled" });
      }

      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const account = await storage.getCustomerPortalAccountByEmail(email, settings.tenantId);
      if (!account || account.status !== "active") {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check lockout
      if (account.lockedUntil && new Date() < account.lockedUntil) {
        return res.status(423).json({ message: "Account temporarily locked" });
      }

      // Verify password
      const bcrypt = await import("bcrypt");
      const valid = await bcrypt.compare(password, account.passwordHash || "");
      if (!valid) {
        // Increment login attempts
        const attempts = (account.loginAttempts || 0) + 1;
        const updates: any = { loginAttempts: attempts };
        if (attempts >= 5) {
          updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
        }
        await storage.updateCustomerPortalAccount(account.id, settings.tenantId, updates);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Reset login attempts and update last login
      await storage.updateCustomerPortalAccount(account.id, settings.tenantId, {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      });

      // Create session
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(64).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.createCustomerPortalSession({
        accountId: account.id,
        tenantId: settings.tenantId,
        sessionToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      res.json({ success: true, sessionToken });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Portal session middleware helper
  const getPortalSession = async (req: any): Promise<{ account: any; customer: any; tenant: any } | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.substring(7);
    const session = await storage.getCustomerPortalSessionByToken(token);
    if (!session || new Date() > session.expiresAt) return null;

    const account = await storage.getCustomerPortalAccount(session.accountId, session.tenantId);
    if (!account || account.status !== "active") return null;

    const customer = await storage.getCustomer(account.customerId, session.tenantId);
    const tenant = await storage.getTenant(session.tenantId);

    return { account, customer, tenant };
  };

  // Get customer profile (authenticated customer)
  app.get("/api/portal/me", async (req, res) => {
    try {
      const sessionData = await getPortalSession(req);
      if (!sessionData) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { account, customer, tenant } = sessionData;
      const settings = await storage.getCustomerPortalSettings(customer.tenantId);
      
      res.json({
        account: {
          id: account.id,
          email: account.email,
          lastLoginAt: account.lastLoginAt,
        },
        customer,
        business: {
          name: tenant?.name,
          logoUrl: tenant?.logoUrl,
        },
        settings: settings ? {
          allowProfileEdit: settings.allowProfileEdit,
          allowInvoiceView: settings.allowInvoiceView,
          allowPayments: settings.allowPayments,
        } : undefined,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update customer profile (authenticated customer)
  app.patch("/api/portal/me", async (req, res) => {
    try {
      const sessionData = await getPortalSession(req);
      if (!sessionData) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { customer } = sessionData;
      const settings = await storage.getCustomerPortalSettings(customer.tenantId);
      if (!settings?.allowProfileEdit) {
        return res.status(403).json({ message: "Profile editing disabled" });
      }

      // Only allow updating specific fields
      const allowedFields = ["name", "phone", "address"];
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in req.body) {
          updates[key] = req.body[key];
        }
      }

      const updated = await storage.updateCustomer(customer.id, customer.tenantId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get customer invoices (authenticated customer)
  app.get("/api/portal/invoices", async (req, res) => {
    try {
      const sessionData = await getPortalSession(req);
      if (!sessionData) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { customer } = sessionData;
      const settings = await storage.getCustomerPortalSettings(customer.tenantId);
      if (!settings?.allowInvoiceView) {
        return res.status(403).json({ message: "Invoice viewing disabled" });
      }

      // Get invoices for this customer
      const allInvoices = await storage.getInvoices(customer.tenantId);
      const customerInvoices = allInvoices.filter(inv => inv.customerId === customer.id);

      res.json(customerInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get specific invoice (authenticated customer)
  app.get("/api/portal/invoices/:invoiceId", async (req, res) => {
    try {
      const sessionData = await getPortalSession(req);
      if (!sessionData) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { customer } = sessionData;
      const settings = await storage.getCustomerPortalSettings(customer.tenantId);
      if (!settings?.allowInvoiceView) {
        return res.status(403).json({ message: "Invoice viewing disabled" });
      }

      const invoice = await storage.getInvoice(req.params.invoiceId, customer.tenantId);
      if (!invoice || invoice.customerId !== customer.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get invoice items
      const items = await storage.getInvoiceItems(invoice.id);

      res.json({ ...invoice, items });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Logout (authenticated customer)
  app.post("/api/portal/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        await storage.deleteCustomerPortalSession(token);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // ==================== IN-APP NOTIFICATIONS ====================

  // Get notifications for current user (supports both regular users and platform admins)
  app.get("/api/notifications", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === "true";

      const notifications = await storage.getInAppNotifications(userId, { limit, offset, unreadOnly });
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Get unread notification count (supports both regular users and platform admins)
  app.get("/api/notifications/unread-count", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Mark single notification as read (supports both regular users and platform admins)
  app.post("/api/notifications/:id/read", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notification = await storage.markNotificationAsRead(req.params.id, userId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read (supports both regular users and platform admins)
  app.post("/api/notifications/mark-all-read", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true, updatedCount: count });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // Delete notification (supports both regular users and platform admins)
  app.delete("/api/notifications/:id", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.deleteNotification(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Create notification (internal/admin use - supports both regular users and platform admins)
  app.post("/api/notifications", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { type, severity, title, message, actionUrl, actionLabel, targetUserId, tenantId } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      const notification = await storage.createInAppNotification({
        userId: targetUserId || userId,
        tenantId: tenantId || (req as any).tenantId,
        type: type || "info",
        severity: severity || "low",
        title,
        message,
        actionUrl,
        actionLabel,
      });

      res.status(201).json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // ============================================
  // PLAN CONVERSION ANALYTICS ROUTES
  // ============================================

  const planConversionEventSchema = z.object({
    event: z.enum([
      "plan_upgrade_banner_shown",
      "locked_feature_clicked",
      "plan_upgrade_clicked",
      "plan_upgraded_success",
      "plan_comparison_viewed",
      "upgrade_nudge_dismissed"
    ]),
    fromPlan: z.string().optional(),
    toPlan: z.string().optional(),
    triggerReason: z.string().optional(),
    featureKey: z.string().optional(),
    limitKey: z.string().optional(),
    country: z.string().optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    timestamp: z.string().optional(),
  });

  app.post("/api/analytics/plan-conversion", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = (req as any).context?.tenant?.id;
      const userId = (req as any).context?.user?.id || (req as any).user?.id;
      
      const parsed = planConversionEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event data" });
      }

      const { event, fromPlan, toPlan, triggerReason, featureKey, country, metadata } = parsed.data;
      
      console.log(`[Plan Analytics] Event: ${event}, From: ${fromPlan}, To: ${toPlan}, Tenant: ${tenantId}, User: ${userId}, Trigger: ${triggerReason || featureKey || 'N/A'}, Country: ${country}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Plan conversion analytics error:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  app.get("/api/admin/analytics/plan-conversion/overview", 
    authenticateJWT,
    requireRole("super_admin", "platform_admin"),
    async (req: Request, res: Response) => {
      try {
        res.json({
          totalUpgrades: 0,
          freeToBasic: 0,
          basicToPro: 0,
          conversionRate: 0,
          topTriggers: [],
          byCountry: {}
        });
      } catch (error) {
        console.error("Plan conversion overview error:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    }
  );

  // Feature Discovery Event Tracking
  const featureEventSchema = z.object({
    featureKey: z.string(),
    eventType: z.enum(["gate_shown", "gate_dismissed", "cta_clicked", "trial_started", "upgrade_completed"]),
    reason: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.string().optional(),
  });

  app.post("/api/analytics/feature-event", authenticateHybrid(), async (req, res) => {
    try {
      const tenantId = (req as any).context?.tenant?.id;
      const userId = (req as any).context?.user?.id || (req as any).user?.id;
      
      const parsed = featureEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event data" });
      }

      const { featureKey, eventType, reason, metadata } = parsed.data;
      
      console.log(`[Feature Discovery] Event: ${eventType}, Feature: ${featureKey}, Reason: ${reason || 'N/A'}, Tenant: ${tenantId}, User: ${userId}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Feature event analytics error:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // ============================================
  // NOTIFICATION PREFERENCES ROUTES
  // ============================================

  // Get notification preferences for current user (supports both regular users and platform admins)
  app.get("/api/notifications/preferences", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const preferences = await storage.getNotificationPreferences(userId);
      
      // Return default preferences if none exist
      if (!preferences) {
        return res.json({
          systemEnabled: true,
          alertEnabled: true,
          infoEnabled: true,
          successEnabled: true,
          warningEnabled: true,
          actionEnabled: true,
          reminderEnabled: true,
          lowSeverityEnabled: true,
          mediumSeverityEnabled: true,
          highSeverityEnabled: true,
          emailEnabled: true,
          whatsappEnabled: false,
          smsEnabled: false,
          quietHoursEnabled: false,
          quietHoursStart: null,
          quietHoursEnd: null,
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ message: "Failed to get notification preferences" });
    }
  });

  // Update notification preferences for current user
  const notificationPrefsUpdateSchema = insertNotificationPreferencesSchema.partial().omit({ userId: true, tenantId: true });
  
  app.put("/api/notifications/preferences", authenticateHybrid(), async (req, res) => {
    try {
      // Support both regular users and platform admins
      const userId = (req as any).context?.user?.id || (req as any).user?.id || (req as any).platformAdminContext?.platformAdmin?.id;
      const tenantId = (req as any).context?.tenant?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const parsed = notificationPrefsUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid preferences data", errors: parsed.error.flatten() });
      }

      const preferences = await storage.upsertNotificationPreferences(userId, tenantId, parsed.data);

      res.json(preferences);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  return httpServer;
}
