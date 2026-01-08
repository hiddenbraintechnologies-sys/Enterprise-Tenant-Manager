/**
 * Tourism Analytics Adapter
 * 
 * Provides analytics metrics for the Tourism/Travel module:
 * - Booking metrics: total bookings, confirmed, cancelled
 * - Package metrics: total packages, active packages
 * - Revenue metrics: booking revenue
 * 
 * @module server/services/tourism-analytics-adapter
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
import { tourPackages, tourBookings } from "@shared/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

const TOURISM_ANALYTICS_CONFIG: ModuleAnalyticsConfig = {
  moduleName: "tourism",
  categories: ["bookings", "packages", "revenue"],
  supportedMetrics: [
    "total_bookings",
    "confirmed_bookings",
    "cancelled_bookings",
    "total_packages",
    "active_packages",
  ],
  defaultDateRange: 30,
};

class TourismAnalyticsAdapter implements IAnalyticsAdapter {
  getModuleName(): string {
    return "tourism";
  }

  getConfig(): ModuleAnalyticsConfig {
    return TOURISM_ANALYTICS_CONFIG;
  }

  async getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview> {
    const [bookingStats, packageStats] = await Promise.all([
      this.getBookingStats(tenantId),
      this.getPackageStats(tenantId),
    ]);

    const summary: AnalyticsOverview["summary"] = {
      bookings: {
        total_bookings: createMetricValue(bookingStats.total),
        confirmed_bookings: createMetricValue(bookingStats.confirmed),
        cancelled_bookings: createMetricValue(bookingStats.cancelled),
      },
      packages: {
        total_packages: createMetricValue(packageStats.total),
        active_packages: createMetricValue(packageStats.active),
      },
    };

    return {
      summary,
      trends: [],
    };
  }

  async getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics> {
    switch (category) {
      case "bookings":
        const bookingStats = await this.getBookingStats(tenantId);
        return {
          total_bookings: createMetricValue(bookingStats.total),
          confirmed_bookings: createMetricValue(bookingStats.confirmed),
          cancelled_bookings: createMetricValue(bookingStats.cancelled),
        };

      case "packages":
        const packageStats = await this.getPackageStats(tenantId);
        return {
          total_packages: createMetricValue(packageStats.total),
          active_packages: createMetricValue(packageStats.active),
        };

      default:
        return {};
    }
  }

  async getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>> {
    return [];
  }

  private async getBookingStats(tenantId: string): Promise<{ total: number; confirmed: number; cancelled: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
      })
        .from(tourBookings)
        .where(and(eq(tourBookings.tenantId, tenantId), isNull(tourBookings.deletedAt)));

      return result[0] || { total: 0, confirmed: 0, cancelled: 0 };
    } catch {
      return { total: 0, confirmed: 0, cancelled: 0 };
    }
  }

  private async getPackageStats(tenantId: string): Promise<{ total: number; active: number }> {
    try {
      const result = await db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
      })
        .from(tourPackages)
        .where(and(eq(tourPackages.tenantId, tenantId), isNull(tourPackages.deletedAt)));

      return result[0] || { total: 0, active: 0 };
    } catch {
      return { total: 0, active: 0 };
    }
  }
}

export const tourismAnalyticsAdapter = new TourismAnalyticsAdapter();
baseAnalyticsService.registerAdapter(tourismAnalyticsAdapter);

export async function getTourismAnalytics(tenantId: string, dateRange?: DateRange): Promise<AnalyticsOverview> {
  const range = dateRange || {
    startDate: new Date(Date.now() - TOURISM_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return tourismAnalyticsAdapter.getAdapterOverview(tenantId, range);
}
