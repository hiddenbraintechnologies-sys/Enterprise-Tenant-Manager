# BizFlow Platform Documentation

## Complete Feature & Role Reference Guide

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Role Hierarchy & Access Control](#role-hierarchy--access-control)
3. [Super Admin Features](#super-admin-features)
4. [Platform Admin Features](#platform-admin-features)
5. [Tech Support Manager Features](#tech-support-manager-features)
6. [Manager Features](#manager-features)
7. [Support Team Features](#support-team-features)
8. [Multi-Tenancy System](#multi-tenancy-system)
9. [Compliance & Regulatory Modules](#compliance--regulatory-modules)
10. [Multi-Currency System](#multi-currency-system)
11. [White-Label & Reseller System](#white-label--reseller-system)
12. [Security Features](#security-features)
13. [Business Vertical Dashboards](#business-vertical-dashboards)
14. [API & Integration](#api--integration)

---

## Platform Overview

BizFlow is an enterprise-grade, multi-tenant SaaS platform designed for small and medium businesses across various sectors:

- PGs/Hostels
- Salons & Spas
- Gyms & Fitness Centers
- Coaching Institutes
- Clinics & Diagnostics
- General Service Businesses
- Tourism & Travel
- Legal Services
- Real Estate
- Coworking Spaces
- Logistics

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js with TypeScript |
| Database | PostgreSQL with Drizzle ORM |
| Authentication | JWT (Access + Refresh tokens) with Replit Auth |
| State Management | TanStack Query v5 |
| Routing | Wouter |
| Mobile | Flutter with Clean Architecture |

---

## Role Hierarchy & Access Control

BizFlow implements a five-tier role hierarchy for platform administration:

```
SUPER_ADMIN (Level 1 - Highest)
    │
    ├── PLATFORM_ADMIN (Level 2)
    │
    ├── TECH_SUPPORT_MANAGER (Level 2 - Technical Focus)
    │
    ├── MANAGER (Level 3)
    │
    └── SUPPORT_TEAM (Level 4 - Lowest)
```

### Role Comparison Matrix

| Capability | Super Admin | Platform Admin | Tech Support Manager | Manager | Support Team |
|------------|-------------|----------------|---------------------|---------|--------------|
| Full System Access | Yes | No | No | No | No |
| Create Other Admins | All Types | Lower roles only | No | No | No |
| Country Assignment | N/A (Global) | Required | N/A (Global) | Required | Required |
| Tenant Management | Full | Assigned Countries | Read-only | Assigned Countries | View Only |
| User Management | Full | Assigned Countries | No | Assigned Countries | No |
| System Health Monitoring | Yes | No | Yes | No | No |
| API Management | Yes | No | Yes | No | No |
| Error Logs Access | Yes | No | Yes | No | No |
| Performance Metrics | Yes | No | Yes | No | No |
| Billing Management | Yes | Permission-based | No | View Only | No |
| Support Tickets | Yes | Yes | No | Yes | Full |
| Audit Logs | Full | Assigned Countries | Technical Only | View Only | No |

---

## Super Admin Features

**Access Level**: Unrestricted global access to all platform features

### Dashboard (`/super-admin`)

The Super Admin dashboard provides a comprehensive overview of the entire platform:

#### Overview Metrics
- Total tenants across all regions
- Active users count
- Monthly recurring revenue (MRR)
- System uptime percentage

#### Quick Actions
- Create new Platform Admins
- Manage global configurations
- Access all regional data
- Emergency system controls

### Admin Management (`/super-admin/admins`)

Super Admins can create and manage all types of platform administrators:

#### Create Admin Types
1. **PLATFORM_ADMIN**: Assign countries and granular permissions
2. **TECH_SUPPORT_MANAGER**: Grant technical monitoring access
3. **MANAGER**: Assign operational countries
4. **SUPPORT_TEAM**: Assign support ticket countries

#### Admin Actions
- Create new admins with secure password requirements
- Assign/revoke permissions
- Assign/remove country access
- Deactivate accounts
- Force password reset
- View login history

### Centralized Registries

#### Feature Registry (`/super-admin/features`)
- Define platform-wide features
- Set feature availability per tier (Free, Pro, Enterprise)
- Enable/disable features globally
- Version feature configurations

#### Module Registry (`/super-admin/modules`)
- Register business modules
- Define module dependencies
- Control module availability
- Track module versions

#### Business Registry (`/super-admin/business`)
- Register business type definitions
- Configure business-specific settings
- Define available features per business type

### Exchange Rate Management (`/super-admin/exchange-rates`)
- Set exchange rates for 15 supported currencies
- Activate/deactivate currencies
- Track historical rate changes
- Set base currency conversions

### Platform Settings
- Global security configuration
- Default tenant settings
- Compliance requirements
- Notification templates

---

## Platform Admin Features

**Access Level**: Full access to assigned countries with permission-based capabilities

### Country-Scoped Access

Platform Admins are assigned specific countries and can only access data for those regions:

- **India (IN)**: Asia Pacific region
- **Malaysia (MY)**: Asia Pacific region
- **United Kingdom (GB)**: Europe region
- Additional countries as configured

### Dashboard (`/admin`)

#### Regional Overview
- Tenant count for assigned countries
- User statistics per region
- Revenue metrics (if billing permission granted)
- Compliance status

### Tenant Management (`/admin/tenants`)

For assigned countries only:
- View all tenants
- Create new tenants
- Edit tenant details
- Manage tenant subscriptions
- View tenant activity
- Suspend/reactivate tenants

### User Management (`/admin/users`)

For assigned countries only:
- View all users
- Reset user passwords
- Manage user roles
- View user activity logs

### Available Permissions

Platform Admins can be granted specific permissions:

| Permission Code | Description |
|-----------------|-------------|
| `read_tenants` | View tenant information |
| `manage_tenants` | Create, edit, delete tenants |
| `read_users` | View user information |
| `manage_users` | Create, edit, delete users |
| `reset_passwords` | Reset user passwords |
| `view_logs` | View audit logs |
| `manage_logs` | Manage/export audit logs |
| `read_admins` | View other admins |
| `manage_admins` | Create/manage lower-level admins |
| `view_analytics` | Access analytics dashboards |
| `manage_features` | Toggle feature flags |
| `view_billing` | View billing information |
| `manage_billing` | Manage billing and subscriptions |

---

## Tech Support Manager Features

**Access Level**: Global technical monitoring with read-only business data access

### Key Characteristics
- **NOT country-scoped**: Has global platform visibility
- **Technical focus**: System health, APIs, performance, errors
- **Read-only business access**: Cannot modify tenant or user data

### Tech Support Dashboard (`/tech-support`)

A comprehensive technical monitoring dashboard with multiple tabs:

#### Overview Tab
Real-time system status including:
- Overall platform health status (Healthy/Degraded/Critical)
- System uptime percentage (dynamically updated)
- Last health check timestamp
- Quick metrics summary

#### Services Tab
Live service monitoring:

| Service | Metrics |
|---------|---------|
| API Gateway | Status, Latency (ms), Last Ping |
| Database (Primary) | Status, Latency (ms), Last Ping |
| Database (Replica) | Status, Latency (ms), Last Ping |
| Cache (Redis) | Status, Latency (ms), Last Ping |
| File Storage | Status, Latency (ms), Last Ping |
| Email Service | Status, Latency (ms), Last Ping |

Status indicators:
- **Up** (Green): Service operating normally
- **Degraded** (Yellow): Service experiencing issues
- **Down** (Red): Service unavailable

#### APIs Tab
API endpoint monitoring:

| Field | Description |
|-------|-------------|
| Method | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| Path | API endpoint path |
| Status | Active, Deprecated, Disabled |
| Avg Latency | Average response time in milliseconds |
| Request Count | Total requests handled |
| Error Rate | Percentage of failed requests |
| Last Called | Timestamp of last request |

#### Errors Tab
Error log monitoring:

| Field | Description |
|-------|-------------|
| Timestamp | When the error occurred |
| Level | Error, Warning, Info |
| Message | Error description |
| Source | Originating service/component |
| Count | Number of occurrences |
| Stack Trace | Technical details (expandable) |

#### Performance Tab
Real-time performance metrics:

| Metric | Unit | Trend Tracking |
|--------|------|----------------|
| Avg Response Time | ms | Up/Down/Stable |
| Requests/min | req | Up/Down/Stable |
| Error Rate | % | Up/Down/Stable |
| Active Sessions | count | Up/Down/Stable |
| CPU Usage | % | Up/Down/Stable |
| Memory Usage | % | Up/Down/Stable |

### Technical Permissions

| Permission | Description |
|------------|-------------|
| `view_system_health` | Access system health dashboard |
| `view_api_metrics` | View API performance metrics |
| `manage_apis` | Enable/disable API endpoints |
| `view_error_logs` | Access error logs |
| `manage_alerts` | Configure alert thresholds |
| `view_performance` | Access performance metrics |

### Auto-Refresh

The Tech Support dashboard automatically refreshes every 30 seconds with dynamic data variations to simulate real-time monitoring.

---

## Manager Features

**Access Level**: Operations access for assigned countries/regions

### Dashboard (`/manager`)

Country-specific operational overview:
- Tenant operations for assigned regions
- User activity metrics
- Service requests
- Operational alerts

### Capabilities

For assigned countries only:
- View tenant information
- Monitor user activity
- Access operational reports
- View (not manage) billing information
- Coordinate with Support Team

### Limitations
- Cannot create or delete tenants
- Cannot access unassigned countries
- Cannot modify system configurations
- No access to technical monitoring

---

## Support Team Features

**Access Level**: Support ticket handling for assigned countries/regions

### Dashboard (`/support`)

Support-focused interface:
- Active tickets for assigned regions
- Customer inquiries
- Escalation queue
- Resolution metrics

### Capabilities

For assigned countries only:
- Handle support tickets
- View customer information (read-only)
- Update ticket status
- Escalate to managers
- Access knowledge base

### Limitations
- Cannot modify tenant or user data
- Cannot access billing information
- No access to system configuration
- Limited to support functions only

---

## Multi-Tenancy System

BizFlow implements comprehensive multi-tenancy with complete data isolation:

### Tenant Isolation Mechanisms

1. **JWT Claims**: Tenant ID embedded in authentication tokens
2. **X-Tenant-ID Headers**: API requests scoped by header
3. **Subdomain Routing**: Tenant-specific subdomains
4. **Database Scoping**: All queries filtered by `tenant_id`

### Tenant Features

#### Subscription Tiers

| Tier | Features |
|------|----------|
| Free | Basic features, limited users |
| Pro | Advanced features, more users, priority support |
| Enterprise | All features, unlimited users, dedicated support |

#### Tenant Branding

Comprehensive white-label theming:
- Custom logos (primary, secondary, favicon)
- Color palettes
- Typography settings
- Theme tokens
- Custom CSS injection
- Email template customization (13 types)

---

## Compliance & Regulatory Modules

### Compliance Pack System

Configurable framework for country-specific compliance requirements:

- Checklist items per regulation
- Progress tracking
- Evidence management
- Audit trails
- Compliance status reporting

### India Compliance Module

| Feature | Description |
|---------|-------------|
| **GST Compliance** | GSTIN validation, state code parsing, CGST/SGST/IGST calculation, e-invoice generation, HSN/SAC codes |
| **WhatsApp/SMS DLT** | Template registration, sender ID management, variable extraction, consent scrubbing |
| **Aadhaar Protection** | Verhoeff checksum validation, secure masking (last 4 digits), access logging |
| **RBI Guidelines** | Card tokenization, 2FA verification, recurring mandate compliance, refund policy validation |

### UAE Compliance Module

| Feature | Description |
|---------|-------------|
| **VAT Compliance** | TRN validation, 5% VAT calculation, zero-rated/exempt handling, reverse charge |
| **TRA Messaging** | Sender ID registration, template approval, opt-out mechanism |
| **Data Residency** | Data classification, storage location tracking, cross-border compliance |
| **Arabic Support** | Business terms translation, dual-language invoices, RTL display |
| **Emirates ID** | Country code validation, secure masking, formatted display |

### UK Compliance Module

| Feature | Description |
|---------|-------------|
| **GDPR Controls** | ICO registration, lawful basis documentation, privacy policy, DPO, DPIA |
| **Data Retention** | Configurable periods, automated deletion, HMRC 6-year requirements |
| **UK VAT Invoicing** | VAT number validation (Mod 97), 20%/5%/0% rates, MTD compliance |
| **Consent Management** | Granular consent types, lawful basis, consent proof, withdrawal, expiry |
| **DSAR Handling** | 30-day response tracking, identity verification, audit trail |
| **Data Breach Register** | Severity assessment, ICO notification (72 hours), remediation tracking |

---

## Multi-Currency System

### Supported Currencies

| Code | Currency | Decimal Places |
|------|----------|----------------|
| INR | Indian Rupee | 2 |
| AED | UAE Dirham | 2 |
| GBP | British Pound | 2 |
| MYR | Malaysian Ringgit | 2 |
| SGD | Singapore Dollar | 2 |
| USD | US Dollar | 2 |
| EUR | Euro | 2 |
| AUD | Australian Dollar | 2 |
| CAD | Canadian Dollar | 2 |
| JPY | Japanese Yen | 0 |
| CNY | Chinese Yuan | 2 |
| SAR | Saudi Riyal | 2 |
| ZAR | South African Rand | 2 |
| NGN | Nigerian Naira | 2 |
| BRL | Brazilian Real | 2 |

### Exchange Rate Features

- Historical rate tracking
- Activation/deactivation per currency
- Super Admin management endpoints
- Automatic conversion calculations
- Invoice currency support
- Payment currency support

---

## White-Label & Reseller System

### Tenant Hierarchy

1. **Platform**: BizFlow core platform
2. **Reseller**: White-label partners
3. **Direct**: Direct BizFlow tenants

### Reseller Features

- Custom branding configuration
- Revenue sharing agreements
- Commission tracking
- Reseller dashboard (`/reseller`)
- Sub-tenant management

### Branding Configuration

| Element | Customization |
|---------|---------------|
| Logo | Primary, secondary, favicon |
| Colors | Full palette customization |
| Typography | Font family, sizes, weights |
| Theme Tokens | CSS variables |
| Custom CSS | Additional styling |
| Email Templates | 13 template types |

---

## Security Features

### Authentication

- JWT Access Tokens (short-lived)
- JWT Refresh Tokens (long-lived with rotation)
- Automatic token refresh
- Session management

### Admin Security

| Feature | Description |
|---------|-------------|
| **Login Rate Limiting** | Max 5 attempts before lockout |
| **Account Lockout** | 30-minute lockout duration |
| **IP Whitelist/Blacklist** | CIDR notation support |
| **Session Management** | Active session tracking |
| **2FA Readiness** | TOTP, SMS, Email methods |
| **Audit Logging** | Comprehensive action tracking |

### Security Configuration

```typescript
{
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  sessionTimeoutMinutes: 60,
  sessionAbsoluteTimeoutHours: 24,
  requireIpWhitelist: false,
  require2FA: false,
  require2FAForSuperAdmin: true,
  passwordExpiryDays: 90,
  minPasswordLength: 12,
  auditLogRetentionDays: 365
}
```

### High-Risk Actions (Require Additional Verification)

- Admin creation/deletion
- Role changes
- Tenant deletion
- User deletion
- Security configuration changes
- 2FA disable
- Terminate all sessions

---

## Business Vertical Dashboards

BizFlow provides specialized dashboards for different business types:

| Dashboard | Route | Target Business |
|-----------|-------|-----------------|
| PG/Hostel | `/pg` | Paying Guest, Hostels |
| Salon | `/salon` | Salons, Spas, Beauty |
| Clinic | `/clinic` | Clinics, Healthcare |
| Education | `/education` | Coaching, Training |
| Tourism | `/tourism` | Travel, Tourism |
| Legal | `/legal` | Law Firms, Legal |
| Real Estate | `/real-estate` | Property, Real Estate |
| Coworking | `/coworking` | Coworking Spaces |
| Logistics | `/logistics` | Delivery, Shipping |
| Service | `/service` | General Services |

---

## API & Integration

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/admin/logout` | Admin logout |
| POST | `/api/auth/admin/refresh` | Refresh tokens |
| GET | `/api/auth/user` | Get current user |

### Platform Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform-admin/me` | Get current admin context |
| GET | `/api/platform-admins` | List all admins (Super Admin) |
| POST | `/api/platform-admins` | Create new admin |
| PATCH | `/api/platform-admins/:id` | Update admin |
| DELETE | `/api/platform-admins/:id` | Delete admin |

### Tech Support Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tech-support/health` | System health status |
| GET | `/api/tech-support/apis` | API endpoint metrics |
| GET | `/api/tech-support/errors` | Error logs |
| GET | `/api/tech-support/metrics` | Performance metrics |

### Region Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/region-configs` | All region configs |
| GET | `/api/region-configs/active` | Active regions only |
| GET | `/api/region-configs/countries` | Country list for selection |

---

## Login Credentials

### Default Super Admin Account

| Field | Value |
|-------|-------|
| Email | superadmin@bizflow.app |
| Password | Admin@123! |
| Role | SUPER_ADMIN |

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

## Mobile Application

### Flutter Architecture

- **Clean Architecture**: Separation of concerns
- **BLoC Pattern**: State management
- **Dio Client**: HTTP with interceptors
- **Secure Storage**: JWT token storage

### Key Modules

- Authentication module
- Tenant selection
- Dashboard module
- Offline support (planned)

---

## Deployment

### Supported Platforms

| Platform | Services |
|----------|----------|
| **AWS** | EKS, Route53, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront + WAF |
| **GCP** | Cloud Run, Cloud SQL PostgreSQL, Memorystore Redis, Cloud Storage, Secret Manager |

### Disaster Recovery

| Provider | RPO | RTO |
|----------|-----|-----|
| AWS | 15 minutes | 1 hour |
| GCP | 15 minutes | 45-60 minutes |

---

## Add-on Marketplace

### Marketplace Features

- Versioned add-ons (semantic versioning)
- Per-tenant installation
- Configuration management
- Reviews and ratings

### Pricing Models

- Free
- One-time purchase
- Subscription
- Usage-based

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Platform: BizFlow Enterprise SaaS*
