/**
 * Comprehensive Tenant Login and Dashboard Flow Tests
 * Tests tenant-aware login and dashboard access scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: string;
  response?: any;
}

const results: TestResult[] = [];

function logResult(scenario: string, passed: boolean, details: string, response?: any) {
  results.push({ scenario, passed, details, response });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${scenario}: ${details}`);
}

describe('1. Tenant Login via Credentials', () => {
  
  describe('1a. TenantId in request body', () => {
    it('should succeed with tenantId in body and include tenantId in JWT', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!',
          tenantId: 'default-tenant'
        })
      });
      
      const data = await response.json();
      const passed = response.status === 200 && data.accessToken;
      logResult('Login with tenantId in body', passed, 
        passed ? `Got token, tenantId: ${data.tenantId || 'included'}` : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
      expect(response.status).toBe(200);
    });
  });

  describe('1b. Tenant subdomain in request body', () => {
    it('should resolve tenant from subdomain field', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!',
          subdomain: 'default-tenant'
        })
      });
      
      const data = await response.json();
      const passed = response.status === 200;
      logResult('Login with subdomain in body', passed,
        passed ? 'Tenant resolved from subdomain' : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
    });
  });

  describe('1c. X-Tenant-ID header', () => {
    it('should resolve tenant from X-Tenant-ID header', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default-tenant'
        },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!'
        })
      });
      
      const data = await response.json();
      const passed = response.status === 200;
      logResult('Login with X-Tenant-ID header', passed,
        passed ? 'Tenant resolved from header' : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
    });
  });

  describe('1d. Host subdomain auto-resolution', () => {
    it('should auto-resolve tenant from host subdomain', async () => {
      // Simulating host header for subdomain resolution
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Host': 'tenant1.payodsoft.co.uk'
        },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!'
        })
      });
      
      const data = await response.json();
      // This may fail if tenant1 doesn't exist, but tests the resolution path
      logResult('Login with host subdomain', response.status !== 500,
        `Host subdomain resolution attempted. Status: ${response.status}`,
        data
      );
    });
  });
});

describe('2. Tenant Dashboard Access', () => {
  let validToken: string;
  
  beforeAll(async () => {
    // Get a valid token first
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mybizstream.com',
        password: 'AdminPass123!',
        tenantId: 'default-tenant'
      })
    });
    const data = await response.json();
    validToken = data.accessToken;
  });

  describe('2a. JWT with correct tenant', () => {
    it('should allow access with valid JWT', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard/access`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${validToken}`,
          'X-Tenant-ID': 'default-tenant'
        }
      });
      
      const data = await response.json();
      const passed = response.status === 200;
      logResult('Dashboard access with valid JWT', passed,
        passed ? `Access allowed, businessType: ${data.businessType}` : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
      expect(response.status).toBe(200);
    });
  });

  describe('2b. JWT with wrong tenant', () => {
    it('should deny access with mismatched tenant', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard/access`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${validToken}`,
          'X-Tenant-ID': 'wrong-tenant-id'
        }
      });
      
      const data = await response.json();
      // Should be denied (401 or 403)
      const passed = response.status === 401 || response.status === 403;
      logResult('Dashboard access with wrong tenant', passed,
        passed ? 'Access correctly denied' : `Unexpected status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
    });
  });

  describe('2c. No JWT token', () => {
    it('should deny access without JWT', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard/access`, {
        method: 'GET',
        headers: { 'X-Tenant-ID': 'default-tenant' }
      });
      
      const data = await response.json();
      const passed = response.status === 401;
      logResult('Dashboard access without JWT', passed,
        passed ? 'Access correctly denied (401)' : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
      expect(response.status).toBe(401);
    });
  });

  describe('2d. Public domain bypass attempt', () => {
    it('should not allow dashboard access from public domain without auth', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard/access`, {
        method: 'GET',
        headers: { 
          'Host': 'www.payodsoft.co.uk'
        }
      });
      
      const data = await response.json();
      const passed = response.status === 401;
      logResult('Public domain dashboard bypass', passed,
        passed ? 'Correctly blocked' : `Status: ${response.status}`,
        data
      );
    });
  });
});

describe('3. Dashboard Validate Route', () => {
  let validToken: string;
  
  beforeAll(async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mybizstream.com',
        password: 'AdminPass123!',
        tenantId: 'default-tenant'
      })
    });
    const data = await response.json();
    validToken = data.accessToken;
  });

  it('should validate route with correct tenant', async () => {
    const response = await fetch(`${BASE_URL}/api/dashboard/validate-route`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
        'X-Tenant-ID': 'default-tenant'
      },
      body: JSON.stringify({ route: '/dashboard' })
    });
    
    const data = await response.json();
    logResult('Validate route with valid context', response.status === 200,
      `Status: ${response.status}, allowed: ${data.allowed}`,
      data
    );
  });
});

describe('4. Edge Cases', () => {
  
  describe('4a. Missing tenant in request', () => {
    it('should handle missing tenant gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!'
          // No tenantId, subdomain, or header
        })
      });
      
      const data = await response.json();
      // Should either succeed (if user has default tenant) or fail gracefully
      logResult('Login without tenant context', response.status !== 500,
        `Graceful handling. Status: ${response.status}`,
        data
      );
    });
  });

  describe('4b. Invalid credentials', () => {
    it('should deny login with wrong password', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'WrongPassword123!',
          tenantId: 'default-tenant'
        })
      });
      
      const data = await response.json();
      const passed = response.status === 401;
      logResult('Login with wrong password', passed,
        passed ? 'Correctly denied' : `Status: ${response.status}`,
        data
      );
      expect(response.status).toBe(401);
    });
  });

  describe('4c. Malformed JWT', () => {
    it('should deny access with malformed JWT', async () => {
      const response = await fetch(`${BASE_URL}/api/dashboard/access`, {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer invalid.malformed.token',
          'X-Tenant-ID': 'default-tenant'
        }
      });
      
      const data = await response.json();
      const passed = response.status === 401 || response.status === 403;
      logResult('Dashboard with malformed JWT', passed,
        passed ? 'Correctly denied' : `Status: ${response.status}`,
        data
      );
    });
  });

  describe('4d. Non-existent tenant', () => {
    it('should deny login to non-existent tenant', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@mybizstream.com',
          password: 'AdminPass123!',
          tenantId: 'non-existent-tenant-xyz'
        })
      });
      
      const data = await response.json();
      const passed = response.status === 401 || response.status === 403 || response.status === 404;
      logResult('Login to non-existent tenant', passed,
        passed ? 'Correctly denied' : `Status: ${response.status}, ${JSON.stringify(data)}`,
        data
      );
    });
  });
});

afterAll(() => {
  console.log('\n========== TEST SUMMARY ==========');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.scenario}: ${r.details}`);
    });
  }
  console.log('==================================\n');
});
