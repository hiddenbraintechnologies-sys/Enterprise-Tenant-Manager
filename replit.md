# BizFlow - Multi-Tenant SaaS Business Management Platform

## Overview
BizFlow is an enterprise-grade, multi-tenant SaaS platform designed for small and medium businesses including PGs/Hostels, Salons, Gyms, Coaching Institutes, and Service-based businesses.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
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
│   ├── replit_integrations/auth/  # Replit Auth integration
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Data access layer
│   └── index.ts           # Server entry
└── shared/
    ├── schema.ts          # Drizzle schema + types
    └── models/auth.ts     # Auth models
```

## Core Features
1. **Authentication**: Replit Auth with Google, GitHub, etc.
2. **Dashboard**: Stats overview with KPIs
3. **Customer Management**: CRUD operations
4. **Service Management**: Define services with pricing
5. **Booking System**: Schedule appointments
6. **Analytics**: Revenue and booking insights
7. **Dark Mode**: Full theme support

## API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST/PATCH/DELETE /api/customers` - Customer CRUD
- `GET/POST/PATCH/DELETE /api/services` - Service CRUD
- `GET/POST/PATCH/DELETE /api/bookings` - Booking CRUD
- `GET /api/bookings/upcoming` - Upcoming bookings
- `GET /api/analytics` - Analytics data

## Database Schema
- **tenants**: Multi-tenant organizations
- **users**: User accounts (via Replit Auth)
- **sessions**: Auth sessions
- **customers**: Customer records per tenant
- **services**: Service definitions per tenant
- **bookings**: Booking/appointment records
- **staff**: Staff members per tenant

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
