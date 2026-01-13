# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management with a vision for diverse business needs and global market potential. The platform offers specialized modules for various industries including Healthcare, Salon/Spa, PG/Hostel, Coworking, General Services, Real Estate, Tourism, Education, Logistics, Legal Services, and Furniture Manufacturing.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform Features
MyBizStream is built as a multi-tenant SaaS platform with robust authentication and authorization. It utilizes Replit Auth (OIDC) for initial authentication, complemented by JWT for session management and token rotation. Security features include login rate limiting, IP whitelisting/blacklisting, and readiness for 2FA.

Multi-tenancy is enforced via JWT claims and an `X-Tenant-ID` header, supporting subdomain isolation and per-tenant feature flags. A comprehensive Role-Based Access Control (RBAC) system defines roles like Super Admin, Admin, Manager, Staff, and Customer, with a granular permission matrix (`resource:action`) and module-level access control.

A five-tier platform administration system provides scoped access based on roles and country assignments, with full audit trail capabilities. The platform also includes a Customer Portal for self-service, a White-Label & Reseller System for hierarchical tenant management, and extensive Tenant Branding options for customization.

Compliance and data protection are central, with features aligned with HIPAA/DPDP, including PHI access logging, role-based data masking, consent management, and unusual access detection. The system supports country-specific compliance for India (GST, DLT, Aadhaar), UAE (VAT, TRA, Data Residency, Arabic support), UK (GDPR, Data Retention, VAT), Malaysia (SST, PDPA), and US (Multi-state sales tax). It boasts multi-currency support for 15 currencies with historical exchange rates and precise decimal handling. An Add-on Marketplace allows for modular plugin integration with various pricing models. All significant actions are captured in an Audit Logging system.

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