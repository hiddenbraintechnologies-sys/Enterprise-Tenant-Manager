# BizFlow Admin System Documentation

## Overview

The BizFlow Admin System provides enterprise-grade platform administration with comprehensive security features, role-based access control, and complete audit logging.

## Table of Contents

1. [Architecture](#architecture)
2. [Roles & Permissions](#roles--permissions)
3. [Initial Setup](#initial-setup)
4. [Security Features](#security-features)
5. [Environment Configuration](#environment-configuration)
6. [Backup & Restore](#backup--restore)
7. [Operations Runbook](#operations-runbook)
8. [API Reference](#api-reference)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Frontend                            │
│  /super-admin (Full Control)  │  /admin (Limited Access)    │
└───────────────────────────────┴─────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Security Middleware                       │
│  IP Restriction │ Rate Limiting │ Session Timeout │ 2FA     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Layer                      │
│  JWT (Access Token) │ Session Tracking │ Login Lockout      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Authorization Layer                       │
│  Role Check │ Permission Matrix │ Tenant Isolation          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  PostgreSQL │ Audit Logs │ Session Storage │ IP Rules       │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `platform_admins` | Admin accounts (Super Admin, Platform Admin) |
| `platform_admin_permissions` | Permission definitions |
| `platform_admin_permission_assignments` | Admin-to-permission mappings |
| `admin_sessions` | Active session tracking |
| `admin_login_attempts` | Login attempt history |
| `admin_account_lockouts` | Account lockout records |
| `admin_ip_rules` | IP whitelist/blacklist rules |
| `admin_security_config` | Security configuration settings |
| `admin_two_factor_auth` | 2FA configuration per admin |
| `admin_audit_logs` | Comprehensive admin action logs |

---

## Roles & Permissions

### Role Hierarchy

| Role | Description | Permission Check |
|------|-------------|------------------|
| `SUPER_ADMIN` | Full platform access | Bypasses all permission checks |
| `PLATFORM_ADMIN` | Limited access | Requires explicit permissions |

### Permission Codes

| Code | Category | Description |
|------|----------|-------------|
| `read_tenants` | Tenants | View tenant information |
| `manage_tenants` | Tenants | Create, update, suspend tenants |
| `read_users` | Users | View user information across tenants |
| `manage_users` | Users | Create, update, delete users |
| `reset_passwords` | Users | Reset user passwords |
| `view_logs` | Logs | View audit logs and system activity |
| `manage_logs` | Logs | Export, archive log data |
| `read_admins` | Admins | View platform admin information |
| `manage_admins` | Admins | Create and manage platform admins |
| `view_analytics` | Analytics | Access platform-wide analytics |
| `manage_features` | Features | Enable/disable tenant features |
| `view_billing` | Billing | View subscription and billing info |
| `manage_billing` | Billing | Manage subscriptions and payments |

---

## Initial Setup

### Development Environment

```bash
# Run database migrations
npm run db:push

# Seed initial data (creates Super Admin with random password)
npx tsx server/seed.ts
```

The seed script will output:
- Super Admin email: `superadmin@bizflow.local`
- Temporary password (displayed once)
- First login will require password change

### Production Environment

```bash
# Required environment variables
export NODE_ENV=production
export INITIAL_SUPER_ADMIN_EMAIL=admin@yourdomain.com
export INITIAL_SUPER_ADMIN_PASSWORD="SecurePassword123!"
export INITIAL_SUPER_ADMIN_NAME="System Administrator"

# Run seed
npx tsx server/seed.ts

# IMPORTANT: Remove password from environment immediately
unset INITIAL_SUPER_ADMIN_PASSWORD
```

**Security Note**: Never log or persist the initial password. Remove it from environment after setup.

---

## Security Features

### Login Rate Limiting

- **Limit**: 30 requests per minute per IP
- **Response**: HTTP 429 with `retryAfter` seconds

### Account Lockout

- **Threshold**: 5 failed attempts in 30 minutes
- **Duration**: 30 minutes (configurable)
- **Scope**: Per email address and per IP

### IP Restrictions

```sql
-- Whitelist an IP
INSERT INTO admin_ip_rules (ip_pattern, rule_type, description, is_active)
VALUES ('192.168.1.0/24', 'whitelist', 'Office network', true);

-- Blacklist an IP
INSERT INTO admin_ip_rules (ip_pattern, rule_type, description, is_active)
VALUES ('10.0.0.50', 'blacklist', 'Suspicious activity', true);
```

### Session Management

| Setting | Default | Description |
|---------|---------|-------------|
| `sessionTimeoutMinutes` | 60 | Inactivity timeout |
| `sessionAbsoluteTimeoutHours` | 24 | Maximum session duration |

### Password Policy

| Setting | Default |
|---------|---------|
| `minPasswordLength` | 8 |
| `passwordExpiryDays` | 90 |
| Uppercase required | Yes |
| Lowercase required | Yes |
| Number required | Yes |

---

## Environment Configuration

### Required Secrets

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Session encryption key (32+ chars) |
| `JWT_SECRET` | JWT signing key (auto-generated if not set) |
| `DATABASE_URL` | PostgreSQL connection string |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `INITIAL_SUPER_ADMIN_EMAIL` | superadmin@bizflow.local | Initial admin email |
| `INITIAL_SUPER_ADMIN_PASSWORD` | (generated) | Initial admin password |
| `INITIAL_SUPER_ADMIN_NAME` | Super Admin | Initial admin display name |

### Environment-Specific Settings

#### Development
- IP whitelist: Disabled
- 2FA: Optional
- Session timeout: 60 minutes
- Verbose logging: Enabled

#### Production
- IP whitelist: Recommended
- 2FA: Required for Super Admins
- Session timeout: 30 minutes (recommended)
- Minimal logging: Sensitive data masked

---

## Backup & Restore

### Critical Tables to Backup

**Priority 1 - Must backup daily:**
- `platform_admins`
- `platform_admin_permissions`
- `platform_admin_permission_assignments`
- `admin_security_config`
- `admin_ip_rules`

**Priority 2 - Backup with retention:**
- `admin_sessions` (7 days)
- `admin_login_attempts` (30 days)
- `admin_account_lockouts` (30 days)

**Priority 3 - Archive to cold storage:**
- `admin_audit_logs` (365 days, then archive)

### Backup Commands

```bash
# Full admin tables backup
pg_dump -t platform_admins -t platform_admin_permissions \
  -t platform_admin_permission_assignments -t admin_security_config \
  -t admin_ip_rules $DATABASE_URL > admin_backup_$(date +%Y%m%d).sql

# Audit logs backup (compressed)
pg_dump -t admin_audit_logs $DATABASE_URL | gzip > audit_logs_$(date +%Y%m%d).sql.gz
```

### Restore Procedure

```bash
# 1. Stop application
# 2. Restore from backup
psql $DATABASE_URL < admin_backup_YYYYMMDD.sql

# 3. Verify Super Admin exists
psql $DATABASE_URL -c "SELECT id, email, role FROM platform_admins WHERE role = 'SUPER_ADMIN';"

# 4. Invalidate all sessions (security measure)
psql $DATABASE_URL -c "UPDATE admin_sessions SET is_active = false, termination_reason = 'restore';"

# 5. Restart application
```

### Recovery Time Objectives

| Component | RTO | RPO |
|-----------|-----|-----|
| Admin accounts | 1 hour | 24 hours |
| Security config | 1 hour | 24 hours |
| Audit logs | 4 hours | 1 hour |

---

## Operations Runbook

### Unlock a Locked Account

```sql
-- Find lockout record
SELECT * FROM admin_account_lockouts 
WHERE email = 'admin@example.com' 
AND unlocked_at IS NULL;

-- Unlock manually
UPDATE admin_account_lockouts 
SET unlocked_at = NOW(), 
    unlocked_by = 'manual_intervention',
    unlocked_reason = 'Support request #12345'
WHERE email = 'admin@example.com' 
AND unlocked_at IS NULL;
```

### Force Password Reset

```sql
UPDATE platform_admins 
SET force_password_reset = true 
WHERE email = 'admin@example.com';
```

### Terminate All Sessions for an Admin

```sql
UPDATE admin_sessions 
SET is_active = false, 
    terminated_at = NOW(),
    termination_reason = 'security_incident'
WHERE admin_id = 'admin-uuid-here';
```

### Add IP to Whitelist

```sql
INSERT INTO admin_ip_rules (ip_pattern, rule_type, description, created_by, is_active)
VALUES ('203.0.113.0/24', 'whitelist', 'New office network', 'super-admin-id', true);
```

### View Recent Login Attempts

```sql
SELECT email, ip_address, success, failure_reason, attempted_at
FROM admin_login_attempts
ORDER BY attempted_at DESC
LIMIT 50;
```

### Audit Log Query Examples

```sql
-- All actions by a specific admin
SELECT * FROM admin_audit_logs 
WHERE admin_id = 'admin-uuid' 
ORDER BY created_at DESC;

-- High-risk actions in last 24 hours
SELECT * FROM admin_audit_logs 
WHERE risk_level IN ('high', 'critical')
AND created_at > NOW() - INTERVAL '24 hours';

-- All tenant access by support staff
SELECT * FROM admin_audit_logs 
WHERE category = 'support'
ORDER BY created_at DESC;
```

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/login` | POST | Admin login with security checks |
| `/api/platform-admin/login` | POST | Alternative login endpoint |
| `/api/auth/logout` | POST | Logout and terminate session |

### Admin Management (Super Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/platform-admin/admins` | GET | List all admins |
| `/api/platform-admin/admins` | POST | Create new admin |
| `/api/platform-admin/admins/:id` | GET | Get admin details |
| `/api/platform-admin/admins/:id` | PATCH | Update admin |
| `/api/platform-admin/admins/:id` | DELETE | Delete admin |
| `/api/platform-admin/admins/:id/permissions` | GET | Get admin permissions |
| `/api/platform-admin/admins/:id/permissions` | POST | Assign permission |
| `/api/platform-admin/admins/:id/permissions/bulk` | POST | Bulk assign permissions |
| `/api/platform-admin/admins/:id/permissions/:code` | DELETE | Revoke permission |

### Support Access (Permission-Based)

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/platform-admin/support/tenants/:id` | GET | `read_tenants` | View tenant (masked) |
| `/api/platform-admin/support/tenants/:id/users` | GET | `read_users` | List tenant users (masked) |
| `/api/platform-admin/support/tenants/:id/audit-logs` | GET | `view_logs` | View tenant audit logs |
| `/api/platform-admin/support/tenants/:id/billing` | GET | `view_billing` | View billing info (masked) |

### Dashboard

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/platform-admin/dashboard/overview` | GET | Dashboard statistics |
| `/api/platform-admin/me` | GET | Current admin info |

---

## Security Checklist

### Before Go-Live

- [ ] Change default Super Admin credentials
- [ ] Set strong `SESSION_SECRET` and `JWT_SECRET`
- [ ] Configure IP whitelist for admin access
- [ ] Enable 2FA for Super Admins
- [ ] Review and adjust session timeouts
- [ ] Set up automated backups
- [ ] Test restore procedure
- [ ] Review audit log retention policy
- [ ] Configure monitoring/alerting for failed logins

### Regular Maintenance

- [ ] Weekly: Review failed login attempts
- [ ] Weekly: Check for locked accounts
- [ ] Monthly: Review admin permissions
- [ ] Monthly: Rotate session secrets
- [ ] Quarterly: Audit admin access patterns
- [ ] Quarterly: Test backup/restore
- [ ] Annually: Review and update security policies

---

## Incident Response

### Suspected Compromise

1. **Immediate**: Terminate all admin sessions
   ```sql
   UPDATE admin_sessions SET is_active = false, termination_reason = 'security_incident';
   ```

2. **Investigate**: Query audit logs for suspicious activity
   ```sql
   SELECT * FROM admin_audit_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

3. **Contain**: Add suspicious IPs to blacklist
   ```sql
   INSERT INTO admin_ip_rules (ip_pattern, rule_type, description, is_active)
   VALUES ('suspicious.ip.here', 'blacklist', 'Security incident', true);
   ```

4. **Recover**: Force password reset for affected accounts

5. **Report**: Document incident and notify stakeholders

---

*Last updated: January 2026*
