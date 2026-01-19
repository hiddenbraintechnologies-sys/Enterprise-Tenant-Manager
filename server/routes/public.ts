import { Router, Request, Response } from "express";
import { db } from "../db";
import { waitlist, insertWaitlistSchema, countryRolloutPolicy } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const waitlistRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  countryCode: z.string().min(2).max(10)
});

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

router.post("/waitlist", async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ 
        error: "Too many requests. Please try again later." 
      });
    }

    const parsed = waitlistRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { email, countryCode } = parsed.data;

    const [existing] = await db.select()
      .from(waitlist)
      .where(and(
        eq(waitlist.email, email.toLowerCase()),
        eq(waitlist.countryCode, countryCode)
      ))
      .limit(1);

    if (existing) {
      return res.status(200).json({ 
        success: true,
        message: "You're already on the waitlist!"
      });
    }

    await db.insert(waitlist).values({
      email: email.toLowerCase(),
      countryCode,
      source: "landing",
      referrer: req.get("referer") || null,
      ipAddress: clientIp
    });

    console.log(`[waitlist] New signup: ${email} for ${countryCode}`);

    return res.status(201).json({ 
      success: true,
      message: "You've been added to the waitlist!"
    });
  } catch (error: any) {
    console.error("[waitlist] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/waitlist/count/:countryCode", async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    
    const entries = await db.select()
      .from(waitlist)
      .where(eq(waitlist.countryCode, countryCode));

    return res.json({ count: entries.length });
  } catch (error: any) {
    console.error("[waitlist] Count error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/public/rollouts
 * Lightweight endpoint for landing + register page country picker
 * Returns only public-safe fields: countryCode, isActive, comingSoonMessage, enabledBusinessTypes
 * Always returns fresh data with no caching
 */
router.get("/rollouts", async (_req: Request, res: Response) => {
  // Disable all caching (browser, CDN, proxy) to ensure fresh data
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store",
    "CDN-Cache-Control": "no-store",
    "Vary": "Origin",
  });

  try {
    const rows = await db
      .select({
        countryCode: countryRolloutPolicy.countryCode,
        isActive: countryRolloutPolicy.isActive,
        status: countryRolloutPolicy.status,
        comingSoonMessage: countryRolloutPolicy.comingSoonMessage,
        enabledBusinessTypes: countryRolloutPolicy.enabledBusinessTypes,
      })
      .from(countryRolloutPolicy)
      .orderBy(countryRolloutPolicy.countryCode);

    const response = {
      rollouts: rows,
      updatedAt: new Date().toISOString(),
      version: Date.now(),
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("[public/rollouts] Returning fresh rollout data:", response);
    }

    res.json(response);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[public/rollouts] Error fetching rollouts:", error);
    }
    res.status(500).json({ error: "Failed to fetch rollouts", updatedAt: new Date().toISOString() });
  }
});

export default router;
