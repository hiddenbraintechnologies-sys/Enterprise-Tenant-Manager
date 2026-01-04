import { db } from "../db";
import {
  tenantAiSettings,
  aiUsageLogs,
  studentRiskPredictions,
  students,
  type TenantAiSettings,
  type AiUsageLog,
  type StudentRiskPrediction,
  type InsertAiUsageLog,
  type InsertStudentRiskPrediction,
} from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import OpenAI from "openai";

type RiskTier = "low" | "medium" | "high";
type AiProvider = "openai" | "anthropic" | "local" | "custom";

interface StudentMetrics {
  attendancePercentage: number;
  feeDelayDays: number;
  averageExamScore: number;
  engagementScore: number;
}

interface RiskFactorScores {
  attendance: number;
  fee: number;
  exam: number;
  engagement: number;
}

interface RiskPredictionResult {
  riskTier: RiskTier;
  overallScore: number;
  factorScores: RiskFactorScores;
  factorWeights: Record<string, number>;
  explanation: string;
  suggestedActions: string[];
  aiGenerated: boolean;
  aiProvider?: AiProvider;
  aiModel?: string;
  usageLogId?: string;
}

const DEFAULT_FACTOR_WEIGHTS = {
  attendance: 0.30,
  fee: 0.20,
  exam: 0.35,
  engagement: 0.15,
};

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

class AiService {
  private rateLimitCache: Map<string, { count: number; resetAt: number }> = new Map();

  async getTenantAiSettings(tenantId: string): Promise<TenantAiSettings | null> {
    const [settings] = await db
      .select()
      .from(tenantAiSettings)
      .where(eq(tenantAiSettings.tenantId, tenantId))
      .limit(1);
    return settings || null;
  }

  async ensureTenantAiSettings(tenantId: string): Promise<TenantAiSettings> {
    let settings = await this.getTenantAiSettings(tenantId);
    if (!settings) {
      const [created] = await db
        .insert(tenantAiSettings)
        .values({ tenantId })
        .returning();
      settings = created;
    }
    return settings;
  }

  async updateTenantAiSettings(
    tenantId: string,
    updates: Partial<{
      aiEnabled: boolean;
      consentGiven: boolean;
      consentGivenBy: string;
      preferredProvider: AiProvider;
      monthlyTokenLimit: number;
      rateLimitPerMinute: number;
      rateLimitPerHour: number;
      allowedFeatures: string[];
    }>
  ): Promise<TenantAiSettings> {
    const now = new Date();
    const [updated] = await db
      .update(tenantAiSettings)
      .set({
        ...updates,
        consentGivenAt: updates.consentGiven ? now : undefined,
        consentVersion: updates.consentGiven ? "1.0" : undefined,
        updatedAt: now,
      })
      .where(eq(tenantAiSettings.tenantId, tenantId))
      .returning();
    return updated;
  }

  async checkAiConsent(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await this.getTenantAiSettings(tenantId);
    
    if (!settings) {
      return { allowed: false, reason: "AI settings not configured" };
    }
    
    if (!settings.aiEnabled) {
      return { allowed: false, reason: "AI features are disabled for this tenant" };
    }
    
    if (!settings.consentGiven) {
      return { allowed: false, reason: "Explicit AI consent not provided" };
    }
    
    return { allowed: true };
  }

  async checkFeatureAllowed(tenantId: string, feature: string): Promise<boolean> {
    const settings = await this.getTenantAiSettings(tenantId);
    if (!settings || !settings.aiEnabled || !settings.consentGiven) {
      return false;
    }
    const allowedFeatures = settings.allowedFeatures as string[] || [];
    return allowedFeatures.length === 0 || allowedFeatures.includes(feature);
  }

  async checkRateLimit(tenantId: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const settings = await this.getTenantAiSettings(tenantId);
    if (!settings) {
      return { allowed: false };
    }

    const now = Date.now();
    const cacheKey = `rate:${tenantId}`;
    const cached = this.rateLimitCache.get(cacheKey);

    if (cached && now < cached.resetAt) {
      if (cached.count >= (settings.rateLimitPerMinute || 10)) {
        return { allowed: false, retryAfterMs: cached.resetAt - now };
      }
      cached.count++;
    } else {
      this.rateLimitCache.set(cacheKey, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
    }

    return { allowed: true };
  }

  async checkTokenQuota(tenantId: string, estimatedTokens: number): Promise<boolean> {
    const settings = await this.getTenantAiSettings(tenantId);
    if (!settings) return false;
    
    const used = settings.tokensUsedThisMonth || 0;
    const limit = settings.monthlyTokenLimit || 100000;
    
    return (used + estimatedTokens) <= limit;
  }

  async logUsage(data: InsertAiUsageLog): Promise<AiUsageLog> {
    const [log] = await db.insert(aiUsageLogs).values(data).returning();
    
    if (data.totalTokens && data.totalTokens > 0) {
      await db
        .update(tenantAiSettings)
        .set({
          tokensUsedThisMonth: sql`${tenantAiSettings.tokensUsedThisMonth} + ${data.totalTokens}`,
          updatedAt: new Date(),
        })
        .where(eq(tenantAiSettings.tenantId, data.tenantId));
    }
    
    return log;
  }

  calculateRiskFactorScores(metrics: StudentMetrics): RiskFactorScores {
    const attendanceRisk = Math.max(0, Math.min(1, (100 - metrics.attendancePercentage) / 100));
    const feeRisk = Math.max(0, Math.min(1, metrics.feeDelayDays / 90));
    const examRisk = Math.max(0, Math.min(1, (100 - metrics.averageExamScore) / 100));
    const engagementRisk = Math.max(0, Math.min(1, (100 - metrics.engagementScore) / 100));

    return {
      attendance: Number(attendanceRisk.toFixed(3)),
      fee: Number(feeRisk.toFixed(3)),
      exam: Number(examRisk.toFixed(3)),
      engagement: Number(engagementRisk.toFixed(3)),
    };
  }

  calculateOverallRisk(
    factorScores: RiskFactorScores,
    weights: Record<string, number> = DEFAULT_FACTOR_WEIGHTS
  ): number {
    const score =
      factorScores.attendance * weights.attendance +
      factorScores.fee * weights.fee +
      factorScores.exam * weights.exam +
      factorScores.engagement * weights.engagement;
    return Number(score.toFixed(3));
  }

  determineRiskTier(overallScore: number): RiskTier {
    if (overallScore < 0.33) return "low";
    if (overallScore < 0.66) return "medium";
    return "high";
  }

  generateDeterministicExplanation(
    metrics: StudentMetrics,
    factorScores: RiskFactorScores,
    riskTier: RiskTier
  ): string {
    const concerns: string[] = [];
    
    if (factorScores.attendance > 0.3) {
      concerns.push(`attendance is at ${metrics.attendancePercentage}%`);
    }
    if (factorScores.fee > 0.3) {
      concerns.push(`fee payments are delayed by ${metrics.feeDelayDays} days`);
    }
    if (factorScores.exam > 0.3) {
      concerns.push(`exam average is ${metrics.averageExamScore}%`);
    }
    if (factorScores.engagement > 0.3) {
      concerns.push(`engagement score is ${metrics.engagementScore}%`);
    }

    if (concerns.length === 0) {
      return `Student is performing well across all tracked metrics. Risk level: ${riskTier.toUpperCase()}.`;
    }

    return `Student shows ${riskTier} risk level. Key concerns: ${concerns.join(", ")}. This assessment is advisory only and should be reviewed by academic staff.`;
  }

  generateDeterministicActions(
    factorScores: RiskFactorScores,
    riskTier: RiskTier
  ): string[] {
    const actions: string[] = [];

    if (riskTier === "low") {
      actions.push("Continue monitoring student progress");
      return actions;
    }

    if (factorScores.attendance > 0.3) {
      actions.push("Schedule meeting with student to discuss attendance");
      actions.push("Contact parents/guardians about attendance concerns");
    }
    if (factorScores.fee > 0.3) {
      actions.push("Review payment plan options with finance team");
      actions.push("Send fee reminder notification");
    }
    if (factorScores.exam > 0.3) {
      actions.push("Assign additional tutoring support");
      actions.push("Schedule academic counseling session");
    }
    if (factorScores.engagement > 0.3) {
      actions.push("Involve student in extracurricular activities");
      actions.push("Connect with student mentor program");
    }

    if (riskTier === "high") {
      actions.push("Escalate to academic coordinator for immediate intervention");
    }

    return actions;
  }

  async generateAiEnhancedExplanation(
    metrics: StudentMetrics,
    factorScores: RiskFactorScores,
    riskTier: RiskTier,
    tenantId: string
  ): Promise<{ explanation: string; actions: string[]; usage: Partial<InsertAiUsageLog> } | null> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `You are an educational advisor. Based on the following student metrics, provide:
1. A brief, empathetic explanation of the risk assessment (2-3 sentences)
2. 3-5 specific, actionable suggestions for intervention

Student Metrics:
- Attendance: ${metrics.attendancePercentage}%
- Fee delay: ${metrics.feeDelayDays} days
- Exam average: ${metrics.averageExamScore}%
- Engagement score: ${metrics.engagementScore}%

Risk Level: ${riskTier.toUpperCase()}
Factor Scores (0-1, higher = more risk):
- Attendance risk: ${factorScores.attendance}
- Fee risk: ${factorScores.fee}
- Exam risk: ${factorScores.exam}
- Engagement risk: ${factorScores.engagement}

IMPORTANT: This is advisory only. Do not suggest automated actions. All suggestions should involve human review and intervention.

Respond in JSON format:
{
  "explanation": "...",
  "suggestedActions": ["action1", "action2", ...]
}`;

      const startTime = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      });
      const latencyMs = Date.now() - startTime;

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        explanation: parsed.explanation || this.generateDeterministicExplanation(metrics, factorScores, riskTier),
        actions: parsed.suggestedActions || this.generateDeterministicActions(factorScores, riskTier),
        usage: {
          tenantId,
          provider: "openai",
          model: "gpt-4o-mini",
          feature: "student_risk",
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          latencyMs,
          success: true,
        },
      };
    } catch (error: any) {
      console.error("AI explanation generation failed:", error.message);
      return null;
    }
  }

  async predictStudentRisk(
    tenantId: string,
    studentId: string,
    metrics: StudentMetrics,
    userId?: string,
    useAi: boolean = true
  ): Promise<RiskPredictionResult> {
    const factorScores = this.calculateRiskFactorScores(metrics);
    const overallScore = this.calculateOverallRisk(factorScores);
    const riskTier = this.determineRiskTier(overallScore);

    let explanation = this.generateDeterministicExplanation(metrics, factorScores, riskTier);
    let suggestedActions = this.generateDeterministicActions(factorScores, riskTier);
    let aiGenerated = false;
    let aiProvider: AiProvider | undefined;
    let aiModel: string | undefined;
    let usageLogId: string | undefined;

    if (useAi) {
      const consentCheck = await this.checkAiConsent(tenantId);
      if (!consentCheck.allowed) {
        console.log(`AI skipped for tenant ${tenantId}: ${consentCheck.reason}`);
      } else {
        const featureAllowed = await this.checkFeatureAllowed(tenantId, "student_risk");
        if (!featureAllowed) {
          console.log(`AI feature 'student_risk' not allowed for tenant ${tenantId}`);
        } else {
          const rateCheck = await this.checkRateLimit(tenantId);
          if (!rateCheck.allowed) {
            console.log(`Rate limit exceeded for tenant ${tenantId}, retry after ${rateCheck.retryAfterMs}ms`);
          } else {
            const estimatedTokens = 600;
            const tokenQuotaOk = await this.checkTokenQuota(tenantId, estimatedTokens);
            if (!tokenQuotaOk) {
              console.log(`Token quota exceeded for tenant ${tenantId}`);
              await this.logUsage({
                tenantId,
                userId,
                provider: "openai",
                model: "gpt-4o-mini",
                feature: "student_risk",
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                success: false,
                errorMessage: "Token quota exceeded",
              });
            } else {
              const aiResult = await this.generateAiEnhancedExplanation(
                metrics,
                factorScores,
                riskTier,
                tenantId
              );

              if (aiResult) {
                explanation = aiResult.explanation;
                suggestedActions = aiResult.actions;
                aiGenerated = true;
                aiProvider = "openai";
                aiModel = "gpt-4o-mini";

                const log = await this.logUsage({
                  ...aiResult.usage,
                  tenantId,
                  userId,
                  provider: "openai",
                  model: "gpt-4o-mini",
                  feature: "student_risk",
                } as InsertAiUsageLog);
                usageLogId = log.id;
              } else {
                await this.logUsage({
                  tenantId,
                  userId,
                  provider: "openai",
                  model: "gpt-4o-mini",
                  feature: "student_risk",
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  success: false,
                  errorMessage: "AI generation failed",
                });
              }
            }
          }
        }
      }
    }

    return {
      riskTier,
      overallScore,
      factorScores,
      factorWeights: DEFAULT_FACTOR_WEIGHTS,
      explanation,
      suggestedActions,
      aiGenerated,
      aiProvider,
      aiModel,
      usageLogId,
    };
  }

  async saveStudentRiskPrediction(
    tenantId: string,
    studentId: string,
    metrics: StudentMetrics,
    result: RiskPredictionResult
  ): Promise<StudentRiskPrediction> {
    const settings = await this.getTenantAiSettings(tenantId);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const [prediction] = await db
      .insert(studentRiskPredictions)
      .values({
        tenantId,
        studentId,
        attendancePercentage: String(metrics.attendancePercentage),
        feeDelayDays: metrics.feeDelayDays,
        averageExamScore: String(metrics.averageExamScore),
        engagementScore: String(metrics.engagementScore),
        attendanceRiskScore: String(result.factorScores.attendance),
        feeRiskScore: String(result.factorScores.fee),
        examRiskScore: String(result.factorScores.exam),
        engagementRiskScore: String(result.factorScores.engagement),
        overallRiskScore: String(result.overallScore),
        riskTier: result.riskTier,
        factorWeights: result.factorWeights,
        explanation: result.explanation,
        suggestedActions: result.suggestedActions,
        aiGenerated: result.aiGenerated,
        aiProvider: result.aiProvider,
        aiModel: result.aiModel,
        aiUsageLogId: result.usageLogId,
        consentVersion: settings?.consentVersion || "1.0",
        isAdvisoryOnly: true,
        validUntil,
      })
      .returning();

    return prediction;
  }

  async getStudentRiskHistory(
    tenantId: string,
    studentId: string,
    limit: number = 10
  ): Promise<StudentRiskPrediction[]> {
    return db
      .select()
      .from(studentRiskPredictions)
      .where(
        and(
          eq(studentRiskPredictions.tenantId, tenantId),
          eq(studentRiskPredictions.studentId, studentId)
        )
      )
      .orderBy(desc(studentRiskPredictions.predictedAt))
      .limit(limit);
  }

  async getLatestPrediction(
    tenantId: string,
    studentId: string
  ): Promise<StudentRiskPrediction | null> {
    const [prediction] = await db
      .select()
      .from(studentRiskPredictions)
      .where(
        and(
          eq(studentRiskPredictions.tenantId, tenantId),
          eq(studentRiskPredictions.studentId, studentId),
          gte(studentRiskPredictions.validUntil, new Date())
        )
      )
      .orderBy(desc(studentRiskPredictions.predictedAt))
      .limit(1);
    return prediction || null;
  }

  async getAiUsageStats(
    tenantId: string,
    startDate?: Date
  ): Promise<{ totalTokens: number; totalRequests: number; totalCost: number }> {
    const conditions = [eq(aiUsageLogs.tenantId, tenantId)];
    if (startDate) {
      conditions.push(gte(aiUsageLogs.createdAt, startDate));
    }

    const [result] = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)::int`,
        totalRequests: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.estimatedCost}::numeric), 0)::numeric`,
      })
      .from(aiUsageLogs)
      .where(and(...conditions));

    return {
      totalTokens: result?.totalTokens || 0,
      totalRequests: result?.totalRequests || 0,
      totalCost: Number(result?.totalCost || 0),
    };
  }
}

export const aiService = new AiService();
