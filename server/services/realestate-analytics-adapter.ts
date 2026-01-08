/**
 * Real Estate Analytics Adapter
 * 
 * Provides analytics metrics for the Real Estate module:
 * - Property metrics: total properties, available, sold
 * - Lead metrics: total leads, converted leads
 * - Agent metrics: total agents, active agents
 * 
 * @module server/services/realestate-analytics-adapter
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
import { realEstateProperties, realEstateLeads, realEstateAgents } from "@shared/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

const REALESTATE_ANALYTICS_CONFIG: ModuleAnalyticsConfig = {
  moduleName: "real_estate",
  categories: ["properties", "leads", "agents"],
  supportedMetrics: [
    "total_properties",
    "available_properties",
    "sold_properties",
    "total_leads",
    "converted_leads",
    "total_agents",
  ],
  defaultDateRange: 30,
};

class RealEstateAnalyticsAdapter implements IAnalyticsAdapter {
  getModuleName(): string {
    return "real_estate";
  }

  getConfig(): ModuleAnalyticsConfig {
    return REALESTATE_ANALYTICS_CONFIG;
  }

  async getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview> {
    const [propertyStats, leadStats, agentStats] = await Promise.all([
      this.getPropertyStats(tenantId),
      this.getLeadStats(tenantId),
      this.getAgentStats(tenantId),
    ]);

    const summary: AnalyticsOverview["summary"] = {
      properties: {
        total_properties: createMetricValue(propertyStats.total),
        available_properties: createMetricValue(propertyStats.available),
        sold_properties: createMetricValue(propertyStats.sold),
      },
      leads: {
        total_leads: createMetricValue(leadStats.total),
        converted_leads: createMetricValue(leadStats.converted),
      },
      agents: {
        total_agents: createMetricValue(agentStats.total),
      },
    };

    return {
      summary,
      trends: [],
    };
  }

  async getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics> {
    switch (category) {
      case "properties":
        const propertyStats = await this.getPropertyStats(tenantId);
        return {
          total_properties: createMetricValue(propertyStats.total),
          available_properties: createMetricValue(propertyStats.available),
          sold_properties: createMetricValue(propertyStats.sold),
        };

      case "leads":
        const leadStats = await this.getLeadStats(tenantId);
        return {
          total_leads: createMetricValue(leadStats.total),
          converted_leads: createMetricValue(leadStats.converted),
        };

      case "agents":
        const agentStats = await this.getAgentStats(tenantId);
        return {
          total_agents: createMetricValue(agentStats.total),
        };

      default:
        return {};
    }
  }

  async getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>> {
    return [];
  }

  private async getPropertyStats(tenantId: string): Promise<{ total: number; available: number; sold: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        available: sql<number>`count(*) filter (where status = 'available')::int`,
        sold: sql<number>`count(*) filter (where status = 'sold')::int`,
      })
        .from(realEstateProperties)
        .where(and(eq(realEstateProperties.tenantId, tenantId), isNull(realEstateProperties.deletedAt)));

      return result[0] || { total: 0, available: 0, sold: 0 };
    } catch {
      return { total: 0, available: 0, sold: 0 };
    }
  }

  private async getLeadStats(tenantId: string): Promise<{ total: number; converted: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        converted: sql<number>`count(*) filter (where status = 'converted')::int`,
      })
        .from(realEstateLeads)
        .where(and(eq(realEstateLeads.tenantId, tenantId), isNull(realEstateLeads.deletedAt)));

      return result[0] || { total: 0, converted: 0 };
    } catch {
      return { total: 0, converted: 0 };
    }
  }

  private async getAgentStats(tenantId: string): Promise<{ total: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
      })
        .from(realEstateAgents)
        .where(and(eq(realEstateAgents.tenantId, tenantId), isNull(realEstateAgents.deletedAt)));

      return result[0] || { total: 0 };
    } catch {
      return { total: 0 };
    }
  }
}

export const realEstateAnalyticsAdapter = new RealEstateAnalyticsAdapter();
baseAnalyticsService.registerAdapter(realEstateAnalyticsAdapter);

export async function getRealEstateAnalytics(tenantId: string, dateRange?: DateRange): Promise<AnalyticsOverview> {
  const range = dateRange || {
    startDate: new Date(Date.now() - REALESTATE_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return realEstateAnalyticsAdapter.getAdapterOverview(tenantId, range);
}
