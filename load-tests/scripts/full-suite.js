import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { config, getRandomTenant, generateTestUser, buildUrl, getHeaders } from './config.js';
import { authenticate, getAuthenticatedHeaders } from './helpers/auth-helper.js';

// Global metrics
const overallSuccessRate = new Rate('overall_success_rate');
const responseTime = new Trend('response_time');
const activeUsers = new Gauge('active_users');
const totalRequests = new Counter('total_requests');
const errorCount = new Counter('error_count');

// Per-module metrics
const authMetrics = {
  duration: new Trend('auth_duration'),
  success: new Rate('auth_success'),
};
const dashboardMetrics = {
  duration: new Trend('dashboard_duration'),
  success: new Rate('dashboard_success'),
};
const billingMetrics = {
  duration: new Trend('billing_duration'),
  success: new Rate('billing_success'),
};
const whatsappMetrics = {
  duration: new Trend('whatsapp_duration'),
  success: new Rate('whatsapp_success'),
};

export const options = {
  scenarios: {
    // Full platform load simulation
    platform_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Warm up
        { duration: '2m', target: 50 },
        // Normal load
        { duration: '5m', target: 100 },
        // Peak load
        { duration: '3m', target: 200 },
        // Sustained peak
        { duration: '5m', target: 200 },
        // Scale down
        { duration: '2m', target: 100 },
        // Cool down
        { duration: '3m', target: 0 },
      ],
    },
  },
  thresholds: {
    'overall_success_rate': ['rate>0.95'],
    'response_time': ['p(95)<1500', 'p(99)<3000'],
    'auth_success': ['rate>0.98'],
    'dashboard_success': ['rate>0.95'],
    'billing_success': ['rate>0.98'],
    'whatsapp_success': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
    'error_count': ['count<500'],
  },
};

export function setup() {
  console.log('='.repeat(60));
  console.log('BizFlow Full Platform Load Test');
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Tenants: ${config.tenants.length}`);
  console.log(`Users per tenant: ${config.usersPerTenant}`);
  console.log('='.repeat(60));
  
  return {
    startTime: new Date().toISOString(),
  };
}

export default function () {
  const tenant = getRandomTenant();
  const userIndex = Math.floor(Math.random() * config.usersPerTenant) + 1;
  
  // Authenticate and get real token (or mock fallback)
  const tokenData = authenticate(tenant, userIndex);
  const headers = getAuthenticatedHeaders(tokenData);
  
  activeUsers.add(__VU);
  
  // Random user journey simulation
  const journey = selectJourney();
  
  switch (journey) {
    case 'dashboard':
      dashboardJourney(headers, tenant);
      break;
    case 'billing':
      billingJourney(headers, tenant);
      break;
    case 'whatsapp':
      whatsappJourney(headers, tenant);
      break;
    case 'mixed':
      mixedJourney(headers, tenant);
      break;
  }
}

function selectJourney() {
  const rand = Math.random();
  if (rand < 0.4) return 'dashboard';      // 40% dashboard users
  if (rand < 0.6) return 'whatsapp';       // 20% whatsapp users
  if (rand < 0.75) return 'billing';       // 15% billing users
  return 'mixed';                           // 25% mixed usage
}

function dashboardJourney(headers, tenant) {
  group('Dashboard Journey', () => {
    const endpoints = [
      config.endpoints.dashboard.overview,
      config.endpoints.dashboard.analytics,
      config.endpoints.dashboard.metrics,
      config.endpoints.dashboard.recent,
    ];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      const res = http.get(buildUrl(endpoint), { headers });
      const duration = Date.now() - start;
      
      totalRequests.add(1);
      responseTime.add(duration);
      dashboardMetrics.duration.add(duration);
      
      const success = check(res, {
        'status is 200': (r) => r.status === 200,
      });
      
      overallSuccessRate.add(success);
      dashboardMetrics.success.add(success);
      if (!success) errorCount.add(1);
      
      sleep(0.3);
    }
  });
  
  sleep(Math.random() * 2 + 1);
}

function billingJourney(headers, tenant) {
  group('Billing Journey', () => {
    const endpoints = [
      config.endpoints.billing.subscription,
      config.endpoints.billing.invoices,
      config.endpoints.billing.usage,
      config.endpoints.billing.paymentMethods,
    ];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      const res = http.get(buildUrl(endpoint), { headers });
      const duration = Date.now() - start;
      
      totalRequests.add(1);
      responseTime.add(duration);
      billingMetrics.duration.add(duration);
      
      const success = check(res, {
        'status is 200': (r) => r.status === 200,
      });
      
      overallSuccessRate.add(success);
      billingMetrics.success.add(success);
      if (!success) errorCount.add(1);
      
      sleep(0.3);
    }
  });
  
  sleep(Math.random() * 2 + 1);
}

function whatsappJourney(headers, tenant) {
  group('WhatsApp Journey', () => {
    // Load templates
    let start = Date.now();
    let res = http.get(buildUrl(config.endpoints.whatsapp.templates), { headers });
    let duration = Date.now() - start;
    
    totalRequests.add(1);
    responseTime.add(duration);
    whatsappMetrics.duration.add(duration);
    
    let success = check(res, { 'templates 200': (r) => r.status === 200 });
    overallSuccessRate.add(success);
    whatsappMetrics.success.add(success);
    
    sleep(0.3);
    
    // Send message
    const messagePayload = JSON.stringify({
      to: '+919876543210',
      templateId: 'order_confirmation',
      templateParams: { orderId: 'ORD-12345', amount: '1,500' },
    });
    
    start = Date.now();
    res = http.post(buildUrl(config.endpoints.whatsapp.send), messagePayload, { headers });
    duration = Date.now() - start;
    
    totalRequests.add(1);
    responseTime.add(duration);
    whatsappMetrics.duration.add(duration);
    
    success = check(res, { 'send 200/202': (r) => r.status === 200 || r.status === 202 });
    overallSuccessRate.add(success);
    whatsappMetrics.success.add(success);
    if (!success) errorCount.add(1);
    
    sleep(0.3);
    
    // Load conversations
    start = Date.now();
    res = http.get(buildUrl(config.endpoints.whatsapp.conversations), { headers });
    duration = Date.now() - start;
    
    totalRequests.add(1);
    responseTime.add(duration);
    whatsappMetrics.duration.add(duration);
    
    success = check(res, { 'conversations 200': (r) => r.status === 200 });
    overallSuccessRate.add(success);
    whatsappMetrics.success.add(success);
  });
  
  sleep(Math.random() * 2 + 1);
}

function mixedJourney(headers, tenant) {
  group('Mixed Journey', () => {
    // Dashboard overview
    let start = Date.now();
    let res = http.get(buildUrl(config.endpoints.dashboard.overview), { headers });
    recordMetrics(res, Date.now() - start, 'dashboard');
    sleep(0.5);
    
    // Check billing
    start = Date.now();
    res = http.get(buildUrl(config.endpoints.billing.subscription), { headers });
    recordMetrics(res, Date.now() - start, 'billing');
    sleep(0.3);
    
    // Send a message
    const payload = JSON.stringify({
      to: '+919876543210',
      templateId: 'welcome_message',
      templateParams: { name: 'Customer' },
    });
    start = Date.now();
    res = http.post(buildUrl(config.endpoints.whatsapp.send), payload, { headers });
    recordMetrics(res, Date.now() - start, 'whatsapp');
    sleep(0.3);
    
    // Check analytics
    start = Date.now();
    res = http.get(buildUrl(config.endpoints.dashboard.analytics), { headers });
    recordMetrics(res, Date.now() - start, 'dashboard');
  });
  
  sleep(Math.random() * 2 + 1);
}

function recordMetrics(res, duration, module) {
  totalRequests.add(1);
  responseTime.add(duration);
  
  const success = res.status >= 200 && res.status < 400;
  overallSuccessRate.add(success);
  if (!success) errorCount.add(1);
  
  switch (module) {
    case 'auth':
      authMetrics.duration.add(duration);
      authMetrics.success.add(success);
      break;
    case 'dashboard':
      dashboardMetrics.duration.add(duration);
      dashboardMetrics.success.add(success);
      break;
    case 'billing':
      billingMetrics.duration.add(duration);
      billingMetrics.success.add(success);
      break;
    case 'whatsapp':
      whatsappMetrics.duration.add(duration);
      whatsappMetrics.success.add(success);
      break;
  }
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('Load Test Complete');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    [`load-tests/reports/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`load-tests/reports/summary-${timestamp}.html`]: htmlReport(data),
  };
}

function htmlReport(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>BizFlow Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a2e; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-label { font-size: 12px; color: #666; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .success { color: #22c55e; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>BizFlow Load Test Report</h1>
    <div class="card">
      <h2>Summary</h2>
      <div class="metric">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value">${data.metrics.http_reqs?.values?.count || 0}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Avg Response Time</div>
        <div class="metric-value">${Math.round(data.metrics.http_req_duration?.values?.avg || 0)}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value ${(data.metrics.http_req_failed?.values?.rate || 0) < 0.05 ? 'success' : 'error'}">
          ${(100 - (data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Response Time Percentiles</h2>
      <table>
        <tr><th>Percentile</th><th>Value</th></tr>
        <tr><td>p50</td><td>${Math.round(data.metrics.http_req_duration?.values?.['p(50)'] || 0)}ms</td></tr>
        <tr><td>p90</td><td>${Math.round(data.metrics.http_req_duration?.values?.['p(90)'] || 0)}ms</td></tr>
        <tr><td>p95</td><td>${Math.round(data.metrics.http_req_duration?.values?.['p(95)'] || 0)}ms</td></tr>
        <tr><td>p99</td><td>${Math.round(data.metrics.http_req_duration?.values?.['p(99)'] || 0)}ms</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}
