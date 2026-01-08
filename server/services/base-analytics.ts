export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MetricValue {
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  unit?: string;
}

export interface CategoryMetrics {
  [metricName: string]: MetricValue;
}

export interface AnalyticsOverview {
  summary: {
    [category: string]: CategoryMetrics;
  };
  trends: Array<{
    date: string;
    metrics: Record<string, number>;
  }>;
  topPerformers?: Array<{
    id: string;
    name: string;
    value: number;
    metric: string;
  }>;
}

export interface ModuleAnalyticsConfig {
  moduleName: string;
  categories: string[];
  supportedMetrics: string[];
  defaultDateRange: number;
}

export interface IAnalyticsAdapter {
  getModuleName(): string;
  getConfig(): ModuleAnalyticsConfig;
  getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview>;
  getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics>;
  getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>>;
}

export interface IAnalyticsService {
  registerAdapter(adapter: IAnalyticsAdapter): void;
  getAdapter(moduleName: string): IAnalyticsAdapter | null;
  getRegisteredModules(): string[];
}

class BaseAnalyticsService implements IAnalyticsService {
  private adapters: Map<string, IAnalyticsAdapter> = new Map();

  registerAdapter(adapter: IAnalyticsAdapter): void {
    const moduleName = adapter.getModuleName();
    this.adapters.set(moduleName, adapter);
  }

  getAdapter(moduleName: string): IAnalyticsAdapter | null {
    return this.adapters.get(moduleName) || null;
  }

  getRegisteredModules(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const baseAnalyticsService = new BaseAnalyticsService();

export function calculateChange(current: number, previous: number): { change: number; changePercentage: number } {
  const change = current - previous;
  const changePercentage = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  return {
    change: Math.round(change * 100) / 100,
    changePercentage: Math.round(changePercentage * 100) / 100,
  };
}

export function createMetricValue(
  value: number,
  previousValue?: number,
  unit?: string
): MetricValue {
  const metric: MetricValue = { value: Math.round(value * 100) / 100 };
  
  if (previousValue !== undefined) {
    metric.previousValue = Math.round(previousValue * 100) / 100;
    const { change, changePercentage } = calculateChange(value, previousValue);
    metric.change = change;
    metric.changePercentage = changePercentage;
  }
  
  if (unit) {
    metric.unit = unit;
  }
  
  return metric;
}

export function aggregateTrends(
  data: Array<{ date: Date; value: number }>,
  granularity: "day" | "week" | "month" = "day"
): Array<{ date: string; value: number }> {
  const aggregated = new Map<string, number>();
  
  for (const item of data) {
    let key: string;
    const d = new Date(item.date);
    
    switch (granularity) {
      case "month":
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "week":
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      default:
        key = d.toISOString().split("T")[0];
    }
    
    aggregated.set(key, (aggregated.get(key) || 0) + item.value);
  }
  
  return Array.from(aggregated.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
