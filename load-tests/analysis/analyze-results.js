#!/usr/bin/env node
/**
 * BizFlow Load Test Results Analyzer
 * 
 * Parses k6 JSON output and generates actionable performance insights.
 * 
 * Usage:
 *   node analyze-results.js <results-file.json>
 *   node analyze-results.js --all (analyze all recent results)
 */

import fs from 'fs';
import path from 'path';

// SLO Thresholds
const SLO = {
  http_req_duration_p95: 500,    // 500ms
  http_req_duration_p99: 1000,   // 1s
  http_req_failed_rate: 0.01,   // 1%
  min_rps: 100,
};

// API Classification
const API_CATEGORIES = {
  auth: ['/api/auth'],
  dashboard: ['/api/dashboard'],
  billing: ['/api/billing'],
  whatsapp: ['/api/whatsapp'],
};

class LoadTestAnalyzer {
  constructor(data, filename) {
    this.data = data;
    this.filename = filename;
    this.insights = {
      summary: {},
      slowApis: [],
      sloBreaches: [],
      recommendations: [],
      trends: [],
    };
  }

  analyze() {
    this.analyzeSummaryMetrics();
    this.identifySlowApis();
    this.checkSloBreaches();
    this.detectBottlenecks();
    this.generateRecommendations();
    return this.insights;
  }

  analyzeSummaryMetrics() {
    const metrics = this.data.metrics || {};
    
    this.insights.summary = {
      totalRequests: metrics.http_reqs?.values?.count || 0,
      failedRequests: Math.round((metrics.http_req_failed?.values?.rate || 0) * (metrics.http_reqs?.values?.count || 0)),
      avgResponseTime: Math.round(metrics.http_req_duration?.values?.avg || 0),
      p95ResponseTime: Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0),
      p99ResponseTime: Math.round(metrics.http_req_duration?.values?.['p(99)'] || 0),
      minResponseTime: Math.round(metrics.http_req_duration?.values?.min || 0),
      maxResponseTime: Math.round(metrics.http_req_duration?.values?.max || 0),
      requestsPerSecond: Math.round(metrics.http_reqs?.values?.rate || 0),
      successRate: ((1 - (metrics.http_req_failed?.values?.rate || 0)) * 100).toFixed(2),
    };

    // Per-category metrics
    this.insights.categoryMetrics = {};
    for (const [category, prefixes] of Object.entries(API_CATEGORIES)) {
      const categoryMetric = metrics[`${category}_duration`] || metrics[`${category}_success`];
      if (categoryMetric) {
        this.insights.categoryMetrics[category] = {
          avgDuration: Math.round(categoryMetric.values?.avg || 0),
          p95Duration: Math.round(categoryMetric.values?.['p(95)'] || 0),
        };
      }
    }
  }

  identifySlowApis() {
    const metrics = this.data.metrics || {};
    const slowApis = [];

    // Check custom duration metrics
    const durationMetrics = Object.entries(metrics).filter(([key]) => 
      key.includes('_duration') || key.includes('_time') || key.includes('_load')
    );

    for (const [name, metric] of durationMetrics) {
      const p95 = metric.values?.['p(95)'] || metric.values?.avg || 0;
      const p99 = metric.values?.['p(99)'] || 0;

      if (p95 > SLO.http_req_duration_p95) {
        slowApis.push({
          name: name.replace(/_/g, ' ').replace('duration', '').trim(),
          metric: name,
          p95: Math.round(p95),
          p99: Math.round(p99),
          severity: p95 > SLO.http_req_duration_p99 ? 'critical' : 'warning',
          overSloBy: Math.round(p95 - SLO.http_req_duration_p95),
        });
      }
    }

    // Sort by severity and p95
    this.insights.slowApis = slowApis.sort((a, b) => b.p95 - a.p95);
  }

  checkSloBreaches() {
    const { summary } = this.insights;
    const breaches = [];

    if (summary.p95ResponseTime > SLO.http_req_duration_p95) {
      breaches.push({
        metric: 'Response Time (p95)',
        current: `${summary.p95ResponseTime}ms`,
        threshold: `${SLO.http_req_duration_p95}ms`,
        severity: 'critical',
      });
    }

    if (summary.p99ResponseTime > SLO.http_req_duration_p99) {
      breaches.push({
        metric: 'Response Time (p99)',
        current: `${summary.p99ResponseTime}ms`,
        threshold: `${SLO.http_req_duration_p99}ms`,
        severity: 'critical',
      });
    }

    const failedRate = 1 - (parseFloat(summary.successRate) / 100);
    if (failedRate > SLO.http_req_failed_rate) {
      breaches.push({
        metric: 'Error Rate',
        current: `${(failedRate * 100).toFixed(2)}%`,
        threshold: `${SLO.http_req_failed_rate * 100}%`,
        severity: 'critical',
      });
    }

    if (summary.requestsPerSecond < SLO.min_rps && summary.totalRequests > 1000) {
      breaches.push({
        metric: 'Throughput',
        current: `${summary.requestsPerSecond} req/s`,
        threshold: `${SLO.min_rps} req/s`,
        severity: 'warning',
      });
    }

    this.insights.sloBreaches = breaches;
  }

  detectBottlenecks() {
    const bottlenecks = [];
    const metrics = this.data.metrics || {};

    // Check for high response time variance (potential database issues)
    const httpDuration = metrics.http_req_duration?.values || {};
    if (httpDuration.max && httpDuration.avg) {
      const variance = httpDuration.max / httpDuration.avg;
      if (variance > 10) {
        bottlenecks.push({
          type: 'High Variance',
          description: `Max response time (${Math.round(httpDuration.max)}ms) is ${Math.round(variance)}x higher than average`,
          possibleCause: 'Database connection pool exhaustion, cold cache, or N+1 queries',
          recommendation: 'Enable query logging and check for slow queries during peak load',
        });
      }
    }

    // Check for high blocked time (connection waiting)
    const blockedTime = metrics.http_req_blocked?.values?.avg || 0;
    if (blockedTime > 50) {
      bottlenecks.push({
        type: 'Connection Blocking',
        description: `Average blocked time: ${Math.round(blockedTime)}ms`,
        possibleCause: 'Insufficient connection pool size or network latency',
        recommendation: 'Increase database/HTTP connection pool size',
      });
    }

    // Check for high connecting time
    const connectTime = metrics.http_req_connecting?.values?.avg || 0;
    if (connectTime > 20) {
      bottlenecks.push({
        type: 'Connection Latency',
        description: `Average connection time: ${Math.round(connectTime)}ms`,
        possibleCause: 'DNS resolution, SSL handshake, or network issues',
        recommendation: 'Enable connection keepalive and connection pooling',
      });
    }

    this.insights.bottlenecks = bottlenecks;
  }

  generateRecommendations() {
    const recommendations = [];
    const { summary, slowApis, sloBreaches, bottlenecks } = this.insights;

    // Slow API recommendations
    for (const api of slowApis.slice(0, 3)) {
      if (api.name.includes('analytics') || api.name.includes('dashboard')) {
        recommendations.push({
          priority: 'high',
          area: 'Caching',
          action: `Add Redis caching for ${api.name} endpoint`,
          impact: `Could reduce p95 from ${api.p95}ms to <100ms`,
        });
      } else if (api.name.includes('billing') || api.name.includes('invoice')) {
        recommendations.push({
          priority: 'high',
          area: 'Database',
          action: `Add database indexes for billing queries, consider materialized views`,
          impact: `Reduce ${api.name} query time`,
        });
      } else if (api.name.includes('whatsapp') || api.name.includes('message')) {
        recommendations.push({
          priority: 'medium',
          area: 'Queue',
          action: `Move message sending to background queue`,
          impact: `Improve ${api.name} response time and reliability`,
        });
      }
    }

    // General recommendations based on metrics
    if (summary.p95ResponseTime > 300) {
      recommendations.push({
        priority: 'high',
        area: 'Performance',
        action: 'Enable response compression (gzip/brotli)',
        impact: 'Reduce payload size by 60-80%',
      });
    }

    if (summary.maxResponseTime > 5000) {
      recommendations.push({
        priority: 'critical',
        area: 'Reliability',
        action: 'Implement request timeouts and circuit breakers',
        impact: 'Prevent cascading failures from slow requests',
      });
    }

    if (bottlenecks.some(b => b.type === 'High Variance')) {
      recommendations.push({
        priority: 'high',
        area: 'Database',
        action: 'Enable pg_stat_statements and identify N+1 queries',
        impact: 'Reduce query count and improve consistency',
      });
    }

    // Add standard recommendations
    recommendations.push({
      priority: 'medium',
      area: 'Monitoring',
      action: 'Set up APM (Application Performance Monitoring)',
      impact: 'Continuous visibility into production performance',
    });

    this.insights.recommendations = recommendations;
  }

  generateReport() {
    const { summary, slowApis, sloBreaches, bottlenecks, recommendations } = this.insights;
    const timestamp = new Date().toISOString();

    let report = `# Load Test Analysis Report

**Generated:** ${timestamp}  
**Source:** ${this.filename}

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Requests | ${summary.totalRequests.toLocaleString()} |
| Success Rate | ${summary.successRate}% |
| Avg Response Time | ${summary.avgResponseTime}ms |
| p95 Response Time | ${summary.p95ResponseTime}ms |
| p99 Response Time | ${summary.p99ResponseTime}ms |
| Throughput | ${summary.requestsPerSecond} req/s |

`;

    // SLO Status
    if (sloBreaches.length > 0) {
      report += `## SLO Breaches

| Metric | Current | Threshold | Severity |
|--------|---------|-----------|----------|
`;
      for (const breach of sloBreaches) {
        report += `| ${breach.metric} | ${breach.current} | ${breach.threshold} | ${breach.severity.toUpperCase()} |\n`;
      }
      report += '\n';
    } else {
      report += `## SLO Status: ALL PASSING\n\n`;
    }

    // Slow APIs
    if (slowApis.length > 0) {
      report += `## Slow APIs (p95 > ${SLO.http_req_duration_p95}ms)

| Endpoint | p95 | p99 | Over SLO By | Severity |
|----------|-----|-----|-------------|----------|
`;
      for (const api of slowApis) {
        report += `| ${api.name} | ${api.p95}ms | ${api.p99}ms | +${api.overSloBy}ms | ${api.severity.toUpperCase()} |\n`;
      }
      report += '\n';
    }

    // Bottlenecks
    if (bottlenecks.length > 0) {
      report += `## Detected Bottlenecks

`;
      for (const bottleneck of bottlenecks) {
        report += `### ${bottleneck.type}
- **Description:** ${bottleneck.description}
- **Possible Cause:** ${bottleneck.possibleCause}
- **Recommendation:** ${bottleneck.recommendation}

`;
      }
    }

    // Recommendations
    if (recommendations.length > 0) {
      report += `## Optimization Recommendations

| Priority | Area | Action | Expected Impact |
|----------|------|--------|-----------------|
`;
      for (const rec of recommendations) {
        report += `| ${rec.priority.toUpperCase()} | ${rec.area} | ${rec.action} | ${rec.impact} |\n`;
      }
      report += '\n';
    }

    // Checklist
    report += `## Performance Optimization Checklist

### Database
- [ ] Enable pg_stat_statements extension
- [ ] Set log_min_duration_statement = 200 (log slow queries)
- [ ] Add indexes on tenant_id for all multi-tenant tables
- [ ] Review and optimize N+1 query patterns
- [ ] Consider connection pooling with PgBouncer

### Caching
- [ ] Implement Redis caching for dashboard analytics
- [ ] Add cache headers for static assets
- [ ] Cache frequently accessed tenant configurations

### Application
- [ ] Enable gzip/brotli response compression
- [ ] Implement request timeouts (30s max)
- [ ] Add circuit breakers for external services
- [ ] Review JWT verification performance

### Infrastructure
- [ ] Set up horizontal scaling for API pods
- [ ] Configure CDN for static assets
- [ ] Enable connection keepalive
- [ ] Monitor CPU/memory with Prometheus
`;

    return report;
  }

  generateHtmlReport() {
    const { summary, slowApis, sloBreaches, recommendations } = this.insights;
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Load Test Analysis - BizFlow</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a2e; margin-bottom: 30px; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card h2 { margin-top: 0; color: #1a1a2e; font-size: 18px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
    .metric { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .metric-label { font-size: 12px; color: #666; margin-top: 4px; }
    .status-ok { color: #22c55e; }
    .status-warn { color: #f59e0b; }
    .status-critical { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; font-size: 13px; color: #666; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-critical { background: #fee2e2; color: #dc2626; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Load Test Analysis Report</h1>
    
    <div class="card">
      <h2>Performance Summary</h2>
      <div class="metrics-grid">
        <div class="metric">
          <div class="metric-value">${summary.totalRequests.toLocaleString()}</div>
          <div class="metric-label">Total Requests</div>
        </div>
        <div class="metric">
          <div class="metric-value ${parseFloat(summary.successRate) > 99 ? 'status-ok' : 'status-warn'}">${summary.successRate}%</div>
          <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.avgResponseTime}ms</div>
          <div class="metric-label">Avg Response</div>
        </div>
        <div class="metric">
          <div class="metric-value ${summary.p95ResponseTime < 500 ? 'status-ok' : 'status-warn'}">${summary.p95ResponseTime}ms</div>
          <div class="metric-label">p95 Response</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.requestsPerSecond}</div>
          <div class="metric-label">Requests/sec</div>
        </div>
      </div>
    </div>
    
    ${sloBreaches.length > 0 ? `
    <div class="card">
      <h2>SLO Breaches</h2>
      <table>
        <tr><th>Metric</th><th>Current</th><th>Threshold</th><th>Severity</th></tr>
        ${sloBreaches.map(b => `<tr><td>${b.metric}</td><td>${b.current}</td><td>${b.threshold}</td><td><span class="badge badge-${b.severity}">${b.severity}</span></td></tr>`).join('')}
      </table>
    </div>
    ` : ''}
    
    ${slowApis.length > 0 ? `
    <div class="card">
      <h2>Slow APIs</h2>
      <table>
        <tr><th>Endpoint</th><th>p95</th><th>p99</th><th>Over SLO</th></tr>
        ${slowApis.map(a => `<tr><td>${a.name}</td><td>${a.p95}ms</td><td>${a.p99}ms</td><td>+${a.overSloBy}ms</td></tr>`).join('')}
      </table>
    </div>
    ` : ''}
    
    <div class="card">
      <h2>Recommendations</h2>
      <table>
        <tr><th>Priority</th><th>Area</th><th>Action</th><th>Impact</th></tr>
        ${recommendations.map(r => `<tr><td><span class="badge badge-${r.priority}">${r.priority}</span></td><td>${r.area}</td><td>${r.action}</td><td>${r.impact}</td></tr>`).join('')}
      </table>
    </div>
  </div>
</body>
</html>`;
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
BizFlow Load Test Analyzer

Usage:
  node analyze-results.js <results.json>     Analyze a specific results file
  node analyze-results.js --all              Analyze all results in reports/
  node analyze-results.js --latest           Analyze most recent results

Options:
  --html          Generate HTML report
  --json          Output raw analysis as JSON
  --ci            CI mode (exit 1 if SLO breached)
`);
    process.exit(0);
  }

  const reportsDir = path.join(process.cwd(), 'load-tests', 'reports');
  let filesToAnalyze = [];

  if (args.includes('--all')) {
    const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
    filesToAnalyze = files.map(f => path.join(reportsDir, f));
  } else if (args.includes('--latest')) {
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length > 0) {
      filesToAnalyze = [path.join(reportsDir, files[0])];
    }
  } else {
    filesToAnalyze = args.filter(a => !a.startsWith('--'));
  }

  if (filesToAnalyze.length === 0) {
    console.error('No results files found to analyze');
    process.exit(1);
  }

  let hasSloBreaches = false;

  for (const file of filesToAnalyze) {
    console.log(`\nAnalyzing: ${file}`);
    
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const analyzer = new LoadTestAnalyzer(data, path.basename(file));
      const insights = analyzer.analyze();

      if (args.includes('--json')) {
        console.log(JSON.stringify(insights, null, 2));
      } else if (args.includes('--html')) {
        const htmlPath = file.replace('.json', '-analysis.html');
        fs.writeFileSync(htmlPath, analyzer.generateHtmlReport());
        console.log(`HTML report saved: ${htmlPath}`);
      } else {
        console.log(analyzer.generateReport());
      }

      if (insights.sloBreaches.length > 0) {
        hasSloBreaches = true;
      }
    } catch (err) {
      console.error(`Error analyzing ${file}: ${err.message}`);
    }
  }

  if (args.includes('--ci') && hasSloBreaches) {
    console.error('\nCI FAILURE: SLO breaches detected');
    process.exit(1);
  }
}

main().catch(console.error);
