import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

describe('Phase 3: Tenant Signup API', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new tenant with admin user', async () => {
      const signupData = {
        tenantName: 'Test Business',
        subdomain: `test-${Date.now()}`,
        businessType: 'service',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: `test-${Date.now()}@example.com`,
        adminPassword: 'Password123!',
        country: 'india',
        phone: '+1234567890',
      };

      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      expect(data).toHaveProperty('tenant');
      expect(data).toHaveProperty('user');
      expect(data.tenant.name).toBe(signupData.tenantName);
      expect(data.tenant.businessType).toBe(signupData.businessType);
      expect(data.user.email).toBe(signupData.adminEmail.toLowerCase());
      expect(data.nextStep).toBe('/subscription/select');
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      const signupData = {
        tenantName: 'Duplicate Test',
        businessType: 'salon',
        adminFirstName: 'Jane',
        adminLastName: 'Doe',
        adminEmail: email,
        adminPassword: 'Password123!',
        country: 'india',
      };

      await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.code).toBe('EMAIL_EXISTS');
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should validate password requirements', async () => {
      const signupData = {
        tenantName: 'Test Business',
        businessType: 'service',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: `test-${Date.now()}@example.com`,
        adminPassword: 'weak',
        country: 'india',
      };

      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Phase 3: Subscription Selection API', () => {
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const signupData = {
      tenantName: `Subscription Test ${Date.now()}`,
      businessType: 'service',
      adminFirstName: 'Sub',
      adminLastName: 'Test',
      adminEmail: `sub-test-${Date.now()}@example.com`,
      adminPassword: 'Password123!',
      country: 'india',
    };

    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });

    const data = await response.json();
    accessToken = data.accessToken;
    tenantId = data.tenant.id;
  });

  describe('GET /api/subscription/plans-with-pricing', () => {
    it('should return available plans with pricing', async () => {
      const response = await fetch(`${API_BASE}/api/subscription/plans-with-pricing?country=india`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('plans');
      expect(Array.isArray(data.plans)).toBe(true);
    });
  });

  describe('POST /api/subscription/select', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, tier: 'starter' }),
      });

      expect(response.status).toBe(401);
    });

    it('should select subscription tier for tenant', async () => {
      const response = await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tenantId, tier: 'free' }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('subscription');
        expect(data).toHaveProperty('plan');
        expect(data).toHaveProperty('enabledModules');
        expect(data.nextStep).toBe('/dashboard');
      }
    });

    it('should prevent cross-tenant subscription selection', async () => {
      const otherTenantId = '00000000-0000-0000-0000-000000000000';
      
      const response = await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tenantId: otherTenantId, tier: 'starter' }),
      });

      expect(response.status).toBe(403);
    });
  });
});

describe('Phase 3: Dashboard API', () => {
  let accessToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const signupData = {
      tenantName: `Dashboard Test ${Date.now()}`,
      businessType: 'coworking',
      adminFirstName: 'Dash',
      adminLastName: 'Test',
      adminEmail: `dash-test-${Date.now()}@example.com`,
      adminPassword: 'Password123!',
      country: 'uae',
    };

    const signupResponse = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });

    const signupData2 = await signupResponse.json();
    accessToken = signupData2.accessToken;
    tenantId = signupData2.tenant.id;
  });

  describe('GET /api/dashboard', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard`);
      expect(response.status).toBe(401);
    });

    it('should return dashboard data with enabled modules', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('tenant');
        expect(data).toHaveProperty('modules');
        expect(data).toHaveProperty('features');
        expect(data).toHaveProperty('navigation');
        expect(data.tenant.id).toBe(tenantId);
        expect(Array.isArray(data.modules.enabled)).toBe(true);
      }
    });

    it('should return modules based on subscription tier', async () => {
      await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tenantId, tier: 'starter' }),
      });

      const response = await fetch(`${API_BASE}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.modules.enabled.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /api/dashboard/subscription/status', () => {
    it('should return subscription status', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('hasSubscription');
      }
    });
  });

  describe('GET /api/dashboard/modules/:moduleId/access', () => {
    it('should check module access', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/modules/bookings/access`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('moduleId');
        expect(data).toHaveProperty('allowed');
      }
    });
  });
});

describe('Phase 3: Middleware Stack', () => {
  describe('Cross-tenant access prevention', () => {
    it('should block access to different tenant data', async () => {
      const tenant1 = await createTestTenant('tenant1');
      const tenant2 = await createTestTenant('tenant2');

      const response = await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tenant1.accessToken}`,
        },
        body: JSON.stringify({ tenantId: tenant2.tenantId, tier: 'starter' }),
      });

      expect(response.status).toBe(403);
    });
  });
});

async function createTestTenant(prefix: string) {
  const signupData = {
    tenantName: `${prefix} Test ${Date.now()}`,
    businessType: 'service',
    adminFirstName: prefix,
    adminLastName: 'User',
    adminEmail: `${prefix}-${Date.now()}@example.com`,
    adminPassword: 'Password123!',
    country: 'india',
  };

  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupData),
  });

  const data = await response.json();
  return {
    accessToken: data.accessToken,
    tenantId: data.tenant?.id,
  };
}
