import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { students, attendance, fees, examResults, exams } from "@shared/schema";
import { eq, and, isNull, sql, gte } from "drizzle-orm";
import { z } from "zod";
import { authenticateHybrid, requireMinimumRole } from "../auth-middleware";
import { tenantIsolationMiddleware } from "../tenant-isolation";
import { aiService } from "../ai-service";
import { auditService } from "../audit";

export const riskPredictionsRouter = Router();

const middleware = [
  authenticateHybrid(),
  tenantIsolationMiddleware(),
  requireMinimumRole("staff"),
];

const predictRequestSchema = z.object({
  overrideMetrics: z.object({
    attendancePercentage: z.number().min(0).max(100).optional(),
    feeDelayDays: z.number().min(0).optional(),
    averageExamScore: z.number().min(0).max(100).optional(),
    engagementScore: z.number().min(0).max(100).optional(),
  }).optional(),
  useAi: z.boolean().default(true),
});

async function calculateStudentMetrics(tenantId: string, studentId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [attendanceResult] = await db
    .select({
      totalDays: sql<number>`COUNT(*)::int`,
      presentDays: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        eq(attendance.studentId, studentId),
        gte(attendance.date, thirtyDaysAgo.toISOString().split("T")[0])
      )
    );

  const attendancePercentage = attendanceResult?.totalDays > 0
    ? (attendanceResult.presentDays / attendanceResult.totalDays) * 100
    : 100;

  const [feeResult] = await db
    .select({
      maxDelayDays: sql<number>`COALESCE(MAX(EXTRACT(DAY FROM NOW() - ${fees.dueDate})), 0)::int`,
    })
    .from(fees)
    .where(
      and(
        eq(fees.tenantId, tenantId),
        eq(fees.studentId, studentId),
        eq(fees.status, "pending")
      )
    );

  const feeDelayDays = Math.max(0, feeResult?.maxDelayDays || 0);

  const [examResult] = await db
    .select({
      avgScore: sql<number>`COALESCE(AVG(${examResults.percentage}::numeric), 75)::numeric`,
    })
    .from(examResults)
    .where(
      and(
        eq(examResults.tenantId, tenantId),
        eq(examResults.studentId, studentId)
      )
    );

  const averageExamScore = Number(examResult?.avgScore || 75);

  const engagementScore = Math.min(100, attendancePercentage * 0.5 + averageExamScore * 0.5);

  return {
    attendancePercentage: Number(attendancePercentage.toFixed(2)),
    feeDelayDays,
    averageExamScore: Number(averageExamScore.toFixed(2)),
    engagementScore: Number(engagementScore.toFixed(2)),
  };
}

riskPredictionsRouter.post("/:studentId/risk-predictions", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    const userId = req.context?.user?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const { studentId } = req.params;
    const body = predictRequestSchema.parse(req.body || {});

    const [student] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.tenantId, tenantId),
          isNull(students.deletedAt)
        )
      )
      .limit(1);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let metrics = await calculateStudentMetrics(tenantId, studentId);

    if (body.overrideMetrics) {
      metrics = { ...metrics, ...body.overrideMetrics };
    }

    const result = await aiService.predictStudentRisk(
      tenantId,
      studentId,
      metrics,
      userId,
      body.useAi
    );

    const prediction = await aiService.saveStudentRiskPrediction(
      tenantId,
      studentId,
      metrics,
      result
    );

    await auditService.log({
      tenantId,
      userId,
      action: "create",
      resource: "student_risk_prediction",
      resourceId: prediction.id,
      metadata: {
        studentId,
        riskTier: result.riskTier,
        aiGenerated: result.aiGenerated,
        isAdvisoryOnly: true,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      prediction: {
        id: prediction.id,
        studentId,
        riskTier: result.riskTier,
        overallScore: result.overallScore,
        factors: result.factorScores,
        factorWeights: result.factorWeights,
        explanation: result.explanation,
        suggestedActions: result.suggestedActions,
        metrics,
        aiGenerated: result.aiGenerated,
        isAdvisoryOnly: true,
        predictedAt: prediction.predictedAt,
        validUntil: prediction.validUntil,
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

function shouldMaskAiContent(
  predictionAiGenerated: boolean,
  predictionConsentVersion: string | null,
  currentConsentAllowed: boolean,
  currentConsentVersion: string | undefined
): boolean {
  if (!predictionAiGenerated) return false;
  if (!currentConsentAllowed) return true;
  
  const predVersion = predictionConsentVersion || "1.0";
  const currVersion = currentConsentVersion || "1.0";
  
  const predMajor = parseInt(predVersion.split(".")[0] || "1");
  const currMajor = parseInt(currVersion.split(".")[0] || "1");
  
  return currMajor > predMajor;
}

riskPredictionsRouter.get("/:studentId/risk-predictions", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const { studentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const predictions = await aiService.getStudentRiskHistory(tenantId, studentId, limit);
    const consentCheck = await aiService.checkAiConsent(tenantId);

    res.json({
      data: predictions.map(p => {
        const shouldMask = shouldMaskAiContent(
          p.aiGenerated || false,
          p.consentVersion,
          consentCheck.allowed,
          consentCheck.consentVersion
        );
        return {
          id: p.id,
          riskTier: p.riskTier,
          overallScore: p.overallRiskScore,
          factors: {
            attendance: p.attendanceRiskScore,
            fee: p.feeRiskScore,
            exam: p.examRiskScore,
            engagement: p.engagementRiskScore,
          },
          explanation: shouldMask ? "[AI content hidden - consent required]" : p.explanation,
          suggestedActions: shouldMask ? [] : p.suggestedActions,
          aiGenerated: shouldMask ? false : p.aiGenerated,
          aiContentMasked: shouldMask,
          isAdvisoryOnly: p.isAdvisoryOnly,
          predictedAt: p.predictedAt,
          validUntil: p.validUntil,
        };
      }),
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

riskPredictionsRouter.get("/:studentId/risk-predictions/latest", ...middleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ message: "Tenant context required" });
    }

    const { studentId } = req.params;

    const prediction = await aiService.getLatestPrediction(tenantId, studentId);

    if (!prediction) {
      return res.status(404).json({ message: "No valid prediction found. Generate a new one." });
    }

    const consentCheck = await aiService.checkAiConsent(tenantId);
    const shouldMask = shouldMaskAiContent(
      prediction.aiGenerated || false,
      prediction.consentVersion,
      consentCheck.allowed,
      consentCheck.consentVersion
    );

    res.json({
      prediction: {
        id: prediction.id,
        riskTier: prediction.riskTier,
        overallScore: prediction.overallRiskScore,
        factors: {
          attendance: prediction.attendanceRiskScore,
          fee: prediction.feeRiskScore,
          exam: prediction.examRiskScore,
          engagement: prediction.engagementRiskScore,
        },
        explanation: shouldMask ? "[AI content hidden - consent required]" : prediction.explanation,
        suggestedActions: shouldMask ? [] : prediction.suggestedActions,
        aiGenerated: shouldMask ? false : prediction.aiGenerated,
        aiContentMasked: shouldMask,
        isAdvisoryOnly: prediction.isAdvisoryOnly,
        predictedAt: prediction.predictedAt,
        validUntil: prediction.validUntil,
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});
