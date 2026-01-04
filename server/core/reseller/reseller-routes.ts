import { Router, Request, Response } from "express";
import { z } from "zod";
import { resellerService } from "./reseller-service";
import { insertResellerProfileSchema, insertResellerRevenueAgreementSchema } from "@shared/schema";

const router = Router();

const createResellerSchema = z.object({
  tenantId: z.string().min(1),
  brandName: z.string().min(1),
  brandTagline: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  customDomain: z.string().optional(),
  subdomainPrefix: z.string().min(2).max(20).optional(),
  allowedBusinessTypes: z.array(z.string()).optional(),
  maxChildTenants: z.number().int().positive().optional(),
});

const createChildTenantSchema = z.object({
  name: z.string().min(1),
  businessType: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const updateBrandingSchema = z.object({
  brandName: z.string().min(1).optional(),
  brandTagline: z.string().optional(),
  logoUrl: z.string().url().optional(),
  logoAltUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  foregroundColor: z.string().optional(),
  themeTokens: z.record(z.any()).optional(),
  customDomain: z.string().optional(),
  subdomainPrefix: z.string().min(2).max(20).optional(),
  emailFromName: z.string().optional(),
  emailFromAddress: z.string().email().optional(),
  emailReplyTo: z.string().email().optional(),
  emailSignature: z.string().optional(),
  termsOfServiceUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
});

const createRevenueAgreementSchema = z.object({
  agreementName: z.string().min(1),
  revenueShareType: z.enum(["percentage", "fixed", "tiered"]).optional(),
  baseSharePercentage: z.string().optional(),
  tieredRates: z.array(z.object({
    minRevenue: z.number(),
    maxRevenue: z.number(),
    percentage: z.number(),
  })).optional(),
  fixedAmount: z.string().optional(),
  fixedCurrency: z.string().length(3).optional(),
  billingCadence: z.enum(["monthly", "quarterly", "annually"]).optional(),
  paymentTermsDays: z.number().int().positive().optional(),
  payoutMethod: z.string().optional(),
  minimumPayoutAmount: z.string().optional(),
});

const addBrandAssetSchema = z.object({
  assetType: z.string().min(1),
  assetName: z.string().min(1),
  assetUrl: z.string().url(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().optional(),
  dimensions: z.object({
    width: z.number().int().optional(),
    height: z.number().int().optional(),
  }).optional(),
});

router.post("/profiles", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const parsed = createResellerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const profile = await resellerService.createResellerProfile(parsed.data, user.id);
    res.status(201).json(profile);
  } catch (error: any) {
    console.error("Create reseller profile error:", error);
    res.status(500).json({ error: error.message || "Failed to create reseller profile" });
  }
});

router.get("/profiles/:tenantId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { tenantId } = req.params;

    if (user.tenantId !== tenantId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const profile = await resellerService.getResellerProfile(tenantId);
    if (!profile) {
      return res.status(404).json({ error: "Reseller profile not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Get reseller profile error:", error);
    res.status(500).json({ error: error.message || "Failed to get reseller profile" });
  }
});

router.patch("/profiles/:tenantId", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { tenantId } = req.params;

    if (user.tenantId !== tenantId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const parsed = updateBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const profile = await resellerService.updateResellerProfile(tenantId, parsed.data, user.id);
    if (!profile) {
      return res.status(404).json({ error: "Reseller profile not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Update reseller profile error:", error);
    res.status(500).json({ error: error.message || "Failed to update reseller profile" });
  }
});

router.post("/profiles/:tenantId/approve", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const { tenantId } = req.params;
    const profile = await resellerService.approveReseller(tenantId, user.id);

    if (!profile) {
      return res.status(404).json({ error: "Reseller profile not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Approve reseller error:", error);
    res.status(500).json({ error: error.message || "Failed to approve reseller" });
  }
});

router.post("/profiles/:tenantId/suspend", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const { tenantId } = req.params;
    const { reason } = req.body;

    const profile = await resellerService.suspendReseller(tenantId, reason || "No reason provided", user.id);

    if (!profile) {
      return res.status(404).json({ error: "Reseller profile not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Suspend reseller error:", error);
    res.status(500).json({ error: error.message || "Failed to suspend reseller" });
  }
});

router.post("/profiles/:tenantId/verify-domain", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const { tenantId } = req.params;
    const profile = await resellerService.verifyCustomDomain(tenantId, user.id);

    if (!profile) {
      return res.status(404).json({ error: "Reseller profile not found" });
    }

    res.json(profile);
  } catch (error: any) {
    console.error("Verify domain error:", error);
    res.status(500).json({ error: error.message || "Failed to verify domain" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const resellers = await resellerService.getAllResellers();
    res.json(resellers);
  } catch (error: any) {
    console.error("Get all resellers error:", error);
    res.status(500).json({ error: error.message || "Failed to get resellers" });
  }
});

router.post("/:resellerId/tenants", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const parsed = createChildTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const childTenant = await resellerService.createChildTenant(
      { ...parsed.data, resellerId },
      user.id
    );

    res.status(201).json(childTenant);
  } catch (error: any) {
    console.error("Create child tenant error:", error);
    res.status(500).json({ error: error.message || "Failed to create child tenant" });
  }
});

router.get("/:resellerId/tenants", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const childTenants = await resellerService.getChildTenants(resellerId);
    res.json(childTenants);
  } catch (error: any) {
    console.error("Get child tenants error:", error);
    res.status(500).json({ error: error.message || "Failed to get child tenants" });
  }
});

router.post("/:resellerId/revenue-agreements", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const { resellerId } = req.params;
    const parsed = createRevenueAgreementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const agreement = await resellerService.createRevenueAgreement(
      { ...parsed.data, resellerId } as any,
      user.id
    );

    res.status(201).json(agreement);
  } catch (error: any) {
    console.error("Create revenue agreement error:", error);
    res.status(500).json({ error: error.message || "Failed to create revenue agreement" });
  }
});

router.get("/:resellerId/revenue-agreements/active", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const agreement = await resellerService.getActiveRevenueAgreement(resellerId);
    if (!agreement) {
      return res.status(404).json({ error: "No active revenue agreement found" });
    }

    res.json(agreement);
  } catch (error: any) {
    console.error("Get active revenue agreement error:", error);
    res.status(500).json({ error: error.message || "Failed to get revenue agreement" });
  }
});

router.post("/:resellerId/revenue-records", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user || !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Platform admin access required" });
    }

    const { resellerId } = req.params;
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "periodStart and periodEnd are required" });
    }

    const record = await resellerService.createRevenueRecord(
      resellerId,
      new Date(periodStart),
      new Date(periodEnd),
      user.id
    );

    res.status(201).json(record);
  } catch (error: any) {
    console.error("Create revenue record error:", error);
    res.status(500).json({ error: error.message || "Failed to create revenue record" });
  }
});

router.get("/:resellerId/revenue-records", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const limit = parseInt(req.query.limit as string) || 12;
    const records = await resellerService.getRevenueRecords(resellerId, limit);
    res.json(records);
  } catch (error: any) {
    console.error("Get revenue records error:", error);
    res.status(500).json({ error: error.message || "Failed to get revenue records" });
  }
});

router.get("/:resellerId/revenue/calculate", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: "periodStart and periodEnd query params are required" });
    }

    const calculation = await resellerService.calculatePeriodRevenue(
      resellerId,
      new Date(periodStart as string),
      new Date(periodEnd as string)
    );

    res.json(calculation);
  } catch (error: any) {
    console.error("Calculate revenue error:", error);
    res.status(500).json({ error: error.message || "Failed to calculate revenue" });
  }
});

router.post("/:resellerId/brand-assets", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const parsed = addBrandAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const asset = await resellerService.addBrandAsset(resellerId, parsed.data as any, user.id);
    res.status(201).json(asset);
  } catch (error: any) {
    console.error("Add brand asset error:", error);
    res.status(500).json({ error: error.message || "Failed to add brand asset" });
  }
});

router.get("/:resellerId/brand-assets", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { resellerId } = req.params;

    if (user.tenantId !== resellerId && !["super_admin", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const assetType = req.query.type as string | undefined;
    const assets = await resellerService.getBrandAssets(resellerId, assetType);
    res.json(assets);
  } catch (error: any) {
    console.error("Get brand assets error:", error);
    res.status(500).json({ error: error.message || "Failed to get brand assets" });
  }
});

router.get("/branding/domain/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const branding = await resellerService.getBrandingForDomain(domain);

    if (!branding) {
      return res.status(404).json({ error: "Branding not found for domain" });
    }

    res.json({
      brandName: branding.reseller.brandName,
      brandTagline: branding.reseller.brandTagline,
      logoUrl: branding.reseller.logoUrl,
      logoAltUrl: branding.reseller.logoAltUrl,
      faviconUrl: branding.reseller.faviconUrl,
      primaryColor: branding.reseller.primaryColor,
      secondaryColor: branding.reseller.secondaryColor,
      accentColor: branding.reseller.accentColor,
      backgroundColor: branding.reseller.backgroundColor,
      foregroundColor: branding.reseller.foregroundColor,
      themeTokens: branding.reseller.themeTokens,
      termsOfServiceUrl: branding.reseller.termsOfServiceUrl,
      privacyPolicyUrl: branding.reseller.privacyPolicyUrl,
      supportEmail: branding.reseller.supportEmail,
      supportPhone: branding.reseller.supportPhone,
    });
  } catch (error: any) {
    console.error("Get branding by domain error:", error);
    res.status(500).json({ error: error.message || "Failed to get branding" });
  }
});

router.get("/branding/subdomain/:subdomain", async (req: Request, res: Response) => {
  try {
    const { subdomain } = req.params;
    const branding = await resellerService.getBrandingForSubdomain(subdomain);

    if (!branding) {
      return res.status(404).json({ error: "Branding not found for subdomain" });
    }

    res.json({
      brandName: branding.reseller.brandName,
      brandTagline: branding.reseller.brandTagline,
      logoUrl: branding.reseller.logoUrl,
      logoAltUrl: branding.reseller.logoAltUrl,
      faviconUrl: branding.reseller.faviconUrl,
      primaryColor: branding.reseller.primaryColor,
      secondaryColor: branding.reseller.secondaryColor,
      accentColor: branding.reseller.accentColor,
      backgroundColor: branding.reseller.backgroundColor,
      foregroundColor: branding.reseller.foregroundColor,
      themeTokens: branding.reseller.themeTokens,
      termsOfServiceUrl: branding.reseller.termsOfServiceUrl,
      privacyPolicyUrl: branding.reseller.privacyPolicyUrl,
      supportEmail: branding.reseller.supportEmail,
      supportPhone: branding.reseller.supportPhone,
    });
  } catch (error: any) {
    console.error("Get branding by subdomain error:", error);
    res.status(500).json({ error: error.message || "Failed to get branding" });
  }
});

export default router;
