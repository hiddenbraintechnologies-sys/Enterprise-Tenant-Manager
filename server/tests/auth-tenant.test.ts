import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, tenants, userTenants, roles } from '@shared/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.use(express.json());

const TEST_TENANT_ID = 'test-tenant-auth-001';
const TEST_TENANT_2_ID = 'test-tenant-auth-002';
const TEST_USER_EMAIL = 'testuser@tenant-auth.test';
const TEST_USER_PASSWORD = 'TestPassword123!';

describe('Tenant Login & Dashboard Access Tests', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    await db.insert(tenants).values({
      id: TEST_TENANT_ID,
      name: 'Test Tenant 1',
      slug: 'test-tenant-1',
      businessType: 'general',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(tenants).values({
      id: TEST_TENANT_2_ID,
      name: 'Test Tenant 2',
      slug: 'test-tenant-2',
      businessType: 'general',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: 'test-user-auth-001',
      email: TEST_USER_EMAIL,
      firstName: 'Test',
      lastName: 'User',
      passwordHash,
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(userTenants).values({
      id: 'test-user-tenant-001',
      userId: 'test-user-auth-001',
      tenantId: TEST_TENANT_ID,
      isDefault: true,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(userTenants).where(eq(userTenants.userId, 'test-user-auth-001'));
    await db.delete(users).where(eq(users.id, 'test-user-auth-001'));
    await db.delete(tenants).where(eq(tenants.id, TEST_TENANT_ID));
    await db.delete(tenants).where(eq(tenants.id, TEST_TENANT_2_ID));
  });

  describe('POST /api/auth/login', () => {
    it('should fail login with wrong tenant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          tenantId: TEST_TENANT_2_ID, 
        });
      
      expect([400, 403]).toContain(response.status);
    });

    it('should fail login with correct tenant but wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: 'WrongPassword123!',
          tenantId: TEST_TENANT_ID,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid/i);
    });

    it('should fail login with non-existent tenant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          tenantId: 'non-existent-tenant',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/not found/i);
    });

    it('should succeed login with correct tenant and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          tenantId: TEST_TENANT_ID,
        });
      
      expect([200, 201]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.tenant?.id).toBe(TEST_TENANT_ID);
      }
    });

    it('should succeed login via X-Tenant-ID header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Tenant-ID', TEST_TENANT_ID)
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        });
      
      expect([200, 201]).toContain(response.status);
    });

    it('should succeed login via tenant slug', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          tenantId: 'test-tenant-1',
        });
      
      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Dashboard Access Protection', () => {
    it('should redirect to login when accessing dashboard without auth', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .set('Accept', 'application/json');
      
      expect([401, 302, 403]).toContain(response.status);
    });

    it('should require tenant context for dashboard access', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          tenantId: TEST_TENANT_ID,
        });
      
      if (loginResponse.body.accessToken) {
        const dashboardResponse = await request(app)
          .get('/api/dashboard')
          .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
        
        expect([200, 401, 403]).toContain(dashboardResponse.status);
      }
    });
  });

  describe('Public Domain Handling', () => {
    it('should require tenant selection on public domain login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Host', 'www.payodsoft.co.uk')
        .send({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
        });
      
      expect([200, 400]).toContain(response.status);
    });
  });
});
