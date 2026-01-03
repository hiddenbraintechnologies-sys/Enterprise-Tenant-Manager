import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, getRandomTenant, generateTestUser, buildUrl, getHeaders } from './config.js';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const loginDuration = new Trend('login_duration');
const tokenRefreshDuration = new Trend('token_refresh_duration');
const authErrors = new Counter('auth_errors');

export const options = {
  scenarios: {
    // Steady state - normal load
    steady_state: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '0s',
    },
    // Ramp up - simulate peak hours
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      startTime: '5m',
    },
    // Spike test - sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
      startTime: '21m',
    },
  },
  thresholds: {
    'login_success_rate': ['rate>0.95'],
    'login_duration': ['p(95)<500', 'p(99)<1000'],
    'token_refresh_duration': ['p(95)<200'],
    'http_req_failed': ['rate<0.05'],
    'auth_errors': ['count<100'],
  },
};

export function setup() {
  console.log(`Starting auth load test against ${config.baseUrl}`);
  return { startTime: new Date().toISOString() };
}

export default function () {
  const tenant = getRandomTenant();
  const userIndex = Math.floor(Math.random() * config.usersPerTenant) + 1;
  const user = generateTestUser(tenant.id, userIndex);
  
  let authToken = null;
  let refreshToken = null;
  
  group('Authentication Flow', () => {
    // Login
    group('Login', () => {
      const loginPayload = JSON.stringify({
        email: user.email,
        password: user.password,
      });
      
      const loginStart = Date.now();
      const loginRes = http.post(
        buildUrl(config.endpoints.auth.login),
        loginPayload,
        { headers: getHeaders(null, tenant.id) }
      );
      const loginTime = Date.now() - loginStart;
      
      loginDuration.add(loginTime);
      
      const loginSuccess = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'login response has token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.accessToken !== undefined || body.token !== undefined;
          } catch {
            return false;
          }
        },
      });
      
      loginSuccessRate.add(loginSuccess);
      
      if (loginSuccess && loginRes.status === 200) {
        try {
          const body = JSON.parse(loginRes.body);
          authToken = body.accessToken || body.token;
          refreshToken = body.refreshToken;
        } catch (e) {
          authErrors.add(1);
        }
      } else {
        authErrors.add(1);
      }
    });
    
    sleep(1);
    
    // Get current user
    if (authToken) {
      group('Get Current User', () => {
        const meRes = http.get(
          buildUrl(config.endpoints.auth.me),
          { headers: getHeaders(authToken, tenant.id) }
        );
        
        check(meRes, {
          'me status is 200': (r) => r.status === 200,
          'me response has user data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.id !== undefined || body.user !== undefined;
            } catch {
              return false;
            }
          },
        });
      });
      
      sleep(0.5);
      
      // Token refresh
      if (refreshToken) {
        group('Token Refresh', () => {
          const refreshStart = Date.now();
          const refreshRes = http.post(
            buildUrl(config.endpoints.auth.refresh),
            JSON.stringify({ refreshToken }),
            { headers: getHeaders(null, tenant.id) }
          );
          const refreshTime = Date.now() - refreshStart;
          
          tokenRefreshDuration.add(refreshTime);
          
          check(refreshRes, {
            'refresh status is 200': (r) => r.status === 200,
            'refresh response has new token': (r) => {
              try {
                const body = JSON.parse(r.body);
                return body.accessToken !== undefined || body.token !== undefined;
              } catch {
                return false;
              }
            },
          });
        });
      }
      
      sleep(0.5);
      
      // Logout
      group('Logout', () => {
        const logoutRes = http.post(
          buildUrl(config.endpoints.auth.logout),
          null,
          { headers: getHeaders(authToken, tenant.id) }
        );
        
        check(logoutRes, {
          'logout status is 200 or 204': (r) => r.status === 200 || r.status === 204,
        });
      });
    }
  });
  
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log(`Auth load test completed. Started at: ${data.startTime}`);
}
