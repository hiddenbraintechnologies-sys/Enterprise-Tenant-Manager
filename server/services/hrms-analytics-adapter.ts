/**
 * HRMS Analytics Adapter
 * 
 * Provides workforce analytics metrics for the HRMS module:
 * - Workforce metrics: total employees, active employees, departments
 * - Attendance metrics: present today, absent today, attendance rate
 * - Leave metrics: pending approvals, approved this month, leave utilization
 * - Payroll metrics: total payroll, average salary (optional)
 * 
 * Integrates with BaseAnalyticsService for unified analytics across modules.
 * 
 * @module server/services/hrms-analytics-adapter
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
import { hrmsStorage } from "../storage/hrms";
import type { HrDepartment } from "@shared/schema";

const HRMS_ANALYTICS_CONFIG: ModuleAnalyticsConfig = {
  moduleName: "hrms",
  categories: [
    "workforce",
    "attendance",
    "leaves",
  ],
  supportedMetrics: [
    "total_employees",
    "active_employees",
    "departments",
    "today_present",
    "today_absent",
    "pending_leaves",
  ],
  defaultDateRange: 30,
};

class HrmsAnalyticsAdapter implements IAnalyticsAdapter {
  getModuleName(): string {
    return "hrms";
  }

  getConfig(): ModuleAnalyticsConfig {
    return HRMS_ANALYTICS_CONFIG;
  }

  async getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview> {
    const stats = await hrmsStorage.getDashboardStats(tenantId);
    
    const summary: AnalyticsOverview["summary"] = {
      workforce: {
        total_employees: createMetricValue(stats.totalEmployees),
        active_employees: createMetricValue(stats.activeEmployees),
        departments: createMetricValue(stats.departmentCount),
      },
      attendance: {
        present_today: createMetricValue(stats.todayPresent),
        absent_today: createMetricValue(stats.todayAbsent),
      },
      leaves: {
        pending_approvals: createMetricValue(stats.pendingLeaves),
      },
    };

    const topPerformers = await this.getTopPerformingDepartments(tenantId);

    return {
      summary,
      trends: [],
      topPerformers,
    };
  }

  async getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics> {
    const stats = await hrmsStorage.getDashboardStats(tenantId);

    switch (category) {
      case "workforce":
        return {
          total_employees: createMetricValue(stats.totalEmployees),
          active_employees: createMetricValue(stats.activeEmployees),
          departments: createMetricValue(stats.departmentCount),
        };

      case "attendance":
        return {
          present_today: createMetricValue(stats.todayPresent),
          absent_today: createMetricValue(stats.todayAbsent),
        };

      case "leaves":
        return {
          pending_approvals: createMetricValue(stats.pendingLeaves),
        };

      default:
        return {};
    }
  }

  async getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>> {
    return [];
  }

  private async getTopPerformingDepartments(tenantId: string): Promise<Array<{ id: string; name: string; value: number; metric: string }>> {
    const departments = await hrmsStorage.getDepartments(tenantId);
    const employeesResult = await hrmsStorage.getEmployees(tenantId, {}, { page: 1, limit: 1000 });

    const deptEmployeeCount = new Map<string, number>();
    for (const emp of employeesResult.data) {
      if (emp.departmentId) {
        deptEmployeeCount.set(emp.departmentId, (deptEmployeeCount.get(emp.departmentId) || 0) + 1);
      }
    }

    return departments
      .map((dept: HrDepartment) => ({
        id: dept.id,
        name: dept.name,
        value: deptEmployeeCount.get(dept.id) || 0,
        metric: "employee_count",
      }))
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
      .slice(0, 5);
  }
}

export const hrmsAnalyticsAdapter = new HrmsAnalyticsAdapter();

baseAnalyticsService.registerAdapter(hrmsAnalyticsAdapter);

export async function getHrmsAnalytics(tenantId: string, dateRange?: DateRange): Promise<AnalyticsOverview> {
  const range = dateRange || {
    startDate: new Date(Date.now() - HRMS_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return hrmsAnalyticsAdapter.getAdapterOverview(tenantId, range);
}

export async function getHrmsMetrics(tenantId: string, category: string, dateRange?: DateRange): Promise<CategoryMetrics> {
  const range = dateRange || {
    startDate: new Date(Date.now() - HRMS_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return hrmsAnalyticsAdapter.getMetricsByCategory(tenantId, category, range);
}

export async function getHrmsTrends(tenantId: string, metric: string, dateRange?: DateRange): Promise<Array<{ date: string; value: number }>> {
  const range = dateRange || {
    startDate: new Date(Date.now() - HRMS_ANALYTICS_CONFIG.defaultDateRange * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };
  return hrmsAnalyticsAdapter.getTrends(tenantId, metric, range);
}
