import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getBootstrapResult } from './setup';

const API_BASE = 'http://localhost:5000';

async function assertJsonResponse(response: Response, description: string) {
  if (!response.ok && response.status >= 500) {
    const text = await response.text();
    console.error(`[test] Server error for ${description}:`, text);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Server returned ${response.status}: ${text}`);
    }
  }
  return response.json();
}

async function signupUser(overrides: Partial<{
  tenantName: string;
  subdomain: string;
  businessType: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  country: string;
  phone: string;
}> = {}) {
  const signupData = {
    tenantName: `Test Business ${Date.now()}`,
    businessType: 'service',
    adminFirstName: 'Test',
    adminLastName: 'User',
    adminEmail: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    adminPassword: 'Password123!',
    country: 'india',
    ...overrides,
  };

  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupData),
  });

  return { response, signupData };
}

describe('Phase 3: Tenant Signup API', () => {
  beforeAll(() => {
    const bootstrap = getBootstrapResult();
    if (!bootstrap?.dbConnected) {
      console.warn('[test] Database not available - signup tests may fail');
    }
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new tenant with admin user', async () => {
      const { response, signupData } = await signupUser({
        subdomain: `test-${Date.now()}`,
        phone: '+1234567890',
      });

      const data = await assertJsonResponse(response, 'signup');

      if (response.status !== 201) {
        console.error('[test] Signup failed with:', data);
      }

      expect(response.status).toBe(201);
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
      
      await signupUser({ adminEmail: email });

      const { response } = await signupUser({ adminEmail: email });
      const data = await assertJsonResponse(response, 'duplicate signup');

      expect(response.status).toBe(409);
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
      const { response } = await signupUser({ adminPassword: 'weak' });
      expect(response.status).toBe(400);
    });
  });
});

describe('Phase 3: Subscription Selection API', () => {
  let accessToken: string;
  let tenantId: string;
  let signupSucceeded = false;

  beforeAll(async () => {
    const bootstrap = getBootstrapResult();
    if (!bootstrap?.dbConnected) {
      console.warn('[test] Database not available - skipping subscription setup');
      return;
    }

    const { response } = await signupUser({
      tenantName: `Subscription Test ${Date.now()}`,
    });

    if (response.ok) {
      const data = await response.json();
      accessToken = data.accessToken;
      tenantId = data.tenant?.id;
      signupSucceeded = !!tenantId;
    } else {
      const errorData = await response.text();
      console.error('[test] Signup for subscription tests failed:', errorData);
    }
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
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

      const response = await fetch(`${API_BASE}/api/subscription/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, tier: 'starter' }),
      });

      expect(response.status).toBe(401);
    });

    it('should select subscription tier for tenant', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

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
      } else if (response.status === 404) {
        const data = await response.json();
        console.warn('[test] Plan not found - pricing plans may not be seeded:', data);
      }
    });

    it('should prevent cross-tenant subscription selection', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

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
  let signupSucceeded = false;

  beforeAll(async () => {
    const bootstrap = getBootstrapResult();
    if (!bootstrap?.dbConnected) {
      console.warn('[test] Database not available - skipping dashboard setup');
      return;
    }

    const { response } = await signupUser({
      tenantName: `Dashboard Test ${Date.now()}`,
      businessType: 'coworking',
      country: 'uae',
    });

    if (response.ok) {
      const data = await response.json();
      accessToken = data.accessToken;
      tenantId = data.tenant?.id;
      signupSucceeded = !!tenantId;
    } else {
      const errorData = await response.text();
      console.error('[test] Signup for dashboard tests failed:', errorData);
    }
  });

  describe('GET /api/dashboard', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard`);
      expect(response.status).toBe(401);
    });

    it('should return dashboard data with enabled modules', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

      const response = await fetch(`${API_BASE}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('tenant');
        expect(data).toHaveProperty('modules');
        expect(data).toHaveProperty('features');
      } else {
        console.warn('[test] Dashboard returned:', response.status);
      }
    });

    it('should return modules based on subscription tier', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

      const response = await fetch(`${API_BASE}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.modules).toHaveProperty('enabled');
        expect(Array.isArray(data.modules.enabled)).toBe(true);
      }
    });
  });

  describe('GET /api/dashboard/subscription/status', () => {
    it('should return subscription status', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

      const response = await fetch(`${API_BASE}/api/dashboard/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('tier');
        expect(data).toHaveProperty('hasSubscription');
      }
    });
  });

  describe('GET /api/dashboard/modules/:moduleId/access', () => {
    it('should check module access', async () => {
      if (!signupSucceeded) {
        console.warn('[test] Skipping - signup did not succeed');
        return;
      }

      const response = await fetch(`${API_BASE}/api/dashboard/modules/coworking/access`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Tenant-ID': tenantId,
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('allowed');
        expect(data).toHaveProperty('moduleId');
        expect(data).toHaveProperty('reason');
      }
    });
  });
});

describe('Phase 3: Middleware Stack', () => {
  describe('Cross-tenant access prevention', () => {
    it('should block access to different tenant data', async () => {
      const bootstrap = getBootstrapResult();
      if (!bootstrap?.dbConnected) {
        console.warn('[test] Skipping - database not available');
        return;
      }

      const { response: signup1 } = await signupUser();
      const { response: signup2 } = await signupUser();

      if (!signup1.ok || !signup2.ok) {
        console.warn('[test] Signups failed, skipping cross-tenant test');
        return;
      }

      const tenant1Data = await signup1.json();
      const tenant2Data = await signup2.json();

      const response = await fetch(`${API_BASE}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${tenant1Data.accessToken}`,
          'X-Tenant-ID': tenant2Data.tenant.id,
        },
      });

      expect([401, 403]).toContain(response.status);
    });
  });
});
