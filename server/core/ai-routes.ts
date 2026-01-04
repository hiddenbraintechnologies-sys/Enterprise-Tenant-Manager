import { Router, type Request, type Response } from "express";
import { aiService } from "./ai-service";
import { authenticateJWT, requireMinimumRole } from "./auth-middleware";
import { tenantIsolationMiddleware } from "./tenant-isolation";
import { z } from "zod";

export const aiRouter = Router();

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("admin"),
];

const updateSettingsSchema = z.object({
  aiEnabled: z.boolean().optional(),
  consentGiven: z.boolean().optional(),
  preferredProvider: z.enum(["openai", "anthropic", "local", "custom"]).optional(),
  monthlyTokenLimit: z.number().min(0).optional(),
  rateLimitPerMinute: z.number().min(1).max(100).optional(),
  rateLimitPerHour: z.number().min(1).max(1000).optional(),
  allowedFeatures: z.array(z.string()).optional(),
});

aiRouter.get("/settings", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const settings = await aiService.ensureTenantAiSettings(tenantId);

    res.json({
      settings: {
        aiEnabled: settings.aiEnabled,
        consentGiven: settings.consentGiven,
        consentGivenAt: settings.consentGivenAt,
        consentVersion: settings.consentVersion,
        preferredProvider: settings.preferredProvider,
        monthlyTokenLimit: settings.monthlyTokenLimit,
        tokensUsedThisMonth: settings.tokensUsedThisMonth,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        rateLimitPerHour: settings.rateLimitPerHour,
        allowedFeatures: settings.allowedFeatures,
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

aiRouter.patch("/settings", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    await aiService.ensureTenantAiSettings(tenantId);
    
    const body = updateSettingsSchema.parse(req.body);

    let settings;
    if (body.consentGiven !== undefined) {
      if (body.consentGiven) {
        settings = await aiService.grantConsent(tenantId, userId || "system");
      } else {
        settings = await aiService.revokeConsent(tenantId);
      }
      
      const { consentGiven, aiEnabled, ...otherUpdates } = body;
      if (Object.keys(otherUpdates).length > 0) {
        settings = await aiService.updateTenantAiSettings(tenantId, otherUpdates);
      }
    } else {
      settings = await aiService.updateTenantAiSettings(tenantId, body);
    }

    res.json({
      settings: {
        aiEnabled: settings.aiEnabled,
        consentGiven: settings.consentGiven,
        consentGivenAt: settings.consentGivenAt,
        consentVersion: settings.consentVersion,
        preferredProvider: settings.preferredProvider,
        monthlyTokenLimit: settings.monthlyTokenLimit,
        tokensUsedThisMonth: settings.tokensUsedThisMonth,
        rateLimitPerMinute: settings.rateLimitPerMinute,
        rateLimitPerHour: settings.rateLimitPerHour,
        allowedFeatures: settings.allowedFeatures,
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

aiRouter.post("/consent", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const settings = await aiService.grantConsent(tenantId, userId || "system");

    res.json({
      message: "AI consent granted successfully",
      consentGivenAt: settings.consentGivenAt,
      consentVersion: settings.consentVersion,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

aiRouter.delete("/consent", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const settings = await aiService.revokeConsent(tenantId);

    res.json({ 
      message: "AI consent revoked successfully",
      consentVersion: settings.consentVersion,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

aiRouter.get("/usage", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = await aiService.getAiUsageStats(tenantId, startOfMonth);
    const settings = await aiService.getTenantAiSettings(tenantId);

    res.json({
      usage: {
        period: "current_month",
        totalTokens: stats.totalTokens,
        totalRequests: stats.totalRequests,
        estimatedCost: stats.totalCost,
        tokenLimit: settings?.monthlyTokenLimit || 100000,
        tokensRemaining: Math.max(0, (settings?.monthlyTokenLimit || 100000) - stats.totalTokens),
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

aiRouter.get("/check-consent", authenticateJWT({ required: true }), tenantIsolationMiddleware(), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const result = await aiService.checkAiConsent(tenantId);

    res.json({
      allowed: result.allowed,
      reason: result.reason,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
