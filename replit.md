# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors (e.g., PGs/Hostels, Salons, Gyms, Coaching Institutes, Clinics, Diagnostics, and general service businesses). It provides scalable and secure solutions for bookings, analytics, and business management, with a vision for diverse business needs and market potential.

## User Preferences
No specific user preferences were provided in the original `replit.md` file.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Tailwind CSS, and shadcn/ui, featuring "Inter" as the primary font and "JetBrains Mono" for monospace. A professional blue color scheme is used, with custom styling applied to shadcn/ui components for consistent branding.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, Wouter.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth (OIDC) combined with JWT (Access + Refresh tokens) for secure token management.
- **Multi-Tenancy**: Implemented via JWT claims, `X-Tenant-ID` headers, subdomains, and user defaults to ensure data isolation and scoping.
- **Feature Flags**: Granular system for enabling/disabling features per tenant, often linked to subscription tiers (Free, Pro, Enterprise).
- **Role-Based Access Control (RBAC)**: Defines roles (Super Admin, Admin, Manager, Staff, Customer) with a `resource:action` permission matrix.
- **Platform Admin Permission System**: A five-tier hierarchy (SUPER_ADMIN, PLATFORM_ADMIN, TECH_SUPPORT_MANAGER, MANAGER, SUPPORT_TEAM) with granular technical and operational permissions.
- **Audit Logging**: Tracks critical actions for compliance and security.
- **Compliance & Data Protection**: Includes features for PHI access logging, role-based data masking, consent management, and secure configurations, aligning with HIPAA/DPDP principles.
- **Admin System**: Production-ready with security features like login rate limiting, account lockout, IP whitelist/blacklist, session management, and 2FA readiness.
- **White-Label Reseller System**: Supports a white-label model with tenant hierarchy, reseller profiles, revenue tracking, and branding configuration.
- **Tenant Branding System**: Comprehensive white-label theming with custom logos, color palettes, typography, theme tokens, custom CSS, and email template customization.
- **Compliance Pack System**: Configurable framework for country-specific compliance (e.g., GDPR, DPDP, HIPAA) with checklists and audit trails.
- **Country-Specific Compliance Modules**:
    - **India**: GST, WhatsApp/SMS DLT, Aadhaar Data Protection, RBI Payment Guidelines.
    - **UAE**: VAT, TRA Messaging, Data Residency Tagging, Arabic Language Support, Emirates ID.
    - **UK**: GDPR Controls, Data Retention Policies, UK VAT Invoicing, Consent Management, DSAR Handling, Data Breach Register.

### Flutter Mobile Application
- **Architecture**: Clean Architecture (presentation, domain, data layers).
- **State Management**: Flutter BLoC pattern.
- **Networking**: Dio HTTP client with interceptors.
- **Authentication**: JWT with automatic token refresh and secure storage.
- **Multi-Tenant**: `X-Tenant-ID` header injection via `TenantInterceptor`.
- **Environment**: Supports dev (dev.bizflow.app) and prod (api.bizflow.app) environments.
- **Dependency Injection**: `get_it` for service location.
- **Routing**: GoRouter with authentication guards and tenant selection.

### System Design Choices
- **Modular Structure**: Organized into `client`, `server`, `shared`, and `mobile` directories.
- **API-First Approach**: RESTful API endpoints for core functionalities.
- **Extensibility**: Designed for future microservices, Redis integration, and JWT system evolution.
- **Healthcare Module**: Feature-flagged module for enterprise clients, including patient management, doctor profiles, appointment scheduling, and EMR.
- **Global Deployment Architecture**: Supports multi-region deployment on AWS (EKS, RDS PostgreSQL, etc.) and GCP (Cloud Run, Cloud SQL PostgreSQL, etc.) with DR capabilities.
- **Add-on Marketplace**: Modular plugin system with versioning, per-tenant installation, multiple pricing models, reviews, and auto-update settings.
- **Multi-Currency Support**: Comprehensive system with historical exchange rates, base currency tracking, precision handling, 15 supported currencies, and Super Admin API endpoints. Includes multi-currency invoice management and cross-currency payment recording.
- **Customer Portal System**: Self-service portal for tenant customers with configurable settings, granular permissions, separate authentication, self-registration/invite system, and customer dashboard.
- **Furniture Manufacturing Module**: Comprehensive module for furniture businesses including:
    - Product Catalog (ready-made, made-to-order, semi-finished) with dimensions, pricing, and customization.
    - Raw Materials Inventory with stock levels, batch tracking, and reorder points.
    - Stock Movements tracking.
    - Bill of Materials (BOM) with versioning, components, and costs.
    - Production Orders with status workflow and scheduling.
    - Production Stages tracking.
    - Delivery Orders with scheduling, assignment, and proof of delivery.
    - Installation Orders with assignment and completion tracking.
    - Sales Orders (retail/wholesale/B2B) with advance payments and multi-currency support.
    - **Multi-Country Invoicing System**: Handles multi-currency and tax compliance for invoices, with services for currency conversion, country-specific tax calculations (India GST, Malaysia SST, US Sales Tax, UAE VAT, UK VAT), and PDF invoice generation with tenant branding.
    - Full CRUD API endpoints with tenant isolation and server-side pagination/filtering.

## External Dependencies
- **Replit Auth (OIDC)**: User authentication.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Database interaction.
- **TanStack Query v5**: Frontend data fetching and state management.
- **Wouter**: Frontend routing.
- **Tailwind CSS**: Frontend styling.
- **shadcn/ui**: Re-usable UI components.