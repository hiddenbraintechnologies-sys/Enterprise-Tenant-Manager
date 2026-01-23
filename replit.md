# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management with a vision for diverse business needs and global market potential. The platform offers specialized modules for various industries including Healthcare, Salon/Spa, PG/Hostel, Coworking, General Services, Real Estate, Tourism, Education, Logistics, Legal Services, and Furniture Manufacturing.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform
MyBizStream is built as a multi-tenant SaaS platform with robust authentication (Replit Auth OIDC, JWT, hybrid middleware for flexibility), fine-grained Role-Based Access Control (RBAC), and a five-tier administration system. It supports subdomain isolation, per-tenant feature flags, and comprehensive audit logging. The platform offers a Customer Portal, White-Label & Reseller System, and extensive Tenant Branding options. Compliance with HIPAA/DPDP and various country-specific regulations (India, UAE, UK, Malaysia, US) is integrated, alongside multi-currency support.

### Add-on Marketplace
The platform features an Add-on Marketplace with country-specific filtering and multi-currency pricing. Add-ons are compatible with specific countries or globally available, with pricing tiers across multiple currencies. A comprehensive feature gating system (useFeatureGate hook) enables soft-upselling by controlling access to modules and features based on plan tier, add-on status, country, and user roles. Locked feature pages/modals with trial CTAs are used to guide users. A Super Admin Marketplace Revenue Analytics Dashboard provides insights into subscriptions, revenue, and conversion funnels.

### Super Admin Marketplace Management (Added Jan 2026)
A complete management console for Super Admins to control the marketplace:

**Database Tables:**
- `addonPlanEligibility`: Per-plan tier eligibility rules (canPurchase, trialEnabled, maxQuantity)
- `addonCountryConfig`: Per-addon country activation, pricing (monthly/yearly), trial config
- `addonAuditLog`: Audit trail for all marketplace admin actions

**API Endpoints** (`/api/super-admin/marketplace/`):
- Catalog CRUD: GET/POST/PATCH addons, POST publish/archive/restore
- Country Rollout: GET/PUT/DELETE addons/:addonId/countries/:countryCode
- Eligibility: GET/PUT addons/:addonId/eligibility/:countryCode
- Audit Logs: GET audit-logs with filtering/pagination
- Summary: GET summary for dashboard stats

**UI Page** (`/super-admin/marketplace-management`):
- Catalog Tab: Create/edit/publish/archive add-ons
- Country Rollout Tab: Configure per-country activation and pricing
- Eligibility Tab: Set plan tier purchase/trial rules
- Audit Logs Tab: View all admin actions with filters

**Seeded Add-ons**: HRMS (IN/MY/UK), Payroll (IN/MY/UK), WhatsApp Automation, Advanced Analytics with country configs and eligibility rules.

### HR Foundation vs HRMS Suite Architecture (Jan 2026)

**Key Principle**: Plans remain primary revenue, add-ons are multipliers.

**Capability Flags** (defined in `server/core/hr-addon-gating.ts`):
- `HR_FOUNDATION`: Employee directory only (Payroll OR HRMS add-on)
- `HRMS_SUITE`: Full HRMS features (HRMS add-on ONLY)
- `PAYROLL_SUITE`: Payroll processing (Payroll add-on ONLY)

**HR Foundation (Employee Directory)**:
- Accessible with: Payroll add-on OR HRMS add-on
- Features: Employee directory, departments, HR dashboard
- API Routes: `/api/hr/employees/*`, `/api/hr/departments`, `/api/hr/dashboard`
- Middleware: `requireEmployeeAccess()` checks for Payroll OR HRMS add-on

**Payroll Processing**:
- Accessible with: Payroll add-on ONLY (HRMS does NOT grant access)
- Features: Payroll runs, payslips, statutory contributions
- API Routes: `/api/hr/payroll/*`
- Middleware: `requirePayrollAccess()` checks for Payroll add-on specifically

**HRMS Suite (Full HR Management)**:
- Accessible with: HRMS add-on ONLY (Payroll does NOT grant access)
- Features: Attendance tracking, leave management, timesheets, approvals
- API Routes: `/api/hr/attendance/*`, `/api/hr/leaves/*`, `/api/hr/projects/*`
- Middleware: `requireHrmsSuiteAccess()` checks for HRMS add-on specifically

**Employee Limit Enforcement**:
- Trial users: Limited to 5 employees (PAYROLL_TRIAL_EMPLOYEE_LIMIT)
- Active marketplace subscriptions: Unlimited (-1) by default
- Legacy tenantPayrollAddon: Respects tier-based maxEmployees
- Limit exceeded: Returns 403 with code `EMPLOYEE_LIMIT_REACHED`

**Implementation Files**:
- Backend middleware: `server/core/hr-addon-gating.ts`
- Route gating: `server/routes/hrms/index.ts`, `server/routes/hrms/employees.ts`
- Sidebar UI: `client/src/components/app-sidebar.tsx`
  - `hrCoreItems`: Dashboard, Employees (Payroll OR HRMS)
  - `payrollItem`: Payroll (Payroll add-on only, locked for HRMS-only)
  - `hrmsSuiteItems`: Attendance, Leave, Pay Runs (HRMS only, locked for Payroll-only)

**Verification Test Scenarios**:
1. **Free + Payroll only**: Should see HR Dashboard, Employees, Payroll. Attendance/Leave/Pay Runs locked.
2. **Free + HRMS only**: Should see HR Dashboard, Employees, Attendance, Leave, Pay Runs. Payroll locked.
3. **Basic + Payroll + HRMS**: Full access to everything.

**Malaysia Payroll Tiers (SMB-friendly pricing):**
- Trial: 7 days, up to 5 employees (free)
- Starter (MYR 20/mo): Up to 5 employees
- Growth (MYR 39/mo): Up to 15 employees
- Scale (MYR 69/mo): Up to 50 employees
- Unlimited (MYR 99/mo): Unlimited employees

**Trial UX Copy** (localized in EN/MS/TA):
- EN: "Start Payroll trial (7 days). Add up to 5 employees — upgrade anytime."
- MS: "Cuba Payroll 7 hari. Tambah sehingga 5 pekerja — naik taraf bila-bila masa."
- TA: "Payroll 7 நாட்கள் சோதனை. 5 ஊழியர்கள் வரை சேர்க்கலாம் — எப்போது வேண்டுமானாலும் மேம்படுத்தலாம்."

**Matrix UI Improvements (Jan 2026):**
- Country Rollout Matrix: Clickable cells showing status icon + price, inline editing
- Plan Eligibility Matrix: Zoho-style grid with 3-state toggle cycle (blocked → trial → enabled)
- CountryConfigDialog supports both controlled and uncontrolled modes for flexible integration

**Smart Upsell Engine** (`server/services/marketplace/upsell-engine.ts`):
- Employee count tier upgrade nudges (80% usage = high priority, 95% = critical)
- Bundle discount suggestions: HR Complete Bundle (HRMS + Payroll + WhatsApp), Analytics Bundle
- Trial expiry reminders (requires trialEndsAt column in tenantAddons - TODO)
- Feature unlock recommendations based on plan tier eligibility

**Marketplace RBAC Permissions (Updated Jan 2026):**

*Super Admin / Platform Admin Permissions:*
- `MARKETPLACE_MANAGE_CATALOG`: Create/edit add-ons, tiers, pricing, limits, icons, categories
- `MARKETPLACE_MANAGE_PRICING`: Update pricing tiers and country-specific pricing
- `MARKETPLACE_MANAGE_ELIGIBILITY`: Set plan tier purchase/trial rules
- `MARKETPLACE_PUBLISH`: Publish/unpublish add-ons, enable per-country rollout
- `MARKETPLACE_VIEW_ANALYTICS`: View marketplace revenue dashboards, conversion funnels
- `MARKETPLACE_VIEW_AUDIT_LOGS`: View audit trail of all admin actions
- `MARKETPLACE_OVERRIDE`: Force-install/uninstall add-ons for tenant (support operations)

*Tenant Permissions:*
- `MARKETPLACE_BROWSE`: View marketplace list and details
- `MARKETPLACE_PURCHASE`: Start trial / purchase add-on, manage subscriptions
- `MARKETPLACE_MANAGE_BILLING`: View invoices, update payment method, cancel subscription

**Marketplace RBAC Enforcement:**
| Action | Required Permission |
|--------|---------------------|
| Create/edit add-on | MARKETPLACE_MANAGE_CATALOG |
| Change pricing/tiers | MARKETPLACE_MANAGE_PRICING |
| Publish add-on to country | MARKETPLACE_PUBLISH |
| View analytics page | MARKETPLACE_VIEW_ANALYTICS |
| Tenant installs add-on | MARKETPLACE_PURCHASE |
| Force install/uninstall | MARKETPLACE_OVERRIDE |

**Role Assignments:**
- `PLATFORM_SUPER_ADMIN`: All marketplace permissions
- `TENANT_ADMIN`: MARKETPLACE_BROWSE, MARKETPLACE_PURCHASE, MARKETPLACE_MANAGE_BILLING
- `TENANT_STAFF`: MARKETPLACE_BROWSE only

**API Enforcement Files:**
- Super Admin routes: `server/routes/super-admin/marketplace-management.ts`
- Analytics routes: `server/routes/super-admin/marketplace-analytics.ts`
- Tenant routes: `server/routes/marketplace/tenant-addons.ts`
- Guard middleware: `server/rbac/guards.ts` (requirePermission)

**Marketplace Revenue Analytics (Jan 2026):**
- API Endpoints: `/api/super-admin/marketplace/analytics/overview`, `/by-addon`, `/by-country`, `/funnel`
- KPIs: Active subscriptions, MTD/YTD revenue, trial-to-paid conversion, payroll attach rate

**Razorpay Add-on Subscription Integration:**
- Webhook endpoint: `/api/webhooks/razorpay-marketplace`
- Events: subscription.activated, subscription.charged, subscription.halted, subscription.cancelled, subscription.completed, payment.failed
- Idempotent processing via MarketplaceEvent table
- Trial flow: `/api/marketplace/addons/trial` with country/plan eligibility validation

**Marketplace i18n (Jan 2026):**
- Added marketplace translations to EN, HI, MS, TA locales
- Includes: add-on names, descriptions, micro-benefits, analytics labels
- Country-specific micro-benefits for Payroll (IN: PF/ESI/PT, MY: EPF/SOCSO/EIS)

### Technical Implementation
The **Frontend** uses React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, and Wouter, following a professional blue color scheme with dark/light modes. The **Backend** is built with Express.js and TypeScript, adopting a RESTful API design with Zod for validation. **Database** operations use PostgreSQL with Drizzle ORM. The **Mobile** application (Flutter) adheres to Clean Architecture, BLoC for state management, Dio for HTTP, and Hive for offline caching, fully supporting multi-tenancy. Deployment is global on AWS (EKS, RDS, ElastiCache, S3, CloudFront) and GCP (Cloud Run, Cloud SQL, Memorystore) with multi-region support and disaster recovery.

### Billing & Pricing
The platform uses a flexible billing system with multi-interval pricing (monthly, quarterly, yearly) and automatic savings calculations. Platform admins can configure pricing via a dedicated UI. Razorpay is integrated for subscription management of marketplace add-ons, handling plan creation, subscription lifecycle, and idempotent webhook processing for events like activation, charging, and cancellation, including trial support.

### User Experience & Notifications
The Booking Dialog features enhanced alerts for missing customer/service data with quick action buttons and informative dropdown placeholders. A customizable Notification Center includes a NotificationBell for in-app alerts and a Preferences UI allowing users to configure notification types, severity, channels (In-App, Email, WhatsApp, SMS), and quiet hours.

### Internationalization (i18n)
The platform supports 8 languages with react-i18next:
- **English (en)**: Default language
- **Hindi (hi)**: For India market
- **Telugu (te)**: For India market
- **Tamil (ta)**: For India and Malaysia markets
- **Kannada (kn)**: For India market
- **Malayalam (ml)**: For India market
- **Malay (ms)**: For Malaysia market (Bahasa Malaysia)
- **Chinese Simplified (zh)**: For Malaysia and Singapore markets (中文简体)

**Country-Language Mapping:**
The landing pages use country-driven language selection. Each country has a defined list of available languages:
- **IN (India)**: en, hi, ta, te, kn, ml (default: en)
- **MY (Malaysia)**: en, ms, zh, ta (default: en)
- **UK (United Kingdom)**: en (default: en)
- **AE (UAE)**: en (default: en)
- **SG (Singapore)**: en, zh, ms, ta (default: en)

Config location: `client/src/lib/country-language-config.ts`

**Behavior:**
- When country changes, if current language is not valid for new country, auto-switch to default
- Both country and language are persisted in localStorage and cookies
- Country routes (/in, /my, /uk, /uae, /sg) auto-set country and validate language
- Language detection order: localStorage -> browser navigator. Fallback: English

Translation files: `client/src/i18n/locales/`

## External Dependencies
- **Replit Auth (OIDC)**: User authentication
- **PostgreSQL**: Primary database
- **Drizzle ORM**: Database interaction
- **TanStack Query v5**: Frontend data fetching
- **Wouter**: Frontend routing
- **Tailwind CSS**: Frontend styling
- **shadcn/ui**: UI components
- **PDFKit**: PDF invoice generation
- **Twilio**: WhatsApp notifications
- **SendGrid/Resend**: Email notifications
- **Razorpay**: Subscription management and billing