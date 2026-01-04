import { Router, Request, Response } from "express";
import { aiAuditService } from "../services/ai-audit";
import { authenticateJWT, requireMinimumRole, requirePlatformAdmin } from "../core/auth-middleware";
import { tenantResolutionMiddleware, enforceTenantBoundary, tenantIsolationMiddleware } from "../core/tenant-isolation";
import { z } from "zod";
import type { AiAuditAction } from "@shared/schema";

const router = Router();

const authMiddleware = [
  authenticateJWT({ required: true }),
  tenantResolutionMiddleware(),
  enforceTenantBoundary(),
  tenantIsolationMiddleware(),
];

const adminMiddleware = [
  ...authMiddleware,
  requireMinimumRole("admin"),
];

const logInvocationSchema = z.object({
  featureCode: z.string().min(1),
  action: z.enum(["invoke", "complete", "error", "denied", "rate_limited"]).default("invoke"),
  inputMetadata: z.object({
    inputType: z.string().optional(),
    inputLength: z.number().optional(),
    inputTokenCount: z.number().optional(),
    modelRequested: z.string().optional(),
    contextType: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    requestSource: z.string().optional(),
  }).optional(),
  outputReference: z.object({
    outputType: z.string().optional(),
    outputLength: z.number().optional(),
    outputTokenCount: z.number().optional(),
    modelUsed: z.string().optional(),
    processingTimeMs: z.number().optional(),
    cached: z.boolean().optional(),
    storageKey: z.string().optional(),
  }).optional(),
  errorCode: z.string().optional(),
  errorCategory: z.string().optional(),
  consentRecorded: z.boolean().optional(),
  complianceFlags: z.array(z.string()).optional(),
});

const completeLogSchema = z.object({
  outputReference: z.object({
    outputType: z.string().optional(),
    outputLength: z.number().optional(),
    outputTokenCount: z.number().optional(),
    modelUsed: z.string().optional(),
    processingTimeMs: z.number().optional(),
    cached: z.boolean().optional(),
    storageKey: z.string().optional(),
  }),
  errorCode: z.string().optional(),
  errorCategory: z.string().optional(),
});

router.post("/log", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    const roleId = req.context?.role?.id;
    
    if (!tenantId || !userId) {
      return res.status(403).json({ error: "Authentication required" });
    }

    const parsed = logInvocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
    const userAgent = req.headers["user-agent"];
    const sessionId = req.sessionID;

    const logId = await aiAuditService.logInvocation({
      tenantId,
      userId,
      roleId,
      featureCode: parsed.data.featureCode,
      action: parsed.data.action as AiAuditAction,
      inputMetadata: parsed.data.inputMetadata,
      outputReference: parsed.data.outputReference,
      ipAddress,
      userAgent,
      sessionId,
      errorCode: parsed.data.errorCode,
      errorCategory: parsed.data.errorCategory,
      consentRecorded: parsed.data.consentRecorded,
      complianceFlags: parsed.data.complianceFlags,
    });

    res.json({ logId });
  } catch (error: any) {
    console.error("Error logging AI invocation:", error);
    res.status(500).json({ error: "Failed to log AI invocation" });
  }
});

router.patch("/log/:logId", ...authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { logId } = req.params;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const existingLog = await aiAuditService.getLogById(tenantId, logId);
    if (!existingLog) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    const parsed = completeLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    await aiAuditService.completeLog(
      logId,
      parsed.data.outputReference,
      parsed.data.errorCode,
      parsed.data.errorCategory
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error completing audit log:", error);
    res.status(500).json({ error: "Failed to complete audit log" });
  }
});

router.get("/logs", ...authMiddleware, requireMinimumRole("manager"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const {
      userId,
      featureCode,
      action,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await aiAuditService.queryLogs({
      tenantId,
      userId: userId as string,
      featureCode: featureCode as string,
      action: action as AiAuditAction,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error querying audit logs:", error);
    res.status(500).json({ error: "Failed to query audit logs" });
  }
});

router.get("/logs/:logId", ...authMiddleware, requireMinimumRole("manager"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const { logId } = req.params;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const log = await aiAuditService.getLogById(tenantId, logId);
    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    res.json({ log });
  } catch (error: any) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

router.get("/summary", ...adminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const { startDate, endDate } = req.query;

    const summary = await aiAuditService.getAuditSummary(
      tenantId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(summary);
  } catch (error: any) {
    console.error("Error fetching audit summary:", error);
    res.status(500).json({ error: "Failed to fetch audit summary" });
  }
});

router.get("/export", ...adminMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant context required" });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const exportData = await aiAuditService.exportLogsForCompliance(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(exportData);
  } catch (error: any) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

router.post(
  "/purge-expired",
  authenticateJWT({ required: true }),
  requirePlatformAdmin(),
  async (req: Request, res: Response) => {
    try {
      const purgedCount = await aiAuditService.purgeExpiredLogs();
      res.json({ success: true, purgedCount });
    } catch (error: any) {
      console.error("Error purging expired logs:", error);
      res.status(500).json({ error: "Failed to purge expired logs" });
    }
  }
);

export default router;
