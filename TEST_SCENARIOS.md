# MyBizStream - Comprehensive Test Scenarios

## Document Information
| Field | Value |
|-------|-------|
| Version | 1.0 |
| Last Updated | 2026-01-07 |
| Project | MyBizStream Multi-Tenant SaaS Platform |

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Registration & Onboarding](#2-user-registration--onboarding)
3. [Multi-Tenancy](#3-multi-tenancy)
4. [Platform Admin System (5-Tier RBAC)](#4-platform-admin-system-5-tier-rbac)
5. [Region & Country Configuration](#5-region--country-configuration)
6. [Multi-Currency & Exchange Rates](#6-multi-currency--exchange-rates)
7. [Billing & Invoicing](#7-billing--invoicing)
8. [Business Operations](#8-business-operations)
9. [Compliance Modules](#9-compliance-modules)
10. [White-Label & Reseller](#10-white-label--reseller)
11. [Tech Support Dashboard](#11-tech-support-dashboard)
12. [Security Features](#12-security-features)
13. [API Testing](#13-api-testing)
14. [UI/UX Testing](#14-uiux-testing)
15. [Mobile Application](#15-mobile-application)
16. [Customer Portal](#16-customer-portal)

---

## 1. Authentication & Authorization

### 1.1 User Login

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| AUTH-001 | Login with valid email/password | User account exists | 1. Navigate to /login<br>2. Enter valid email<br>3. Enter valid password<br>4. Click Sign In | User logged in, redirected to dashboard, JWT tokens stored | P0 |
| AUTH-002 | Login with invalid password | User account exists | 1. Navigate to /login<br>2. Enter valid email<br>3. Enter wrong password<br>4. Click Sign In | Error message "Invalid email or password", no tokens stored | P0 |
| AUTH-003 | Login with non-existent email | - | 1. Navigate to /login<br>2. Enter unregistered email<br>3. Enter any password<br>4. Click Sign In | Error message "Invalid email or password" | P0 |
| AUTH-004 | Login with empty fields | - | 1. Navigate to /login<br>2. Leave fields empty<br>3. Click Sign In | Validation errors shown for required fields | P1 |
| AUTH-005 | Login with invalid email format | - | 1. Navigate to /login<br>2. Enter "notanemail"<br>3. Click Sign In | Validation error "Invalid email format" | P1 |
| AUTH-006 | Social login with Google | Google account exists | 1. Navigate to /login<br>2. Click "Continue with Google"<br>3. Complete OAuth flow | User authenticated and redirected | P1 |
| AUTH-007 | Social login with Replit | Replit account exists | 1. Navigate to /login<br>2. Click "Continue with Replit"<br>3. Complete OAuth flow | User authenticated and redirected | P1 |
| AUTH-008 | Remember me functionality | User account exists | 1. Login with remember me checked<br>2. Close browser<br>3. Reopen and navigate to app | User session persists | P2 |

### 1.2 JWT Token Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| JWT-001 | Access token expiration | User logged in | 1. Wait for access token to expire (15 min)<br>2. Make API request | Automatic token refresh, request succeeds | P0 |
| JWT-002 | Refresh token rotation | User logged in | 1. Call /api/auth/token/refresh<br>2. Use new tokens | New token pair issued, old refresh token invalidated | P0 |
| JWT-003 | Invalid refresh token | Expired refresh token | 1. Call /api/auth/token/refresh with expired token | 401 error, user redirected to login | P0 |
| JWT-004 | Token revocation on logout | User logged in | 1. Call /api/auth/logout<br>2. Try using old tokens | Tokens invalidated, 401 on subsequent requests | P0 |
| JWT-005 | Concurrent session handling | User logged in on multiple devices | 1. Login on device A<br>2. Login on device B<br>3. Verify both sessions | Both sessions active with valid tokens | P1 |
| JWT-006 | Token with invalid signature | - | 1. Modify JWT payload<br>2. Make API request | 401 Unauthorized | P0 |

### 1.3 Password Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PWD-001 | Password reset request | User account exists | 1. Navigate to /forgot-password<br>2. Enter email<br>3. Submit | Reset email sent, confirmation message shown | P1 |
| PWD-002 | Password reset with valid token | Reset email received | 1. Click reset link<br>2. Enter new password<br>3. Confirm password<br>4. Submit | Password updated, redirect to login | P1 |
| PWD-003 | Password reset with expired token | Token expired (24h) | 1. Click old reset link<br>2. Try to reset | Error "Reset link expired" | P1 |
| PWD-004 | Password strength validation | - | 1. Try password without uppercase<br>2. Try password without number<br>3. Try password < 8 chars | Each fails with specific validation message | P1 |
| PWD-005 | Admin force password reset | Admin user, target user exists | 1. Admin navigates to user management<br>2. Select user<br>3. Click "Force Password Reset" | User must change password on next login | P1 |

---

## 2. User Registration & Onboarding

### 2.1 User Registration

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| REG-001 | Register new user | - | 1. Navigate to /register<br>2. Fill all required fields<br>3. Select business type<br>4. Submit | Account created, tenant created, redirect to dashboard | P0 |
| REG-002 | Register with existing email | Email already registered | 1. Navigate to /register<br>2. Enter existing email<br>3. Submit | Error "Email already registered" | P0 |
| REG-003 | Register with all business types | - | 1. Register as Salon<br>2. Register as Clinic<br>3. Register as PG/Hostel<br>... for all 11 types | Each type creates appropriate dashboard route | P1 |
| REG-004 | Password confirmation mismatch | - | 1. Enter password<br>2. Enter different confirmation<br>3. Submit | Error "Passwords do not match" | P1 |
| REG-005 | Registration from landing page | - | 1. Click "Get Started" on landing<br>2. Complete registration | Smooth flow to registration form | P2 |
| REG-006 | Link to login from register | - | 1. Navigate to /register<br>2. Click "Already have an account? Sign in" | Redirect to /login | P2 |

### 2.2 Onboarding Flow

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| ONB-001 | Get onboarding status | New user registered | 1. GET /api/onboarding/status | Returns current step, completion percentage | P1 |
| ONB-002 | Initialize onboarding | New user, no onboarding | 1. POST /api/onboarding/initialize | Onboarding progress created for business type | P1 |
| ONB-003 | Complete onboarding step | Onboarding in progress | 1. POST /api/onboarding/step/:stepKey<br>2. Complete required actions | Step marked complete, progress updated | P1 |
| ONB-004 | Skip onboarding | Onboarding in progress | 1. POST /api/onboarding/skip | Onboarding marked complete, tenant updated | P2 |
| ONB-005 | Advance to next step | Current step completed | 1. POST /api/onboarding/advance | Move to next step in sequence | P1 |
| ONB-006 | Check business type modification | New tenant | 1. GET /api/onboarding/can-modify-business-type | Returns true if allowed, false if locked | P2 |

---

## 3. Multi-Tenancy

### 3.1 Tenant Data Isolation

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| MT-001 | Query own tenant data | User logged in | 1. GET /api/customers<br>2. GET /api/bookings<br>3. GET /api/services | Only current tenant's data returned | P0 |
| MT-002 | Access other tenant data | User logged in | 1. Modify X-Tenant-ID header to other tenant<br>2. Make API request | 403 Forbidden | P0 |
| MT-003 | Create resource with tenant scope | User logged in | 1. POST /api/customers with data<br>2. Verify created resource | Resource created with current tenant_id | P0 |
| MT-004 | Cross-tenant resource access | Resource exists in Tenant B | 1. As Tenant A user, GET /api/customers/:id (Tenant B's customer) | 404 Not Found or 403 Forbidden | P0 |
| MT-005 | Tenant header validation | User logged in | 1. Make request without tenant context | Use default tenant from JWT | P1 |
| MT-006 | User with multiple tenants | User belongs to 2 tenants | 1. Login<br>2. Check available tenants<br>3. Switch tenant | Can switch between tenants, data changes accordingly | P1 |

### 3.2 Tenant Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| TM-001 | Get tenant details | Authenticated user | 1. GET /api/tenant | Returns current tenant info | P1 |
| TM-002 | Update tenant settings | Admin user | 1. PATCH /api/tenant with new settings | Tenant updated, audit log created | P1 |
| TM-003 | Tenant settings access | Non-admin user | 1. PATCH /api/tenant | 403 Forbidden | P1 |
| TM-004 | Get tenant settings | Authenticated user | 1. GET /api/tenant/settings | Returns tenant configuration | P2 |

### 3.3 Tenant Switching

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| TS-001 | Switch to another tenant | User has multiple tenants | 1. PATCH /api/auth/tenants/switch with target tenant | New tokens issued, context updated | P1 |
| TS-002 | Switch to unauthorized tenant | User has 1 tenant | 1. Try switching to tenant user doesn't belong to | 403 Forbidden | P1 |
| TS-003 | Verify data after switch | Multi-tenant user | 1. Switch tenant<br>2. Query data<br>3. Verify data belongs to new tenant | Data scoped to switched tenant | P1 |

---

## 4. Platform Admin System (5-Tier RBAC)

### 4.1 Super Admin

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| SA-001 | Super Admin login | Valid credentials | 1. Navigate to /admin-login<br>2. Enter superadmin@mybizstream.app / Admin@123!<br>3. Submit | Login success, redirect to /super-admin | P0 |
| SA-002 | Access Super Admin dashboard | Logged in as Super Admin | 1. Navigate to /super-admin | Full dashboard with global metrics displayed | P0 |
| SA-003 | Create Platform Admin | Super Admin logged in | 1. Navigate to /super-admin/admins<br>2. Click Create Admin<br>3. Select PLATFORM_ADMIN<br>4. Assign countries<br>5. Set permissions<br>6. Submit | Platform Admin created with assigned countries | P0 |
| SA-004 | Create Tech Support Manager | Super Admin logged in | 1. Create admin with TECH_SUPPORT_MANAGER role | Admin created with global technical access | P0 |
| SA-005 | Create Manager | Super Admin logged in | 1. Create admin with MANAGER role<br>2. Assign countries | Manager created with regional access | P1 |
| SA-006 | Create Support Team member | Super Admin logged in | 1. Create admin with SUPPORT_TEAM role<br>2. Assign countries | Support member created | P1 |
| SA-007 | Deactivate admin | Admin exists | 1. Select admin<br>2. Click Deactivate | Admin deactivated, cannot login | P1 |
| SA-008 | Access Feature Registry | Super Admin logged in | 1. Navigate to /super-admin/features | Feature registry displayed with all features | P1 |
| SA-009 | Access Module Registry | Super Admin logged in | 1. Navigate to /super-admin/modules | Module registry displayed | P1 |
| SA-010 | Access Business Registry | Super Admin logged in | 1. Navigate to /super-admin/business | Business type definitions displayed | P1 |

### 4.2 Platform Admin

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PA-001 | Platform Admin login | Valid credentials, country assigned | 1. Login as Platform Admin | Login success, redirect to /admin | P0 |
| PA-002 | View assigned country tenants | Platform Admin with IN, GB assigned | 1. Navigate to /admin/tenants | Only IN and GB tenants displayed | P0 |
| PA-003 | Access unassigned country | Platform Admin with IN only | 1. Try accessing GB tenant directly | 403 Forbidden or tenant not in list | P0 |
| PA-004 | Create tenant in assigned country | Has manage_tenants permission | 1. Create new tenant<br>2. Select assigned country | Tenant created successfully | P1 |
| PA-005 | Create tenant in unassigned country | Has manage_tenants permission | 1. Try creating tenant in unassigned country | Country not available in dropdown or 403 | P1 |
| PA-006 | View users (with permission) | Has read_users permission | 1. Navigate to user management | Users for assigned countries displayed | P1 |
| PA-007 | View users (without permission) | No read_users permission | 1. Navigate to user management | Access denied or option hidden | P1 |
| PA-008 | Reset user password | Has reset_passwords permission | 1. Select user<br>2. Reset password | Password reset, user notified | P1 |
| PA-009 | View audit logs | Has view_logs permission | 1. Navigate to audit logs | Logs for assigned countries shown | P2 |
| PA-010 | Create lower-level admin | Has manage_admins permission | 1. Create Manager or Support Team | Admin created with subset of own permissions | P1 |

### 4.3 Tech Support Manager

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| TS-001 | Access Tech Support dashboard | Tech Support Manager logged in | 1. Navigate to /tech-support | Dashboard with all tabs accessible | P0 |
| TS-002 | View system health | Tech Support logged in | 1. View Overview tab | System health status, uptime displayed | P0 |
| TS-003 | View service status | Tech Support logged in | 1. View Services tab | All services with status, latency shown | P0 |
| TS-004 | View API metrics | Tech Support logged in | 1. View APIs tab | API endpoints with request counts, error rates | P1 |
| TS-005 | View error logs | Tech Support logged in | 1. View Errors tab | Recent errors with stack traces | P1 |
| TS-006 | View performance metrics | Tech Support logged in | 1. View Performance tab | CPU, memory, response times shown | P1 |
| TS-007 | Auto-refresh verification | Tech Support logged in | 1. Stay on dashboard 60 seconds | Data refreshes every 30 seconds | P2 |
| TS-008 | No access to tenant management | Tech Support logged in | 1. Try accessing /admin/tenants | Access denied or redirect | P0 |
| TS-009 | No access to user management | Tech Support logged in | 1. Try accessing user management | Access denied or redirect | P0 |
| TS-010 | Read-only tenant view | Tech Support logged in | 1. View tenant info | Can view but not modify | P1 |

### 4.4 Manager

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| MG-001 | Access Manager dashboard | Manager logged in | 1. Navigate to /manager | Regional dashboard displayed | P0 |
| MG-002 | View assigned region tenants | Manager with IN assigned | 1. View tenant list | Only IN region tenants shown | P0 |
| MG-003 | Operational actions | Manager logged in | 1. Perform allowed operations | Operations complete within scope | P1 |
| MG-004 | No admin creation access | Manager logged in | 1. Try to create admins | Option not available | P1 |

### 4.5 Support Team

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| ST-001 | Access Support dashboard | Support Team logged in | 1. Navigate to /support | Support dashboard displayed | P0 |
| ST-002 | View support tickets | Support logged in | 1. View ticket list | Tickets for assigned countries shown | P0 |
| ST-003 | Handle ticket | Support logged in | 1. Open ticket<br>2. Add response<br>3. Update status | Ticket updated, customer notified | P1 |
| ST-004 | View tenant info (read-only) | Support logged in | 1. View tenant details | Read-only view, no edit options | P1 |
| ST-005 | No access to billing | Support logged in | 1. Try accessing billing | Access denied | P1 |

### 4.6 Admin Security

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| AS-001 | Admin login rate limiting | - | 1. Attempt 5 failed logins rapidly | Rate limit applied, temporary block | P0 |
| AS-002 | Account lockout | 5 failed attempts | 1. Try 6th login attempt | Account locked for 30 minutes | P0 |
| AS-003 | IP whitelist | Whitelist configured | 1. Login from whitelisted IP<br>2. Login from non-whitelisted IP | Whitelisted: success<br>Non-whitelisted: blocked | P1 |
| AS-004 | Session timeout | Admin logged in | 1. Stay inactive for session timeout period | Session expires, redirect to login | P1 |
| AS-005 | Force logout all sessions | Admin with active sessions | 1. Super Admin forces logout | All admin sessions invalidated | P1 |

---

## 5. Region & Country Configuration

### 5.1 Region Selection

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| RC-001 | View active regions | User logged in | 1. Click region selector | Only enabled regions displayed | P0 |
| RC-002 | Switch region to India | User logged in | 1. Select India from dropdown | Currency: INR, Tax: GST 18%, Date format updated | P0 |
| RC-003 | Switch region to UK | User logged in | 1. Select United Kingdom | Currency: GBP, Tax: VAT 20%, Date format updated | P0 |
| RC-004 | Switch region to Malaysia | User logged in | 1. Select Malaysia | Currency: MYR, Tax: SST 6%, Date format updated | P0 |
| RC-005 | Region persistence | User selects region | 1. Select region<br>2. Refresh page | Selected region persists | P1 |
| RC-006 | Region affects currency display | Region set to IN | 1. View dashboard revenue<br>2. View invoices | All monetary values in INR with ₹ symbol | P1 |
| RC-007 | No flickering on region change | User logged in | 1. Rapidly switch regions | Smooth transition, no UI flickering | P1 |

### 5.2 Region Configuration (Admin)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| RA-001 | View all region configs | Super Admin logged in | 1. GET /api/platform-admin/region-configs | All regions returned | P1 |
| RA-002 | Create new region | Super Admin logged in | 1. POST new region config | Region created, available in system | P1 |
| RA-003 | Enable region | Region disabled | 1. PATCH region status to enabled | Region appears in user selection | P1 |
| RA-004 | Disable region | Region enabled | 1. PATCH region status to disabled | Region hidden from user selection | P1 |
| RA-005 | Update region settings | Region exists | 1. PATCH tax rate, timezone, etc. | Settings updated, reflected in calculations | P1 |
| RA-006 | Delete region | Region exists, no tenants | 1. DELETE region | Region removed | P2 |
| RA-007 | Delete region with tenants | Region has active tenants | 1. Try deleting region | Error: Cannot delete region with tenants | P1 |

---

## 6. Multi-Currency & Exchange Rates

### 6.1 Exchange Rate Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| ER-001 | View exchange rates | Super Admin logged in | 1. Navigate to /super-admin/exchange-rates | All 15 currencies with rates displayed | P1 |
| ER-002 | Update exchange rate | Super Admin logged in | 1. Edit USD/INR rate to 84.00<br>2. Save | Rate updated, effective immediately | P0 |
| ER-003 | Activate currency | Currency inactive | 1. Activate currency | Currency available for invoicing | P1 |
| ER-004 | Deactivate currency | Currency active, no active invoices | 1. Deactivate currency | Currency hidden from selection | P1 |
| ER-005 | Get active rates | - | 1. GET /api/exchange-rates/active | Only active currency rates returned | P1 |
| ER-006 | Get specific rate | - | 1. GET /api/exchange-rates/USD/INR | Current USD to INR rate returned | P1 |
| ER-007 | Historical rate tracking | Rates updated over time | 1. View rate history | Previous rates with timestamps shown | P2 |

### 6.2 Currency Formatting

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| CF-001 | Format INR | Region: India | 1. Format 1000.50 | "₹1,000.50" (symbol before) | P1 |
| CF-002 | Format GBP | Region: UK | 1. Format 1000.50 | "£1,000.50" | P1 |
| CF-003 | Format MYR | Region: Malaysia | 1. Format 1000.50 | "RM1,000.50" | P1 |
| CF-004 | Format AED | Region: UAE | 1. Format 1000.50 | "1,000.50 AED" (symbol after) | P1 |
| CF-005 | Format JPY | Currency: JPY | 1. Format 1000 | "¥1,000" (no decimals) | P1 |
| CF-006 | Compact format (thousands) | Amount: 5000 | 1. formatCompactCurrency(5000) | "₹5k" or equivalent | P2 |
| CF-007 | Compact format (millions) | Amount: 1500000 | 1. formatCompactCurrency(1500000) | "₹1.5M" or equivalent | P2 |

---

## 7. Billing & Invoicing

### 7.1 Invoice Creation

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| INV-001 | Create invoice (single currency) | Customer exists | 1. Navigate to invoices<br>2. Click Create<br>3. Add line items<br>4. Save | Invoice created with tenant currency | P0 |
| INV-002 | Create invoice (different currency) | Customer exists | 1. Create invoice<br>2. Select USD for IN tenant<br>3. Save | Invoice in USD, exchange rate applied | P0 |
| INV-003 | Add line items | Creating invoice | 1. Add service<br>2. Set quantity<br>3. Set unit price | Line total calculated, invoice total updated | P0 |
| INV-004 | Apply tax | Invoice with items | 1. Apply GST/VAT | Tax calculated based on region settings | P0 |
| INV-005 | Invoice numbering | Create multiple invoices | 1. Create invoice<br>2. Create another | Sequential invoice numbers assigned | P1 |
| INV-006 | Save as draft | Creating invoice | 1. Save as draft | Invoice saved, status: draft | P1 |
| INV-007 | Send invoice | Draft invoice exists | 1. Click Send | Invoice status: sent, customer notified | P1 |
| INV-008 | View invoice list | Invoices exist | 1. Navigate to /invoices | All tenant invoices displayed with status | P1 |
| INV-009 | Filter invoices by status | Invoices exist | 1. Filter by paid/unpaid/overdue | Correct invoices shown | P2 |
| INV-010 | Search invoices | Invoices exist | 1. Search by customer name or invoice number | Matching invoices returned | P2 |

### 7.2 Payment Recording

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PAY-001 | Record full payment | Invoice: sent, $100 | 1. Record payment of $100 | Invoice status: paid | P0 |
| PAY-002 | Record partial payment | Invoice: $100 | 1. Record payment of $50 | Invoice status: partial, balance: $50 | P0 |
| PAY-003 | Cross-currency payment | Invoice: USD | 1. Record payment in INR<br>2. System converts | Correct conversion applied | P1 |
| PAY-004 | Multiple payments | Invoice: partial | 1. Record additional payment | Balance updated, status changes when paid in full | P1 |
| PAY-005 | Payment date | Recording payment | 1. Set payment date | Date recorded correctly | P2 |
| PAY-006 | Payment method | Recording payment | 1. Select payment method (cash, card, bank) | Method recorded | P2 |
| PAY-007 | Overpayment prevention | Invoice: $100 | 1. Try recording $150 payment | Error or warning shown | P1 |

### 7.3 Invoice Status Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| IS-001 | Draft to Sent | Draft invoice | 1. Send invoice | Status: sent | P1 |
| IS-002 | Sent to Paid | Sent invoice, full payment | 1. Record full payment | Status: paid | P0 |
| IS-003 | Sent to Partial | Sent invoice, partial payment | 1. Record partial payment | Status: partial | P1 |
| IS-004 | Overdue detection | Due date passed, unpaid | 1. Check invoice status | Status: overdue | P1 |
| IS-005 | Cancel invoice | Draft or sent invoice | 1. Cancel invoice | Status: cancelled | P1 |
| IS-006 | Void invoice | Paid invoice, refund needed | 1. Void invoice | Status: voided, linked refund created | P2 |

---

## 8. Business Operations

### 8.1 Customer Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| CUS-001 | Create customer | User logged in | 1. Navigate to Customers<br>2. Click Add<br>3. Fill details<br>4. Save | Customer created with tenant_id | P0 |
| CUS-002 | View customers | Customers exist | 1. Navigate to Customers | List of tenant customers displayed | P0 |
| CUS-003 | Edit customer | Customer exists | 1. Click customer<br>2. Edit details<br>3. Save | Customer updated | P1 |
| CUS-004 | Delete customer | Customer exists, no bookings | 1. Delete customer | Customer removed | P1 |
| CUS-005 | Delete customer with bookings | Customer has bookings | 1. Try deleting | Error or soft delete | P1 |
| CUS-006 | Search customers | Customers exist | 1. Search by name/email/phone | Matching customers returned | P1 |
| CUS-007 | Customer history | Customer with transactions | 1. View customer details | Booking and payment history shown | P2 |

### 8.2 Service Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| SVC-001 | Create service | User logged in | 1. Navigate to Services<br>2. Add service with name, price, duration | Service created | P0 |
| SVC-002 | View services | Services exist | 1. Navigate to Services | Service list displayed | P0 |
| SVC-003 | Edit service | Service exists | 1. Edit service details | Service updated | P1 |
| SVC-004 | Deactivate service | Service exists | 1. Deactivate service | Service not available for booking | P1 |
| SVC-005 | Service categories | Services exist | 1. Categorize services | Services grouped by category | P2 |

### 8.3 Booking Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| BK-001 | Create booking | Customer, service exist | 1. Navigate to Bookings<br>2. Select customer, service, date/time<br>3. Save | Booking created | P0 |
| BK-002 | View upcoming bookings | Bookings exist | 1. GET /api/bookings/upcoming | Future bookings returned | P0 |
| BK-003 | View today's bookings | Bookings today | 1. View dashboard | Today's booking count displayed | P0 |
| BK-004 | Booking conflict | Same slot already booked | 1. Try booking same slot | Error or warning shown | P1 |
| BK-005 | Cancel booking | Booking exists | 1. Cancel booking | Booking status: cancelled | P1 |
| BK-006 | Reschedule booking | Booking exists | 1. Change date/time | Booking updated, customer notified | P1 |
| BK-007 | Complete booking | Booking in progress | 1. Mark as completed | Booking status: completed | P1 |
| BK-008 | Booking reminders | Booking tomorrow | 1. System sends reminder | Customer receives notification | P2 |

### 8.4 Dashboard Statistics

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| DS-001 | Get dashboard stats | User logged in | 1. GET /api/dashboard/stats | Returns totalCustomers, totalBookings, todayBookings, monthlyRevenue | P0 |
| DS-002 | Revenue in selected currency | Region selected | 1. View monthly revenue | Revenue displayed in region currency | P1 |
| DS-003 | Revenue growth calculation | Historical data exists | 1. View revenue growth | Percentage calculated correctly | P2 |

---

## 9. Compliance Modules

### 9.1 Audit Logging

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| AL-001 | Log create action | User creates resource | 1. Create customer<br>2. Check audit log | CREATE action logged with user, timestamp, data | P0 |
| AL-002 | Log update action | User updates resource | 1. Update customer<br>2. Check audit log | UPDATE logged with before/after values | P0 |
| AL-003 | Log delete action | User deletes resource | 1. Delete customer<br>2. Check audit log | DELETE action logged | P0 |
| AL-004 | Log login action | User logs in | 1. Login<br>2. Check audit log | LOGIN logged with IP, user agent | P0 |
| AL-005 | Log logout action | User logs out | 1. Logout<br>2. Check audit log | LOGOUT logged | P1 |
| AL-006 | Audit log query | Logs exist | 1. Query logs with filters | Filtered logs returned | P1 |
| AL-007 | Export audit logs | Logs exist | 1. Export to CSV/JSON | File downloaded with all fields | P2 |
| AL-008 | Audit log retention | Old logs exist | 1. Check logs older than retention period | Handled per retention policy | P2 |

### 9.2 India Compliance (DPDP)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| IN-001 | GSTIN validation | Indian tenant | 1. Enter valid GSTIN<br>2. Enter invalid GSTIN | Valid: passes, state code parsed<br>Invalid: error shown | P1 |
| IN-002 | GST calculation (intra-state) | Invoice within same state | 1. Create invoice | CGST + SGST applied (9% each) | P1 |
| IN-003 | GST calculation (inter-state) | Invoice to different state | 1. Create invoice | IGST applied (18%) | P1 |
| IN-004 | Aadhaar masking | Aadhaar number stored | 1. Display Aadhaar | Only last 4 digits visible: XXXX-XXXX-1234 | P0 |
| IN-005 | Aadhaar validation | Entering Aadhaar | 1. Enter valid Aadhaar<br>2. Enter invalid Aadhaar | Verhoeff checksum validated | P1 |
| IN-006 | DLT template compliance | Sending SMS | 1. Send SMS with registered template | Message sent successfully | P2 |

### 9.3 UK Compliance (GDPR)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| UK-001 | VAT number validation | UK tenant | 1. Enter VAT number | Mod 97 validation applied | P1 |
| UK-002 | VAT calculation | Creating invoice | 1. Create invoice | 20% VAT applied correctly | P1 |
| UK-003 | Consent recording | User action requires consent | 1. Record user consent | Consent logged with timestamp, purpose | P0 |
| UK-004 | Consent withdrawal | Consent given | 1. Withdraw consent | Consent revoked, processed accordingly | P1 |
| UK-005 | DSAR request | Customer requests data | 1. Submit DSAR<br>2. Track progress | 30-day timer starts, data compiled | P1 |
| UK-006 | Data retention check | Data older than retention | 1. Run retention check | Data flagged for deletion | P2 |
| UK-007 | Data breach logging | Breach detected | 1. Log breach<br>2. Check ICO notification flag | Breach recorded, 72-hour notification tracked | P1 |

### 9.4 UAE Compliance

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| UAE-001 | TRN validation | UAE tenant | 1. Enter TRN | Check digit validation applied | P1 |
| UAE-002 | UAE VAT calculation | Creating invoice | 1. Create invoice | 5% VAT applied | P1 |
| UAE-003 | Emirates ID masking | Emirates ID stored | 1. Display ID | Properly masked | P1 |
| UAE-004 | Arabic language support | UAE tenant | 1. View invoices | Arabic business terms available | P2 |

---

## 10. White-Label & Reseller

### 10.1 Tenant Branding

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| WL-001 | Upload custom logo | Admin user | 1. Navigate to branding settings<br>2. Upload logo | Logo displayed in header | P1 |
| WL-002 | Custom color palette | Admin user | 1. Set primary, secondary colors | UI reflects custom colors | P1 |
| WL-003 | Custom email templates | Admin user | 1. Edit email template<br>2. Send test email | Email uses custom branding | P2 |
| WL-004 | Branding preview | Setting up branding | 1. Make changes<br>2. Preview | Preview shows expected result | P2 |

### 10.2 Reseller Management

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| RS-001 | Create reseller | Super Admin | 1. Create reseller profile | Reseller account created | P1 |
| RS-002 | Reseller tenant creation | Reseller logged in | 1. Create tenant under reseller | Tenant linked to reseller | P1 |
| RS-003 | Revenue tracking | Reseller has tenants | 1. View revenue dashboard | Reseller revenue calculated per agreement | P1 |
| RS-004 | Commission calculation | Revenue generated | 1. Calculate commissions | Correct commission based on agreement | P2 |

---

## 11. Tech Support Dashboard

### 11.1 System Monitoring

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| TS-001 | View overall health | Tech Support logged in | 1. View Overview tab | Health status (Healthy/Degraded/Critical) shown | P0 |
| TS-002 | View uptime | Tech Support logged in | 1. View uptime metric | Percentage displayed (e.g., 99.9%) | P1 |
| TS-003 | Service status grid | Tech Support logged in | 1. View Services tab | All services with status indicators | P0 |
| TS-004 | Degraded service alert | Service degraded | 1. View service status | Yellow indicator, latency shown | P1 |
| TS-005 | Down service alert | Service down | 1. View service status | Red indicator, alert shown | P0 |

### 11.2 API Monitoring

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| API-001 | View all APIs | Tech Support logged in | 1. View APIs tab | All endpoints listed | P1 |
| API-002 | Sort by error rate | APIs displayed | 1. Sort by error rate | High error rate APIs first | P1 |
| API-003 | API latency tracking | APIs active | 1. View average latency | Latency in ms shown | P1 |
| API-004 | Request count | APIs active | 1. View request count | Total requests shown | P2 |

### 11.3 Error Monitoring

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| ERR-001 | View recent errors | Errors exist | 1. View Errors tab | Recent errors with timestamps | P1 |
| ERR-002 | Error details | Error exists | 1. Click error | Stack trace and details shown | P1 |
| ERR-003 | Filter by severity | Errors exist | 1. Filter by ERROR/WARN/INFO | Correct errors shown | P2 |
| ERR-004 | Error count tracking | Recurring error | 1. View error count | Occurrence count displayed | P2 |

### 11.4 Performance Metrics

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PERF-001 | View response time | System active | 1. View Performance tab | Avg response time in ms | P1 |
| PERF-002 | View requests per minute | System active | 1. View Performance tab | Request rate shown | P1 |
| PERF-003 | View CPU usage | System active | 1. View Performance tab | CPU percentage shown | P1 |
| PERF-004 | View memory usage | System active | 1. View Performance tab | Memory percentage shown | P1 |
| PERF-005 | Trend indicators | Metrics changing | 1. View trend arrows | Up/Down/Stable arrows shown | P2 |

---

## 12. Security Features

### 12.1 Rate Limiting

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| RL-001 | Auth endpoint rate limit | - | 1. Make 100+ login attempts/min | 429 Too Many Requests | P0 |
| RL-002 | API rate limit | Authenticated user | 1. Make excessive API calls | Rate limit applied per tier | P1 |
| RL-003 | Rate limit header | Rate limited request | 1. Check response headers | X-RateLimit-* headers present | P2 |

### 12.2 Input Validation

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| IV-001 | SQL injection prevention | - | 1. Enter SQL in form field | Input sanitized, no injection | P0 |
| IV-002 | XSS prevention | - | 1. Enter script tag in input | Script escaped, not executed | P0 |
| IV-003 | Request body validation | - | 1. Send malformed JSON | 400 Bad Request | P1 |
| IV-004 | File upload validation | File upload feature | 1. Upload malicious file | File rejected | P1 |

### 12.3 Session Security

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| SS-001 | Secure cookie flags | Session active | 1. Check cookie attributes | HttpOnly, Secure, SameSite set | P0 |
| SS-002 | Session regeneration | After login | 1. Check session ID | New session ID after login | P1 |
| SS-003 | Session invalidation | Logout | 1. Logout<br>2. Try using old session | Session invalid | P0 |

---

## 13. API Testing

### 13.1 Authentication APIs

| ID | Endpoint | Method | Test Cases | Priority |
|----|----------|--------|------------|----------|
| A-001 | /api/auth/register | POST | Valid registration, duplicate email, invalid data | P0 |
| A-002 | /api/auth/login | POST | Valid login, invalid credentials, locked account | P0 |
| A-003 | /api/auth/token/refresh | POST | Valid refresh, expired token, invalid token | P0 |
| A-004 | /api/auth/logout | POST | Successful logout, invalid token | P0 |
| A-005 | /api/auth/me | GET | Authenticated user, no token | P1 |

### 13.2 Platform Admin APIs

| ID | Endpoint | Method | Test Cases | Priority |
|----|----------|--------|------------|----------|
| PA-001 | /api/platform-admin/login | POST | Valid login, lockout, rate limit | P0 |
| PA-002 | /api/platform-admin/admins | GET | List admins, permission check | P1 |
| PA-003 | /api/platform-admin/admins | POST | Create admin, validation, permission | P1 |
| PA-004 | /api/platform-admin/admins/:id | PATCH | Update admin, permission check | P1 |
| PA-005 | /api/platform-admin/admins/:id | DELETE | Delete admin, self-delete prevention | P1 |

### 13.3 Business APIs

| ID | Endpoint | Method | Test Cases | Priority |
|----|----------|--------|------------|----------|
| B-001 | /api/customers | GET | List with pagination, tenant isolation | P0 |
| B-002 | /api/customers | POST | Create customer, validation | P0 |
| B-003 | /api/customers/:id | GET | Get by ID, not found, wrong tenant | P1 |
| B-004 | /api/services | GET | List services | P1 |
| B-005 | /api/bookings | GET | List bookings | P1 |
| B-006 | /api/bookings/upcoming | GET | Upcoming bookings | P1 |
| B-007 | /api/invoices | GET | List invoices | P1 |
| B-008 | /api/invoices | POST | Create invoice, multi-currency | P0 |
| B-009 | /api/dashboard/stats | GET | Dashboard statistics | P0 |

### 13.4 Region & Currency APIs

| ID | Endpoint | Method | Test Cases | Priority |
|----|----------|--------|------------|----------|
| RC-001 | /api/region-configs/active | GET | List active regions | P0 |
| RC-002 | /api/exchange-rates/active | GET | List active rates | P1 |
| RC-003 | /api/exchange-rates/:from/:to | GET | Get specific rate | P1 |

---

## 14. UI/UX Testing

### 14.1 Responsive Design

| ID | Scenario | Breakpoints | Test Steps | Expected Result | Priority |
|----|----------|-------------|------------|-----------------|----------|
| UI-001 | Dashboard responsiveness | Mobile, Tablet, Desktop | 1. View dashboard at each breakpoint | Layout adapts correctly | P1 |
| UI-002 | Sidebar behavior | Mobile, Desktop | 1. Toggle sidebar | Collapses on mobile, persists on desktop | P1 |
| UI-003 | Table responsiveness | Mobile | 1. View data tables on mobile | Horizontal scroll or card view | P1 |
| UI-004 | Form layout | Mobile, Desktop | 1. View forms | Stacked on mobile, grid on desktop | P2 |

### 14.2 Theme & Accessibility

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| TH-001 | Light mode | Default theme | 1. View application | Light theme colors applied | P1 |
| TH-002 | Dark mode | Toggle theme | 1. Switch to dark mode | Dark theme colors applied | P1 |
| TH-003 | Theme persistence | Theme selected | 1. Change theme<br>2. Refresh | Theme persists | P1 |
| TH-004 | Color contrast | Both themes | 1. Check text contrast | WCAG AA compliant | P2 |
| TH-005 | Keyboard navigation | - | 1. Navigate using keyboard only | All interactive elements accessible | P2 |
| TH-006 | Screen reader | - | 1. Use screen reader | Proper labels and ARIA attributes | P2 |

### 14.3 Loading States

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| LS-001 | Page loading | Navigating | 1. Navigate to new page | Loading indicator shown | P1 |
| LS-002 | Button loading | Form submit | 1. Submit form | Button shows loading state | P1 |
| LS-003 | Data fetching | Query in progress | 1. Load data list | Skeleton or loader shown | P1 |
| LS-004 | Error state | API error | 1. Simulate API error | Error message displayed | P1 |

---

## 15. Mobile Application

### 15.1 Authentication (Flutter)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| MOB-001 | Login | App installed | 1. Open app<br>2. Enter credentials<br>3. Login | JWT stored securely, navigate to tenant selection | P0 |
| MOB-002 | Token refresh | Access token expired | 1. Make API call<br>2. Token interceptor triggers | Token refreshed automatically | P0 |
| MOB-003 | Biometric login | Biometrics enabled | 1. Open app<br>2. Use biometric | Login successful | P2 |
| MOB-004 | Logout | User logged in | 1. Logout | Tokens cleared, navigate to login | P1 |

### 15.2 Multi-Tenant (Flutter)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| MOB-005 | Tenant selection | User has multiple tenants | 1. View tenant list<br>2. Select tenant | Tenant set, navigate to dashboard | P0 |
| MOB-006 | Tenant header injection | Tenant selected | 1. Make API call | X-Tenant-ID header present | P0 |
| MOB-007 | Switch tenant | Tenant active | 1. Switch to different tenant | Data refreshes for new tenant | P1 |

### 15.3 Dashboard (Flutter)

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| MOB-008 | View dashboard | Logged in, tenant selected | 1. Navigate to dashboard | Stats displayed correctly | P0 |
| MOB-009 | Pull to refresh | On dashboard | 1. Pull down to refresh | Data refreshes | P1 |
| MOB-010 | Offline mode | No network | 1. View cached data | Cached data displayed with offline indicator | P2 |

---

## 16. Customer Portal

### 16.1 Portal Configuration

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| CP-001 | Enable customer portal | Tenant admin logged in | 1. Navigate to Settings<br>2. Toggle portal enabled<br>3. Save | Portal enabled, access token generated | P0 |
| CP-002 | Configure portal permissions | Portal enabled | 1. Toggle self-registration<br>2. Toggle profile edit<br>3. Toggle invoice view<br>4. Save | Permissions saved correctly | P1 |
| CP-003 | Set welcome message | Portal enabled | 1. Enter custom welcome message<br>2. Save<br>3. View portal login | Welcome message displayed on login | P2 |
| CP-004 | Regenerate access token | Portal enabled | 1. Click regenerate token<br>2. Confirm action | New token generated, old links invalidated | P1 |
| CP-005 | Copy portal link | Portal enabled | 1. Click copy link button | Link copied to clipboard with access token | P2 |

### 16.2 Customer Self-Registration

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| SR-001 | Self-register with valid data | Self-registration enabled | 1. Navigate to portal link<br>2. Click Create Account<br>3. Enter name, email, password<br>4. Submit | Account created, logged in to dashboard | P0 |
| SR-002 | Self-register when disabled | Self-registration disabled | 1. Navigate to portal link | Create Account button not visible | P0 |
| SR-003 | Duplicate email registration | Account exists | 1. Try registering with existing email | Error "An account with this email already exists" | P0 |
| SR-004 | Weak password | Self-registration enabled | 1. Enter password < 8 chars | Error "Password must be at least 8 characters" | P1 |
| SR-005 | Password mismatch | Self-registration enabled | 1. Enter different passwords | Error "Passwords don't match" | P1 |
| SR-006 | Portal disabled access | Portal disabled | 1. Navigate to portal link | Error "Portal not found or disabled" | P0 |

### 16.3 Customer Login

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PL-001 | Login with valid credentials | Account exists | 1. Navigate to portal<br>2. Enter email/password<br>3. Click Sign In | Logged in, redirect to dashboard | P0 |
| PL-002 | Login with invalid password | Account exists | 1. Enter wrong password<br>2. Submit | Error "Invalid email or password" | P0 |
| PL-003 | Login with non-existent email | - | 1. Enter unregistered email<br>2. Submit | Error "Invalid email or password" | P0 |
| PL-004 | Account lockout | 4 failed attempts | 1. Fail 5th login attempt | Account locked for 15 minutes | P0 |
| PL-005 | Login after lockout expires | Locked account, 15 min passed | 1. Attempt login with correct password | Login successful | P1 |
| PL-006 | Session persistence | Logged in | 1. Close browser<br>2. Reopen within 24 hours | Session still valid | P2 |

### 16.4 Customer Invite Flow

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| CI-001 | Send invite to customer | Portal enabled, customer exists | 1. Navigate to Customers<br>2. Click share portal<br>3. Confirm invite | Invite created with unique token | P0 |
| CI-002 | Accept invite | Valid invite token | 1. Navigate to invite link<br>2. Set password<br>3. Submit | Account created, logged in | P0 |
| CI-003 | Expired invite | Invite older than 7 days | 1. Navigate to expired invite link | Error "This invite has expired" | P0 |
| CI-004 | Used invite | Invite already used | 1. Navigate to used invite link | Error "This invite has already been used" | P1 |
| CI-005 | Send invite when portal disabled | Portal disabled | 1. Try to send invite | Error "Customer portal is not enabled" | P0 |

### 16.5 Customer Dashboard

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| CD-001 | View profile | Logged in | 1. Navigate to Profile tab | Customer name, email, phone displayed | P0 |
| CD-002 | Edit profile (allowed) | allowProfileEdit true | 1. Click Edit Profile<br>2. Update name<br>3. Save | Profile updated successfully | P1 |
| CD-003 | Edit profile (disallowed) | allowProfileEdit false | 1. View Profile tab | Edit button not visible | P1 |
| CD-004 | View invoices (allowed) | allowInvoiceView true | 1. Navigate to Invoices tab | Invoice list displayed | P0 |
| CD-005 | View invoices (disallowed) | allowInvoiceView false | 1. View dashboard | Invoices tab not visible | P0 |
| CD-006 | Invoice details | Invoices visible, invoices exist | 1. View invoice list | Invoice number, amount, status, date shown | P1 |
| CD-007 | Logout | Logged in | 1. Click Logout | Session ended, redirect to login | P1 |

### 16.6 Portal Security

| ID | Scenario | Preconditions | Test Steps | Expected Result | Priority |
|----|----------|---------------|------------|-----------------|----------|
| PS-001 | Cross-tenant access attempt | Logged into Tenant A portal | 1. Modify API calls to Tenant B | 403 Forbidden, data not exposed | P0 |
| PS-002 | Expired session | Session > 24 hours old | 1. Make API request | 401 Unauthorized, redirect to login | P0 |
| PS-003 | Invalid session token | Fabricated token | 1. Set fake portal token<br>2. Access dashboard | Redirect to login | P0 |
| PS-004 | Password hashing verification | Account created | 1. Query database | Password stored as bcrypt hash, not plaintext | P0 |

---

## Appendix A: Test Data

### Test Users

| Email | Password | Role | Tenant | Use Case |
|-------|----------|------|--------|----------|
| superadmin@mybizstream.app | Admin@123! | SUPER_ADMIN | N/A | Super Admin testing |
| admin@tenant1.com | Test@123! | Admin | Tenant 1 | Tenant admin testing |
| staff@tenant1.com | Test@123! | Staff | Tenant 1 | Staff user testing |
| user@tenant2.com | Test@123! | User | Tenant 2 | Cross-tenant isolation testing |

### Test Tenants

| ID | Name | Business Type | Country | Subscription |
|----|------|---------------|---------|--------------|
| tenant-1 | Test Salon | salon | IN | Pro |
| tenant-2 | Test Clinic | clinic | GB | Enterprise |
| tenant-3 | Test PG | pg | MY | Free |

---

## Appendix B: Traceability Matrix

| Requirement | Test Scenarios |
|-------------|----------------|
| User Authentication | AUTH-001 to AUTH-008, JWT-001 to JWT-006 |
| Multi-Tenancy | MT-001 to MT-006, TM-001 to TM-004 |
| 5-Tier RBAC | SA-001 to SA-010, PA-001 to PA-010, TS-001 to TS-010 |
| Multi-Currency | ER-001 to ER-007, CF-001 to CF-007 |
| Billing | INV-001 to INV-010, PAY-001 to PAY-007 |
| Compliance (India) | IN-001 to IN-006 |
| Compliance (UK) | UK-001 to UK-007 |
| Security | RL-001 to RL-003, IV-001 to IV-004, SS-001 to SS-003 |
| Customer Portal | CP-001 to CP-005, SR-001 to SR-006, PL-001 to PL-006, CI-001 to CI-005, CD-001 to CD-007, PS-001 to PS-004 |

---

## Appendix C: Defect Severity

| Severity | Description | Example |
|----------|-------------|---------|
| Critical (P0) | System unusable, data loss, security breach | Login broken, data exposed |
| High (P1) | Major feature broken, no workaround | Cannot create invoices |
| Medium (P2) | Feature impaired, workaround exists | Filter not working, can use search |
| Low (P3) | Minor issue, cosmetic | Alignment off, typo |

---

*Document maintained by MyBizStream QA Team*
