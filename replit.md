# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management. The platform aims to serve diverse business needs and has global market potential, offering specialized modules for industries such as Healthcare, Salon/Spa, PG/Hostel, Coworking, General Services, Real Estate, Tourism, Education, Logistics, Legal Services, and Furniture Manufacturing.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform
MyBizStream is built as a multi-tenant SaaS platform featuring robust authentication (Replit Auth OIDC, JWT, hybrid middleware), fine-grained Role-Based Access Control (RBAC), and a five-tier administration system. It supports subdomain isolation, per-tenant feature flags, and comprehensive audit logging. Key features include a Customer Portal, White-Label & Reseller System, extensive Tenant Branding options, multi-currency support, and compliance with various international data protection and taxation regulations (HIPAA/DPDP, India, UAE, UK, Malaysia, US).

### Add-on Marketplace & Entitlement Enforcement
The platform includes an Add-on Marketplace with country-specific filtering and multi-currency pricing. A comprehensive feature gating system enables soft-upselling by controlling module and feature access based on plan tier, add-on status, country, and user roles. A robust entitlement enforcement system controls add-on access, supporting states like `active`, `trial`, `grace`, `expired`, `not_installed`, and `cancelled`. This includes both backend (API middleware, dependency checking) and frontend enforcement (hooks, wrapper components) with background synchronization jobs.

### Technical Implementation
The **Frontend** is developed using React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, and Wouter, featuring a professional blue color scheme with dark/light modes. The **Backend** is built with Express.js and TypeScript, adhering to a RESTful API design with Zod for validation. **Database** operations utilize PostgreSQL with Drizzle ORM. The **Mobile** application (Flutter) follows Clean Architecture, uses BLoC for state management, Dio for HTTP, and Hive for offline caching, with full multi-tenancy support. Deployment is multi-cloud on AWS and GCP with multi-region support and disaster recovery.

### Billing & Pricing
A flexible billing system supports multi-interval pricing with automatic savings calculations. Razorpay is integrated for marketplace add-on subscription management, handling plan creation, subscription lifecycle, and idempotent webhook processing.

### User Experience & Notifications
The platform includes an enhanced Booking Dialog and a customizable Notification Center offering in-app alerts and preferences for configuring notification types, severity, channels (In-App, Email, WhatsApp, SMS), and quiet hours.

### Internationalization (i18n) & Country Locale Defaults
The platform supports 8 languages via `react-i18next` (English, Hindi, Telugu, Tamil, Kannada, Malayalam, Malay, and Chinese Simplified) with country-driven language selection. A centralized country defaults system ensures correct locale settings (currency, timezone, tax rates) during tenant creation for supported countries (MY, IN, SG, AE, GB, US).

### Progressive Web App (PWA)
The platform offers PWA features including an installable app with manifest and icons, an offline fallback page, and a smart install prompt. A service worker provides safe caching for static assets.

### Security Hardening
Security measures include:
- **Security Headers (Helmet)**: Baseline security headers are configured, including CSP in report-only mode with Razorpay exceptions.
- **Registration Anti-Abuse**: Rate limiting, honeypot, optional MX validation, business name validation (Unicode-safe, no special characters), and profanity moderation (flag or strict block mode with obfuscation and leet-speak detection, and a false positive allowlist).
- **Audit Logging**: Key security events are logged for tracking.
- **Impersonation ("View as User")**: Allows admins to view the application as another staff member for support, with strict permission checks, sensitive route blocking, and clear UI indicators.
- **Tenant Isolation**: Multi-tenant data isolation is enforced through middleware and scoping helpers, ensuring "fail-closed" behavior and returning 404 for cross-tenant access to prevent information leakage.
- **Login History Tracking**: Zoho-style login history with SSO integration (Google, Microsoft, Okta), 90-day retention with automatic cleanup job.
- **Force Logout Capability**: Session version management enables admins to force logout staff members across all devices; self-service logout of other sessions also supported.
- **IP Restriction System**: Configurable IP allow/deny rules with CIDR support for tenant-level access control.
- **Suspicious Login Detection**: Device fingerprinting using SHA-256 hashes; automatic security alerts for new devices or IPs during SSO login.
- **Security Alerts**: Categorized alerts (new_device, new_ip, new_country, force_logout, suspicious_activity) with severity levels and acknowledgment workflow.
- **Session Version Middleware**: Applied to authenticated routes to enforce logout invalidation across the platform.

### Role-Based Access Control (RBAC)

The platform implements a comprehensive permission-based RBAC system defined in `shared/rbac.ts`.

#### Roles
Five predefined roles with hierarchical access:
- **OWNER**: Full platform access, all settings and modules
- **ADMIN**: Most access, view-only for Security and Billing
- **MANAGER**: Operations focus, limited settings (Profile, Theme, Notifications, Client Portal view-only)
- **STAFF**: Limited to personal work view and appointments (Profile, Notifications only)
- **ACCOUNTANT**: Billing and invoicing focus (Profile, Billing, Notifications only)

#### Settings Visibility per Role
| Setting | Owner | Admin | Manager | Staff | Accountant |
|---------|-------|-------|---------|-------|------------|
| Profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Organization | ✓ | ✓ | - | - | - |
| Team & Roles | ✓ | ✓ | - | - | - |
| Security | ✓ | View only | - | - | - |
| Billing | ✓ | View only | - | - | ✓ |
| Client Portal | ✓ | ✓ | View only | - | - |
| Branding | ✓ | ✓ | - | - | - |
| Theme & Layout | ✓ | ✓ | ✓ | - | - |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ |

#### Permission Categories
- **Settings Permissions**: `SETTINGS_*_VIEW`, `SETTINGS_*_EDIT` for Profile, Org, Team, Security, Billing, Client Portal, Branding, Theme, Notifications
- **Dashboard Permissions**: `DASHBOARD_OVERVIEW_VIEW`, `DASHBOARD_OPERATIONS_VIEW`, `DASHBOARD_MYWORK_VIEW`
- **Module Permissions**: `CLIENTS_VIEW`, `SERVICES_VIEW`, `APPOINTMENTS_VIEW`, `INVOICES_VIEW`, `REPORTS_VIEW`

#### Key Files
- `shared/rbac.ts`: Role/permission constants, role-permission mappings, helper functions (`hasPermission`, `buildPermissionsFromRole`, `normalizeRole`)
- `shared/defaultRoute.ts`: Smart dashboard routing via `getDefaultDashboardRoute(user)` - routes based on role + permissions + business type
- `shared/plans.ts`: Plan and Addon definitions with permission mappings (FREE, BASIC, PRO, ENTERPRISE plans; HRMS, PAYROLL, SERVICES, ADVANCED_ANALYTICS, WHITE_LABEL addons)
- `shared/composePermissions.ts`: Permission composer that merges Role + Plan + Addon permissions into a single set
- `server/rbac/requirePermission.ts`: Express middleware guards (`requirePermission`, `requireAnyPermission`, `requireAllPermissions`)
- `server/audit/logAudit.ts`: Audit logging system for security events (role changes, plan changes, addon installs, force logout, login events)
- `client/src/rbac/useCan.ts`: React hook for permission-based UI visibility (`can`, `canAny`, `canAll`)
- `client/src/stores/authStore.ts`: Zustand auth store with race-condition-proof flow (status: idle/loading/authenticated/unauthenticated)
- `client/src/billing/postPlanSelection.ts`: Safe post-plan handler - never redirects to module routes, always uses `getDefaultDashboardRoute(user)`
- `client/src/layouts/DashboardLayout.tsx`: Protected layout that prevents blank screens during auth loading
- `client/src/config/sidebar.config.ts`: Permission-based sidebar configuration (single JSON → UI)

#### Permission Composition
Permissions are composed from three sources: `Final Permissions = Role + Plan + Addons`
- **Role permissions**: Base access granted by user role (OWNER, ADMIN, MANAGER, STAFF, ACCOUNTANT)
- **Plan permissions**: Features unlocked by subscription tier (FREE, BASIC, PRO, ENTERPRISE)
- **Addon permissions**: Extra features from installed add-ons (HRMS, PAYROLL, SERVICES, etc.)

Use `composePermissions()` once during login/session refresh and store the result on the user object.

**Integration Notes:**
- `authStore` should be used as the single source of truth for auth state, replacing any existing auth context
- `DashboardLayout` should wrap all `/dashboard/*` routes in the app router
- `postPlanSelection` should be called after payment success instead of direct redirects
- Sidebar components should consume `SIDEBAR_CONFIG` and `SETTINGS_SIDEBAR_CONFIG` for permission-based rendering

**Current Implementation Status:**
- Settings sidebar (`app-sidebar.tsx`) already uses permission-based filtering via `settingsSections` with `viewPermission`/`editPermission`
- Existing `useAuth()` hook (`hooks/use-auth.ts`) uses TanStack Query; Zustand store is available as alternative/complement
- `useCan()` hook (`rbac/useCan.ts`) provides permission checks with backend-first priority, role-fallback

#### Smart Dashboard Routing
After login, users are routed based on role, permissions, and business type:

**Clinic/Salon Business:**
| Role | Landing Route |
|------|---------------|
| Owner/Admin | `/dashboard/overview` |
| Manager | `/dashboard/appointments` |
| Staff | `/dashboard/my-work` |
| Accountant | `/dashboard/overview` |

**Generic Business:**
| Role | Landing Route |
|------|---------------|
| Owner/Admin | `/dashboard/overview` |
| Manager | `/dashboard/clients` |
| Staff | `/dashboard/my-work` |
| Accountant | `/dashboard/overview` |

**Safety Fallback:** If computed route is not permitted, redirect to `/dashboard/overview`. Never redirect to module routes directly after login/payment.

#### Settings Visibility
Settings sidebar items use `viewPermission` and `editPermission` to:
- Hide items user cannot access (no disabled-only UI)
- Show "View only" badge for items user can view but not edit
- Backend permissions are used when available, with role-derived fallback

#### Usage Examples

**Backend route protection:**
```typescript
import { requirePermission } from "./rbac/requirePermission";
router.get("/api/settings/security", requirePermission("SETTINGS_SECURITY_VIEW"), handler);
```

**Frontend visibility:**
```typescript
import { useCan } from "@/rbac/useCan";
const { can } = useCan();
if (can("SETTINGS_BILLING_VIEW")) { /* show billing menu */ }
```

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
- **Helmet**: Security headers middleware