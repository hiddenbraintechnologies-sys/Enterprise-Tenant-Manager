# BizFlow - Multi-Tenant SaaS Business Management Platform

## Overview
BizFlow is an enterprise-grade, multi-tenant SaaS platform for small and medium businesses across various sectors like PGs/Hostels, Salons, Gyms, Coaching Institutes, Clinics, Diagnostics, and general service businesses. It aims to streamline operations, manage customer relationships, handle bookings, and provide analytics, offering a scalable and secure solution with a vision for diverse business needs.

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
- **Platform Admin Permission System**: Two-tier hierarchy (SUPER_ADMIN, PLATFORM_ADMIN) with granular permissions managed in `platform_admin_permissions` and `platform_admin_permission_assignments` tables.
- **Audit Logging**: Tracks critical actions (create, update, delete, login, logout, access) for compliance and security.
- **Compliance & Data Protection (HIPAA/DPDP Style)**: Includes PHI access logging, role-based data masking, consent management, unusual access detection, and secure configuration.
- **Admin System**: Production-ready with security features like login rate limiting, account lockout, IP whitelist/blacklist, session management, and 2FA readiness.
- **White-Label Reseller System**: Supports a white-label model with tenant hierarchy (Platform, Reseller, Direct), reseller profiles, revenue agreements/tracking, branding configuration, and an admin dashboard.
- **Tenant Branding System**: Comprehensive white-label theming with custom logos, color palettes, typography, theme tokens, custom CSS, and 13 types of email template customization.
- **Compliance Pack System**: Configurable framework for country-specific compliance (GDPR, DPDP, HIPAA) with checklist items, progress tracking, evidence management, and audit trails.

### System Design Choices
- **Modular Structure**: Organized into `client`, `server`, and `shared` directories.
- **API-First Approach**: RESTful API endpoints for core functionalities, business operations, notifications, billing, inventory, memberships, and healthcare.
- **Extensibility**: Designed for future microservices, Redis integration, and JWT system evolution.
- **Healthcare Module**: A specialized, feature-flagged module for enterprise clients, including patient management, doctor profiles, appointment scheduling, and EMR.
- **Global Deployment Architecture**: Supports both AWS (EKS, Route53, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront + WAF) and GCP (Global HTTP(S) Load Balancer, Cloud Run, Cloud SQL PostgreSQL, Memorystore Redis, Cloud Storage, Secret Manager) for multi-region deployment with DR capabilities (RPO 15 mins, RTO 1 hour for AWS; RPO 15 mins, RTO 45-60 mins for GCP).

## External Dependencies
- **Replit Auth (OIDC)**: Initial user authentication.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Database interaction.
- **TanStack Query v5**: Frontend data fetching and state management.
- **Wouter**: Frontend routing.
- **Tailwind CSS**: Frontend styling.
- **shadcn/ui**: Re-usable UI components.