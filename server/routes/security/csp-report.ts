import { Router } from "express";
import { db } from "../../db";
import { cspReports } from "@shared/schema";
import { desc } from "drizzle-orm";
import { authenticateJWT } from "../../core/auth-middleware";

const router = Router();

router.post("/csp-report", async (req, res) => {
  try {
    const report = req.body?.["csp-report"] || req.body;
    
    if (!report) {
      return res.status(400).json({ error: "No CSP report in request body" });
    }

    await db.insert(cspReports).values({
      documentUri: report["document-uri"] || null,
      blockedUri: report["blocked-uri"] || null,
      violatedDirective: report["violated-directive"] || null,
      effectiveDirective: report["effective-directive"] || null,
      originalPolicy: report["original-policy"] || null,
      disposition: report.disposition || null,
      referrer: report.referrer || null,
      sourceFile: report["source-file"] || null,
      lineNumber: report["line-number"] || null,
      columnNumber: report["column-number"] || null,
    });

    return res.status(204).send();
  } catch (error) {
    console.error("CSP report error:", error);
    return res.status(500).json({ error: "Failed to store CSP report" });
  }
});

router.get("/csp-reports", authenticateJWT(), async (req: any, res) => {
  try {
    const permissions: string[] = req.context?.permissions || req.permissions || [];
    if (!permissions.includes("SECURITY_AUDIT_VIEW") && !permissions.includes("PLATFORM_SUPER_ADMIN")) {
      return res.status(403).json({ error: "FORBIDDEN", message: "SECURITY_AUDIT_VIEW permission required" });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const reports = await db
      .select()
      .from(cspReports)
      .orderBy(desc(cspReports.createdAt))
      .limit(limit);

    return res.json({ reports, count: reports.length });
  } catch (error) {
    console.error("Fetch CSP reports error:", error);
    return res.status(500).json({ error: "Failed to fetch CSP reports" });
  }
});

export default router;
