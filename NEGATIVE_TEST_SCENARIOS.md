# MyBizStream - Negative Test Scenarios

## Document Information
| Field | Value |
|-------|-------|
| Version | 1.0 |
| Last Updated | 2026-01-25 |
| Project | MyBizStream Multi-Tenant SaaS Platform |
| Purpose | Comprehensive negative testing, edge cases, and failure scenarios |

---

## Table of Contents

1. [Authentication Failures](#1-authentication-failures)
2. [Authorization & Access Control Violations](#2-authorization--access-control-violations)
3. [Multi-Tenancy Security](#3-multi-tenancy-security)
4. [Input Validation & Injection](#4-input-validation--injection)
5. [API Error Handling](#5-api-error-handling)
6. [Session & Token Security](#6-session--token-security)
7. [Rate Limiting & Abuse Prevention](#7-rate-limiting--abuse-prevention)
8. [Data Integrity & Constraints](#8-data-integrity--constraints)
9. [Billing & Payment Failures](#9-billing--payment-failures)
10. [HR/Payroll Edge Cases](#10-hrpayroll-edge-cases)
11. [Marketplace Security](#11-marketplace-security)
12. [File Upload Security](#12-file-upload-security)
13. [Concurrent Operations](#13-concurrent-operations)
14. [Network & Infrastructure Failures](#14-network--infrastructure-failures)
15. [Internationalization Edge Cases](#15-internationalization-edge-cases)

---

## 1. Authentication Failures

### 1.1 Login Failures

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-AUTH-001 | Login with empty email | 1. POST /api/auth/login with email: "" | 400 Bad Request, validation error | P0 |
| NEG-AUTH-002 | Login with empty password | 1. POST /api/auth/login with password: "" | 400 Bad Request, validation error | P0 |
| NEG-AUTH-003 | Login with malformed email | 1. POST /api/auth/login with email: "notanemail" | 400 Bad Request, "Invalid email format" | P0 |
| NEG-AUTH-004 | Login with non-existent user | 1. POST /api/auth/login with unregistered email | 401 Unauthorized, "Invalid credentials" | P0 |
| NEG-AUTH-005 | Login with wrong password | 1. POST /api/auth/login with incorrect password | 401 Unauthorized, "Invalid credentials" | P0 |
| NEG-AUTH-006 | Login with deactivated account | 1. POST /api/auth/login for deactivated user | 403 Forbidden, "Account deactivated" | P0 |
| NEG-AUTH-007 | Login with locked account | 1. Trigger 5 failed logins<br>2. Try 6th login | 403 Forbidden, "Account locked" with unlock time | P0 |
| NEG-AUTH-008 | Login with SQL injection in email | 1. POST with email: "' OR '1'='1" | 400 Bad Request, input sanitized | P0 |
| NEG-AUTH-009 | Login with XSS in password | 1. POST with password: "<script>alert('x')</script>" | Input escaped, no execution | P0 |
| NEG-AUTH-010 | Login with extremely long email (>255 chars) | 1. POST with 500-char email | 400 Bad Request, length validation | P1 |
| NEG-AUTH-011 | Login with null values | 1. POST with email: null, password: null | 400 Bad Request | P1 |
| NEG-AUTH-012 | Login with unicode injection | 1. POST with email containing zero-width chars | Input normalized, validation applied | P1 |

### 1.2 Registration Failures

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-REG-001 | Register with existing email | 1. POST /api/auth/register with taken email | 409 Conflict, "Email already registered" | P0 |
| NEG-REG-002 | Register with weak password | 1. POST with password: "123" | 400 Bad Request, password requirements | P0 |
| NEG-REG-003 | Register with mismatched passwords | 1. POST with different password/confirmPassword | 400 Bad Request, "Passwords don't match" | P0 |
| NEG-REG-004 | Register with missing required fields | 1. POST with only email | 400 Bad Request, list of missing fields | P0 |
| NEG-REG-005 | Register with invalid business type | 1. POST with businessType: "invalid_type" | 400 Bad Request, "Invalid business type" | P0 |
| NEG-REG-006 | Register with profanity in business name | 1. POST with offensive business name | 400 Bad Request or flagged for review | P2 |
| NEG-REG-007 | Register with special chars only in name | 1. POST with firstName: "!@#$%^" | 400 Bad Request, name validation | P1 |
| NEG-REG-008 | Register with phone in wrong format | 1. POST with phone: "abc123" | 400 Bad Request, phone validation | P1 |

### 1.3 Password Reset Failures

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-PWD-001 | Reset for non-existent email | 1. POST /api/auth/forgot-password with fake email | 200 OK (no information leakage) | P0 |
| NEG-PWD-002 | Reset with expired token | 1. Use token older than 24 hours | 400 Bad Request, "Token expired" | P0 |
| NEG-PWD-003 | Reset with invalid token | 1. Use fabricated token | 400 Bad Request, "Invalid token" | P0 |
| NEG-PWD-004 | Reset with already-used token | 1. Use token after password changed | 400 Bad Request, "Token already used" | P0 |
| NEG-PWD-005 | Reset with tampered token | 1. Modify base64 portion of token | 400 Bad Request, signature mismatch | P0 |
| NEG-PWD-006 | Brute force reset tokens | 1. Generate 1000 random tokens | All fail, no successful resets | P0 |

---

## 2. Authorization & Access Control Violations

### 2.1 Role-Based Access Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-RBAC-001 | Staff accessing admin routes | 1. Login as staff<br>2. GET /api/admin/users | 403 Forbidden | P0 |
| NEG-RBAC-002 | Tenant Admin accessing Super Admin | 1. Login as Tenant Admin<br>2. GET /api/super-admin/tenants | 403 Forbidden | P0 |
| NEG-RBAC-003 | Platform Admin accessing unassigned country | 1. Login as Platform Admin (IN only)<br>2. Access UK tenant data | 403 Forbidden | P0 |
| NEG-RBAC-004 | Support Team modifying data | 1. Login as Support Team<br>2. POST to create resource | 403 Forbidden (read-only) | P0 |
| NEG-RBAC-005 | Tech Support accessing user management | 1. Login as Tech Support<br>2. GET /api/admin/users | 403 Forbidden | P0 |
| NEG-RBAC-006 | Privilege escalation via role modification | 1. PATCH own user with role: "admin" | 403 Forbidden | P0 |
| NEG-RBAC-007 | Deactivated admin accessing system | 1. Deactivate admin<br>2. Use cached token | 401/403, token invalidated | P0 |

### 2.2 Permission Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-PERM-001 | User without manage_tenants creating tenant | 1. Admin without permission<br>2. POST /api/tenants | 403 Forbidden | P0 |
| NEG-PERM-002 | User without view_logs accessing audit | 1. Admin without permission<br>2. GET /api/audit-logs | 403 Forbidden | P1 |
| NEG-PERM-003 | User without reset_passwords resetting | 1. Admin without permission<br>2. POST /api/users/:id/reset-password | 403 Forbidden | P1 |
| NEG-PERM-004 | Manipulating permission claims in JWT | 1. Modify JWT permissions array<br>2. Make request | 401 Unauthorized (signature invalid) | P0 |

---

## 3. Multi-Tenancy Security

### 3.1 Cross-Tenant Data Access

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-MT-001 | Access other tenant's customer by ID | 1. Login as Tenant A<br>2. GET /api/customers/:tenantB_customerId | 404 Not Found (not 403, no leakage) | P0 |
| NEG-MT-002 | Access other tenant's bookings | 1. GET /api/bookings?tenantId=other_tenant | Own tenant data only (header ignored) | P0 |
| NEG-MT-003 | Modify other tenant's resource | 1. PATCH /api/customers/:tenantB_id | 404 Not Found | P0 |
| NEG-MT-004 | Delete other tenant's resource | 1. DELETE /api/services/:tenantB_id | 404 Not Found | P0 |
| NEG-MT-005 | SQL injection to bypass tenant filter | 1. GET /api/customers?search=' OR tenant_id!='x | Input sanitized, own data only | P0 |
| NEG-MT-006 | Enumerate tenant IDs | 1. Try sequential tenant UUIDs | 404 for all non-owned tenants | P0 |
| NEG-MT-007 | Access via X-Tenant-ID header spoofing | 1. Set X-Tenant-ID to other tenant<br>2. Make request | Ignored, uses JWT tenant | P0 |

### 3.2 Tenant Switching Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-TS-001 | Switch to non-member tenant | 1. PATCH /api/auth/tenants/switch<br>2. Target: unrelated tenant | 403 Forbidden | P0 |
| NEG-TS-002 | Switch to deactivated tenant | 1. Switch to disabled tenant | 403 Forbidden, "Tenant deactivated" | P0 |
| NEG-TS-003 | Switch with invalid tenant UUID | 1. Switch with malformed UUID | 400 Bad Request | P1 |
| NEG-TS-004 | Rapid tenant switching (DoS) | 1. Switch tenants 100 times in 1 second | Rate limited | P1 |

---

## 4. Input Validation & Injection

### 4.1 SQL Injection Attempts

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-SQL-001 | SQL injection in search | 1. GET /api/customers?search='; DROP TABLE customers;-- | Input escaped, normal search | P0 |
| NEG-SQL-002 | SQL injection in sort parameter | 1. GET /api/bookings?sortBy=name; DELETE FROM bookings | 400 Bad Request, enum validation | P0 |
| NEG-SQL-003 | UNION-based injection | 1. GET /api/services?id=1 UNION SELECT * FROM users | Input sanitized | P0 |
| NEG-SQL-004 | Boolean-based blind injection | 1. GET /api/customers?id=1 AND 1=1 | Input sanitized, parameterized query | P0 |
| NEG-SQL-005 | Time-based blind injection | 1. GET /api/customers?id=1; WAITFOR DELAY '0:0:10' | No delay, input sanitized | P0 |

### 4.2 XSS Attempts

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-XSS-001 | Stored XSS in customer name | 1. POST customer with name: "<script>..." | Script escaped in storage and display | P0 |
| NEG-XSS-002 | Reflected XSS in search | 1. GET /api/search?q=<script>alert(1)</script> | Script escaped in response | P0 |
| NEG-XSS-003 | XSS via SVG file upload | 1. Upload SVG with embedded JS | File rejected or sanitized | P0 |
| NEG-XSS-004 | XSS in email template | 1. Save template with onclick handler | Attributes stripped | P0 |
| NEG-XSS-005 | DOM-based XSS via URL fragment | 1. Navigate to /#<script>... | Frontend escapes dynamic content | P0 |
| NEG-XSS-006 | XSS via JSON response | 1. POST with JSON containing scripts<br>2. Verify JSON response | Content-Type: application/json, proper escaping | P1 |

### 4.3 Command Injection

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-CMD-001 | Command injection in file name | 1. Upload file: "test; rm -rf /" | Filename sanitized | P0 |
| NEG-CMD-002 | Command injection in export | 1. Request export with filename: "$(whoami)" | Filename sanitized | P0 |

### 4.4 NoSQL/JSON Injection

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-JSON-001 | JSON injection in request body | 1. POST with nested objects where primitives expected | 400 Bad Request, schema validation | P0 |
| NEG-JSON-002 | Prototype pollution | 1. POST with __proto__ in body | Property stripped or ignored | P0 |
| NEG-JSON-003 | Malformed JSON | 1. POST with invalid JSON syntax | 400 Bad Request, parse error | P0 |

---

## 5. API Error Handling

### 5.1 Invalid Request Formats

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-API-001 | Request without Content-Type | 1. POST without Content-Type header | 400 Bad Request | P1 |
| NEG-API-002 | Wrong Content-Type | 1. POST with Content-Type: text/plain, JSON body | 400 Bad Request or parsed | P1 |
| NEG-API-003 | Oversized request body | 1. POST with 50MB JSON body | 413 Payload Too Large | P0 |
| NEG-API-004 | Request to non-existent endpoint | 1. GET /api/nonexistent | 404 Not Found (no stack trace) | P0 |
| NEG-API-005 | Wrong HTTP method | 1. PUT /api/customers (expects POST) | 405 Method Not Allowed | P1 |
| NEG-API-006 | Missing required headers | 1. Request without Authorization | 401 Unauthorized | P0 |
| NEG-API-007 | Malformed Authorization header | 1. Authorization: "NotBearer xxx" | 401 Unauthorized | P0 |
| NEG-API-008 | Empty request body | 1. POST to create endpoint with empty body | 400 Bad Request | P0 |

### 5.2 Invalid Path Parameters

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-PATH-001 | Invalid UUID format | 1. GET /api/customers/not-a-uuid | 400 Bad Request, "Invalid ID format" | P0 |
| NEG-PATH-002 | UUID with SQL injection | 1. GET /api/customers/'; DROP TABLE-- | 400 Bad Request | P0 |
| NEG-PATH-003 | Negative ID | 1. GET /api/customers/-1 | 400 Bad Request | P1 |
| NEG-PATH-004 | Path traversal attempt | 1. GET /api/files/../../../etc/passwd | 400 Bad Request or 404 | P0 |
| NEG-PATH-005 | URL-encoded special chars | 1. GET /api/customers/%00%0d%0a | Input sanitized | P0 |

### 5.3 Invalid Query Parameters

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-QUERY-001 | Negative page number | 1. GET /api/customers?page=-1 | 400 Bad Request or default to 1 | P1 |
| NEG-QUERY-002 | Extremely large page | 1. GET /api/customers?page=999999999 | Empty results or validation error | P1 |
| NEG-QUERY-003 | Limit exceeds maximum | 1. GET /api/customers?limit=10000 | Capped at maximum (e.g., 100) | P1 |
| NEG-QUERY-004 | Invalid sort order | 1. GET /api/customers?sortOrder=invalid | 400 Bad Request, enum validation | P1 |
| NEG-QUERY-005 | Array parameter overflow | 1. GET /api/customers?ids=id1&ids=id2...x1000 | Limited or error | P2 |

---

## 6. Session & Token Security

### 6.1 JWT Token Attacks

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-JWT-001 | Modified JWT payload | 1. Decode JWT<br>2. Modify userId<br>3. Re-encode | 401 Unauthorized, signature invalid | P0 |
| NEG-JWT-002 | JWT with "none" algorithm | 1. Create JWT with alg: "none" | 401 Unauthorized | P0 |
| NEG-JWT-003 | JWT with weak algorithm | 1. Create JWT with alg: "HS256" using guessed key | 401 Unauthorized | P0 |
| NEG-JWT-004 | Expired access token | 1. Use token after 15 min expiry | 401 Unauthorized, refresh required | P0 |
| NEG-JWT-005 | Expired refresh token | 1. Use refresh token after expiry | 401 Unauthorized, re-login required | P0 |
| NEG-JWT-006 | Revoked token | 1. Logout<br>2. Use old token | 401 Unauthorized | P0 |
| NEG-JWT-007 | Token from different environment | 1. Use production token in dev | 401 Unauthorized | P0 |
| NEG-JWT-008 | Future-dated token (nbf claim) | 1. Create token with nbf in future | 401 Unauthorized until nbf | P1 |
| NEG-JWT-009 | Token with invalid issuer | 1. Create token with wrong iss claim | 401 Unauthorized | P1 |

### 6.2 Session Attacks

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-SESS-001 | Session fixation | 1. Get session ID before login<br>2. Login<br>3. Check session ID | New session ID after login | P0 |
| NEG-SESS-002 | Session hijacking via XSS | 1. Attempt to read document.cookie | HttpOnly flag prevents access | P0 |
| NEG-SESS-003 | Cross-site session use | 1. Copy cookie to different domain | SameSite attribute prevents | P0 |
| NEG-SESS-004 | Session over HTTP | 1. Access via HTTP | Secure flag requires HTTPS | P0 |
| NEG-SESS-005 | Concurrent session limit | 1. Login from 10 devices | Policy enforced (if configured) | P2 |

---

## 7. Rate Limiting & Abuse Prevention

### 7.1 Rate Limit Testing

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-RATE-001 | Login endpoint brute force | 1. Send 100 login requests in 1 minute | 429 after threshold | P0 |
| NEG-RATE-002 | Registration spam | 1. Send 50 registration requests | 429 after threshold | P0 |
| NEG-RATE-003 | Password reset spam | 1. Request reset 20 times for same email | 429 after threshold | P0 |
| NEG-RATE-004 | API endpoint flooding | 1. Send 1000 GET requests per minute | 429 after threshold | P0 |
| NEG-RATE-005 | Distributed attack (different IPs) | 1. Send requests from multiple IPs | Per-user limits still apply | P1 |
| NEG-RATE-006 | Rate limit bypass via headers | 1. Spoof X-Forwarded-For | Original IP used (trusted proxies only) | P0 |
| NEG-RATE-007 | Slow loris attack | 1. Send partial requests slowly | Connection timeout | P1 |

### 7.2 Account Lockout

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-LOCK-001 | Account lockout trigger | 1. 5 failed login attempts | Account locked for 30 minutes | P0 |
| NEG-LOCK-002 | Lockout counter reset | 1. 4 failed attempts<br>2. 1 successful<br>3. 4 more failed | No lockout (counter reset) | P1 |
| NEG-LOCK-003 | Lockout bypass attempt | 1. Clear cookies after lockout<br>2. Retry | Still locked (server-side) | P0 |
| NEG-LOCK-004 | Admin lockout recovery | 1. Lock admin account<br>2. Super Admin clears lockout | Admin can login | P1 |
| NEG-LOCK-005 | Lockout notification | 1. Trigger lockout | Email notification sent | P2 |

---

## 8. Data Integrity & Constraints

### 8.1 Database Constraint Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-DB-001 | Duplicate unique field | 1. Create customer with duplicate email | 409 Conflict | P0 |
| NEG-DB-002 | Foreign key violation | 1. Create booking with non-existent customerId | 400 Bad Request | P0 |
| NEG-DB-003 | Null in non-nullable field | 1. Create resource with required field null | 400 Bad Request | P0 |
| NEG-DB-004 | Value exceeds column length | 1. Create with 1000-char name (max 255) | 400 Bad Request | P0 |
| NEG-DB-005 | Invalid enum value | 1. Create with status: "invalid_status" | 400 Bad Request | P0 |
| NEG-DB-006 | Negative amount | 1. Create invoice with amount: -100 | 400 Bad Request | P0 |
| NEG-DB-007 | Date in invalid format | 1. Create with date: "not-a-date" | 400 Bad Request | P0 |
| NEG-DB-008 | Future birth date | 1. Create customer with DOB in future | 400 Bad Request | P1 |

### 8.2 Referential Integrity

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-REF-001 | Delete parent with children | 1. Delete customer with bookings | 400 or cascade/soft delete | P0 |
| NEG-REF-002 | Delete tenant with users | 1. Try deleting tenant with active users | 400 Bad Request | P0 |
| NEG-REF-003 | Delete service with bookings | 1. Delete service used in bookings | 400 or soft delete | P0 |
| NEG-REF-004 | Orphaned records | 1. Query for records without parent | No orphans exist | P1 |

---

## 9. Billing & Payment Failures

### 9.1 Invoice Errors

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-INV-001 | Create invoice with no items | 1. POST invoice with empty items array | 400 Bad Request | P0 |
| NEG-INV-002 | Negative item quantity | 1. Create line item with quantity: -1 | 400 Bad Request | P0 |
| NEG-INV-003 | Negative unit price | 1. Create line item with price: -100 | 400 Bad Request | P0 |
| NEG-INV-004 | Invalid tax rate | 1. Create with taxRate: 500 | 400 Bad Request | P1 |
| NEG-INV-005 | Send already-sent invoice | 1. Send invoice twice | 400 or idempotent success | P1 |
| NEG-INV-006 | Modify paid invoice | 1. Edit paid invoice items | 400 Bad Request | P0 |
| NEG-INV-007 | Delete paid invoice | 1. DELETE paid invoice | 400 Bad Request (must void) | P0 |
| NEG-INV-008 | Due date in past for new invoice | 1. Create with dueDate before today | 400 Bad Request or warning | P1 |

### 9.2 Payment Recording Errors

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-PAY-001 | Payment exceeds invoice total | 1. Record $150 for $100 invoice | 400 Bad Request or warning | P0 |
| NEG-PAY-002 | Negative payment amount | 1. Record payment of -$50 | 400 Bad Request | P0 |
| NEG-PAY-003 | Payment for cancelled invoice | 1. Record payment for cancelled invoice | 400 Bad Request | P0 |
| NEG-PAY-004 | Invalid payment method | 1. Record with method: "bitcoin" | 400 Bad Request | P1 |
| NEG-PAY-005 | Future payment date | 1. Record with date next week | 400 Bad Request or allowed | P2 |

### 9.3 Subscription Failures

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-SUB-001 | Invalid plan ID | 1. Subscribe to non-existent plan | 400 Bad Request | P0 |
| NEG-SUB-002 | Downgrade with active features | 1. Downgrade from Pro to Free | Warning about feature loss | P1 |
| NEG-SUB-003 | Double subscription | 1. Subscribe to same plan twice | Idempotent or 400 | P1 |
| NEG-SUB-004 | Payment failure | 1. Subscribe with declined card | Payment error, no subscription | P0 |
| NEG-SUB-005 | Cancel already cancelled | 1. Cancel subscription twice | Idempotent or 400 | P1 |

---

## 10. HR/Payroll Edge Cases

### 10.1 Employee Limit Enforcement

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-HR-001 | Exceed trial employee limit | 1. Payroll trial<br>2. Add 6th employee | 403 EMPLOYEE_LIMIT_REACHED | P0 |
| NEG-HR-002 | Exceed tier employee limit | 1. Starter tier (5 max)<br>2. Add 6th | 403 with upgrade prompt | P0 |
| NEG-HR-003 | Bypass limit via bulk import | 1. Import 20 employees on trial | Limited to 5, others rejected | P0 |
| NEG-HR-004 | Bypass limit via API | 1. POST multiple employees rapidly | Limit enforced per request | P0 |

### 10.2 Access Control Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-HR-005 | Payroll-only accessing HRMS | 1. Has Payroll, no HRMS<br>2. GET /api/hr/attendance | 403 Forbidden | P0 |
| NEG-HR-006 | HRMS-only accessing Payroll | 1. Has HRMS, no Payroll<br>2. GET /api/hr/payroll/runs | 403 Forbidden | P0 |
| NEG-HR-007 | No add-ons accessing HR | 1. No Payroll, no HRMS<br>2. GET /api/hr/employees | 403 Forbidden | P0 |
| NEG-HR-008 | Expired trial accessing HR | 1. Trial ended<br>2. Access employee directory | Read-only or 403 | P0 |

### 10.3 Read-Only Mode Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-HR-009 | Create employee in read-only | 1. Payroll expired<br>2. POST /api/hr/employees | 403 EMPLOYEE_READ_ONLY | P0 |
| NEG-HR-010 | Update employee in read-only | 1. Payroll expired<br>2. PATCH /api/hr/employees/:id | 403 EMPLOYEE_READ_ONLY | P0 |
| NEG-HR-011 | Delete employee in read-only | 1. Payroll expired<br>2. DELETE /api/hr/employees/:id | 403 EMPLOYEE_READ_ONLY | P0 |

---

## 11. Marketplace Security

### 11.1 Access Control

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-MKT-001 | Tenant Admin accessing catalog management | 1. Login as Tenant Admin<br>2. POST /api/super-admin/marketplace/addons | 403 FORBIDDEN_SUPER_ADMIN_ONLY | P0 |
| NEG-MKT-002 | Platform Admin accessing catalog | 1. Login as Platform Admin<br>2. PATCH add-on | 403 FORBIDDEN_SUPER_ADMIN_ONLY | P0 |
| NEG-MKT-003 | Staff starting trial | 1. Login as staff<br>2. POST /api/marketplace/addons/trial | 403 TENANT_ADMIN_REQUIRED | P0 |
| NEG-MKT-004 | Unauthenticated catalog access | 1. No auth<br>2. GET /api/super-admin/marketplace/addons | 401 UNAUTHENTICATED | P0 |

### 11.2 Purchase/Trial Violations

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-MKT-005 | Start trial - ineligible plan | 1. Free plan, trialEnabled: false<br>2. Start trial | 400 "Not eligible for trial" | P0 |
| NEG-MKT-006 | Start trial - wrong country | 1. Add-on not available in country<br>2. Start trial | 400 "Add-on not available" | P0 |
| NEG-MKT-007 | Purchase - add-on not published | 1. Try purchasing draft add-on | 400 "Add-on not available" | P0 |
| NEG-MKT-008 | Second trial for same add-on | 1. Complete trial<br>2. Start new trial | 400 "Trial already used" | P0 |
| NEG-MKT-009 | Exceed max quantity | 1. maxQuantity: 1<br>2. Purchase second instance | 400 "Maximum quantity reached" | P1 |

### 11.3 Webhook Tampering

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-MKT-010 | Invalid webhook signature | 1. POST webhook with wrong signature | 401 Unauthorized | P0 |
| NEG-MKT-011 | Replay webhook | 1. Replay old webhook event | Idempotent - no duplicate action | P0 |
| NEG-MKT-012 | Fabricated webhook event | 1. POST fake subscription.activated | Signature validation fails | P0 |

---

## 12. File Upload Security

### 12.1 File Type Attacks

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-FILE-001 | Upload executable (.exe) | 1. Upload malware.exe | 400 "File type not allowed" | P0 |
| NEG-FILE-002 | Upload PHP file | 1. Upload shell.php | 400 "File type not allowed" | P0 |
| NEG-FILE-003 | Double extension bypass | 1. Upload image.jpg.exe | 400 or renamed | P0 |
| NEG-FILE-004 | MIME type mismatch | 1. Upload .exe renamed to .jpg<br>2. Check MIME validation | File rejected (magic bytes check) | P0 |
| NEG-FILE-005 | Upload SVG with script | 1. Upload SVG with embedded JS | Sanitized or rejected | P0 |
| NEG-FILE-006 | Upload HTML file | 1. Upload page.html | 400 or served with safe headers | P0 |

### 12.2 File Size & Quantity

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-FILE-007 | Oversized file upload | 1. Upload 100MB image | 413 Payload Too Large | P0 |
| NEG-FILE-008 | Zero-byte file | 1. Upload 0-byte file | 400 or ignored | P1 |
| NEG-FILE-009 | Too many files | 1. Upload 1000 files in one request | Limited or error | P1 |
| NEG-FILE-010 | Storage quota exceeded | 1. Upload files until quota exceeded | 400 "Storage limit reached" | P0 |

### 12.3 File Name Attacks

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-FILE-011 | Path traversal in filename | 1. Upload "../../etc/passwd" | Filename sanitized | P0 |
| NEG-FILE-012 | Null byte in filename | 1. Upload "image.php%00.jpg" | Null byte stripped | P0 |
| NEG-FILE-013 | Extremely long filename | 1. Upload file with 500-char name | Truncated or error | P1 |
| NEG-FILE-014 | Unicode in filename | 1. Upload with unicode chars | Properly encoded/decoded | P1 |

---

## 13. Concurrent Operations

### 13.1 Race Conditions

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-RACE-001 | Double booking same slot | 1. Two users book same time simultaneously | One succeeds, one fails | P0 |
| NEG-RACE-002 | Concurrent employee creation at limit | 1. At employee limit<br>2. Two add requests simultaneously | One succeeds, one fails | P0 |
| NEG-RACE-003 | Double payment recording | 1. Submit same payment twice quickly | Idempotent (only one recorded) | P0 |
| NEG-RACE-004 | Concurrent invoice modifications | 1. Two users edit same invoice | One succeeds, one gets conflict | P1 |
| NEG-RACE-005 | Rapid status changes | 1. Change status while another in progress | Consistent final state | P1 |

### 13.2 Optimistic Locking

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-LOCK-001 | Update with stale version | 1. Read resource<br>2. Another user updates<br>3. Submit with old version | 409 Conflict | P1 |
| NEG-LOCK-002 | Delete with modifications | 1. Read resource<br>2. Another modifies<br>3. Delete | 409 Conflict or success | P1 |

---

## 14. Network & Infrastructure Failures

### 14.1 Timeout Handling

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-NET-001 | Database connection timeout | 1. Simulate DB unreachable | 503 Service Unavailable, retry logic | P0 |
| NEG-NET-002 | External API timeout | 1. Simulate third-party API timeout | Graceful degradation, error message | P0 |
| NEG-NET-003 | Redis connection failure | 1. Simulate Redis down | Fallback to in-memory or DB | P0 |
| NEG-NET-004 | Slow query timeout | 1. Simulate slow database query | Query cancelled after timeout | P1 |

### 14.2 Service Degradation

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-SVC-001 | Email service down | 1. Send email with provider offline | Queued for retry, user notified | P0 |
| NEG-SVC-002 | WhatsApp service down | 1. Send WhatsApp notification | Queued for retry | P1 |
| NEG-SVC-003 | Payment gateway timeout | 1. Payment request times out | Clear error, no double charge | P0 |
| NEG-SVC-004 | File storage unavailable | 1. Upload while storage offline | Clear error message | P0 |

---

## 15. Internationalization Edge Cases

### 15.1 Language & Locale

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-I18N-001 | Unsupported language request | 1. Set Accept-Language: xx-XX | Fallback to English | P1 |
| NEG-I18N-002 | RTL language rendering | 1. Switch to Arabic | Layout properly mirrored | P2 |
| NEG-I18N-003 | Missing translation key | 1. Request non-existent translation | Fallback to default, no crash | P1 |
| NEG-I18N-004 | Unicode in all text fields | 1. Enter Chinese, Hindi, Arabic text | Stored and displayed correctly | P0 |

### 15.2 Currency & Number Formatting

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-I18N-005 | Invalid currency code | 1. Set currency: "INVALID" | 400 Bad Request | P0 |
| NEG-I18N-006 | Inactive currency | 1. Create invoice in deactivated currency | 400 Bad Request | P0 |
| NEG-I18N-007 | Exchange rate not found | 1. Convert between currencies without rate | Error or fallback rate | P0 |
| NEG-I18N-008 | Extremely large currency amounts | 1. Create invoice for 999,999,999,999 | Proper handling, no overflow | P1 |
| NEG-I18N-009 | Precision loss in conversion | 1. Convert with many decimal places | Proper rounding applied | P1 |

### 15.3 Date & Time Edge Cases

| ID | Scenario | Test Steps | Expected Result | Priority |
|----|----------|------------|-----------------|----------|
| NEG-I18N-010 | Invalid timezone | 1. Set timezone: "Invalid/Zone" | 400 Bad Request or fallback | P1 |
| NEG-I18N-011 | DST transition | 1. Book appointment during DST change | Correct time displayed | P1 |
| NEG-I18N-012 | Cross-timezone booking | 1. Book in different timezone than tenant | Proper conversion | P1 |
| NEG-I18N-013 | Invalid date format | 1. Submit "31/02/2026" | 400 Bad Request | P0 |

---

## Appendix A: Error Response Format Standards

All API errors should follow this format:

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

### Standard Error Codes

| HTTP Status | Code | Usage |
|-------------|------|-------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 400 | INVALID_FORMAT | Malformed request |
| 401 | UNAUTHENTICATED | No valid credentials |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | TENANT_ADMIN_REQUIRED | Admin action required |
| 403 | FORBIDDEN_SUPER_ADMIN_ONLY | Super Admin only action |
| 403 | EMPLOYEE_LIMIT_REACHED | Add-on limit exceeded |
| 403 | EMPLOYEE_READ_ONLY | Expired subscription |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate or version conflict |
| 413 | PAYLOAD_TOO_LARGE | Request body too large |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error (no details exposed) |
| 503 | SERVICE_UNAVAILABLE | Temporary outage |

---

## Appendix B: Test Data Requirements

### Malicious Test Inputs

```text
SQL Injection:
- ' OR '1'='1
- '; DROP TABLE users;--
- 1; SELECT * FROM information_schema.tables
- ' UNION SELECT username, password FROM users--

XSS Payloads:
- <script>alert('XSS')</script>
- <img src=x onerror=alert('XSS')>
- javascript:alert('XSS')
- <svg onload=alert('XSS')>

Command Injection:
- ; rm -rf /
- | cat /etc/passwd
- $(whoami)
- `ls -la`

Path Traversal:
- ../../../etc/passwd
- ..%2F..%2F..%2Fetc%2Fpasswd
- ....//....//etc/passwd

Unicode Bypass:
- U+0000 (null byte)
- U+2028/U+2029 (line separators)
- U+FEFF (BOM)
```

---

## Appendix C: Negative Test Priority Guide

| Priority | Criteria | Example |
|----------|----------|---------|
| P0 (Critical) | Security vulnerability, data exposure, system crash | SQL injection, auth bypass |
| P1 (High) | Feature broken, data integrity issue | Validation bypass, race condition |
| P2 (Medium) | Poor UX, edge case handling | Missing error message, edge case fail |
| P3 (Low) | Minor issue, cosmetic | Error message wording |

---

*Document maintained by MyBizStream QA Team*
*Security tests should be run in isolated environment*
