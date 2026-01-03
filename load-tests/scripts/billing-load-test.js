import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getRandomTenant, buildUrl, getHeaders } from './config.js';
import { authenticate, getAuthenticatedHeaders } from './helpers/auth-helper.js';

// Custom metrics
const subscriptionLoadTime = new Trend('subscription_load_time');
const invoiceLoadTime = new Trend('invoice_load_time');
const checkoutTime = new Trend('checkout_time');
const billingSuccessRate = new Rate('billing_success_rate');
const paymentErrors = new Counter('payment_errors');

export const options = {
  scenarios: {
    // Normal billing operations
    normal_billing: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
    },
    // End of month invoice rush
    invoice_rush: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 10 },
      ],
      preAllocatedVUs: 50,
      maxVUs: 150,
      startTime: '10m',
    },
    // Checkout stress test
    checkout_stress: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 10,
      maxDuration: '5m',
      startTime: '18m',
    },
  },
  thresholds: {
    'subscription_load_time': ['p(95)<500', 'p(99)<1000'],
    'invoice_load_time': ['p(95)<1000', 'p(99)<2000'],
    'checkout_time': ['p(95)<3000', 'p(99)<5000'],
    'billing_success_rate': ['rate>0.98'],
    'payment_errors': ['count<20'],
    'http_req_failed': ['rate<0.02'],
  },
};

export function setup() {
  console.log(`Starting billing load test against ${config.baseUrl}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const tenant = getRandomTenant();
  const userIndex = 1; // Admin user for billing
  
  // Authenticate
  const tokenData = authenticate(tenant, userIndex);
  const headers = getAuthenticatedHeaders(tokenData);
  
  group('Billing Operations', () => {
    // Get subscription details
    group('Subscription', () => {
      const start = Date.now();
      const res = http.get(buildUrl(config.endpoints.billing.subscription), { headers });
      const loadTime = Date.now() - start;
      
      subscriptionLoadTime.add(loadTime);
      
      const success = check(res, {
        'subscription status is 200': (r) => r.status === 200,
        'subscription has plan info': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.plan !== undefined || body.subscription !== undefined;
          } catch {
            return r.status === 200;
          }
        },
      });
      
      billingSuccessRate.add(success);
    });
    
    sleep(0.5);
    
    // Get invoices
    group('Invoices', () => {
      const start = Date.now();
      const res = http.get(
        `${buildUrl(config.endpoints.billing.invoices)}?page=1&limit=20`,
        { headers }
      );
      const loadTime = Date.now() - start;
      
      invoiceLoadTime.add(loadTime);
      
      const success = check(res, {
        'invoices status is 200': (r) => r.status === 200,
        'invoices returns array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body) || Array.isArray(body.invoices) || body.data !== undefined;
          } catch {
            return r.status === 200;
          }
        },
      });
      
      billingSuccessRate.add(success);
    });
    
    sleep(0.3);
    
    // Get usage metrics
    group('Usage Metrics', () => {
      const res = http.get(
        `${buildUrl(config.endpoints.billing.usage)}?period=current`,
        { headers }
      );
      
      const success = check(res, {
        'usage status is 200': (r) => r.status === 200,
      });
      
      billingSuccessRate.add(success);
    });
    
    sleep(0.3);
    
    // Get payment methods
    group('Payment Methods', () => {
      const res = http.get(buildUrl(config.endpoints.billing.paymentMethods), { headers });
      
      const success = check(res, {
        'payment methods status is 200': (r) => r.status === 200,
      });
      
      billingSuccessRate.add(success);
    });
    
    // Simulate checkout (10% of users)
    if (Math.random() < 0.1) {
      sleep(1);
      
      group('Checkout', () => {
        const checkoutPayload = JSON.stringify({
          planId: 'pro',
          billingCycle: 'monthly',
          paymentMethodId: 'pm_test_' + Math.random().toString(36).substring(7),
        });
        
        const start = Date.now();
        const res = http.post(
          buildUrl(config.endpoints.billing.checkout),
          checkoutPayload,
          { headers }
        );
        const loadTime = Date.now() - start;
        
        checkoutTime.add(loadTime);
        
        const success = check(res, {
          'checkout status is 200 or 201': (r) => r.status === 200 || r.status === 201,
          'checkout time < 5s': () => loadTime < 5000,
        });
        
        billingSuccessRate.add(success);
        if (!success) paymentErrors.add(1);
      });
    }
  });
  
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log(`Billing load test completed. Started at: ${data.startTime}`);
}
