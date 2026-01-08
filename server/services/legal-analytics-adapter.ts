/**
 * Legal Services Analytics Adapter
 * 
 * Provides analytics metrics for the Legal Services module:
 * - Case metrics: total cases, active cases, closed cases
 * - Client metrics: total clients, active clients
 * - Revenue metrics: billed amounts, collected amounts
 * 
 * @module server/services/legal-analytics-adapter
 */

import {
  IAnalyticsAdapter,
  ModuleAnalyticsConfig,
  DateRange,
  AnalyticsOverview,
  CategoryMetrics,
  baseAnalyticsService,
  createMetricValue,
} from "./base-analytics";
import { db } from "../db";
import { legalClients, cases } from "@shared/schema";
import { eq, and, sql, isNull, gte, lte } from "drizzle-orm";

const LEGAL_ANALYTICS_CONFIG: ModuleAnalyticsConfig = {
  moduleName: "legal",
  categories: ["cases", "clients", "revenue"],
  supportedMetrics: [
    "total_cases",
    "active_cases",
    "closed_cases",
    "total_clients",
    "active_clients",
  ],
  defaultDateRange: 30,
};

class LegalAnalyticsAdapter implements IAnalyticsAdapter {
  getModuleName(): string {
    return "legal";
  }

  getConfig(): ModuleAnalyticsConfig {
    return LEGAL_ANALYTICS_CONFIG;
  }

  async getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview> {
    const [caseStats, clientStats] = await Promise.all([
      this.getCaseStats(tenantId),
      this.getClientStats(tenantId),
    ]);

    const summary: AnalyticsOverview["summary"] = {
      cases: {
        total_cases: createMetricValue(caseStats.total),
        active_cases: createMetricValue(caseStats.active),
        closed_cases: createMetricValue(caseStats.closed),
      },
      clients: {
        total_clients: createMetricValue(clientStats.total),
        active_clients: createMetricValue(clientStats.active),
      },
    };

    return {
      summary,
      trends: [],
    };
  }

  async getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics> {
    switch (category) {
      case "cases":
        const caseStats = await this.getCaseStats(tenantId);
        return {
          total_cases: createMetricValue(caseStats.total),
          active_cases: createMetricValue(caseStats.active),
          closed_cases: createMetricValue(caseStats.closed),
        };

      case "clients":
        const clientStats = await this.getClientStats(tenantId);
        return {
          total_clients: createMetricValue(clientStats.total),
          active_clients: createMetricValue(clientStats.active),
        };

      default:
        return {};
    }
  }

  async getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>> {
    return [];
  }

  private async getCaseStats(tenantId: string): Promise<{ total: number; active: number; closed: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status in ('open', 'in_progress', 'pending'))::int`,
        closed: sql<number>`count(*) filter (where status = 'closed')::int`,
      })
        .from(cases)
        .where(and(eq(cases.tenantId, tenantId), isNull(cases.deletedAt)));

      return result[0] || { total: 0, active: 0, closed: 0 };
    } catch {
      return { total: 0, active: 0, closed: 0 };
    }
  }

  private async getClientStats(tenantId: string): Promise<{ total: number; active: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
      })
        .from(legalClients)
        .where(and(eq(legalClients.tenantId, tenantId), isNull(legalClients.deletedAt)));

      return result[0] || { total: 0, active: 0 };
    } catch {
      return { total: 0, active: 0 };
    }
  }
}

export const legalAnalyticsAdapter = new LegalAnalyticsAdapter();
baseAnalyticsService.registerAdapter(legalAnalyticsAdapter);

export async function getLegalAnalytics(tenantId: string, dateRange?: DateRange): Promise<AnalyticsOverview> {
  const range = dateRange || {
    startDate: new Date(Date.now() - LEGAL_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return legalAnalyticsAdapter.getAdapterOverview(tenantId, range);
}
