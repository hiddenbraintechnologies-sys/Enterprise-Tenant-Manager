# Manual Add-on Enforcement Test Script

This document provides step-by-step instructions for manually testing add-on enforcement.

## Prerequisites

1. Access to the database (via SQL tool or Drizzle Studio)
2. A test tenant with installed add-ons
3. Authentication credentials for the test tenant

## Test Scenarios

### Scenario 1: Expired Trial Blocks Access

**Goal:** Verify that an expired trial blocks both API and UI access.

**Steps:**

1. Find the tenant's add-on installation:
```sql
SELECT ta.id, ta.tenant_id, a.slug, ta.status, ta.subscription_status, 
       ta.trial_ends_at, ta.current_period_end
FROM tenant_addons ta
JOIN addons a ON ta.addon_id = a.id
WHERE ta.tenant_id = '<your-tenant-id>'
AND a.slug = 'hrms';
```

2. Set trial to expired (yesterday):
```sql
UPDATE tenant_addons 
SET trial_ends_at = NOW() - INTERVAL '1 day',
    subscription_status = 'trialing',
    status = 'trial'
WHERE id = '<addon-installation-id>';
```

3. Test API access:
```bash
curl -X GET "https://<your-domain>/api/hr/attendance" \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Expected Result:** 
- HTTP 403 Forbidden
- Response body: `{"error":"ADDON_ACCESS_DENIED","code":"ADDON_TRIAL_EXPIRED",...}`

4. Test UI access:
- Navigate to `/hr/attendance` in the browser
- **Expected:** Redirect to `/my-add-ons` with toast message "Your trial has ended"

5. **Restore:** 
```sql
UPDATE tenant_addons 
SET trial_ends_at = NOW() + INTERVAL '7 days'
WHERE id = '<addon-installation-id>';
```

---

### Scenario 2: Active Subscription Allows Access

**Goal:** Verify that a valid paid subscription grants full access.

**Steps:**

1. Set subscription to active with future expiry:
```sql
UPDATE tenant_addons 
SET subscription_status = 'active',
    status = 'active',
    current_period_end = NOW() + INTERVAL '30 days',
    trial_ends_at = NULL
WHERE id = '<addon-installation-id>';
```

2. Test API access:
```bash
curl -X GET "https://<your-domain>/api/hr/attendance" \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Expected Result:**
- HTTP 200 OK
- Response body: attendance data

3. Test UI access:
- Navigate to `/hr/attendance` in the browser
- **Expected:** Attendance page renders normally

---

### Scenario 3: Grace Period - Read Allowed, Write Blocked

**Goal:** Verify grace period allows reads but blocks writes.

**Steps:**

1. Set subscription to grace period:
```sql
UPDATE tenant_addons 
SET subscription_status = 'grace_period',
    status = 'active',
    current_period_end = NOW() - INTERVAL '1 day',
    grace_until = NOW() + INTERVAL '2 days'
WHERE id = '<addon-installation-id>';
```

2. Test READ access:
```bash
curl -X GET "https://<your-domain>/api/hr/attendance" \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Expected:** HTTP 200 OK

3. Test WRITE access:
```bash
curl -X POST "https://<your-domain>/api/hr/attendance" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp-1","date":"2026-02-01","checkIn":"09:00"}'
```

**Expected:** HTTP 403 Forbidden (write blocked during grace)

---

### Scenario 4: Payroll Requires HRMS Dependency

**Goal:** Verify payroll is blocked when HRMS is missing/expired.

**Steps:**

1. Ensure HRMS is NOT installed or expired for the tenant:
```sql
UPDATE tenant_addons 
SET subscription_status = 'expired',
    status = 'active',
    current_period_end = NOW() - INTERVAL '5 days',
    grace_until = NULL
WHERE tenant_id = '<your-tenant-id>'
AND addon_id = (SELECT id FROM addons WHERE slug LIKE 'hrms%' LIMIT 1);
```

2. Test Payroll API access:
```bash
curl -X GET "https://<your-domain>/api/hr/payroll/settings" \
  -H "Authorization: Bearer <your-jwt-token>"
```

**Expected Result:**
- HTTP 403 Forbidden
- Response: `{"error":"ADDON_ACCESS_DENIED","code":"ADDON_DEPENDENCY_EXPIRED",...}`

---

### Scenario 5: My Add-ons Page Button Logic

**Goal:** Verify Renew/Open buttons show correctly.

**Steps:**

1. Navigate to `/my-add-ons`

2. For **Active** add-on:
   - Should show "Open" button (links to module)
   - Status badge: "Active" (green)

3. For **Expired** add-on:
   - Should show "Renew" button
   - Status badge: "Expired" (red)

4. For **Trial** add-on:
   - Should show "Open" button
   - Status badge: "Trial - X days" (amber)

5. While loading:
   - Should show skeleton placeholder (NOT "Loading" text)

---

## Cleanup Commands

Reset all test add-ons to active state:
```sql
UPDATE tenant_addons 
SET subscription_status = 'active',
    status = 'active',
    current_period_end = NOW() + INTERVAL '30 days',
    trial_ends_at = NULL,
    grace_until = NULL
WHERE tenant_id = '<your-tenant-id>';
```

## Verification Checklist

- [ ] Expired trial returns 403 on API
- [ ] Expired trial redirects to /my-add-ons on UI
- [ ] Active subscription allows full access
- [ ] Grace period allows GET, blocks POST/PUT/DELETE
- [ ] Missing dependency blocks payroll
- [ ] Expired dependency blocks payroll
- [ ] My Add-ons shows correct button (Open vs Renew)
- [ ] No "Loading" text appears (skeletons only)
