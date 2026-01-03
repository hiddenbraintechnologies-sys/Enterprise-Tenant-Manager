/**
 * Performance Metrics Collector
 * 
 * Collects and exposes application metrics for monitoring.
 * Compatible with Prometheus scraping.
 */

import { Request, Response, NextFunction } from 'express';

// Metric types
interface Counter {
  name: string;
  help: string;
  value: number;
  labels: Map<string, number>;
}

interface Histogram {
  name: string;
  help: string;
  buckets: number[];
  values: Map<string, number[]>;
  sum: Map<string, number>;
  count: Map<string, number>;
}

interface Gauge {
  name: string;
  help: string;
  value: number;
}

class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private startTime: number = Date.now();

  constructor() {
    // Initialize default metrics
    this.registerGauge('nodejs_heap_used_bytes', 'Node.js heap used in bytes');
    this.registerGauge('nodejs_heap_total_bytes', 'Node.js heap total in bytes');
    this.registerGauge('nodejs_external_memory_bytes', 'Node.js external memory in bytes');
    this.registerGauge('process_cpu_user_seconds_total', 'Total user CPU time spent in seconds');
    this.registerGauge('process_uptime_seconds', 'Process uptime in seconds');
    this.registerGauge('nodejs_active_handles', 'Number of active handles');
    this.registerGauge('nodejs_event_loop_lag_seconds', 'Event loop lag in seconds');
    
    this.registerCounter('http_requests_total', 'Total HTTP requests');
    this.registerCounter('http_request_errors_total', 'Total HTTP request errors');
    this.registerCounter('database_queries_total', 'Total database queries');
    this.registerCounter('database_query_errors_total', 'Total database query errors');
    
    this.registerHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    );
    this.registerHistogram(
      'database_query_duration_seconds',
      'Database query duration in seconds',
      [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    );

    // Start collecting system metrics
    this.startSystemMetrics();
  }

  private registerCounter(name: string, help: string): void {
    this.counters.set(name, {
      name,
      help,
      value: 0,
      labels: new Map(),
    });
  }

  private registerHistogram(name: string, help: string, buckets: number[]): void {
    this.histograms.set(name, {
      name,
      help,
      buckets,
      values: new Map(),
      sum: new Map(),
      count: new Map(),
    });
  }

  private registerGauge(name: string, help: string): void {
    this.gauges.set(name, { name, help, value: 0 });
  }

  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const counter = this.counters.get(name);
    if (!counter) return;

    counter.value += value;
    
    const labelKey = this.labelsToKey(labels);
    const current = counter.labels.get(labelKey) || 0;
    counter.labels.set(labelKey, current + value);
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const histogram = this.histograms.get(name);
    if (!histogram) return;

    const labelKey = this.labelsToKey(labels);
    
    // Initialize if needed
    if (!histogram.values.has(labelKey)) {
      histogram.values.set(labelKey, new Array(histogram.buckets.length).fill(0));
      histogram.sum.set(labelKey, 0);
      histogram.count.set(labelKey, 0);
    }

    // Update buckets
    const bucketCounts = histogram.values.get(labelKey)!;
    for (let i = 0; i < histogram.buckets.length; i++) {
      if (value <= histogram.buckets[i]) {
        bucketCounts[i]++;
      }
    }

    // Update sum and count
    histogram.sum.set(labelKey, (histogram.sum.get(labelKey) || 0) + value);
    histogram.count.set(labelKey, (histogram.count.get(labelKey) || 0) + 1);
  }

  setGauge(name: string, value: number): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.value = value;
    }
  }

  private labelsToKey(labels: Record<string, string>): string {
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([k, v]) => `${k}="${v}"`).join(',');
  }

  private startSystemMetrics(): void {
    const collectSystemMetrics = () => {
      const memUsage = process.memoryUsage();
      this.setGauge('nodejs_heap_used_bytes', memUsage.heapUsed);
      this.setGauge('nodejs_heap_total_bytes', memUsage.heapTotal);
      this.setGauge('nodejs_external_memory_bytes', memUsage.external);
      
      const cpuUsage = process.cpuUsage();
      this.setGauge('process_cpu_user_seconds_total', cpuUsage.user / 1000000);
      
      this.setGauge('process_uptime_seconds', (Date.now() - this.startTime) / 1000);
      
      // Event loop lag approximation
      const start = Date.now();
      setImmediate(() => {
        const lag = (Date.now() - start) / 1000;
        this.setGauge('nodejs_event_loop_lag_seconds', lag);
      });
    };

    // Collect every 15 seconds
    setInterval(collectSystemMetrics, 15000);
    collectSystemMetrics();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export gauges
    Array.from(this.gauges.values()).forEach(gauge => {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name} ${gauge.value}`);
      lines.push('');
    });

    // Export counters
    Array.from(this.counters.values()).forEach(counter => {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      
      if (counter.labels.size === 0) {
        lines.push(`${counter.name} ${counter.value}`);
      } else {
        Array.from(counter.labels.entries()).forEach(([labels, value]) => {
          const labelStr = labels ? `{${labels}}` : '';
          lines.push(`${counter.name}${labelStr} ${value}`);
        });
      }
      lines.push('');
    });

    // Export histograms
    Array.from(this.histograms.values()).forEach(histogram => {
      lines.push(`# HELP ${histogram.name} ${histogram.help}`);
      lines.push(`# TYPE ${histogram.name} histogram`);

      Array.from(histogram.values.entries()).forEach(([labels, bucketCounts]) => {
        const labelPrefix = labels ? `${labels},` : '';
        
        for (let i = 0; i < histogram.buckets.length; i++) {
          const le = histogram.buckets[i];
          lines.push(`${histogram.name}_bucket{${labelPrefix}le="${le}"} ${bucketCounts[i]}`);
        }
        lines.push(`${histogram.name}_bucket{${labelPrefix}le="+Inf"} ${histogram.count.get(labels) || 0}`);
        lines.push(`${histogram.name}_sum{${labels || ''}} ${histogram.sum.get(labels) || 0}`);
        lines.push(`${histogram.name}_count{${labels || ''}} ${histogram.count.get(labels) || 0}`);
      });
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON for internal use
   */
  exportJson(): object {
    return {
      uptime: (Date.now() - this.startTime) / 1000,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      counters: Object.fromEntries(
        Array.from(this.counters.entries()).map(([name, c]) => [name, c.value])
      ),
      gauges: Object.fromEntries(
        Array.from(this.gauges.entries()).map(([name, g]) => [name, g.value])
      ),
    };
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

/**
 * Middleware to track request metrics
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const path = req.route?.path || req.path;
  const method = req.method;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const status = res.statusCode;
    const labels = { method, path, status: String(status) };

    metrics.incrementCounter('http_requests_total', labels);
    metrics.observeHistogram('http_request_duration_seconds', duration, { method, path });

    if (status >= 400) {
      metrics.incrementCounter('http_request_errors_total', labels);
    }
  });

  next();
}

/**
 * Route handler for /metrics endpoint
 */
export function metricsHandler(req: Request, res: Response): void {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.exportPrometheus());
}

/**
 * Route handler for /metrics/json endpoint
 */
export function metricsJsonHandler(req: Request, res: Response): void {
  res.json(metrics.exportJson());
}

/**
 * Track database query metrics
 */
export function trackDatabaseQuery(duration: number, success: boolean, operation: string): void {
  metrics.incrementCounter('database_queries_total', { operation });
  metrics.observeHistogram('database_query_duration_seconds', duration / 1000, { operation });
  
  if (!success) {
    metrics.incrementCounter('database_query_errors_total', { operation });
  }
}
