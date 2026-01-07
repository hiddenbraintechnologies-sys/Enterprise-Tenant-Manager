# MyBizStream - Testing Workflow Document

## Table of Contents
1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Testing Types & Layers](#testing-types--layers)
4. [Test Environment Setup](#test-environment-setup)
5. [Module Test Scenarios](#module-test-scenarios)
6. [Testing Tools & Frameworks](#testing-tools--frameworks)
7. [Test Data Management](#test-data-management)
8. [CI/CD Integration](#cicd-integration)
9. [Quality Gates & Acceptance Criteria](#quality-gates--acceptance-criteria)
10. [Appendix](#appendix)

---

## Overview

MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed for small and medium businesses across various sectors. This document outlines the comprehensive testing workflow to ensure quality, security, and reliability of the platform.

### Key Testing Objectives
- Ensure multi-tenant data isolation and security
- Validate authentication and authorization flows
- Verify billing and payment processing accuracy
- Confirm compliance with regional regulations (GDPR, DPDP, HIPAA)
- Validate role-based access control (5-tier admin system)
- Ensure white-label and reseller functionality

---

## Testing Strategy

### Risk-Based Prioritization

| Priority | Module | Risk Level | Testing Focus |
|----------|--------|------------|---------------|
| P0 | Authentication & Authorization | Critical | Security, JWT, SSO, session management |
| P0 | Multi-Tenancy Isolation | Critical | Data scoping, cross-tenant access prevention |
| P0 | Billing & Payments | Critical | Multi-currency, invoicing, payment gateway |
| P1 | Compliance Modules | High | Audit logs, consent management, data protection |
| P1 | Admin Role System | High | RBAC, permissions, country-scoped access |
| P2 | Business Operations | Medium | Bookings, customers, services |
| P3 | UI/UX Features | Low | Layout, theming, responsiveness |

### Shift-Left Testing Approach
- Early integration of testing in development cycle
- Automated unit tests during development
- Code review with security focus
- Static analysis before commits

### Testing Cadence
| Type | Frequency | Trigger |
|------|-----------|---------|
| Unit Tests | On commit | Pre-commit hooks, PR |
| Integration Tests | On PR | CI pipeline |
| API Tests | On PR | CI pipeline |
| E2E Tests | Nightly/On merge | Main branch |
| Performance Tests | Weekly | Scheduled |
| Security Scans | Daily | Automated |

---

## Testing Types & Layers

### 1. Unit Testing

**Scope:** Individual functions, components, utilities

**Frontend (React/TypeScript)**
```typescript
// Example: Testing currency formatting
describe('CurrencyService', () => {
  it('should format INR correctly', () => {
    const result = formatCurrency(1000, 'INR');
    expect(result).toBe('₹1,000.00');
  });

  it('should handle multi-currency conversion', () => {
    const result = convertCurrency(100, 'USD', 'INR', 83.5);
    expect(result).toBeCloseTo(8350, 2);
  });
});
```

**Backend (Express/TypeScript)**
```typescript
// Example: Testing JWT token generation
describe('JWTAuthService', () => {
  it('should generate valid token pair', async () => {
    const tokens = await jwtAuthService.generateTokenPair(userId, tenantId, roleId, []);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('should reject expired tokens', async () => {
    const result = await jwtAuthService.verifyToken(expiredToken);
    expect(result.valid).toBe(false);
  });
});
```

### 2. Integration Testing

**Scope:** API endpoints, database operations, service interactions

**API Integration Tests**
```typescript
// Example: Testing tenant creation flow
describe('POST /api/tenants', () => {
  it('should create tenant with valid data', async () => {
    const response = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Business',
        businessType: 'salon',
        countryCode: 'IN'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.tenant.id).toBeDefined();
  });

  it('should enforce tenant isolation', async () => {
    const response = await request(app)
      .get(`/api/tenants/${otherTenantId}`)
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

### 3. API Contract Testing

**Scope:** API schema validation, request/response contracts

```typescript
// Example: Validating against Zod schemas
describe('API Contracts', () => {
  it('should match user schema', () => {
    const user = await api.getUser(userId);
    const result = userSelectSchema.safeParse(user);
    expect(result.success).toBe(true);
  });
});
```

### 4. End-to-End (E2E) Testing

**Scope:** Complete user flows across the application

```typescript
// Example: Playwright E2E test
test('complete booking flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="input-email"]', 'user@test.com');
  await page.fill('[data-testid="input-password"]', 'password123');
  await page.click('[data-testid="button-login"]');
  
  // Navigate to bookings
  await page.waitForURL('/dashboard/*');
  await page.click('[data-testid="nav-bookings"]');
  
  // Create booking
  await page.click('[data-testid="button-new-booking"]');
  await page.fill('[data-testid="input-customer"]', 'John Doe');
  await page.click('[data-testid="button-submit"]');
  
  // Verify
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
});
```

### 5. Performance Testing

**Scope:** Load testing, stress testing, response times

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.get('https://api.mybizstream.app/api/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## Test Environment Setup

### Local Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: mybizstream_test
    ports:
      - "5433:5432"
    volumes:
      - ./scripts/seed-test.sql:/docker-entrypoint-initdb.d/seed.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

### Environment Variables for Testing

```env
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://dev:devpass@localhost:5433/mybizstream_test
REDIS_URL=redis://localhost:6380
JWT_SECRET=test-jwt-secret-key
SESSION_SECRET=test-session-secret
```

### Test Database Seeding

```typescript
// scripts/seed-test-data.ts
async function seedTestData() {
  // Create test tenants
  await db.insert(tenants).values([
    { id: 'tenant-1', name: 'Test Salon', businessType: 'salon', countryCode: 'IN' },
    { id: 'tenant-2', name: 'Test Clinic', businessType: 'clinic', countryCode: 'GB' },
  ]);

  // Create test users with different roles
  await db.insert(users).values([
    { id: 'super-admin', email: 'superadmin@test.com', role: 'SUPER_ADMIN' },
    { id: 'admin-1', email: 'admin@test.com', tenantId: 'tenant-1', role: 'admin' },
    { id: 'staff-1', email: 'staff@test.com', tenantId: 'tenant-1', role: 'staff' },
  ]);

  // Create test currencies and exchange rates
  await db.insert(exchangeRates).values([
    { baseCurrency: 'USD', targetCurrency: 'INR', rate: '83.50' },
    { baseCurrency: 'USD', targetCurrency: 'GBP', rate: '0.79' },
  ]);
}
```

---

## Module Test Scenarios

### 1. Authentication Module

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| AUTH-001 | Email/Password Login | Enter valid credentials, submit | JWT tokens returned, redirect to dashboard |
| AUTH-002 | Invalid Login | Enter wrong password | Error message, no tokens |
| AUTH-003 | Account Lockout | 5 failed attempts | Account locked for 30 mins |
| AUTH-004 | JWT Refresh | Use expired access token with valid refresh | New token pair returned |
| AUTH-005 | Token Revocation | Call logout endpoint | Tokens invalidated |
| AUTH-006 | SSO Login (Replit) | Click SSO button | OAuth flow completes |
| AUTH-007 | Password Reset | Request reset, use link | Password updated |
| AUTH-008 | Rate Limiting | 100 requests/min | 429 error on excess |

### 2. Multi-Tenancy Module

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| MT-001 | Tenant Data Isolation | Query as Tenant A | Only Tenant A data returned |
| MT-002 | Cross-Tenant Access | Request Tenant B resource as Tenant A | 403 Forbidden |
| MT-003 | Tenant Header Validation | Missing X-Tenant-ID | Use default tenant from JWT |
| MT-004 | Region Lock | Access from blocked region | 403 with region message |
| MT-005 | Feature Flag Resolution | Access premium feature (free tier) | Feature disabled |
| MT-006 | Subscription Tier Check | Pro tenant accesses Pro features | Access granted |
| MT-007 | Multi-Tenant Switch | User with multiple tenants switches | Context updates correctly |

### 3. Billing & Payments Module

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| BILL-001 | Create Invoice (INR) | Create invoice for Indian tenant | INR formatting, GST applied |
| BILL-002 | Multi-Currency Invoice | Create invoice in USD for IN tenant | Exchange rate applied |
| BILL-003 | Exchange Rate Update | Admin updates USD/INR rate | New invoices use updated rate |
| BILL-004 | Payment Recording | Record payment for invoice | Invoice status updated |
| BILL-005 | Partial Payment | Pay 50% of invoice | Status: partial, balance calculated |
| BILL-006 | Cross-Currency Payment | Pay GBP invoice with USD | Conversion applied |
| BILL-007 | Invoice PDF Generation | Generate invoice PDF | PDF with correct branding |
| BILL-008 | Revenue Analytics | View monthly revenue | Correct aggregations by currency |

### 4. Admin Role System (5-Tier RBAC)

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| RBAC-001 | Super Admin Access | Access all admin functions | Full access granted |
| RBAC-002 | Platform Admin Country Scope | Access assigned countries only | Other countries hidden |
| RBAC-003 | Tech Support Global View | View system health globally | Access granted (read-only) |
| RBAC-004 | Manager Operations | Perform operations in region | Access within scope |
| RBAC-005 | Support Team Tickets | Handle support tickets | Access to assigned region tickets |
| RBAC-006 | Permission Inheritance | Child role access parent permission | Permission denied |
| RBAC-007 | Dynamic Permission Check | Change role permissions | Immediate effect |
| RBAC-008 | Country-Scoped Data | Platform Admin views tenants | Only assigned country tenants |

### 5. Compliance Module

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| COMP-001 | Audit Log Creation | Perform CRUD action | Audit log entry created |
| COMP-002 | PHI Access Logging | Access patient data | PHI access logged with purpose |
| COMP-003 | Data Masking | View masked Aadhaar | Only last 4 digits visible |
| COMP-004 | Consent Management | User gives consent | Consent recorded with timestamp |
| COMP-005 | DSAR Request | Submit data access request | 30-day timer starts |
| COMP-006 | Data Retention | Check expired data | Marked for deletion |
| COMP-007 | GDPR Export | Request data export | JSON/CSV export generated |
| COMP-008 | Breach Notification | Log data breach | ICO notification flag set |

### 6. Region Configuration

| Test ID | Scenario | Steps | Expected Result |
|---------|----------|-------|-----------------|
| REG-001 | Active Regions Display | Open region selector | Only enabled regions shown |
| REG-002 | Region Switch | Switch from IN to GB | Currency, tax, format update |
| REG-003 | Region Persistence | Refresh after region change | Selected region persists |
| REG-004 | Tax Calculation | Create invoice in region | Region-specific tax applied |
| REG-005 | Disabled Region | Admin disables region | Region hidden from selector |

---

## Testing Tools & Frameworks

### Frontend Testing
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest** | Unit testing | `vitest.config.ts` |
| **React Testing Library** | Component testing | With Vitest |
| **MSW (Mock Service Worker)** | API mocking | `mocks/handlers.ts` |
| **Playwright** | E2E testing | `playwright.config.ts` |

### Backend Testing
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest/Jest** | Unit testing | `vitest.config.ts` |
| **Supertest** | API testing | Integrated with Vitest |
| **Testcontainers** | Database testing | PostgreSQL container |

### Performance & Security
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **k6** | Load testing | `load-tests/` directory |
| **npm audit** | Dependency scanning | CI pipeline |
| **Trivy** | Container scanning | CI pipeline |

### Mobile (Flutter)
| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Flutter Test** | Widget/Unit testing | Built-in |
| **Integration Test** | Integration testing | `integration_test/` |
| **Appium** | Device testing | Cross-platform |

---

## Test Data Management

### Test Fixtures Structure
```
tests/
├── fixtures/
│   ├── tenants.json
│   ├── users.json
│   ├── invoices.json
│   ├── bookings.json
│   └── compliance/
│       ├── audit-logs.json
│       └── consent-records.json
├── factories/
│   ├── user.factory.ts
│   ├── tenant.factory.ts
│   └── invoice.factory.ts
└── mocks/
    ├── handlers.ts
    └── data/
```

### Test Data Principles
1. **Synthetic PII**: Never use real customer data
2. **Deterministic IDs**: Use UUIDs for reproducibility
3. **Isolation**: Each test cleans up its data
4. **Versioning**: Fixtures versioned with schema changes

### Example Factory
```typescript
// tests/factories/tenant.factory.ts
import { faker } from '@faker-js/faker';

export function createTestTenant(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    businessType: faker.helpers.arrayElement(['salon', 'clinic', 'pg', 'gym']),
    countryCode: faker.helpers.arrayElement(['IN', 'GB', 'AE']),
    subscriptionTier: 'pro',
    ...overrides,
  };
}
```

---

## CI/CD Integration

### GitHub Actions Pipeline

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: mybizstream_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/mybizstream_test

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'
```

### Pipeline Stages

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Lint     │───▶│    Unit     │───▶│ Integration │───▶│    E2E      │
│  TypeCheck  │    │    Tests    │    │    Tests    │    │   Tests     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │  Coverage   │    │  DB Verify  │    │   Report    │
                   │   Report    │    │   Check     │    │  Artifacts  │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Quality Gates & Acceptance Criteria

### Pull Request Requirements

| Gate | Requirement | Blocking |
|------|-------------|----------|
| Lint | No ESLint errors | Yes |
| TypeCheck | No TypeScript errors | Yes |
| Unit Tests | All passing | Yes |
| Coverage | >= 80% | Yes |
| Integration Tests | All passing | Yes |
| Security Scan | No critical vulnerabilities | Yes |

### Release Criteria

| Criteria | Description | Owner |
|----------|-------------|-------|
| Zero Critical Defects | No P0/P1 bugs open | QA Lead |
| E2E Tests Passing | All smoke tests green | QA Lead |
| Performance Baseline | P95 latency < 500ms | DevOps |
| Security Audit | No OWASP Top 10 issues | Security |
| Audit Log Verification | All actions logged | Compliance |
| Rollback Plan | Documented and tested | DevOps |
| Data Migration | Tested on staging | DBA |

### Test Coverage Targets

| Module | Unit | Integration | E2E |
|--------|------|-------------|-----|
| Authentication | 90% | 85% | Critical paths |
| Multi-Tenancy | 85% | 90% | Critical paths |
| Billing | 90% | 85% | Full flows |
| Compliance | 85% | 80% | Audit flows |
| Admin RBAC | 80% | 85% | Role scenarios |
| Business Ops | 75% | 70% | Happy paths |

---

## Appendix

### A. Test Naming Conventions

```typescript
// Format: should_[expected behavior]_when_[condition]
describe('InvoiceService', () => {
  it('should_calculate_gst_when_indian_tenant', () => {});
  it('should_apply_exchange_rate_when_cross_currency', () => {});
  it('should_throw_error_when_invalid_amount', () => {});
});
```

### B. Data-TestId Conventions

| Element Type | Pattern | Example |
|--------------|---------|---------|
| Button | `button-{action}` | `button-submit` |
| Input | `input-{field}` | `input-email` |
| Link | `link-{destination}` | `link-dashboard` |
| Text | `text-{content}` | `text-username` |
| Card | `card-{type}-{id}` | `card-invoice-123` |
| Row | `row-{type}-{index}` | `row-customer-0` |

### C. Test Environment Matrix

| Environment | Purpose | Database | Auth |
|-------------|---------|----------|------|
| Local | Development | Docker PostgreSQL | Mock |
| CI | Automated tests | GitHub Services | Mock |
| QA | Manual testing | Shared PostgreSQL | Real SSO |
| Staging | Pre-prod | Prod replica | Real SSO |
| Production | Live | Production | Real SSO |

### D. Defect Severity Classification

| Severity | Description | SLA |
|----------|-------------|-----|
| P0 - Critical | System down, data loss, security breach | 4 hours |
| P1 - High | Major feature broken, workaround difficult | 24 hours |
| P2 - Medium | Feature impaired, workaround available | 72 hours |
| P3 - Low | Minor issue, cosmetic | Next sprint |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-07 | MyBizStream Team | Initial version |

---

*This document is a living document and should be updated as the platform evolves.*
