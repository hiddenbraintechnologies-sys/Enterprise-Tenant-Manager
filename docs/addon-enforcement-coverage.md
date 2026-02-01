# Add-on Enforcement Coverage

This document lists all API routes protected by add-on entitlement middleware and their enforcement rules.

## Enforcement States

| State | Description | Read Access | Write Access |
|-------|-------------|-------------|--------------|
| `active` | Paid subscription valid | ✅ | ✅ |
| `trial` | Active trial period | ✅ | ✅ |
| `grace` | Expired but within grace period (3 days) | ✅ | ❌ |
| `expired` | Subscription/trial fully expired | ❌ | ❌ |
| `not_installed` | Add-on not installed | ❌ | ❌ |
| `cancelled` | Explicitly cancelled | ❌ | ❌ |

## Error Codes

| Code | Description |
|------|-------------|
| `ADDON_EXPIRED` | Subscription has expired |
| `ADDON_TRIAL_EXPIRED` | Trial period has ended |
| `ADDON_NOT_INSTALLED` | Add-on is not installed |
| `ADDON_CANCELLED` | Add-on has been cancelled |
| `ADDON_DEPENDENCY_MISSING` | Required dependency not installed |
| `ADDON_DEPENDENCY_EXPIRED` | Required dependency has expired |

## HR Module Routes

### Employee Directory (HR Foundation)
**Required Add-on:** `hrms` OR `payroll` (either grants access)

| Route | Method | Middleware | Grace Period |
|-------|--------|------------|--------------|
| `/api/hr/dashboard` | GET | `requireEmployeeAccess()` | ✅ Read only |
| `/api/hr/departments` | GET | `requireEmployeeAccess()` | ✅ Read only |
| `/api/hr/departments` | POST | `requireEmployeeAccess()` | ❌ Blocked |
| `/api/hr/employees` | GET | `requireEmployeeAccess()` | ✅ Read only |
| `/api/hr/employees` | POST | `requireEmployeeAccess()` | ❌ Blocked |
| `/api/hr/employees/:id` | GET | `requireEmployeeAccess()` | ✅ Read only |
| `/api/hr/employees/:id` | PATCH | `requireEmployeeAccess()` | ❌ Blocked |
| `/api/hr/employees/:id` | DELETE | `requireEmployeeAccess()` | ❌ Blocked |

### HRMS Suite (Attendance, Leaves, Projects)
**Required Add-on:** `hrms` only (payroll does NOT grant access)

| Route | Method | Middleware | Grace Period |
|-------|--------|------------|--------------|
| `/api/hr/attendance` | GET | `requireHrmsSuiteAccess()` | ✅ Read only |
| `/api/hr/attendance` | POST | `requireHrmsSuiteAccess()` | ❌ Blocked |
| `/api/hr/attendance/:id` | PATCH | `requireHrmsSuiteAccess()` | ❌ Blocked |
| `/api/hr/leaves` | GET | `requireHrmsSuiteAccess()` | ✅ Read only |
| `/api/hr/leaves` | POST | `requireHrmsSuiteAccess()` | ❌ Blocked |
| `/api/hr/leaves/:id` | PATCH | `requireHrmsSuiteAccess()` | ❌ Blocked |
| `/api/hr/projects` | ALL | `requireHrmsSuiteAccess()` | ✅/❌ |

### Payroll Suite
**Required Add-on:** `payroll` only (HRMS does NOT grant access)
**Dependencies:** Requires `hrms` add-on installed

| Route | Method | Middleware | Grace Period |
|-------|--------|------------|--------------|
| `/api/hr/payroll/settings` | GET | `requirePayrollAccess()` | ✅ Read only |
| `/api/hr/payroll/settings` | PATCH | `requirePayrollAccess()` | ❌ Blocked |
| `/api/hr/payroll/salary-structures` | GET | `requirePayrollAccess()` | ✅ Read only |
| `/api/hr/payroll/salary-structures` | POST | `requirePayrollAccess()` | ❌ Blocked |
| `/api/hr/payroll/pay-runs` | GET | `requirePayrollAccess()` | ✅ Read only |
| `/api/hr/payroll/pay-runs/generate` | POST | `requirePayrollAccess()` | ❌ Blocked |
| `/api/hr/payroll/pay-runs/:id/approve` | POST | `requirePayrollAccess()` | ❌ Blocked |
| `/api/hr/payroll/pay-runs/:id/mark-paid` | POST | `requirePayrollAccess()` | ❌ Blocked |
| `/api/hr/payroll/payslips/:id/pdf` | GET | `requirePayrollAccess()` | ✅ Read only |

## Entitlements API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/billing/entitlements` | GET | Get all tenant entitlements |
| `/api/billing/entitlements/:addonCode` | GET | Get specific add-on entitlement |
| `/api/billing/entitlements/:addonCode/checkout` | POST | Create renewal checkout |
| `/api/billing/entitlements/:addonCode/verify-payment` | POST | Verify payment and activate |

## Frontend Route Protection

### RequireAddon Wrappers

All HR module pages are wrapped with fail-closed add-on enforcement:

| Frontend Route | Required Add-on | Wrapper |
|----------------|-----------------|---------|
| `/hr` | hrms OR payroll | `<RequireEmployeeDirectory>` |
| `/hr/employees` | hrms OR payroll | `<RequireEmployeeDirectory>` |
| `/hr/attendance` | hrms | `<RequireHrms>` |
| `/hr/leaves` | hrms | `<RequireHrms>` |
| `/hr/payroll` | payroll | `<RequirePayroll>` |
| `/hr/pay-runs` | payroll | `<RequirePayroll>` |
| `/hr/projects` | hrms | `<RequireHrms>` |
| `/hr/timesheets` | hrms | `<RequireHrms>` |
| `/hr/allocations` | hrms | `<RequireHrms>` |
| `/hr/billing` | hrms OR payroll | `<RequireEmployeeDirectory>` |

### Fail-Closed Behavior

1. **While Loading:** Show skeleton, do NOT render protected content
2. **On Error:** Treat as not entitled (fail-closed)
3. **Not Entitled:** Redirect to `/my-add-ons` with toast notification and error code (e.g., ADDON_NOT_INSTALLED, ADDON_EXPIRED)
4. **Entitled:** Render protected content

## Dependency Chain

```
payroll → hrms (Payroll requires HRMS to be installed)
payroll-india → hrms OR hrms-india
payroll-malaysia → hrms OR hrms-malaysia
payroll-uk → hrms OR hrms-uk
```

## Implementation Files

### Backend
- `server/middleware/require-addon.ts` - Generic add-on middleware
- `server/core/hr-addon-gating.ts` - HR-specific middleware
- `server/services/entitlement.ts` - Entitlement computation service
- `server/routes/billing/entitlements.ts` - Entitlements API

### Frontend
- `client/src/hooks/use-entitlements.ts` - Entitlement hooks
- `client/src/components/gating/require-addon.tsx` - Route wrapper components
- `client/src/components/my-addons.tsx` - My Add-ons page
