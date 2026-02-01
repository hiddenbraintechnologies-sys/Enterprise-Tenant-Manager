# Security Documentation

## Tenant Isolation Lint

A static analysis script that flags potentially unsafe database queries accessing tenant-owned tables without explicit `tenantId` scoping.

### Quick Start

```bash
# Run manually
./scripts/lint-tenant-isolation.sh

# Exit codes
# 0 = pass (no violations)
# 1 = fail (violations found)
```

### CI Integration

Add to your CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/ci.yml
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Tenant Isolation Lint
        run: ./scripts/lint-tenant-isolation.sh
        
      - name: Run Tests
        run: npm test
```

### Allowlist

Patterns in `scripts/tenant-isolation-allowlist.txt` are excluded from checks.

**Format:**
- `server/routes/file.ts:123` - Exclude specific line
- `server/routes/file.ts:` - Exclude entire file

**When to allowlist:**
1. Updates by primary key AFTER fetching with tenantId scoping
2. Routes protected by `requireTenantContext` middleware
3. Internal services that receive `tenantId` in function parameters
4. Platform-level tables (not tenant-scoped by design)

### What It Checks

1. **Tenant table queries without tenantId:**
   - `eq(hrEmployees.id, ...)` without `tenantId` in same query
   - `findFirst` on tenant tables without `tenantId` filter

2. **Unscoped mutations:**
   - `.delete()` calls outside admin routes without `tenantId`

### Tables Monitored

- `hrEmployees`, `hrDepartments`
- `services`, `bookings`, `invoices`
- `tenantAddons`, `tenantPayrollAddon`, `tenantSubscriptions`
- `employees`

---

## Tenant Isolation Contract

### Design Principles

1. **404 for cross-tenant access** - Never reveal resource existence to other tenants
2. **403 for RBAC failures** - Only within same tenant (permission denied)
3. **Fail-closed** - Missing tenant context = 403 Forbidden

### Error Response Format

```typescript
// Cross-tenant access (returns 404)
{
  error: "RESOURCE_NOT_FOUND",
  message: "Resource not found"
}

// Permission denied within tenant (returns 403)
{
  error: "FORBIDDEN",
  message: "Insufficient permissions"
}
```

### Test Coverage

- **DB-layer tests:** 12 passing
- **HTTP-layer tests:** 14 passing
- **Admin route guards:** 57 tests verify tenant users get 403

---

## Add-on Entitlement Enforcement

### States

| State | Description | API Access |
|-------|-------------|------------|
| `active` | Paid subscription valid | Full access |
| `trial` | Trial period active | Full access |
| `grace` | Expired, within grace period | Reads only |
| `expired` | Fully expired | Blocked |
| `not_installed` | Not installed | Blocked |
| `cancelled` | Explicitly cancelled | Blocked |

### Error Codes

- `ADDON_EXPIRED` - Subscription has expired
- `ADDON_TRIAL_EXPIRED` - Trial period ended
- `ADDON_NOT_INSTALLED` - Add-on not installed
- `ADDON_CANCELLED` - Add-on was cancelled
- `ADDON_DEPENDENCY_MISSING` - Required dependency not installed
- `ADDON_DEPENDENCY_EXPIRED` - Required dependency expired

### Middleware

```typescript
// Tenant routes
requireAddonMiddleware("hrms", { allowGraceForReads: true })

// Employee portal
requireEmployeeAddon("payroll", { allowGraceForReads: true })
```

---

## Admin Route Security

### Guard Hierarchy

1. **Super Admin routes** (`/api/super-admin/*`) - Platform operators only
2. **Admin routes** (`/api/admin/*`) - Tenant admins only
3. **Tenant routes** - Users within their tenant

### Response Codes

- **401** - Unauthenticated
- **403** - Authenticated but wrong role/tenant
- **404** - Resource not found (cross-tenant access)
