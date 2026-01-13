import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { billingOffers, offerRedemptions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateJWT, requirePlatformAdmin } from "../core/auth-middleware";
import { requirePermission, getScopeContext } from "../rbac/guards";
import { Permissions } from "@shared/rbac/permissions";
import { auditService } from "../core";
import { offerService } from "../services/offers";

const router = Router();

const requiredAuth = authenticateJWT({ required: true });

function getAdminInfo(req: Request): { adminId: string; adminEmail: string } {
  const admin = req.platformAdminContext?.platformAdmin;
  return {
    adminId: admin?.id || "unknown",
    adminEmail: admin?.email || "unknown",
  };
}

const createOfferSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  countryCode: z.string().max(5).nullable().optional(),
  planCode: z.string().max(50).nullable().optional(),
  offerType: z.enum(["PERCENT", "FLAT"]),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/),
  billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]).nullable().optional(),
  couponCode: z.string().max(50).nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  maxRedemptions: z.number().int().min(0).nullable().optional(),
  perTenantLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const updateOfferSchema = createOfferSchema.partial();

router.get(
  "/offers",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const scopeContext = getScopeContext(req);
      
      const allOffers = await db.select()
        .from(billingOffers)
        .orderBy(desc(billingOffers.createdAt));
      
      let filteredOffers = allOffers;
      if (scopeContext && !scopeContext.isSuperAdmin && scopeContext.scopeType !== "GLOBAL") {
        const allowedCountries = scopeContext.allowedCountryIds || [];
        filteredOffers = allOffers.filter(offer => 
          !offer.countryCode || allowedCountries.includes(offer.countryCode)
        );
      }
      
      res.json({ offers: filteredOffers });
    } catch (error) {
      console.error("[admin-billing-offers] Error fetching offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  }
);

router.get(
  "/offers/:id",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const offer = await offerService.getOfferById(id);
      
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      res.json({ offer });
    } catch (error) {
      console.error("[admin-billing-offers] Error fetching offer:", error);
      res.status(500).json({ error: "Failed to fetch offer" });
    }
  }
);

router.post(
  "/offers",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const data = createOfferSchema.parse(req.body);
      
      const offer = await offerService.createOffer({
        name: data.name,
        description: data.description,
        countryCode: data.countryCode || undefined,
        planCode: data.planCode || undefined,
        offerType: data.offerType,
        value: data.value,
        billingCycle: data.billingCycle || undefined,
        couponCode: data.couponCode || undefined,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validTo: data.validTo ? new Date(data.validTo) : undefined,
        maxRedemptions: data.maxRedemptions || undefined,
        perTenantLimit: data.perTenantLimit ?? 1,
        isActive: data.isActive ?? true,
      });
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "create",
        resource: "billing_offer",
        resourceId: offer.id,
        newValue: offer,
        metadata: {
          adminEmail,
          offerName: offer.name,
          offerType: offer.offerType,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-offers] Offer created: ${offer.name} by ${adminEmail}`);
      
      res.status(201).json({ offer });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          errors: error.errors,
        });
      }
      console.error("[admin-billing-offers] Error creating offer:", error);
      res.status(500).json({ error: "Failed to create offer" });
    }
  }
);

router.patch(
  "/offers/:id",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = updateOfferSchema.parse(req.body);
      
      const existingOffer = await offerService.getOfferById(id);
      if (!existingOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.countryCode !== undefined) updateData.countryCode = data.countryCode || undefined;
      if (data.planCode !== undefined) updateData.planCode = data.planCode || undefined;
      if (data.offerType !== undefined) updateData.offerType = data.offerType;
      if (data.value !== undefined) updateData.value = data.value;
      if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle || undefined;
      if (data.couponCode !== undefined) updateData.couponCode = data.couponCode || undefined;
      if (data.validFrom !== undefined) updateData.validFrom = data.validFrom ? new Date(data.validFrom) : null;
      if (data.validTo !== undefined) updateData.validTo = data.validTo ? new Date(data.validTo) : null;
      if (data.maxRedemptions !== undefined) updateData.maxRedemptions = data.maxRedemptions;
      if (data.perTenantLimit !== undefined) updateData.perTenantLimit = data.perTenantLimit;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      
      const updatedOffer = await offerService.updateOffer(id, updateData);
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "update",
        resource: "billing_offer",
        resourceId: id,
        oldValue: existingOffer,
        newValue: updatedOffer,
        metadata: {
          adminEmail,
          offerName: updatedOffer?.name,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-offers] Offer updated: ${id} by ${adminEmail}`);
      
      res.json({ offer: updatedOffer });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          errors: error.errors,
        });
      }
      console.error("[admin-billing-offers] Error updating offer:", error);
      res.status(500).json({ error: "Failed to update offer" });
    }
  }
);

router.delete(
  "/offers/:id",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const existingOffer = await offerService.getOfferById(id);
      if (!existingOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      await offerService.deleteOffer(id);
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "delete",
        resource: "billing_offer",
        resourceId: id,
        oldValue: existingOffer,
        metadata: {
          adminEmail,
          offerName: existingOffer.name,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-offers] Offer deleted: ${id} by ${adminEmail}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("[admin-billing-offers] Error deleting offer:", error);
      res.status(500).json({ error: "Failed to delete offer" });
    }
  }
);

router.post(
  "/offers/:id/toggle",
  requiredAuth,
  requirePlatformAdmin(),
  requirePermission(Permissions.MANAGE_PLANS_PRICING),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const existingOffer = await offerService.getOfferById(id);
      if (!existingOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      
      const updatedOffer = await offerService.updateOffer(id, { 
        isActive: !existingOffer.isActive 
      });
      
      const { adminId, adminEmail } = getAdminInfo(req);
      await auditService.log({
        userId: adminId,
        action: "update",
        resource: "billing_offer",
        resourceId: id,
        oldValue: { isActive: existingOffer.isActive },
        newValue: { isActive: updatedOffer?.isActive },
        metadata: {
          adminEmail,
          offerName: existingOffer.name,
          action: updatedOffer?.isActive ? "activated" : "deactivated",
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      
      console.log(`[admin-billing-offers] Offer toggled: ${id} to ${updatedOffer?.isActive ? "active" : "inactive"} by ${adminEmail}`);
      
      res.json({ offer: updatedOffer });
    } catch (error) {
      console.error("[admin-billing-offers] Error toggling offer:", error);
      res.status(500).json({ error: "Failed to toggle offer" });
    }
  }
);

export default router;
