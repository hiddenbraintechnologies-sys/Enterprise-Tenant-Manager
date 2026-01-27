# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management. The platform aims to serve diverse business needs and has global market potential, offering specialized modules for industries such as Healthcare, Salon/Spa, PG/Hostel, Coworking, General Services, Real Estate, Tourism, Education, Logistics, Legal Services, and Furniture Manufacturing.

## User Preferences
The user wants the AI to act as an expert developer and to follow all the architectural and technical guidelines provided. The AI should prioritize security, scalability, and maintainability. When making changes, the AI should always consider the multi-tenant nature of the platform and ensure that any modifications are compliant with country-specific regulations, especially regarding data protection and taxation. The user prefers clear, concise explanations and wants to be informed of major architectural decisions or significant code changes before they are implemented.

## System Architecture

### Core Platform
MyBizStream is built as a multi-tenant SaaS platform featuring robust authentication (Replit Auth OIDC, JWT, hybrid middleware), fine-grained Role-Based Access Control (RBAC), and a five-tier administration system. It supports subdomain isolation, per-tenant feature flags, and comprehensive audit logging. Key features include a Customer Portal, White-Label & Reseller System, extensive Tenant Branding options, multi-currency support, and compliance with various international data protection and taxation regulations (HIPAA/DPDP, India, UAE, UK, Malaysia, US).

### Add-on Marketplace
The platform includes an Add-on Marketplace with country-specific filtering and multi-currency pricing, allowing add-ons to be globally available or country-specific. A comprehensive feature gating system (using `useFeatureGate` hook) enables soft-upselling by controlling module and feature access based on plan tier, add-on status, country, and user roles. Locked feature pages/modals include trial Calls-to-Action. A Super Admin Marketplace Revenue Analytics Dashboard provides insights into subscriptions, revenue, and conversion funnels. The Super Admin console allows full management of the marketplace, including catalog, country rollout, and eligibility rules. HR-related add-ons (HRMS, Payroll) are structured to provide specific capabilities and restrict access based on add-on subscriptions, with mechanisms for employee limit enforcement and read-only modes upon subscription expiry.

### Technical Implementation
The **Frontend** is developed using React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query v5, and Wouter, featuring a professional blue color scheme with dark/light modes. The **Backend** is built with Express.js and TypeScript, adhering to a RESTful API design with Zod for validation. **Database** operations utilize PostgreSQL with Drizzle ORM. The **Mobile** application (Flutter) follows Clean Architecture, uses BLoC for state management, Dio for HTTP, and Hive for offline caching, with full multi-tenancy support. Deployment is multi-cloud on AWS (EKS, RDS, ElastiCache, S3, CloudFront) and GCP (Cloud Run, Cloud SQL, Memorystore) with multi-region support and disaster recovery.

### Billing & Pricing
A flexible billing system supports multi-interval pricing (monthly, quarterly, yearly) with automatic savings calculations, configurable by platform admins. Razorpay is integrated for marketplace add-on subscription management, handling plan creation, subscription lifecycle, and idempotent webhook processing for various events including trial support.

### User Experience & Notifications
The platform includes an enhanced Booking Dialog with alerts for missing data and quick action buttons. A customizable Notification Center offers a NotificationBell for in-app alerts and preferences for configuring notification types, severity, channels (In-App, Email, WhatsApp, SMS), and quiet hours.

### Internationalization (i18n)
The platform supports 8 languages via `react-i18next`: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Malay, and Chinese Simplified. It features country-driven language selection with defined language lists for India, Malaysia, UK, UAE, and Singapore. Language and country preferences are persisted, with automatic language switching if the current language is invalid for a selected country.

### Progressive Web App (PWA)
The platform offers PWA features including an installable app with manifest and icons, an offline fallback page, and a smart install prompt. A service worker provides safe caching for static assets (cache-first) while strictly avoiding caching of API requests or requests with authentication/tenant headers.

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