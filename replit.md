# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management with a vision for diverse business needs and global market potential. The platform offers specialized modules for various industries including Healthcare, Salon/Spa, PG/Hostel, Coworking, General Services, Real Estate, Tourism, Education, Logistics, Legal Services, and Furniture Manufacturing.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform Features
MyBizStream is built as a multi-tenant SaaS platform with robust authentication and authorization. It utilizes Replit Auth (OIDC) for initial authentication, complemented by JWT for session management and token rotation. Security features include login rate limiting, IP whitelisting/blacklisting, and readiness for 2FA.

### Authentication Architecture
The platform supports **hybrid authentication** for flexibility across different access patterns:
- **JWT Authentication**: Primary method for API access, with tokens stored in localStorage and sent via `Authorization: Bearer` header
- **Session Authentication**: Replit Auth (OIDC) creates sessions for browser-based access via cookies
- **Hybrid Middleware**: The `authenticateHybrid` middleware (in `server/core/auth-middleware.ts`) supports both methods:
  - Checks for JWT token first (takes precedence)
  - Falls back to session-based auth via `req.isAuthenticated()`
  - Used by consulting and software_services modules to allow dashboard users to access APIs without separate JWT tokens
- **Tenant Context**: The middleware in `server/index.ts` (lines 198-289) populates `req.context` with user, tenant, role, permissions, and features before route handlers execute

Multi-tenancy is enforced via JWT claims and an `X-Tenant-ID` header, supporting subdomain isolation and per-tenant feature flags. A comprehensive Role-Based Access Control (RBAC) system defines roles like Super Admin, Admin, Manager, Staff, and Customer, with a granular permission matrix (`resource:action`) and module-level access control.

A five-tier platform administration system provides scoped access based on roles and country assignments, with full audit trail capabilities. The platform also includes a Customer Portal for self-service, a White-Label & Reseller System for hierarchical tenant management, and extensive Tenant Branding options for customization.

Compliance and data protection are central, with features aligned with HIPAA/DPDP, including PHI access logging, role-based data masking, consent management, and unusual access detection. The system supports country-specific compliance for India (GST, DLT, Aadhaar), UAE (VAT, TRA, Data Residency, Arabic support), UK (GDPR, Data Retention, VAT), Malaysia (SST, PDPA), and US (Multi-state sales tax). It boasts multi-currency support for 15 currencies with historical exchange rates and precise decimal handling. All significant actions are captured in an Audit Logging system.

### Add-on Marketplace
The platform features a comprehensive Add-on Marketplace with:
- **Country-specific filtering**: Add-ons are filtered at the SQL level using `supportedCountries` jsonb field
- **Multi-currency pricing**: Each add-on supports multiple pricing tiers with currency variants (INR, MYR, GBP, USD)
- **Phase 1 Add-ons** (11 seeded):
  - Payroll (India) - ₹49/employee/month
  - Payroll (Malaysia) - MYR 15/employee/month
  - Payroll (UK) - £3/employee/month
  - WhatsApp Automation - global availability
  - Advanced Analytics - global availability
  - Extra Users Pack (5 users)
  - Extra Storage Pack (10GB)
  - GST Filing Pack (India only)
  - Document Management
  - Multi-Branch Support
  - API Access
- **Compatibility badges**: UI shows "Compatible" for country-specific add-ons and "Global" for universally available add-ons
- **SQL-level filtering**: `supportedCountries @> '["IN"]'::jsonb` ensures only compatible add-ons reach clients with accurate pagination

### Technical Implementation
The **Frontend** is developed using React 18 with TypeScript, styled with Tailwind CSS and shadcn/ui components. Data fetching is managed by TanStack Query v5, and routing by Wouter. The design adheres to a professional blue color scheme with Inter font and supports dark/light modes.

The **Backend** is built with Express.js and TypeScript, following a RESTful API design. It incorporates Zod for request validation and middleware for authentication and security headers.

**Database** operations rely on PostgreSQL with Drizzle ORM for type-safe schema definitions and migrations handled by drizzle-kit.

The **Mobile** application, located in the `mobile/` directory, is developed with Flutter, adhering to Clean Architecture principles (presentation, domain, data layers). It uses Flutter BLoC for state management, Dio for HTTP requests with interceptors, Hive for offline caching, and GoRouter with authentication guards. It fully supports multi-tenancy. Several modules (Furniture, HRMS, Legal, Education) are fully implemented on mobile, with others partially implemented or scaffolded.

Deployment strategies include global deployment on AWS (EKS, RDS, ElastiCache, S3, CloudFront) and GCP (Cloud Run, Cloud SQL, Memorystore) with multi-region support and disaster recovery capabilities (RPO 15 mins, RTO 45-60 mins).

API structure is organized into Core APIs, module-specific APIs (e.g., Furniture Module APIs), and Admin APIs, facilitating clear separation of concerns. Production operations are secured with health endpoints, startup validation for environment variables, security guards against dev endpoints, and robust scripting for migrations and smoke tests.

### Billing & Pricing
The platform uses a flexible billing system with:
- **Multi-interval pricing**: Plans support multiple billing cycles (monthly, quarterly, yearly) stored in the `billingCycles` JSONB column
- **India pricing** (seeded): Free ₹0/₹0, Basic ₹99/₹999, Pro ₹199/₹1999 (monthly/yearly)
- **Automatic savings calculation**: Yearly savings badges show absolute amounts (e.g., "Save ₹189")
- **Admin management**: Platform admins can configure monthly/yearly prices via the billing admin UI
- **API endpoint**: `/api/billing/plans-with-cycles` returns plans with full cycle data for frontend consumption
- **Frontend pages**: Both `/packages` and `/pricing` pages fetch dynamic pricing and display based on selected billing cycle

### UX Improvements
- **Booking Dialog**: Enhanced with comprehensive alert system when customers/services are missing:
  - Combined alerts for both missing scenarios with quick action buttons
  - Mutually exclusive alert conditions (6 scenarios: both error, customer error only, service error only, both empty, customer empty only, service empty only)
  - Informative dropdown placeholders (Loading/Error/No data available states)
  - Submit button disabled when blocking conditions exist

### Razorpay Subscription Management
The platform integrates Razorpay for subscription-based billing of marketplace add-ons:
- **Plan Management**: `createPlan`, `fetchPlan` for creating recurring billing plans
- **Subscription Lifecycle**: `createSubscription`, `fetchSubscription`, `cancelSubscription`, `pauseSubscription`, `resumeSubscription`, `updateSubscription`
- **Webhook Handlers**: Idempotent handlers for `subscription.activated`, `subscription.charged`, `subscription.cancelled` events
- **Marketplace Add-on Billing** (`/api/billing/marketplace-addon`):
  - `GET /installed` - List tenant's installed add-ons
  - `GET /status/:addonId` - Get installation status
  - `POST /subscribe` - Subscribe with free/trial/paid flow
  - `POST /cancel` - Cancel subscription (immediate or at period end)
  - `POST /reactivate` - Reactivate cancelled subscription
- **Trial Support**: Trials create Razorpay subscriptions with delayed start_at, auto-converting to paid when trial ends
- **Idempotent Webhooks**: Create missing tenantAddons rows using notes data when subscription events arrive

### Recent Changes (January 2026)
- Extended Razorpay service with full subscription management capabilities
- Created marketplace add-on billing routes with free/trial/paid subscription flows
- Updated webhooks to handle both payroll and marketplace add-on subscription events
- Implemented idempotent webhook handlers that create missing tenantAddons rows
- Added Phase 1 Marketplace with 11 add-ons and multi-currency pricing
- Implemented SQL-level country filtering for add-ons using jsonb operators
- Enhanced booking dialog with helpful alerts for missing customers/services
- Fixed session-to-JWT exchange for Replit Auth users
- Updated Super Admin deletion system with accurate counts across 11 tables

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