# BizFlow - Multi-Tenant SaaS Business Management Platform

## Overview
BizFlow is an enterprise-grade, multi-tenant SaaS platform designed for small and medium businesses including PGs/Hostels, Salons, Gyms, Coaching Institutes, Clinics, Diagnostics, and Service-based businesses.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC) + Session-based
- **State Management**: TanStack Query v5
- **Routing**: Wouter

## Project Structure
```
├── client/src/
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── app-sidebar.tsx
│   │   ├── dashboard-layout.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── use-auth.ts    # Authentication hook
│   │   └── use-toast.ts
│   ├── lib/               # Utilities
│   ├── pages/             # Page components
│   │   ├── landing.tsx    # Landing page (unauthenticated)
│   │   ├── dashboard.tsx  # Main dashboard
│   │   ├── customers.tsx  # Customer management
│   │   ├── services.tsx   # Service management
│   │   ├── bookings.tsx   # Booking/scheduling
│   │   ├── analytics.tsx  # Analytics dashboard
│   │   └── settings.tsx   # Settings page
│   └── App.tsx
├── server/
│   ├── core/              # Enterprise core services
│   │   ├── context.ts     # Tenant context & middleware
│   │   ├── features.ts    # Feature flag service
│   │   ├── permissions.ts # RBAC service
│   │   ├── tenants.ts     # Tenant management
│   │   ├── audit.ts       # Audit logging
│   │   └── index.ts       # Core exports
│   ├── replit_integrations/auth/  # Replit Auth
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Data access layer
│   └── index.ts           # Server entry
├── shared/
│   ├── schema.ts          # Drizzle schema + types
│   └── models/auth.ts     # Auth models
└── docs/
    └── API_DOCUMENTATION.md  # API reference
```

## Enterprise Architecture

### Multi-Tenant System
- **Tenant Isolation**: All data scoped to tenant via tenant_id
- **Tenant Resolution**: Middleware resolves tenant from authenticated user
- **Auto-Assignment**: New users auto-assigned to default tenant
- **Custom Domains**: Support for tenant custom domains (planned)

### Feature Flags
- **Per-Tenant Features**: Enable/disable features per tenant
- **Tier-Based**: Features locked to subscription tiers (free/pro/enterprise)
- **Caching**: In-memory cache with TTL for performance
- **Available Features**:
  - `booking_system` - Core booking functionality
  - `customer_management` - CRM features
  - `service_catalog` - Service management
  - `analytics_basic` / `analytics_advanced` - Analytics tiers
  - `notifications_engine` - Email/SMS/WhatsApp notifications (free)
  - `notifications_whatsapp` - WhatsApp channel (pro)
  - `billing_invoices` - Invoice management (free)
  - `payment_tracking` - Payment tracking (free)
  - `inventory_management` - Stock management (pro)
  - `memberships_subscriptions` - Customer memberships (pro)
  - `healthcare_module` - Full healthcare suite (enterprise)
  - `patient_management` - Patient profiles (enterprise)
  - `appointment_scheduling` - Doctor appointments (enterprise)
  - `electronic_medical_records` - EMR system (enterprise)
  - `api_access` - External API access

### Role-Based Access Control (RBAC)
- **System Roles**: Super Admin, Admin, Manager, Staff, Customer
- **Permission Matrix**: Resource-action based (e.g., `customers:read`)
- **Per-Tenant Roles**: Custom roles per tenant supported
- **Permission Guard**: Middleware for route-level access control

### Audit Logging
- **Tracked Actions**: create, update, delete, login, logout, access
- **Captured Data**: Actor, tenant, resource, old/new values, IP, user agent
- **Query Endpoints**: `/api/audit-logs` for viewing history

## API Endpoints

### Core
- `GET /api/context` - Current user, tenant, role, permissions, features
- `GET /api/features` - Tenant feature flags
- `GET /api/audit-logs` - Audit log history

### Business
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST/PATCH/DELETE /api/customers` - Customer CRUD
- `GET/POST/PATCH/DELETE /api/services` - Service CRUD
- `GET/POST/PATCH/DELETE /api/bookings` - Booking CRUD
- `GET /api/bookings/upcoming` - Upcoming bookings
- `GET /api/analytics` - Analytics data

### Notifications
- `GET/POST/PATCH/DELETE /api/notification-templates` - Template CRUD
- `GET /api/notification-logs` - Notification history

### Billing & Payments
- `GET/POST/PATCH/DELETE /api/invoices` - Invoice CRUD
- `GET/POST /api/payments` - Payment tracking

### Inventory (Pro Tier)
- `GET/POST /api/inventory/categories` - Category management
- `GET/POST/PATCH /api/inventory/items` - Item management
- `POST /api/inventory/items/:id/adjust` - Stock adjustments

### Memberships (Pro Tier)
- `GET/POST/PATCH /api/membership-plans` - Plan management
- `GET/POST/PATCH /api/customer-memberships` - Customer memberships

### Healthcare (Enterprise Tier)
- `GET/POST/PATCH /api/patients` - Patient management
- `GET/POST/PATCH /api/doctors` - Doctor profiles
- `GET/POST/PATCH /api/appointments` - Appointment scheduling
- `GET /api/patients/:id/medical-records` - Patient EMR
- `POST/PATCH /api/medical-records` - Medical record management

## Database Schema

### Core Tables
- **tenants**: Business organizations with settings
- **tenant_domains**: Custom domain mappings
- **tenant_settings**: Per-tenant configuration (JSONB)
- **feature_flags**: Available features
- **tenant_features**: Per-tenant feature overrides
- **roles**: System and tenant roles
- **permissions**: Resource:action permissions
- **role_permissions**: Role-permission mappings
- **user_tenants**: User-tenant associations with roles
- **audit_logs**: Action history
- **api_tokens**: API authentication tokens
- **refresh_tokens**: Session refresh tokens

### Business Tables
- **users**: User accounts (via Replit Auth)
- **sessions**: Auth sessions
- **customers**: Customer records per tenant
- **services**: Service definitions per tenant
- **bookings**: Booking/appointment records
- **staff**: Staff members per tenant

### Notification Tables
- **notification_templates**: Email/SMS/WhatsApp templates with variables
- **notification_logs**: Sent notification history with status tracking

### Billing Tables
- **invoices**: Invoice records with status tracking
- **invoice_items**: Line items per invoice
- **payments**: Payment records with method and gateway info

### Inventory Tables
- **inventory_categories**: Product/supply categories
- **inventory_items**: Stock items with pricing
- **inventory_transactions**: Stock movement history

### Membership Tables
- **membership_plans**: Subscription plans with features
- **customer_memberships**: Customer subscriptions

### Healthcare Tables (Enterprise)
- **patients**: Patient profiles with medical history
- **doctors**: Doctor profiles with specializations
- **appointments**: Doctor appointments with token system
- **medical_records**: EMR with diagnosis, prescriptions, lab tests

## Running the Application
```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
```

## Design System
- Primary font: Inter
- Mono font: JetBrains Mono
- Theme: Professional blue color scheme
- Components: shadcn/ui with custom styling

## Architecture Notes
- **Future Migration**: Code structured for NestJS migration
- **Microservices Ready**: Core services can be extracted
- **JWT Extensible**: Token infrastructure in place
- **Redis Ready**: Caching layer can be swapped to Redis
- **Healthcare Module**: Feature-flagged for enterprise tier only
