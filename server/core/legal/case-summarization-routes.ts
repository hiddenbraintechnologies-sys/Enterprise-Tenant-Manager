import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticateJWT, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware, createTenantIsolation } from "../tenant-isolation";
import { requirePermission } from "../context";
import { caseSummarizationService } from "./case-summarization";
import { auditService } from "../audit";

export const caseSummarizationRouter = Router();

const middleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("manager"),
];

const staffMiddleware = [
  authenticateJWT({ required: true }),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

const summarizeRequestSchema = z.object({
  accessReason: z.string().min(1).max(500).optional(),
});

const updateActionItemSchema = z.object({
  itemIndex: z.number().int().min(0),
  status: z.enum(["pending", "in_progress", "completed"]),
});

caseSummarizationRouter.post("/cases/:caseId/summarize", ...middleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { caseId } = req.params;
    const userId = req.context?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    const body = summarizeRequestSchema.parse(req.body || {});

    const result = await caseSummarizationService.summarizeCase(
      tenantId,
      caseId,
      userId,
      body.accessReason
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Case summarization error:", error);
    if (error.message === "Case not found or access denied") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to summarize case", error: error.message });
  }
});

caseSummarizationRouter.get("/cases/:caseId/summaries", ...staffMiddleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { caseId } = req.params;

    const summaries = await caseSummarizationService.getCaseSummaries(tenantId, caseId);

    res.json({
      data: summaries,
      count: summaries.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve summaries", error: error.message });
  }
});

caseSummarizationRouter.get("/summaries/:jobId", ...staffMiddleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { jobId } = req.params;

    const job = await caseSummarizationService.getSummaryJob(tenantId, jobId);

    if (!job) {
      return res.status(404).json({ message: "Summary job not found" });
    }

    await auditService.logAsync({
      tenantId,
      userId: req.context?.user?.id,
      action: "access",
      resource: "case_summary_job",
      resourceId: jobId,
      metadata: { caseId: job.caseId, aiGenerated: job.aiGenerated },
    });

    res.json(job);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to retrieve summary", error: error.message });
  }
});

caseSummarizationRouter.patch("/summaries/:jobId/action-items", ...staffMiddleware, async (req: Request, res: Response) => {
  try {
    const isolation = createTenantIsolation(req);
    const tenantId = isolation.getTenantId();
    const { jobId } = req.params;
    const userId = req.context?.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    const body = updateActionItemSchema.parse(req.body);

    const updated = await caseSummarizationService.updateActionItemStatus(
      tenantId,
      jobId,
      body.itemIndex,
      body.status,
      userId
    );

    if (!updated) {
      return res.status(404).json({ message: "Summary job not found" });
    }

    res.json(updated);
  } catch (error: any) {
    if (error.message === "Invalid action item index") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to update action item", error: error.message });
  }
});
