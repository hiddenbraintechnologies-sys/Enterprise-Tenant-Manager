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
  tenants, userTenants, users, roles,
  tenantSubscriptions, subscriptionInvoices, transactionLogs, countryPricingConfigs,
  dsarRequests,
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
import { ssoRoutes } from "./sso";
import { domainRoutes } from "./core/domain";
import { complianceService } from "./core/compliance";
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
} from "./core/admin-security";
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
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
      await featureService.seedFeatureFlags();
      console.log("[bootstrap] Feature flags seeded");
      await tenantService.getOrCreateDefaultTenant();
      console.log("[bootstrap] Default tenant ready");
      await initializeWhatsappProviders();
      console.log("[bootstrap] WhatsApp providers initialized");
    } catch (error) {
      console.error("[bootstrap] Background initialization error:", error);
    }
  });

  // Register SSO routes
  app.use('/api/sso', ssoRoutes);
  
  // Register domain management routes
  app.use('/api/domains', domainRoutes);

  // Register AI service routes
  app.use('/api/ai', aiRouter);
  
  // Register AI Permissions routes (role-based AI access control)
  app.use('/api/ai/permissions', aiPermissionsRoutes);

  // Register AI Audit routes (compliance-safe logging)
  app.use('/api/ai/audit', aiAuditRoutes);

  // Module-protected middleware stack (includes tenant context resolution)
  const moduleProtectedMiddleware = (businessType: "real_estate" | "tourism" | "education" | "logistics" | "legal") => [
    authenticateJWT({ required: true }),
    tenantResolutionMiddleware(),
    enforceTenantBoundary(),
    tenantIsolationMiddleware(),
    validateModuleAccess(businessType),
  ];

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

  // Register Reseller/White-label routes
  app.use('/api/resellers', authenticateJWT({ required: true }), resellerRoutes);

  // Register Branding/Theming routes
  app.use('/api/branding', isAuthenticated, brandingRoutes);

  // Register Add-on Marketplace routes
  app.use('/api/addons', addonRoutes);

  // Register Feature Flags runtime evaluation routes (for tenant apps)
  app.use('/api/feature-flags', isAuthenticated, featureFlagsRoutes);

  // Register Business Version management routes (SuperAdmin only)
  app.use('/api/business-versions', isAuthenticated, businessVersionRoutes);

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
  app.use('/api/compliance', isAuthenticated, complianceRoutes);
  
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

  app.get("/api/onboarding/status", isAuthenticated, async (req, res) => {
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

  app.post("/api/onboarding/initialize", isAuthenticated, async (req, res) => {
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

  app.post("/api/onboarding/step/:stepKey", isAuthenticated, async (req, res) => {
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

  app.post("/api/onboarding/advance", isAuthenticated, async (req, res) => {
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

  app.post("/api/onboarding/skip", isAuthenticated, async (req, res) => {
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

  app.get("/api/onboarding/can-modify-business-type", isAuthenticated, async (req, res) => {
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

  app.get("/api/dashboard/access", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      const tenant = req.context?.tenant;
      if (!tenant) {
        return res.status(400).json({ message: "Tenant not found" });
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

  app.post("/api/dashboard/validate-route", isAuthenticated, async (req, res) => {
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

  const registrationSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Invalid email format"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    businessName: z.string().min(1, "Business name is required").max(200),
    businessType: z.enum(["clinic", "salon", "pg", "coworking", "service"]),
  });

  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parsed.error.flatten().fieldErrors 
        });
      }

      const { firstName, lastName, email, password, businessName, businessType } = parsed.data;

      const [existingUser] = await db.select().from(users).where(eq(users.email, email));
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

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

      const result = await db.transaction(async (tx) => {
        const [newTenant] = await tx.insert(tenants).values({
          name: businessName,
          businessType: businessType,
          email: email,
          currency: "INR",
          timezone: "Asia/Kolkata",
        }).returning();

        const [newUser] = await tx.insert(users).values({
          email,
          firstName,
          lastName,
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

      const businessTypeKey = businessType as BusinessType;
      const modulesToEnable = BUSINESS_TYPE_MODULES[businessTypeKey] || BUSINESS_TYPE_MODULES.service;
      
      for (const featureCode of modulesToEnable) {
        await featureService.enableFeature(newTenant.id, featureCode);
      }

      const tokens = await jwtAuthService.generateTokenPair(
        { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName },
        newTenant.id,
        {
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip || undefined,
        }
      );

      auditService.logAsync({
        tenantId: newTenant.id,
        userId: newUser.id,
        action: "create",
        resource: "user",
        metadata: { method: "registration", businessType },
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
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
          businessType: newTenant.businessType,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
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

      const tokens = await jwtAuthService.exchangeSessionForTokens(dbUser, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip || undefined,
      });

      auditService.logAsync({
        tenantId: req.context?.tenant?.id,
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
        tenant: req.context?.tenant || null,
        role: req.context?.role?.name || null,
        permissions: req.context?.permissions || [],
        features: req.context?.features || [],
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
  
  const platformAdminLoginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
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

      const { email, password } = parsed.data;

      const admin = await storage.getPlatformAdminByEmail(email);
      if (!admin) {
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

      await recordLoginAttempt(email, clientIp, userAgent, true);
      await storage.updatePlatformAdminLastLogin(admin.id);

      const adminPermissions = admin.role === "PLATFORM_ADMIN" 
        ? await storage.getAdminPermissions(admin.id)
        : undefined;

      const tokens = await jwtAuthService.generatePlatformAdminTokenPair(
        admin.id,
        admin.role as "SUPER_ADMIN" | "PLATFORM_ADMIN",
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
        metadata: { loginMethod: "password" },
      });

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

  const requirePlatformAdmin = (requiredRole?: "SUPER_ADMIN" | "PLATFORM_ADMIN") => {
    return (req: Request, res: Response, next: any) => {
      if (!req.platformAdminContext) {
        return res.status(403).json({ 
          message: "Platform admin access required",
          code: "NOT_PLATFORM_ADMIN"
        });
      }

      if (requiredRole === "SUPER_ADMIN") {
        if (req.platformAdminContext.platformAdmin.role !== "SUPER_ADMIN") {
          return res.status(403).json({ 
            message: "Super admin access required",
            code: "INSUFFICIENT_PLATFORM_ROLE"
          });
        }
      }

      next();
    };
  };

  // Register Business Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/business-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), businessRegistryRoutes);

  // Register Module Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/module-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), moduleRegistryRoutes);

  // Register Feature Registry routes (SuperAdmin only for management)
  app.use('/api/platform-admin/feature-registry', authenticateJWT(), requirePlatformAdmin("SUPER_ADMIN"), featureRegistryRoutes);

  app.get("/api/platform-admin/me", authenticateJWT(), requirePlatformAdmin(), async (req, res) => {
    try {
      res.json({
        platformAdmin: req.platformAdminContext?.platformAdmin,
        permissions: req.platformAdminContext?.permissions,
      });
    } catch (error) {
      console.error("Get platform admin me error:", error);
      res.status(500).json({ message: "Failed to get admin info" });
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
    role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN"]).optional(),
    forcePasswordReset: z.boolean().optional().default(true),
    permissions: z.array(z.string()).optional(),
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

      const { name, email, password, role, forcePasswordReset, permissions } = parsed.data;

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
        action: "read",
        resource: "platform_admin",
        metadata: { action: "list_all" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(admins.map(admin => ({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        forcePasswordReset: admin.forcePasswordReset,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
      })));
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

      res.json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        forcePasswordReset: admin.forcePasswordReset,
        permissions,
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
    role: z.enum(["SUPER_ADMIN", "PLATFORM_ADMIN"]).optional(),
    isActive: z.boolean().optional(),
    forcePasswordReset: z.boolean().optional(),
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

      const { name, email, password, role, isActive, forcePasswordReset } = parsed.data;

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

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "platform_admin",
        resourceId: req.params.id,
        metadata: { updatedFields: Object.keys(updateData) },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        id: admin?.id,
        name: admin?.name,
        email: admin?.email,
        role: admin?.role,
        isActive: admin?.isActive,
        forcePasswordReset: admin?.forcePasswordReset,
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

  // ==================== GLOBAL TENANT REGISTRY ====================

  // List all tenants with filtering
  app.get("/api/platform-admin/tenants", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const { country, region, status, businessType, search } = req.query;
      
      let query = db.select().from(tenants);
      
      const allTenants = await query;
      
      // Filter in memory for flexibility (can be optimized with drizzle where clauses)
      let filtered = allTenants;
      
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
        metadata: { action: "list_tenants", filters: { country, region, status, businessType }, count: filtered.length },
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

  // Get single tenant details
  app.get("/api/platform-admin/tenants/:tenantId", authenticateJWT(), requirePlatformAdmin(), requirePlatformPermission("read_tenants"), async (req, res) => {
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.params.tenantId));
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
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
    businessType: z.enum(["clinic", "salon", "pg", "coworking", "service"]),
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
    permissionCodes: z.array(z.string()).min(1),
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
      
      const overview: any = {};
      
      if (isSuperAdmin || permissions.includes("read_tenants")) {
        overview.tenantStats = await storage.getTenantStats();
      }
      if (isSuperAdmin || permissions.includes("read_users")) {
        overview.userStats = await storage.getUserStats();
      }
      if (isSuperAdmin || permissions.includes("view_logs")) {
        overview.errorStats = await storage.getErrorLogStats();
        overview.ticketStats = await storage.getSupportTicketStats();
      }
      if (isSuperAdmin || permissions.includes("view_analytics")) {
        overview.usageStats = await storage.getAggregatedUsageMetrics();
      }

      auditService.logAsync({
        tenantId: undefined,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "access",
        resource: "platform_dashboard",
        metadata: { section: "overview" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json(overview);
    } catch (error) {
      console.error("Get dashboard overview error:", error);
      res.status(500).json({ message: "Failed to get dashboard overview" });
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
        features: features.map(f => f.featureCode),
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

      const users = await storage.getUsersByTenant(
        tenantId,
        limit ? parseInt(limit as string) : 100,
        offset ? parseInt(offset as string) : 0
      );

      const maskedUsers = users.map(user => DataMasking.maskUserForSupport(user));

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

      if (user.tenantId !== tenantId) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      const maskedUser = DataMasking.maskUserForSupport(user);

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

      if (user.tenantId !== tenantId) {
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

      if (user.tenantId !== tenantId) {
        return res.status(403).json({ message: "User does not belong to this tenant" });
      }

      await storage.updateUser(userId, { isActive });

      auditService.logAsync({
        tenantId,
        userId: req.platformAdminContext?.platformAdmin.id,
        action: "update",
        resource: "support_user_status",
        resourceId: userId,
        oldValue: { isActive: user.isActive },
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

  // ==================== TENANT MANAGEMENT ROUTES ====================
  
  const tenantProtectedMiddleware = [
    authenticateJWT({ required: true }),
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
        features: features.map(f => f.featureCode),
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

  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
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

  app.get("/api/analytics", isAuthenticated, async (req, res) => {
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

  app.get("/api/customers", isAuthenticated, async (req, res) => {
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

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/customers", isAuthenticated, async (req, res) => {
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

  app.patch("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.get("/api/services", isAuthenticated, async (req, res) => {
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

  app.get("/api/services/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/services", isAuthenticated, async (req, res) => {
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

  app.patch("/api/services/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
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

  app.get("/api/bookings", isAuthenticated, async (req, res) => {
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

  app.get("/api/bookings/upcoming", isAuthenticated, async (req, res) => {
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

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/bookings", isAuthenticated, async (req, res) => {
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

  app.patch("/api/bookings/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/bookings/:id", isAuthenticated, async (req, res) => {
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

  app.get("/api/context", isAuthenticated, async (req, res) => {
    try {
      const context = req.context;
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
      });
    } catch (error) {
      console.error("Error fetching context:", error);
      res.status(500).json({ message: "Failed to fetch context" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
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

  app.get("/api/audit-logs", isAuthenticated, async (req, res) => {
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
  app.get("/api/notification-templates", isAuthenticated, async (req, res) => {
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

  app.post("/api/notification-templates", isAuthenticated, async (req, res) => {
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

  app.patch("/api/notification-templates/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/notification-templates/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/notification-logs", isAuthenticated, async (req, res) => {
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
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
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

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const { items, ...invoiceData } = req.body;
      const parsed = insertInvoiceSchema.safeParse({ ...invoiceData, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const invoice = await storage.createInvoice(parsed.data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createInvoiceItem({ ...item, invoiceId: invoice.id });
        }
      }
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/payments", isAuthenticated, async (req, res) => {
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

  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(403).json({ message: "No tenant access" });
      const parsed = insertPaymentSchema.safeParse({ ...req.body, tenantId, createdBy: getUserId(req) });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const payment = await storage.createPayment(parsed.data);
      if (payment.invoiceId) {
        const invoice = await storage.getInvoice(payment.invoiceId, tenantId);
        if (invoice) {
          const currentPaid = parseFloat(invoice.paidAmount || "0") || 0;
          const paymentAmount = parseFloat(payment.amount) || 0;
          const totalAmount = parseFloat(invoice.totalAmount) || 0;
          const newPaidAmount = Math.max(0, currentPaid + paymentAmount);
          await storage.updateInvoice(payment.invoiceId, tenantId, { 
            paidAmount: newPaidAmount.toFixed(2),
            status: newPaidAmount >= totalAmount ? "paid" : "partial"
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
  app.get("/api/inventory/categories", isAuthenticated, async (req, res) => {
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

  app.post("/api/inventory/categories", isAuthenticated, async (req, res) => {
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
  app.get("/api/inventory/items", isAuthenticated, async (req, res) => {
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

  app.post("/api/inventory/items", isAuthenticated, async (req, res) => {
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

  app.patch("/api/inventory/items/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/inventory/items/:id/adjust", isAuthenticated, async (req, res) => {
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
  app.get("/api/membership-plans", isAuthenticated, async (req, res) => {
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

  app.post("/api/membership-plans", isAuthenticated, async (req, res) => {
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

  app.patch("/api/membership-plans/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/customer-memberships", isAuthenticated, async (req, res) => {
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

  app.post("/api/customer-memberships", isAuthenticated, async (req, res) => {
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

  app.patch("/api/customer-memberships/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/coworking/spaces", isAuthenticated, async (req, res) => {
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

  app.get("/api/coworking/desks", isAuthenticated, async (req, res) => {
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

  app.post("/api/coworking/book", isAuthenticated, async (req, res) => {
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

  app.get("/api/coworking/bookings", isAuthenticated, async (req, res) => {
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
    isAuthenticated, 
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
    isAuthenticated, 
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
    isAuthenticated,
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
    isAuthenticated, 
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
    isAuthenticated, 
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
  app.get("/api/doctors", isAuthenticated, async (req, res) => {
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

  app.post("/api/doctors", isAuthenticated, async (req, res) => {
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

  app.patch("/api/doctors/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/appointments", isAuthenticated, async (req, res) => {
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

  app.post("/api/appointments", isAuthenticated, async (req, res) => {
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

  app.patch("/api/appointments/:id", isAuthenticated, async (req, res) => {
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
    isAuthenticated, 
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
    isAuthenticated, 
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
    isAuthenticated, 
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
    isAuthenticated,
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
        invoiceNumber: subscriptionInvoices.invoiceNumber,
        status: subscriptionInvoices.status,
        country: subscriptionInvoices.country,
        currency: subscriptionInvoices.currency,
        totalAmount: subscriptionInvoices.totalAmount,
        amountPaid: subscriptionInvoices.amountPaid,
        amountDue: subscriptionInvoices.amountDue,
        dueDate: subscriptionInvoices.dueDate,
        paidAt: subscriptionInvoices.paidAt,
        gateway: subscriptionInvoices.gateway,
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
      
      const user = req.user;
      const success = await complianceService.updateDSARStatus(
        dsarId,
        status,
        user?.id || "unknown",
        user?.email || "unknown",
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

  return httpServer;
}
