# BizFlow - Multi-Tenant SaaS Business Management Platform

## Overview
BizFlow is an enterprise-grade, multi-tenant SaaS platform designed for small and medium businesses. Its purpose is to provide a comprehensive business management solution for various sectors including PGs/Hostels, Salons, Gyms, Coaching Institutes, Clinics, Diagnostics, and general service-based businesses. The platform aims to streamline operations, manage customer relationships, handle bookings, and provide analytics, with a vision to offer a scalable and secure solution for diverse business needs.

## User Preferences
No specific user preferences were provided in the original `replit.md` file.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Tailwind CSS, and shadcn/ui for a modern and responsive user interface. The design system incorporates "Inter" as the primary font and "JetBrains Mono" for monospace, utilizing a professional blue color scheme. Components are built using shadcn/ui with custom styling to maintain a consistent brand identity.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5 for state management, and Wouter for routing.
- **Backend**: Express.js with TypeScript, designed for scalability and future migration to frameworks like NestJS.
- **Database**: PostgreSQL with Drizzle ORM, ensuring type-safe and efficient database interactions.
- **Authentication**: Utilizes Replit Auth (OIDC) for initial authentication, complemented by a robust JWT (Access + Refresh tokens) system for API security, including token rotation and revocation.
- **Multi-Tenancy**: Core design principle with tenant isolation enforced at the database and application levels. Tenant resolution strategies include JWT claims, `X-Tenant-ID` headers, subdomains, and user defaults. Data is scoped to tenants via `tenant_id` to prevent cross-tenant access.
- **Feature Flags**: A granular feature flagging system allows enabling/disabling features per tenant, often tied to subscription tiers (Free, Pro, Enterprise).
- **Role-Based Access Control (RBAC)**: A comprehensive RBAC system defines roles (Super Admin, Admin, Manager, Staff, Customer) and a permission matrix (`resource:action` based) to control access to functionalities and data.
- **Platform Admin Permission System**: Two-tier platform admin hierarchy with SUPER_ADMIN (full bypass) and PLATFORM_ADMIN (granular permissions). Permissions stored in `platform_admin_permissions` table with 13 predefined codes covering tenants, users, logs, admins, analytics, features, and billing. Assignments tracked via `platform_admin_permission_assignments` junction table with grantedBy audit trail. SUPER_ADMIN bypasses all permission checks; PLATFORM_ADMIN permissions loaded at login and embedded in JWT tokens.
- **Audit Logging**: Tracks critical actions (create, update, delete, login, logout, access) with detailed metadata for compliance and security monitoring.
- **Compliance & Data Protection (HIPAA/DPDP Style)**:
    - **PHI Access Logging**: Logs all access to Protected Health Information, requiring explicit access reasons.
    - **Role-Based Data Masking**: Automatically masks sensitive data fields based on the user's role.
    - **Consent Management**: Tracks patient consent for data handling.
    - **Unusual Access Detection**: Flags suspicious access patterns.
    - **Secure Configuration**: Emphasizes environment-based secret management and retention policies.

### System Design Choices
- **Modular Structure**: The project is organized into `client`, `server`, and `shared` directories to promote code organization and maintainability.
- **API-First Approach**: A well-defined set of RESTful API endpoints for authentication, core functionalities, business operations, notifications, billing, inventory, memberships, and healthcare.
- **Extensibility**: The architecture is designed to be extensible, with considerations for future microservices extraction, Redis integration for caching, and further evolution of the JWT system.
- **Healthcare Module**: A specialized, feature-flagged module for enterprise clients, offering patient management, doctor profiles, appointment scheduling, and Electronic Medical Records (EMR).

## Admin System (Production Ready)

### Initial Setup
- **Development**: Run `npx tsx server/seed.ts` to create Super Admin with auto-generated password
- **Production**: Set `INITIAL_SUPER_ADMIN_EMAIL`, `INITIAL_SUPER_ADMIN_PASSWORD`, and `NODE_ENV=production` before seeding
- **Documentation**: See `docs/ADMIN_SYSTEM.md` for comprehensive admin documentation

### Security Features
- Login rate limiting (30 req/min per IP)
- Account lockout (5 failed attempts = 30 min lockout)
- IP whitelist/blacklist with CIDR support
- Session management (60 min inactivity, 24 hour absolute timeout)
- 2FA readiness with TOTP support
- Comprehensive audit logging with risk levels

### Environment Variables for Admin System
| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | Session encryption key |
| `INITIAL_SUPER_ADMIN_EMAIL` | Prod only | Initial admin email |
| `INITIAL_SUPER_ADMIN_PASSWORD` | Prod only | Initial admin password (remove after setup) |

### Backup Priority
1. Daily: `platform_admins`, `admin_security_config`, `admin_ip_rules`
2. Weekly: `admin_sessions`, `admin_login_attempts`
3. Archive: `admin_audit_logs` (365 day retention)

## AWS Global Deployment Architecture

The platform is designed for multi-region AWS deployment with the following architecture:

### Target Regions
- **ap-south-1 (India)**: Primary hub for DPDP compliance
- **ap-southeast-1 (Singapore)**: PDPA Singapore/Malaysia compliance
- **me-south-1 (UAE)**: UAE Data Protection Law compliance
- **eu-west-2 (UK)**: GDPR compliance

### Key Components
- **EKS**: Kubernetes-based container orchestration with managed node groups and Fargate profiles
- **Route53**: Geo-routing and latency-based DNS for regional traffic distribution
- **RDS PostgreSQL**: Multi-AZ primary with cross-region read replicas
- **ElastiCache Redis**: Session management and caching with Global Datastore
- **S3**: Regional buckets with cross-region replication for DR
- **CloudFront + WAF**: Edge protection with Shield Advanced
- **Secrets Manager**: Credential management with automatic rotation

### Disaster Recovery
- **RPO**: 15 minutes (async PostgreSQL replication)
- **RTO**: 1 hour (automated failover procedures)
- **Documentation**: See `docs/AWS_DEPLOYMENT_ARCHITECTURE.md` for complete details

## GCP Global Deployment Architecture (Alternative)

The platform also supports Google Cloud Platform deployment with the following architecture:

### Target Regions
- **asia-south1 (Mumbai)**: Primary hub for DPDP compliance
- **asia-southeast1 (Singapore)**: DR + PDPA compliance
- **asia-southeast2 (Jakarta)**: Malaysia coverage / PDPA MY
- **europe-west2 (London)**: GDPR compliance

### Key Components
- **Global HTTP(S) Load Balancer**: Single global resource with Cloud CDN and Cloud Armor (WAF)
- **Cloud Run**: Serverless container orchestration with auto-scaling per region
- **Cloud SQL PostgreSQL**: Regional HA primary with cross-region read replicas
- **Memorystore Redis**: Session management and caching per region
- **Cloud Storage**: Multi-region buckets with lifecycle policies
- **Secret Manager**: Centralized credential management with IAM conditions
- **Cloud Monitoring**: Dashboards, SLO-based alerting, and uptime checks

### Cost Comparison
| Platform | Estimated Monthly Cost |
|----------|----------------------|
| AWS (EKS-based) | ~$10,150 |
| GCP (Cloud Run) | ~$5,400 |

### Disaster Recovery
- **RPO**: 15 minutes (async replication)
- **RTO**: 45-60 minutes (automated failover)
- **Documentation**: See `docs/GCP_DEPLOYMENT_ARCHITECTURE.md` for complete details

## White-Label Reseller System

The platform supports a white-label reseller model enabling partners to offer BizFlow under their own branding.

### Tenant Hierarchy
- **Platform**: Super admin tenants with full platform access
- **Reseller**: White-label partners who manage child tenants
- **Direct**: Normal tenants (either standalone or under a reseller)

### Reseller Database Schema
- `reseller_profiles`: Reseller tenant profiles with status, contact info, settings
- `reseller_revenue_agreements`: Revenue sharing configuration (percentage, fixed, tiered)
- `reseller_revenue_records`: Period-based revenue tracking and calculations
- `reseller_child_invoices`: Billing records for child tenant invoices
- `reseller_brand_assets`: Logo and branding asset storage

### Revenue Sharing Models
- **Percentage**: Base percentage of child tenant revenue
- **Fixed**: Flat monthly fee per child tenant
- **Tiered**: Revenue brackets with increasing percentages

### Branding Configuration
- Primary/secondary colors and theme tokens
- Custom domains with verification workflow
- Logo storage (light/dark variants, favicon)
- Email template customization
- Login page branding

### API Routes (Protected by JWT Auth)
- `/api/resellers/profile` - Get/update reseller profile
- `/api/resellers/tenants` - List/create child tenants
- `/api/resellers/revenue` - Revenue dashboard and records
- `/api/resellers/branding` - Branding configuration
- `/api/resellers/admin/*` - Platform admin routes for reseller management

### Important Files
- `server/core/reseller/reseller-service.ts` - Core reseller business logic
- `server/core/reseller/reseller-routes.ts` - API route handlers
- `server/core/reseller/reseller-scope.ts` - Hierarchy validation middleware
- `shared/schema.ts` - Database tables and types

## External Dependencies
- **Replit Auth (OIDC)**: Used for initial user authentication.
- **PostgreSQL**: The primary database for all application data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **TanStack Query v5**: Utilized for data fetching, caching, and state management in the frontend.
- **Wouter**: A small, fast, and modern router for the React frontend.
- **Tailwind CSS**: A utility-first CSS framework for styling the frontend.
- **shadcn/ui**: A collection of re-usable components built using Radix UI and Tailwind CSS.