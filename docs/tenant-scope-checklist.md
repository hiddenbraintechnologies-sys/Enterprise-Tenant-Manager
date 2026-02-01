# Tenant Scope Checklist

This document provides guidelines for ensuring proper tenant isolation in MyBizStream.

## Tenant-Owned Tables

The following tables contain tenant-specific data and MUST include `tenantId` in all queries:

| Table | Description |
|-------|-------------|
| `hr_employees` | Employee records |
| `hr_departments` | Department structure |
| `hr_attendance` | Attendance records |
| `hr_leaves` | Leave requests |
| `hr_leave_types` | Leave type definitions |
| `hr_leave_balances` | Employee leave balances |
| `hr_payroll` | Payroll records |
| `hr_salary_structures` | Salary component definitions |
| `hr_projects` | Project records |
| `hr_allocations` | Employee-project allocations |
| `hr_timesheets` | Timesheet entries |
| `hr_holidays` | Company holidays |
| `invoices` | Customer invoices |
| `bookings` | Service bookings |
| `customers` | Customer records |
| `services` | Service definitions |
| `products` | Product catalog |
| `appointments` | Scheduled appointments |
| `documents` | Document storage |
| `notifications` | User notifications |
| `tenant_features` | Feature flags per tenant |
| `tenant_settings` | Tenant configuration |
| `tenant_branding` | Branding customization |
| `tenant_addons` | Add-on subscriptions |
| `api_tokens` | API authentication tokens |
| `user_tenants` | User-tenant associations |
| `audit_logs` | Audit trail entries |

## Required Patterns

### 1. Middleware Order

Every tenant-scoped route MUST follow this middleware order:

```typescript
router.use(authenticateHybrid({ required: true }));  // 1. Authentication
router.use(tenantIsolationMiddleware());             // 2. Tenant context
router.use(requireMinimumRole("manager"));           // 3. RBAC (optional)
```

### 2. Query Patterns

**SELECT (List):**
```typescript
// CORRECT: Always include tenantId
const employees = await db.select()
  .from(hrEmployees)
  .where(eq(hrEmployees.tenantId, tenantId));

// WRONG: No tenant filter
const employees = await db.select().from(hrEmployees);
```

**SELECT (Single):**
```typescript
// CORRECT: Include both tenantId AND id
const [employee] = await db.select()
  .from(hrEmployees)
  .where(and(
    eq(hrEmployees.tenantId, tenantId),
    eq(hrEmployees.id, id)
  ));

// WRONG: Only filtering by id
const [employee] = await db.select()
  .from(hrEmployees)
  .where(eq(hrEmployees.id, id));
```

**UPDATE:**
```typescript
// CORRECT: Include tenantId in WHERE clause
const [updated] = await db.update(hrEmployees)
  .set({ status: "active" })
  .where(and(
    eq(hrEmployees.tenantId, tenantId),
    eq(hrEmployees.id, id)
  ))
  .returning();

// WRONG: Only filtering by id
const [updated] = await db.update(hrEmployees)
  .set({ status: "active" })
  .where(eq(hrEmployees.id, id))
  .returning();
```

**DELETE:**
```typescript
// CORRECT: Include tenantId in WHERE clause
await db.delete(hrEmployees)
  .where(and(
    eq(hrEmployees.tenantId, tenantId),
    eq(hrEmployees.id, id)
  ));

// WRONG: Only filtering by id
await db.delete(hrEmployees)
  .where(eq(hrEmployees.id, id));
```

**INSERT:**
```typescript
// CORRECT: Always include tenantId
await db.insert(hrEmployees).values({
  ...data,
  tenantId,  // REQUIRED
});
```

### 3. Using Scoping Helpers

Import and use the scoping helpers from `server/lib/tenant-scope.ts`:

```typescript
import { scopedWhere, scopedWhereById, scopedInsert } from "../lib/tenant-scope";

// For list queries
const employees = await db.select()
  .from(hrEmployees)
  .where(scopedWhere(hrEmployees, tenantId));

// For single-record queries
const [employee] = await db.select()
  .from(hrEmployees)
  .where(scopedWhereById(hrEmployees, tenantId, hrEmployees.id, id));

// For inserts
await db.insert(hrEmployees).values(
  scopedInsert(data, tenantId)
);
```

## Adding New Endpoints

When creating new tenant-scoped endpoints:

1. **Apply middleware stack:**
   ```typescript
   import { tenantIsolationMiddleware } from "../core/tenant-isolation";
   
   router.use(tenantIsolationMiddleware());
   ```

2. **Get tenantId from context:**
   ```typescript
   const tenantId = req.context?.tenant?.id;
   if (!tenantId) {
     return res.status(403).json({ error: "Tenant context required" });
   }
   ```

3. **Pass tenantId to storage/service layer:**
   ```typescript
   const result = await myStorage.getData(tenantId, params);
   ```

4. **Validate ownership for detail/update/delete:**
   ```typescript
   const record = await myStorage.getById(tenantId, id);
   if (!record) {
     return res.status(404).json({ error: "Not found" });
   }
   // Record is guaranteed to belong to this tenant
   ```

## Banned Patterns

These patterns are PROHIBITED as they can lead to data leaks:

| Pattern | Risk |
|---------|------|
| `findFirst` without tenant filter | Returns first matching record from ANY tenant |
| `findMany` without tenant filter | Returns records from ALL tenants |
| `update().where(eq(id))` | Could update another tenant's record |
| `delete().where(eq(id))` | Could delete another tenant's record |
| Trusting `tenantId` from request body | User could spoof tenant ID |

## Testing Requirements

Every tenant-scoped feature should have isolation tests that verify:

1. **List isolation:** Listing returns only current tenant's records
2. **Detail isolation:** Getting another tenant's record returns 404
3. **Update isolation:** Updating another tenant's record returns null/fails
4. **Delete isolation:** Deleting another tenant's record returns false/fails

See `server/__tests__/tenant-isolation.test.ts` for examples.

## Key Files

| File | Purpose |
|------|---------|
| `server/core/tenant-isolation.ts` | Main isolation infrastructure |
| `server/middleware/tenant-context.ts` | Request context middleware |
| `server/lib/tenant-scope.ts` | Scoping helper functions |
| `server/core/context.ts` | Request context types and resolution |
| `server/core/auth-middleware.ts` | Authentication middleware |
