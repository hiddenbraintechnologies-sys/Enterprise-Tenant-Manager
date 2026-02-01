# Route Coverage Checklist

## Cross-Tenant Access Policy

**Canonical Rule (Implemented 2026-02-01):**

| HTTP Status | Meaning | When to Use |
|-------------|---------|-------------|
| **404** | Resource not found | Resource ID doesn't exist OR belongs to another tenant |
| **403** | Permission denied | User lacks permission WITHIN their own tenant (RBAC failure) |

**Why 404 for cross-tenant access?**
- Prevents tenant enumeration attacks
- An attacker cannot distinguish between "ID doesn't exist" and "ID exists but belongs to another tenant"
- Same response for both cases provides no information leakage

**Helper File:** `server/utils/assert-tenant-owned.ts`
- `assertTenantOwnedOr404(record, options)` - Throws if record is null/undefined
- `assertMutationSucceededOr404(result, options)` - Throws if mutation affected 0 rows
- `TenantResourceNotFoundError` - Error class with `code: "RESOURCE_NOT_FOUND"`

**Usage Pattern:**
```typescript
// In route handler
const employee = await storage.getById(tenantId, id);
assertTenantOwnedOr404(employee, { resourceName: "Employee" });
// If we get here, employee is guaranteed non-null
```

---

## A) Multi-Tenant Authorization Audit

### Route Classification

#### 1. Platform-Level (Super-Admin/Admin Scoped)
These routes require platform admin auth, NOT tenant context.

| Route File | Scope | Required Middleware | Status |
|------------|-------|---------------------|--------|
| `server/routes/admin/addons.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin/countries.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin/marketplace-revenue.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin/payroll-analytics.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin/promos.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin-billing-offers.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/admin-billing-plans.ts` | Platform | `requireAuth` → `requirePlatformAdmin` | ⬜ Audit |
| `server/routes/super-admin/marketplace-analytics.ts` | Platform | `requireAuth` → `requireSuperAdmin` | ⬜ Audit |
| `server/routes/super-admin/marketplace-management.ts` | Platform | `requireAuth` → `requireSuperAdmin` | ⬜ Audit |

#### 2. Webhooks (External Callbacks)
Tenant context differs; requires signature verification.

| Route File | Scope | Required Middleware | Status |
|------------|-------|---------------------|--------|
| `server/routes/billing/razorpay-webhooks.ts` | Webhook | Signature verification | ⬜ Audit |
| `server/routes/webhooks/razorpay-marketplace.ts` | Webhook | Signature verification | ⬜ Audit |

#### 3. Public (No Auth)
Must never leak tenant data.

| Route File | Scope | Required Middleware | Status |
|------------|-------|---------------------|--------|
| `server/routes/public.ts` | Public | None | ⬜ Audit |

#### 4. Tenant-Scoped (MUST have requireAuth + requireTenantContext)

| Route File | Scope | Required Middleware | Status |
|------------|-------|---------------------|--------|
| `server/routes/dashboard-api.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/employee-portal.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/tenant-settings.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/services/index.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/subscriptions.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/addons.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/marketplace/tenant-addons.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/hrms/index.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/furniture.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/furniture-guardrails.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/business-registry.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/business-version.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/catalog.ts` | Tenant/Global | Check usage | ⬜ Audit |
| `server/routes/phase3-onboarding.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/feature-flags.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/entitlements.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/marketplace-addon.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/payroll-addon.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/addon-permissions.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/promos.ts` | Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |

#### 5. Platform/Global (Check Usage)

| Route File | Scope | Required Middleware | Status |
|------------|-------|---------------------|--------|
| `server/routes/feature-registry.ts` | Platform | Check if global or tenant | ⬜ Audit |
| `server/routes/module-registry.ts` | Platform | Check if global or tenant | ⬜ Audit |
| `server/routes/region-lock.ts` | Middleware | Guard/middleware | ⬜ Audit |
| `server/routes/ai-audit.ts` | Check | Determine scope | ⬜ Audit |
| `server/routes/ai-permissions.ts` | Check | Determine scope | ⬜ Audit |
| `server/routes/billing.ts` | Check | Determine scope | ⬜ Audit |

---

## B) Add-on Enforcement Coverage

### HRMS Module Routes

| Route File | Required Add-on | Middleware | Read (GET) | Write (POST/PUT/DELETE) | Status |
|------------|-----------------|------------|------------|-------------------------|--------|
| `server/routes/hrms/employees.ts` | hrms OR payroll | `requireAnyAddon(['hrms','payroll'])` | allowGrace: true | allowGrace: false | ✅ Implemented |
| `server/routes/hrms/attendance.ts` | hrms only | `requireAddon('hrms')` | allowGrace: true | allowGrace: false | ✅ Implemented |
| `server/routes/hrms/leaves.ts` | hrms only | `requireAddon('hrms')` | allowGrace: true | allowGrace: false | ✅ Implemented |
| `server/routes/hrms/projects.ts` | hrms only | `requireAddon('hrms')` | allowGrace: true | allowGrace: false | ✅ Implemented |
| `server/routes/hrms/payroll.ts` | payroll + hrms dep | `requireAddon('payroll', {dependency:['hrms']})` | allowGrace: true | allowGrace: false | ✅ Implemented |
| `server/routes/hrms/index.ts` | Router-level mount | Per-subrouter guards | N/A | N/A | ✅ Implemented |

### Billing/Add-on Management Routes

| Route File | Required | Middleware | Status |
|------------|----------|------------|--------|
| `server/routes/billing/entitlements.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ✅ Verified |
| `server/routes/billing/marketplace-addon.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/payroll-addon.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/billing/addon-permissions.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/addons.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |
| `server/routes/marketplace/tenant-addons.ts` | Auth + Tenant | `requireAuth` → `requireTenantContext` | ⬜ Audit |

---

## C) Drizzle Query Scoping Rules

### Red Flags to Search For
```typescript
// BAD: Missing tenantId filter
eq(table.id, id)

// BAD: No tenant filter
.findFirst() / .findMany()

// BAD: Update/delete by id only
db.update(table).where(eq(table.id, id))
db.delete(table).where(eq(table.id, id))
```

### Correct Pattern
```typescript
// GOOD: Always include tenantId
db.select().from(table).where(
  and(
    eq(table.tenantId, ctx.tenantId),
    eq(table.id, id)
  )
)

// GOOD: Use scoping helper
import { scopedWhere, scopedWhereById } from '../lib/tenant-scope';

// For lists
scopedWhere(table, tenantId, additionalConditions)

// For single record
scopedWhereById(table, tenantId, recordId)
```

### Tenant-Owned Tables (Must Always Filter by tenantId)
- employees
- departments
- attendance
- leaves
- payroll runs / payslips
- invoices
- bookings
- services
- catalog items (if tenant-specific)
- tenant_addons
- tenant_settings
- furniture orders

---

## D) Frontend UI Route Protection

### HRMS Pages

| Page Route | Required Add-on | Wrapper Component | Status |
|------------|-----------------|-------------------|--------|
| `/hr` | hrms OR payroll | `<RequireEmployeeDirectory>` | ✅ Implemented |
| `/hr/employees` | hrms OR payroll | `<RequireEmployeeDirectory>` | ✅ Implemented |
| `/hr/attendance` | hrms | `<RequireHrms>` | ✅ Implemented |
| `/hr/leaves` | hrms | `<RequireHrms>` | ✅ Implemented |
| `/hr/projects` | hrms | `<RequireHrms>` | ✅ Implemented |
| `/hr/timesheets` | hrms | `<RequireHrms>` | ✅ Implemented |
| `/hr/allocations` | hrms | `<RequireHrms>` | ✅ Implemented |
| `/hr/payroll` | payroll | `<RequirePayroll>` | ✅ Implemented |
| `/hr/pay-runs` | payroll | `<RequirePayroll>` | ✅ Implemented |
| `/hr/billing` | hrms OR payroll | `<RequireEmployeeDirectory>` | ✅ Implemented |

### UI Behavior Rules
- ✅ Sidebar items: hidden or locked consistently
- ✅ Never show "Loading" as status badge (use skeleton)
- ✅ Fail-closed: don't render protected content while entitlements loading
- ✅ Redirect to `/my-add-ons` when not entitled

---

## E) Test Coverage Requirements

### Tenant Isolation Tests (DB Layer)
- [x] HRMS employees list returns only tenant A records (not tenant B)
- [x] Reading tenant B's employee returns undefined (→ API returns 404)
- [x] Update tenant B's record fails and doesn't mutate
- [x] Delete tenant B's record fails and record still exists
- [x] Count/pagination is tenant-scoped (no leaks via totals)
- [x] Services list isolation (secondary resource)

**Test file:** `server/__tests__/tenant-isolation.test.ts`
**Utilities:** `server/__tests__/utils/tenant-test-utils.ts`

### Tenant Isolation Tests (HTTP Layer)
- [x] GET /api/hr/employees only returns tenant A employees
- [x] GET /api/hr/employees/:id with tenant B ID returns 404/403
- [x] PUT /api/hr/employees/:id with tenant B ID returns 404/403 and DB unchanged
- [x] DELETE /api/hr/employees/:id with tenant B ID returns 404/403 and record exists
- [x] GET /api/hr/departments isolation verified
- [x] GET /api/hr/dashboard counts are tenant-scoped
- [x] Cross-check: User B cannot access tenant A data

**Test file:** `server/__tests__/tenant-isolation-http.test.ts`
**Note:** Requires running server (uses http://localhost:5000)

### Add-on Enforcement Tests
- [x] Expired addon returns 403 with `ADDON_EXPIRED`
- [x] Not installed returns 403 with `ADDON_NOT_INSTALLED`
- [x] Missing dependency returns 403 with `ADDON_DEPENDENCY_MISSING`
- [x] Expired dependency returns 403 with `ADDON_DEPENDENCY_EXPIRED`
- [x] Grace period allows GET, blocks POST/PUT/DELETE
- [x] Renewal checkout creates payment link
- [x] Payment verification activates entitlement

---

## F) Implementation Status Summary

| Category | Total | Completed | Pending |
|----------|-------|-----------|---------|
| Platform Routes | 9 | 0 | 9 |
| Webhook Routes | 2 | 0 | 2 |
| Public Routes | 1 | 0 | 1 |
| Tenant Routes | 20+ | 6 | 14+ |
| HRMS Add-on Enforcement | 6 | 6 | 0 |
| Billing Routes | 6 | 1 | 5 |
| Frontend UI Guards | 10 | 10 | 0 |

### Priority Order
1. ✅ HRMS add-on enforcement (COMPLETED)
2. ✅ Tenant isolation tests - DB layer (COMPLETED)
3. ✅ Tenant isolation tests - HTTP layer (COMPLETED)
4. ⬜ Tenant-scoped route audit (HIGH)
5. ⬜ Billing routes audit (HIGH)
6. ⬜ Platform/admin routes audit (MEDIUM)
