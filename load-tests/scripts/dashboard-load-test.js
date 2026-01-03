import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getRandomTenant, generateTestUser, buildUrl, getHeaders } from './config.js';
import { authenticate, getAuthenticatedHeaders } from './helpers/auth-helper.js';

// Custom metrics
const dashboardLoadTime = new Trend('dashboard_load_time');
const analyticsLoadTime = new Trend('analytics_load_time');
const metricsLoadTime = new Trend('metrics_load_time');
const pageLoadSuccessRate = new Rate('page_load_success_rate');
const dashboardErrors = new Counter('dashboard_errors');

export const options = {
  scenarios: {
    // Simulate typical workday traffic pattern
    workday_pattern: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        // Morning ramp-up (9 AM)
        { duration: '2m', target: 50 },
        // Morning peak
        { duration: '3m', target: 100 },
        // Mid-morning
        { duration: '2m', target: 75 },
        // Lunch dip
        { duration: '2m', target: 30 },
        // Afternoon peak
        { duration: '3m', target: 120 },
        // Evening wind-down
        { duration: '2m', target: 40 },
        // Close
        { duration: '1m', target: 0 },
      ],
    },
    // Heavy concurrent dashboard access
    concurrent_dashboards: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 200,
      startTime: '16m',
    },
  },
  thresholds: {
    'dashboard_load_time': ['p(95)<1000', 'p(99)<2000'],
    'analytics_load_time': ['p(95)<2000', 'p(99)<3000'],
    'metrics_load_time': ['p(95)<500', 'p(99)<1000'],
    'page_load_success_rate': ['rate>0.95'],
    'http_req_failed': ['rate<0.05'],
  },
};

export function setup() {
  console.log(`Starting dashboard load test against ${config.baseUrl}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const tenant = getRandomTenant();
  const userIndex = Math.floor(Math.random() * config.usersPerTenant) + 1;
  
  // Authenticate and get headers
  const tokenData = authenticate(tenant, userIndex);
  const headers = getAuthenticatedHeaders(tokenData);
  
  group('Dashboard Load', () => {
    // Overview - main dashboard page
    group('Overview', () => {
      const start = Date.now();
      const res = http.get(buildUrl(config.endpoints.dashboard.overview), { headers });
      const loadTime = Date.now() - start;
      
      dashboardLoadTime.add(loadTime);
      
      const success = check(res, {
        'overview status is 200': (r) => r.status === 200,
        'overview has data': (r) => r.body && r.body.length > 0,
        'overview load time < 1s': () => loadTime < 1000,
      });
      
      pageLoadSuccessRate.add(success);
      if (!success) dashboardErrors.add(1);
    });
    
    sleep(0.5);
    
    // Analytics - heavier query
    group('Analytics', () => {
      const params = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        granularity: 'day',
      };
      
      const url = `${buildUrl(config.endpoints.dashboard.analytics)}?` + 
        `startDate=${params.startDate}&endDate=${params.endDate}&granularity=${params.granularity}`;
      
      const start = Date.now();
      const res = http.get(url, { headers });
      const loadTime = Date.now() - start;
      
      analyticsLoadTime.add(loadTime);
      
      const success = check(res, {
        'analytics status is 200': (r) => r.status === 200,
        'analytics has chart data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data !== undefined || body.chartData !== undefined || Array.isArray(body);
          } catch {
            return r.status === 200;
          }
        },
        'analytics load time < 2s': () => loadTime < 2000,
      });
      
      pageLoadSuccessRate.add(success);
      if (!success) dashboardErrors.add(1);
    });
    
    sleep(0.5);
    
    // Real-time metrics
    group('Metrics', () => {
      const start = Date.now();
      const res = http.get(buildUrl(config.endpoints.dashboard.metrics), { headers });
      const loadTime = Date.now() - start;
      
      metricsLoadTime.add(loadTime);
      
      const success = check(res, {
        'metrics status is 200': (r) => r.status === 200,
        'metrics load time < 500ms': () => loadTime < 500,
      });
      
      pageLoadSuccessRate.add(success);
      if (!success) dashboardErrors.add(1);
    });
    
    sleep(0.3);
    
    // Recent activity
    group('Recent Activity', () => {
      const res = http.get(buildUrl(config.endpoints.dashboard.recent), { headers });
      
      const success = check(res, {
        'recent activity status is 200': (r) => r.status === 200,
      });
      
      pageLoadSuccessRate.add(success);
    });
  });
  
  // Simulate user thinking/reading time
  sleep(Math.random() * 3 + 2);
}

export function teardown(data) {
  console.log(`Dashboard load test completed. Started at: ${data.startTime}`);
}
