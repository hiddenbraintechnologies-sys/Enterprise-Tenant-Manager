import { db } from "../db";
import { aiFeatures, aiRoleSettings, aiUsageCounters, roles } from "@shared/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export type AiPermissionCheckResult = {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  remainingUsage?: number;
};

export type RoleAiFeatureStatus = {
  featureId: string;
  featureCode: string;
  featureName: string;
  category: string | null;
  isEnabled: boolean;
  usageLimit: number | null;
  resetWindow: string;
  currentUsage: number;
  remainingUsage: number | null;
};

function getPeriodBounds(window: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (window) {
    case "daily":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    case "weekly":
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    case "monthly":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  return { start, end };
}

export class AiPermissionService {
  async getFeatures(): Promise<typeof aiFeatures.$inferSelect[]> {
    return db.select().from(aiFeatures).where(eq(aiFeatures.isActive, true));
  }

  async getFeatureByCode(code: string): Promise<typeof aiFeatures.$inferSelect | null> {
    const [feature] = await db
      .select()
      .from(aiFeatures)
      .where(and(eq(aiFeatures.code, code), eq(aiFeatures.isActive, true)));
    return feature || null;
  }

  async getRoleSettings(tenantId: string, roleId: string): Promise<RoleAiFeatureStatus[]> {
    const features = await this.getFeatures();
    const settings = await db
      .select()
      .from(aiRoleSettings)
      .where(and(eq(aiRoleSettings.tenantId, tenantId), eq(aiRoleSettings.roleId, roleId)));

    const settingsMap = new Map(settings.map((s) => [s.featureId, s]));

    const results: RoleAiFeatureStatus[] = [];

    for (const feature of features) {
      const setting = settingsMap.get(feature.id);
      const resetWindow = setting?.resetWindow || feature.defaultResetWindow || "monthly";
      const usageLimit = setting?.usageLimit ?? feature.defaultUsageLimit;
      const isEnabled = setting?.isEnabled ?? feature.defaultEnabled ?? false;

      const currentUsage = await this.getCurrentUsage(tenantId, roleId, feature.id, resetWindow);

      results.push({
        featureId: feature.id,
        featureCode: feature.code,
        featureName: feature.name,
        category: feature.category,
        isEnabled,
        usageLimit,
        resetWindow,
        currentUsage,
        remainingUsage: usageLimit != null ? Math.max(0, usageLimit - currentUsage) : null,
      });
    }

    return results;
  }

  async checkPermission(
    tenantId: string,
    roleId: string,
    featureCode: string
  ): Promise<AiPermissionCheckResult> {
    const feature = await this.getFeatureByCode(featureCode);
    if (!feature) {
      return { allowed: false, reason: "Feature not found" };
    }

    if (!feature.isActive) {
      return { allowed: false, reason: "Feature is disabled globally" };
    }

    const [setting] = await db
      .select()
      .from(aiRoleSettings)
      .where(
        and(
          eq(aiRoleSettings.tenantId, tenantId),
          eq(aiRoleSettings.roleId, roleId),
          eq(aiRoleSettings.featureId, feature.id)
        )
      );

    const isEnabled = setting?.isEnabled ?? feature.defaultEnabled ?? false;
    if (!isEnabled) {
      return { allowed: false, reason: "Feature not enabled for this role" };
    }

    const usageLimit = setting?.usageLimit ?? feature.defaultUsageLimit;
    const resetWindow = setting?.resetWindow || feature.defaultResetWindow || "monthly";

    if (usageLimit == null) {
      return { allowed: true };
    }

    const currentUsage = await this.getCurrentUsage(tenantId, roleId, feature.id, resetWindow);

    if (currentUsage >= usageLimit) {
      return {
        allowed: false,
        reason: "Usage limit exceeded",
        currentUsage,
        limit: usageLimit,
        remainingUsage: 0,
      };
    }

    return {
      allowed: true,
      currentUsage,
      limit: usageLimit,
      remainingUsage: usageLimit - currentUsage,
    };
  }

  async recordUsage(tenantId: string, roleId: string, featureCode: string): Promise<void> {
    const feature = await this.getFeatureByCode(featureCode);
    if (!feature) return;

    const [setting] = await db
      .select()
      .from(aiRoleSettings)
      .where(
        and(
          eq(aiRoleSettings.tenantId, tenantId),
          eq(aiRoleSettings.roleId, roleId),
          eq(aiRoleSettings.featureId, feature.id)
        )
      );

    const resetWindow = setting?.resetWindow || feature.defaultResetWindow || "monthly";
    const { start, end } = getPeriodBounds(resetWindow);

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(aiUsageCounters)
        .where(
          and(
            eq(aiUsageCounters.tenantId, tenantId),
            eq(aiUsageCounters.roleId, roleId),
            eq(aiUsageCounters.featureId, feature.id),
            eq(aiUsageCounters.periodStart, start)
          )
        );

      if (existing) {
        await tx
          .update(aiUsageCounters)
          .set({
            usageCount: sql`${aiUsageCounters.usageCount} + 1`,
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiUsageCounters.id, existing.id));
      } else {
        await tx.insert(aiUsageCounters).values({
          tenantId,
          roleId,
          featureId: feature.id,
          periodStart: start,
          periodEnd: end,
          usageCount: 1,
          lastUsedAt: new Date(),
        });
      }
    });
  }

  async getCurrentUsage(
    tenantId: string,
    roleId: string,
    featureId: string,
    resetWindow: string
  ): Promise<number> {
    const { start, end } = getPeriodBounds(resetWindow);

    const [counter] = await db
      .select()
      .from(aiUsageCounters)
      .where(
        and(
          eq(aiUsageCounters.tenantId, tenantId),
          eq(aiUsageCounters.roleId, roleId),
          eq(aiUsageCounters.featureId, featureId),
          gte(aiUsageCounters.periodStart, start),
          lte(aiUsageCounters.periodEnd, end)
        )
      );

    return counter?.usageCount ?? 0;
  }

  async updateRoleSetting(
    tenantId: string,
    roleId: string,
    featureId: string,
    updates: { isEnabled?: boolean; usageLimit?: number | null; resetWindow?: "daily" | "weekly" | "monthly" },
    updatedBy?: string
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(aiRoleSettings)
      .where(
        and(
          eq(aiRoleSettings.tenantId, tenantId),
          eq(aiRoleSettings.roleId, roleId),
          eq(aiRoleSettings.featureId, featureId)
        )
      );

    if (existing) {
      const updateData: any = { updatedBy, updatedAt: new Date() };
      if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
      if (updates.usageLimit !== undefined) updateData.usageLimit = updates.usageLimit;
      if (updates.resetWindow !== undefined) updateData.resetWindow = updates.resetWindow;
      
      await db
        .update(aiRoleSettings)
        .set(updateData)
        .where(eq(aiRoleSettings.id, existing.id));
    } else {
      await db.insert(aiRoleSettings).values({
        tenantId,
        roleId,
        featureId,
        isEnabled: updates.isEnabled ?? true,
        usageLimit: updates.usageLimit,
        resetWindow: updates.resetWindow || "monthly",
        updatedBy,
      });
    }
  }

  async resetUsage(tenantId: string, roleId?: string, featureId?: string): Promise<void> {
    let conditions = [eq(aiUsageCounters.tenantId, tenantId)];
    if (roleId) conditions.push(eq(aiUsageCounters.roleId, roleId));
    if (featureId) conditions.push(eq(aiUsageCounters.featureId, featureId));

    await db
      .update(aiUsageCounters)
      .set({ usageCount: 0, updatedAt: new Date() })
      .where(and(...conditions));
  }

  async getUsageStats(
    tenantId: string,
    roleId?: string
  ): Promise<
    {
      roleId: string;
      roleName: string;
      featureId: string;
      featureCode: string;
      featureName: string;
      usageCount: number;
      usageLimit: number | null;
      periodStart: Date;
      periodEnd: Date;
    }[]
  > {
    const results = await db
      .select({
        roleId: aiUsageCounters.roleId,
        roleName: roles.name,
        featureId: aiUsageCounters.featureId,
        featureCode: aiFeatures.code,
        featureName: aiFeatures.name,
        usageCount: aiUsageCounters.usageCount,
        usageLimit: aiRoleSettings.usageLimit,
        periodStart: aiUsageCounters.periodStart,
        periodEnd: aiUsageCounters.periodEnd,
      })
      .from(aiUsageCounters)
      .innerJoin(roles, eq(aiUsageCounters.roleId, roles.id))
      .innerJoin(aiFeatures, eq(aiUsageCounters.featureId, aiFeatures.id))
      .leftJoin(
        aiRoleSettings,
        and(
          eq(aiRoleSettings.tenantId, aiUsageCounters.tenantId),
          eq(aiRoleSettings.roleId, aiUsageCounters.roleId),
          eq(aiRoleSettings.featureId, aiUsageCounters.featureId)
        )
      )
      .where(
        roleId
          ? and(eq(aiUsageCounters.tenantId, tenantId), eq(aiUsageCounters.roleId, roleId))
          : eq(aiUsageCounters.tenantId, tenantId)
      );

    return results.map((r) => ({
      ...r,
      usageCount: r.usageCount ?? 0,
    }));
  }

  async seedDefaultFeatures(): Promise<void> {
    const defaultFeatures = [
      {
        code: "ai_chat",
        name: "AI Chat Assistant",
        description: "Interactive AI-powered chat for customer and staff support",
        category: "communication",
        defaultEnabled: true,
        defaultUsageLimit: 100,
        riskLevel: "low" as const,
      },
      {
        code: "ai_report_generation",
        name: "AI Report Generation",
        description: "Automatically generate business reports and insights",
        category: "analytics",
        defaultEnabled: false,
        defaultUsageLimit: 20,
        riskLevel: "low" as const,
      },
      {
        code: "ai_risk_prediction",
        name: "AI Risk Prediction",
        description: "Predictive analytics for student/customer risk assessment",
        category: "analytics",
        defaultEnabled: false,
        defaultUsageLimit: 50,
        riskLevel: "medium" as const,
        requiredTier: "pro",
      },
      {
        code: "ai_document_analysis",
        name: "AI Document Analysis",
        description: "Analyze and extract information from documents",
        category: "processing",
        defaultEnabled: false,
        defaultUsageLimit: 30,
        riskLevel: "medium" as const,
      },
      {
        code: "ai_appointment_scheduling",
        name: "AI Appointment Scheduling",
        description: "Smart appointment scheduling and optimization",
        category: "automation",
        defaultEnabled: true,
        defaultUsageLimit: 200,
        riskLevel: "low" as const,
      },
      {
        code: "ai_content_generation",
        name: "AI Content Generation",
        description: "Generate marketing content, emails, and notifications",
        category: "content",
        defaultEnabled: false,
        defaultUsageLimit: 50,
        riskLevel: "low" as const,
      },
    ];

    for (const feature of defaultFeatures) {
      const [existing] = await db
        .select()
        .from(aiFeatures)
        .where(eq(aiFeatures.code, feature.code));

      if (!existing) {
        await db.insert(aiFeatures).values(feature);
      }
    }
  }
}

export const aiPermissionService = new AiPermissionService();
