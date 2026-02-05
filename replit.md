# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform for small and medium businesses, streamlining operations and customer relationship management. It offers scalable and secure solutions for bookings, analytics, invoicing, and general business management. The platform targets a global market, with specialized modules for diverse industries such as Healthcare, Salon/Spa, Hospitality, Coworking, Real Estate, Tourism, Education, Logistics, Legal Services, and Manufacturing. Its core purpose is to provide a comprehensive, multi-module business management solution compliant with various international data protection and taxation regulations.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform
MyBizStream is designed as a multi-tenant SaaS platform featuring robust authentication (OIDC, JWT, hybrid middleware), fine-grained Role-Based Access Control (RBAC), and a five-tier administration system. It supports subdomain isolation, per-tenant feature flags, comprehensive audit logging, and tenant branding. The platform incorporates multi-currency support and complies with international data protection and taxation regulations (e.g., HIPAA/DPDP, India, UAE, UK, Malaysia, US). Key components include a Customer Portal and a White-Label & Reseller System.

### Add-on Marketplace & Entitlement Enforcement
The platform includes an Add-on Marketplace with country-specific filtering and multi-currency pricing. A feature gating system enables soft-upselling by controlling module and feature access based on plan tier, add-on status, country, and user roles. A robust entitlement enforcement system controls add-on access, supporting various states and including both backend (API middleware, dependency checking) and frontend enforcement (hooks, wrapper components) with background synchronization.

### Technical Implementation
The **Frontend** uses React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, and Wouter, featuring a professional blue color scheme with dark/light modes. The **Backend** is built with Express.js and TypeScript, following a RESTful API design with Zod for validation. **Database** operations leverage PostgreSQL with Drizzle ORM. The **Mobile** application (Flutter) adheres to Clean Architecture, uses BLoC for state management, Dio for HTTP, and Hive for offline caching, with full multi-tenancy support. Deployment is multi-cloud (AWS, GCP) with multi-region support and disaster recovery.

### Billing & Pricing
The platform features a flexible billing system with multi-interval pricing and automatic savings calculations. Razorpay is integrated for marketplace add-on subscription management, handling plan creation, subscription lifecycle, and idempotent webhook processing.

### User Experience & Notifications
An enhanced Booking Dialog and a customizable Notification Center are included, offering in-app alerts and preferences for configuring notification types, severity, channels (In-App, Email, WhatsApp, SMS), and quiet hours.

### Internationalization (i18n) & Country Locale Defaults
The platform supports 8 languages via `react-i18next` (English, Hindi, Telugu, Tamil, Kannada, Malayalam, Malay, and Chinese Simplified) with country-driven language selection. A centralized country defaults system ensures correct locale settings (currency, timezone, tax rates) during tenant creation for supported countries.

### Progressive Web App (PWA)
PWA features include an installable app with manifest and icons, an offline fallback page, a smart install prompt, and a service worker for static asset caching.

### Security Hardening
Security measures include:
- **Security Headers**: Helmet integration with CSP.
- **Registration Anti-Abuse**: Rate limiting, honeypot, optional MX validation, business name validation, and profanity moderation.
- **Audit Logging**: Comprehensive logging of key security events.
- **Impersonation**: "View as User" functionality for admins with strict permission checks and UI indicators.
- **Tenant Isolation**: Enforced multi-tenant data isolation via middleware, ensuring "fail-closed" behavior.
- **Login History Tracking**: Zoho-style login history with SSO integration (Google, Microsoft, Okta), 90-day retention.
- **Force Logout**: Session version management allows force logout of staff members and self-service logout of other sessions.
- **IP Restriction System**: Configurable IP allow/deny rules with CIDR support at the tenant level.
- **Suspicious Login Detection**: Device fingerprinting using SHA-256 hashes, with automatic security alerts for new devices or IPs during SSO login.
- **Security Alerts**: Categorized alerts with severity levels and acknowledgment workflow.
- **Anomaly Scoring (SOC2)**: Session anomaly detection using indexed queries and caching. Risk factors (e.g., new device, country, city, active sessions) trigger step-up authentication or force logout.
- **Refresh Token Rotation**: JWT refresh tokens implement automatic rotation with reuse detection, invalidating token families upon replay.

### Role-Based Access Control (RBAC)
The platform implements a comprehensive permission-based RBAC system with five predefined roles (OWNER, ADMIN, MANAGER, STAFF, ACCOUNTANT) with hierarchical access. Permissions are composed from Role, Plan, and Addons. Key features include permission-based UI visibility, backend route protection, and smart dashboard routing based on user role, permissions, and business type.

## External Dependencies
- **Replit Auth**: OIDC for user authentication.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Database interaction.
- **TanStack Query v5**: Frontend data fetching.
- **Wouter**: Frontend routing.
- **Tailwind CSS**: Frontend styling.
- **shadcn/ui**: UI components.
- **PDFKit**: PDF invoice generation.
- **Twilio**: WhatsApp notifications.
- **SendGrid/Resend**: Email notifications.
- **Razorpay**: Subscription management and billing.
- **Helmet**: Security headers middleware.