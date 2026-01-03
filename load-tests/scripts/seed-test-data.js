/**
 * BizFlow Load Test Data Seeding
 * 
 * This script creates test users and tenants for load testing.
 * Run once before executing load tests against a new environment.
 * 
 * Usage:
 *   k6 run --env K6_BASE_URL=http://localhost:5000 seed-test-data.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, buildUrl, getHeaders } from './config.js';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log('='.repeat(60));
  console.log('BizFlow Load Test Data Seeding');
  console.log('='.repeat(60));
  console.log(`Target: ${config.baseUrl}`);
  console.log('');
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  // Create test tenants and users
  for (const tenant of config.tenants) {
    console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);
    
    // Create tenant (admin endpoint)
    const tenantPayload = JSON.stringify({
      id: tenant.id,
      name: tenant.name,
      tier: tenant.tier,
      settings: {
        locale: 'en-US',
        timezone: 'Asia/Kolkata',
      },
    });
    
    const tenantRes = http.post(
      buildUrl('/api/admin/tenants'),
      tenantPayload,
      { headers: getHeaders() }
    );
    
    if (tenantRes.status === 201) {
      console.log(`  Created tenant: ${tenant.id}`);
      created++;
    } else if (tenantRes.status === 409) {
      console.log(`  Tenant exists: ${tenant.id}`);
      skipped++;
    } else {
      console.log(`  Failed to create tenant: ${tenant.id} (${tenantRes.status})`);
      failed++;
    }
    
    // Create test users for this tenant
    for (let i = 1; i <= config.usersPerTenant; i++) {
      const email = `user${i}@${tenant.id}.test`;
      
      const userPayload = JSON.stringify({
        email: email,
        password: 'TestPassword123!',
        name: `Test User ${i}`,
        tenantId: tenant.id,
        role: i === 1 ? 'admin' : 'staff',
      });
      
      const userRes = http.post(
        buildUrl('/api/admin/users'),
        userPayload,
        { headers: getHeaders(null, tenant.id) }
      );
      
      if (userRes.status === 201) {
        console.log(`    Created user: ${email}`);
        created++;
      } else if (userRes.status === 409) {
        console.log(`    User exists: ${email}`);
        skipped++;
      } else {
        // Silently skip if endpoint doesn't exist
        if (userRes.status !== 404) {
          console.log(`    Failed: ${email} (${userRes.status})`);
          failed++;
        }
      }
    }
    
    sleep(0.5);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Seeding Complete');
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed:  ${failed}`);
  console.log('='.repeat(60));
  
  // Verify we can authenticate
  console.log('');
  console.log('Verifying authentication...');
  
  const testTenant = config.tenants[0];
  const loginRes = http.post(
    buildUrl(config.endpoints.auth.login),
    JSON.stringify({
      email: `user1@${testTenant.id}.test`,
      password: 'TestPassword123!',
    }),
    { headers: getHeaders(null, testTenant.id) }
  );
  
  const authWorks = check(loginRes, {
    'login works': (r) => r.status === 200,
  });
  
  if (authWorks) {
    console.log('Authentication verified successfully!');
  } else {
    console.log(`Authentication failed (status: ${loginRes.status})`);
    console.log('Note: Load tests will use mock tokens if real auth is unavailable.');
  }
}
