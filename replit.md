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

## External Dependencies
- **Replit Auth (OIDC)**: Used for initial user authentication.
- **PostgreSQL**: The primary database for all application data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **TanStack Query v5**: Utilized for data fetching, caching, and state management in the frontend.
- **Wouter**: A small, fast, and modern router for the React frontend.
- **Tailwind CSS**: A utility-first CSS framework for styling the frontend.
- **shadcn/ui**: A collection of re-usable components built using Radix UI and Tailwind CSS.