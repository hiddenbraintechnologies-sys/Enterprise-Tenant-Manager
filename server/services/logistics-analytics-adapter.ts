/**
 * Logistics Analytics Adapter
 * 
 * Provides analytics metrics for the Logistics module:
 * - Fleet metrics: total vehicles, active vehicles
 * - Trip metrics: total trips, completed, in-progress
 * - Shipment metrics: total shipments, delivered
 * 
 * @module server/services/logistics-analytics-adapter
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
import { vehicles, trips, shipments } from "@shared/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

const LOGISTICS_ANALYTICS_CONFIG: ModuleAnalyticsConfig = {
  moduleName: "logistics",
  categories: ["fleet", "trips", "shipments"],
  supportedMetrics: [
    "total_vehicles",
    "active_vehicles",
    "total_trips",
    "completed_trips",
    "total_shipments",
    "delivered_shipments",
  ],
  defaultDateRange: 30,
};

class LogisticsAnalyticsAdapter implements IAnalyticsAdapter {
  getModuleName(): string {
    return "logistics";
  }

  getConfig(): ModuleAnalyticsConfig {
    return LOGISTICS_ANALYTICS_CONFIG;
  }

  async getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview> {
    const [vehicleStats, tripStats, shipmentStats] = await Promise.all([
      this.getVehicleStats(tenantId),
      this.getTripStats(tenantId),
      this.getShipmentStats(tenantId),
    ]);

    const summary: AnalyticsOverview["summary"] = {
      fleet: {
        total_vehicles: createMetricValue(vehicleStats.total),
        active_vehicles: createMetricValue(vehicleStats.active),
      },
      trips: {
        total_trips: createMetricValue(tripStats.total),
        completed_trips: createMetricValue(tripStats.completed),
      },
      shipments: {
        total_shipments: createMetricValue(shipmentStats.total),
        delivered_shipments: createMetricValue(shipmentStats.delivered),
      },
    };

    return {
      summary,
      trends: [],
    };
  }

  async getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics> {
    switch (category) {
      case "fleet":
        const vehicleStats = await this.getVehicleStats(tenantId);
        return {
          total_vehicles: createMetricValue(vehicleStats.total),
          active_vehicles: createMetricValue(vehicleStats.active),
        };

      case "trips":
        const tripStats = await this.getTripStats(tenantId);
        return {
          total_trips: createMetricValue(tripStats.total),
          completed_trips: createMetricValue(tripStats.completed),
        };

      case "shipments":
        const shipmentStats = await this.getShipmentStats(tenantId);
        return {
          total_shipments: createMetricValue(shipmentStats.total),
          delivered_shipments: createMetricValue(shipmentStats.delivered),
        };

      default:
        return {};
    }
  }

  async getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>> {
    return [];
  }

  private async getVehicleStats(tenantId: string): Promise<{ total: number; active: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
      })
        .from(vehicles)
        .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)));

      return result[0] || { total: 0, active: 0 };
    } catch {
      return { total: 0, active: 0 };
    }
  }

  private async getTripStats(tenantId: string): Promise<{ total: number; completed: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      })
        .from(trips)
        .where(and(eq(trips.tenantId, tenantId), isNull(trips.deletedAt)));

      return result[0] || { total: 0, completed: 0 };
    } catch {
      return { total: 0, completed: 0 };
    }
  }

  private async getShipmentStats(tenantId: string): Promise<{ total: number; delivered: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')::int`,
      })
        .from(shipments)
        .where(and(eq(shipments.tenantId, tenantId), isNull(shipments.deletedAt)));

      return result[0] || { total: 0, delivered: 0 };
    } catch {
      return { total: 0, delivered: 0 };
    }
  }
}

export const logisticsAnalyticsAdapter = new LogisticsAnalyticsAdapter();
baseAnalyticsService.registerAdapter(logisticsAnalyticsAdapter);

export async function getLogisticsAnalytics(tenantId: string, dateRange?: DateRange): Promise<AnalyticsOverview> {
  const range = dateRange || {
    startDate: new Date(Date.now() - LOGISTICS_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return logisticsAnalyticsAdapter.getAdapterOverview(tenantId, range);
}
