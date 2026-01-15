import { Router, Request, Response } from "express";
import { db } from "../../db";
import { billingPromos, billingPromoRedemptions, insertBillingPromoSchema } from "@shared/schema";
import { eq, and, desc, sql, isNull, count } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createPromoSchema = z.object({
  code: z.string().min(1).max(50).transform(v => v.toUpperCase()),
  name: z.string().min(1),
  description: z.string().optional(),
  appliesTo: z.enum(["plan", "addon", "bundle", "any"]).default("any"),
  targetIds: z.array(z.string()).default([]),
  discountType: z.enum(["flat", "percent"]).default("percent"),
  discountValue: z.number().int().positive(),
  maxDiscountAmount: z.number().int().positive().optional(),
  minAmount: z.number().int().positive().optional(),
  startAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  endAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  usageLimitTotal: z.number().int().positive().optional(),
  usageLimitPerTenant: z.number().int().positive().default(1),
  allowStacking: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const updatePromoSchema = createPromoSchema.partial();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const includeArchived = req.query.includeArchived === "true";

    let whereClause = includeArchived ? undefined : isNull(billingPromos.archivedAt);

    const promos = await db.select()
      .from(billingPromos)
      .where(whereClause)
      .orderBy(desc(billingPromos.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ value: total }] = await db.select({ value: count() })
      .from(billingPromos)
      .where(whereClause);

    return res.json({
      promos,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    });
  } catch (error: any) {
    console.error("[admin/promos] List error:", error);
    return res.status(500).json({ error: "Failed to list promos" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [promo] = await db.select()
      .from(billingPromos)
      .where(eq(billingPromos.id, id))
      .limit(1);

    if (!promo) {
      return res.status(404).json({ error: "Promo not found" });
    }

    const redemptions = await db.select()
      .from(billingPromoRedemptions)
      .where(eq(billingPromoRedemptions.promoId, id))
      .orderBy(desc(billingPromoRedemptions.createdAt))
      .limit(50);

    return res.json({ promo, redemptions });
  } catch (error: any) {
    console.error("[admin/promos] Get error:", error);
    return res.status(500).json({ error: "Failed to get promo" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createPromoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors
      });
    }

    const userId = (req as any).context?.user?.id;

    const [existing] = await db.select()
      .from(billingPromos)
      .where(eq(billingPromos.code, parsed.data.code))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Promo code already exists" });
    }

    const [promo] = await db.insert(billingPromos)
      .values({
        ...parsed.data,
        createdBy: userId
      })
      .returning();

    console.log(`[admin/promos] Created promo: ${promo.code} by user ${userId}`);

    return res.status(201).json({ promo });
  } catch (error: any) {
    console.error("[admin/promos] Create error:", error);
    return res.status(500).json({ error: "Failed to create promo" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const parsed = updatePromoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors
      });
    }

    const [existing] = await db.select()
      .from(billingPromos)
      .where(eq(billingPromos.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Promo not found" });
    }

    if (parsed.data.code && parsed.data.code !== existing.code) {
      const [codeConflict] = await db.select()
        .from(billingPromos)
        .where(eq(billingPromos.code, parsed.data.code))
        .limit(1);

      if (codeConflict) {
        return res.status(409).json({ error: "Promo code already exists" });
      }
    }

    const [promo] = await db.update(billingPromos)
      .set({
        ...parsed.data,
        updatedAt: new Date()
      })
      .where(eq(billingPromos.id, id))
      .returning();

    console.log(`[admin/promos] Updated promo: ${promo.code}`);

    return res.json({ promo });
  } catch (error: any) {
    console.error("[admin/promos] Update error:", error);
    return res.status(500).json({ error: "Failed to update promo" });
  }
});

router.post("/:id/archive", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select()
      .from(billingPromos)
      .where(eq(billingPromos.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Promo not found" });
    }

    const [promo] = await db.update(billingPromos)
      .set({
        isActive: false,
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(billingPromos.id, id))
      .returning();

    console.log(`[admin/promos] Archived promo: ${promo.code}`);

    return res.json({ promo, message: "Promo archived successfully" });
  } catch (error: any) {
    console.error("[admin/promos] Archive error:", error);
    return res.status(500).json({ error: "Failed to archive promo" });
  }
});

router.get("/:id/stats", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const redemptions = await db.select()
      .from(billingPromoRedemptions)
      .where(eq(billingPromoRedemptions.promoId, id));

    const totalRedemptions = redemptions.length;
    const totalDiscount = redemptions.reduce((sum, r) => sum + r.discountAmount, 0);
    const totalRevenue = redemptions.reduce((sum, r) => sum + r.amountAfter, 0);

    return res.json({
      totalRedemptions,
      totalDiscount,
      totalRevenue,
      avgDiscount: totalRedemptions > 0 ? Math.round(totalDiscount / totalRedemptions) : 0
    });
  } catch (error: any) {
    console.error("[admin/promos] Stats error:", error);
    return res.status(500).json({ error: "Failed to get promo stats" });
  }
});

export default router;
