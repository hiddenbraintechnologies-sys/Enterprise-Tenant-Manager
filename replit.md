# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform for small and medium businesses across various sectors like PGs/Hostels, Salons, Gyms, Coaching Institutes, Clinics, Diagnostics, and general service businesses. It aims to streamline operations, manage customer relationships, handle bookings, and provide analytics, offering a scalable and secure solution with a vision for diverse business needs.

## User Preferences
No specific user preferences were provided in the original `replit.md` file.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Tailwind CSS, and shadcn/ui. It features "Inter" as the primary font and "JetBrains Mono" for monospace, with a professional blue color scheme. Components are built using shadcn/ui with custom styling for consistent branding.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, Wouter.
- **Backend**: Express.js with TypeScript, designed for scalability.
- **Database**: PostgreSQL with Drizzle ORM for type-safe interactions.
- **Authentication**: Replit Auth (OIDC) for initial authentication, supplemented by JWT (Access + Refresh tokens) with rotation and revocation.
- **Multi-Tenancy**: Core design principle with tenant isolation via JWT claims, `X-Tenant-ID` headers, subdomains, and user defaults, ensuring data scoping with `tenant_id`.
- **Feature Flags**: Granular system for enabling/disabling features per tenant, often tied to subscription tiers (Free, Pro, Enterprise).
- **Role-Based Access Control (RBAC)**: Defines roles (Super Admin, Admin, Manager, Staff, Customer) and a `resource:action` permission matrix.
- **Platform Admin Permission System**: Five-tier hierarchy with granular permissions:
  - **SUPER_ADMIN**: Full access to everything, can create all other admin types
  - **PLATFORM_ADMIN**: Full access to assigned countries with permission-based capabilities
  - **TECH_SUPPORT_MANAGER**: Global platform technical monitoring, API management, system health, error logs, performance metrics (not country-scoped)
  - **MANAGER**: Operations access for assigned countries/regions
  - **SUPPORT_TEAM**: Support ticket handling for assigned countries/regions
  
  Technical permissions include: VIEW_SYSTEM_HEALTH, VIEW_API_METRICS, MANAGE_APIS, VIEW_ERROR_LOGS, MANAGE_ALERTS, VIEW_PERFORMANCE
- **Audit Logging**: Tracks critical actions (create, update, delete, login, logout, access) for compliance and security.
- **Compliance & Data Protection (HIPAA/DPDP Style)**: Includes PHI access logging, role-based data masking, consent management, unusual access detection, and secure configuration.
- **Admin System**: Production-ready with security features like login rate limiting, account lockout, IP whitelist/blacklist, session management, and 2FA readiness.
- **White-Label Reseller System**: Supports a white-label model with tenant hierarchy (Platform, Reseller, Direct), reseller profiles, revenue agreements/tracking, branding configuration, and an admin dashboard.
- **Tenant Branding System**: Comprehensive white-label theming with custom logos, color palettes, typography, theme tokens, custom CSS, and 13 types of email template customization.
- **Compliance Pack System**: Configurable framework for country-specific compliance (GDPR, DPDP, HIPAA) with checklist items, progress tracking, evidence management, and audit trails.
- **India Compliance Module**: Comprehensive India-specific regulatory compliance features:
  - **GST Compliance**: GSTIN validation with state code parsing, inter/intra-state tax calculation (CGST/SGST/IGST), e-invoice generation, HSN/SAC code support
  - **WhatsApp/SMS DLT Compliance**: Template registration, sender ID management, variable extraction, consent scrubbing
  - **Aadhaar Data Protection**: Verhoeff checksum validation, secure masking (last 4 digits only), access logging with purpose tracking
  - **RBI Payment Guidelines**: Card tokenization checks, 2FA verification, recurring mandate compliance, refund policy validation
- **UAE Compliance Module**: Comprehensive UAE-specific regulatory compliance features:
  - **VAT Compliance**: TRN validation with check digit verification, 5% VAT calculation, zero-rated/exempt handling, reverse charge mechanism
  - **TRA Messaging Compliance**: Sender ID registration, template approval workflow, opt-out mechanism support
  - **Data Residency Tagging**: Data classification (personal/financial/health/government), storage location tracking, cross-border transfer compliance
  - **Arabic Language Support**: Common business terms translation, dual-language invoice support, RTL display readiness
  - **Emirates ID**: Validation with country code check, secure masking, formatted display
- **UK Compliance Module**: Comprehensive UK-specific regulatory compliance features:
  - **GDPR Controls**: ICO registration tracking, lawful basis documentation, privacy policy management, DPO appointment, DPIA support
  - **Data Retention Policies**: Configurable retention periods per data category, automated deletion, HMRC 6-year requirements, policy review scheduling
  - **UK VAT Invoicing**: VAT number validation (Mod 97), 20% standard/5% reduced/0% zero rates, MTD compliance, reverse charge support
  - **Consent Management**: Granular consent types, lawful basis tracking, consent proof/evidence, withdrawal mechanism, expiry management
  - **DSAR Handling**: 30-day response tracking, request types (access/rectification/erasure/portability), identity verification, audit trail
  - **Data Breach Register**: Severity assessment, ICO notification tracking (72 hours), data subject notification, remediation tracking

### Flutter Mobile Application
- **Architecture**: Clean Architecture with presentation, domain, and data layers
- **State Management**: Flutter BLoC pattern with Equatable for immutability
- **Networking**: Dio HTTP client with interceptors for auth/tenant headers
- **Authentication**: JWT with automatic token refresh, secure storage (flutter_secure_storage)
- **Multi-Tenant**: TenantInterceptor injects X-Tenant-ID header on all authenticated requests
- **Environment**: Supports dev (dev.bizflow.app) and prod (api.bizflow.app) environments
- **Dependency Injection**: get_it for service location with proper registration order
- **Routing**: GoRouter with authentication guards and tenant selection flow
- **Key Directories**:
  - `mobile/lib/core/` - DI, networking, storage, config
  - `mobile/lib/domain/` - Entities, repositories, use cases
  - `mobile/lib/data/` - Models, datasources, repository implementations
  - `mobile/lib/features/` - Auth, tenant, dashboard modules
  - `mobile/lib/presentation/` - Routes, shared pages/widgets

### System Design Choices
- **Modular Structure**: Organized into `client`, `server`, `shared`, and `mobile` directories.
- **API-First Approach**: RESTful API endpoints for core functionalities, business operations, notifications, billing, inventory, memberships, and healthcare.
- **Extensibility**: Designed for future microservices, Redis integration, and JWT system evolution.
- **Healthcare Module**: A specialized, feature-flagged module for enterprise clients, including patient management, doctor profiles, appointment scheduling, and EMR.
- **Global Deployment Architecture**: Supports both AWS (EKS, Route53, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront + WAF) and GCP (Global HTTP(S) Load Balancer, Cloud Run, Cloud SQL PostgreSQL, Memorystore Redis, Cloud Storage, Secret Manager) for multi-region deployment with DR capabilities (RPO 15 mins, RTO 1 hour for AWS; RPO 15 mins, RTO 45-60 mins for GCP).
- **Add-on Marketplace**: Modular plugin system with:
  - Versioned add-ons with semantic versioning (major.minor.patch)
  - Per-tenant installation with configuration
  - Free, one-time, subscription, and usage-based pricing models
  - Reviews and ratings system
  - Auto-update settings (stable/prerelease channels)
  - Install/update/uninstall audit history
- **Multi-Currency Support**: Comprehensive currency management system:
  - Exchange rates table with historical tracking and activation/deactivation
  - Invoice and payment currency fields with base currency tracking
  - Currency conversion with precision based on target currency (JPY/0, BHD/3, etc.)
  - 15 supported currencies: INR, AED, GBP, MYR, SGD, USD, EUR, AUD, CAD, JPY, CNY, SAR, ZAR, NGN, BRL
  - Client-side currency service with formatting, symbols, and decimal precision
  - Super Admin API endpoints for exchange rate management
  - **Invoice Management** (`/invoices`): Full CRUD with multi-currency selection, automatic exchange rate lookup, base amount conversion (to USD), line item management, and formatted currency display
  - **Payment Recording**: Cross-currency payment support with automatic conversion when payment currency differs from invoice currency, invoice status updates (draft/sent/partial/paid/overdue/cancelled)

## Documentation
- **MYBIZSTREAM_DOCUMENTATION.md**: Comprehensive platform documentation
- **TESTING_WORKFLOW.md**: Complete testing strategy, scenarios, and CI/CD guidelines

## External Dependencies
- **Replit Auth (OIDC)**: Initial user authentication.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Database interaction.
- **TanStack Query v5**: Frontend data fetching and state management.
- **Wouter**: Frontend routing.
- **Tailwind CSS**: Frontend styling.
- **shadcn/ui**: Re-usable UI components.