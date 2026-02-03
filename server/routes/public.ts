import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { waitlist, insertWaitlistSchema, countryRolloutPolicy, tenantStaffInvites, tenantStaff, tenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

// ==================== STAFF INVITE ENDPOINTS ====================

router.get("/invites/:token/lookup", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);

    const invite = await storage.getStaffInviteByToken(tokenHash);
    if (!invite) {
      return res.status(404).json({ error: "Invite not found or expired" });
    }

    // Check if expired
    if (new Date() > invite.expiresAt) {
      await storage.updateStaffInvite(invite.id, { status: "expired" });
      return res.status(410).json({ error: "Invite has expired" });
    }

    // Check if already accepted or revoked
    if (invite.status === "accepted") {
      return res.status(410).json({ error: "Invite has already been accepted" });
    }
    if (invite.status === "revoked") {
      return res.status(410).json({ error: "Invite has been revoked" });
    }
    if (invite.status === "expired") {
      return res.status(410).json({ error: "Invite has expired" });
    }

    // Get tenant info
    const [tenant] = await db.select({
      id: tenants.id,
      name: tenants.name,
    }).from(tenants).where(eq(tenants.id, invite.tenantId));

    // Mask email for security (e.g., "doctor@clinic.com" -> "do***@clinic.com")
    const maskEmail = (email: string): string => {
      const [local, domain] = email.split("@");
      if (!domain) return "***";
      const maskedLocal = local.length <= 2 
        ? local[0] + "***" 
        : local.substring(0, 2) + "***";
      return `${maskedLocal}@${domain}`;
    };

    return res.json({
      email: maskEmail(invite.email),
      tenantName: tenant?.name || "Unknown",
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("[public/invites] Lookup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites/:token/accept", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenHash = hashToken(token);

    // User must be authenticated
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ 
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    const invite = await storage.getStaffInviteByToken(tokenHash);
    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Validate invite status
    if (new Date() > invite.expiresAt) {
      await storage.updateStaffInvite(invite.id, { status: "expired" });
      return res.status(410).json({ error: "Invite has expired" });
    }
    if (invite.status !== "pending") {
      return res.status(410).json({ error: `Invite is ${invite.status}` });
    }

    // Validate email match
    const userEmail = user.email?.toLowerCase();
    const inviteEmail = invite.email?.toLowerCase();
    if (userEmail !== inviteEmail) {
      return res.status(403).json({ 
        error: "Email mismatch. Please sign in with the invited email address.",
        code: "EMAIL_MISMATCH"
      });
    }

    // Get staff record
    const staffMember = await storage.getTenantStaffMember(invite.staffId, invite.tenantId);
    if (!staffMember) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    // Update invite to accepted
    await storage.updateStaffInvite(invite.id, {
      status: "accepted",
      acceptedAt: new Date(),
    });

    // Link user to staff and activate
    await storage.updateTenantStaff(staffMember.id, invite.tenantId, {
      userId: user.id,
      status: "active",
    });

    // Get tenant info
    const [tenant] = await db.select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
    }).from(tenants).where(eq(tenants.id, invite.tenantId));

    return res.json({
      success: true,
      message: "Invite accepted successfully",
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        slug: tenant?.slug,
      },
    });
  } catch (error) {
    console.error("[public/invites] Accept error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
