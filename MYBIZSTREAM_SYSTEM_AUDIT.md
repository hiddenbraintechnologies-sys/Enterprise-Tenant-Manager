# MyBizStream - System Audit & Source of Truth

**Generated:** January 8, 2026  
**Version:** Phase 2 Completion  
**Document Type:** Consolidated System Audit

---

## Table of Contents
1. [Business Module Coverage Audit](#1-business-module-coverage-audit)
2. [Cross-Module Feature Parity Matrix](#2-cross-module-feature-parity-matrix)
3. [HRMS Global Availability Check](#3-hrms-global-availability-check)
4. [Tech Stack Canonical Document](#4-tech-stack-canonical-document)

---

## 1. Business Module Coverage Audit

### Legend
- ✅ **Production-ready**: Full CRUD, workflows, validations, tested
- 🟡 **Partially implemented**: Core features exist, some gaps
- ❌ **Not started**: No implementation exists
- ⚪ **N/A**: Not applicable to this module

---

### 1.1 Furniture Manufacturing Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Most comprehensive module |
| **Backend CRUD** | ✅ Complete | Products, Raw Materials, BOM, Production Orders, Sales Orders, Delivery Orders, Installation Orders, Invoices, Payments |
| **Workflows** | ✅ Complete | Production lifecycle (draft→pending→in_progress→completed), Delivery scheduling, Installation tracking |
| **Validations** | ✅ Complete | Zod schemas, financial consistency guards, tenant scope enforcement |
| **Web UI** | ✅ Complete | Dashboard, Products, BOM, Sales Orders, Production Orders, Deliveries, Invoices, Raw Materials, Analytics, Reports |
| **Mobile (Flutter)** | ✅ Complete | Full BLoC/Repository implementation in `mobile/lib/features/furniture/` with Products, Invoices, Analytics pages |
| **Financial - Invoicing** | ✅ Complete | Multi-country invoicing with lifecycle management |
| **Financial - Payments** | ✅ Complete | Multi-currency, partial payments, payment tracking |
| **Financial - PDF** | ✅ Complete | Branded PDF invoice generation with tenant branding |
| **Financial - Multi-Currency** | ✅ Complete | 15 currencies, exchange rates, currency conversion |
| **Financial - Tax** | ✅ Complete | India GST, Malaysia SST, UAE VAT, UK VAT, US Sales Tax |
| **Notifications - Email** | ✅ Complete | SendGrid/Resend integration |
| **Notifications - WhatsApp** | ✅ Complete | Twilio, Meta, Gupshup adapters |
| **Notifications - In-App** | 🟡 Partial | Notification templates exist, logging available |
| **Analytics & Reporting** | ✅ Complete | Dashboard stats, analytics adapter, AI insights |
| **RBAC** | ✅ Complete | Tenant isolation, permission enforcement |
| **Pagination/Filtering** | ✅ Complete | Server-side pagination, multi-field filtering, search |

---

### 1.2 HRMS Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Full HR management suite |
| **Backend CRUD** | ✅ Complete | Employees, Departments, Attendance, Leaves, Payroll, Projects, Timesheets |
| **Workflows** | ✅ Complete | Leave approval workflow, payroll processing |
| **Validations** | ✅ Complete | Zod schemas, role-based access |
| **Web UI** | ✅ Complete | HR Dashboard, Employees, Attendance, Leaves, Payroll, Projects, Timesheets, Allocations |
| **Mobile (Flutter)** | ✅ Complete | Full BLoC/Repository in `mobile/lib/features/hrms/` with Dashboard, Employees, Attendance, Leave, Payroll pages |
| **Financial - Invoicing** | ⚪ N/A | Internal HR - no customer invoicing |
| **Financial - Payments** | 🟡 Partial | Payroll processing exists |
| **Financial - PDF** | ❌ Not started | No payslip PDF generation |
| **Financial - Multi-Currency** | ❌ Not started | Single currency only |
| **Financial - Tax** | ❌ Not started | No tax deduction calculations |
| **Notifications - Email** | ✅ Complete | Via baseNotificationService |
| **Notifications - WhatsApp** | ✅ Complete | Via HrmsNotificationAdapter |
| **Notifications - In-App** | 🟡 Partial | Template-based notifications |
| **Analytics & Reporting** | ✅ Complete | HrmsAnalyticsAdapter integrated |
| **RBAC** | ✅ Complete | Manager/Admin role enforcement |
| **Pagination/Filtering** | 🟡 Partial | Basic pagination, limited filtering |

---

### 1.3 Legal Services Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Case management, billing |
| **Backend CRUD** | ✅ Complete | Cases, Clients, Documents, Appointments, Hearings, Time Entries, Invoices |
| **Workflows** | ✅ Complete | Case lifecycle, hearing scheduling |
| **Validations** | ✅ Complete | Zod schemas, soft-delete support |
| **Web UI** | ✅ Complete | Legal Dashboard with stats |
| **Mobile (Flutter)** | ✅ Complete | BLoC/Repository in `mobile/lib/features/legal/` with Dashboard, Cases pages |
| **Financial - Invoicing** | ✅ Complete | BaseFinancialService integrated |
| **Financial - Payments** | 🟡 Partial | Payment tracking exists |
| **Financial - PDF** | ✅ Complete | `/api/legal/invoices/:id/pdf` route |
| **Financial - Multi-Currency** | ❌ Not started | INR only |
| **Financial - Tax** | 🟡 Partial | GST calculation available |
| **Notifications - Email** | ✅ Complete | LegalNotificationAdapter |
| **Notifications - WhatsApp** | ✅ Complete | Via notification adapter |
| **Notifications - In-App** | 🟡 Partial | Event logging |
| **Analytics & Reporting** | ✅ Complete | LegalAnalyticsAdapter |
| **RBAC** | ✅ Complete | Tenant isolation middleware |
| **Pagination/Filtering** | 🟡 Partial | Basic listing |

---

### 1.4 Education/Coaching Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Student management, fee collection |
| **Backend CRUD** | ✅ Complete | Students, Courses, Batches, Attendance, Exams, Fees |
| **Workflows** | ✅ Complete | Enrollment, fee collection, exam scheduling |
| **Validations** | ✅ Complete | Zod schemas, soft-delete |
| **Web UI** | ✅ Complete | Education Dashboard |
| **Mobile (Flutter)** | ✅ Complete | BLoC/Repository in `mobile/lib/features/education/` with Dashboard |
| **Financial - Invoicing** | ✅ Complete | Fee receipts via BaseFinancialService |
| **Financial - Payments** | ✅ Complete | Fee payment tracking |
| **Financial - PDF** | ✅ Complete | `/api/education/fees/:id/pdf` route |
| **Financial - Multi-Currency** | ❌ Not started | INR only |
| **Financial - Tax** | 🟡 Partial | GST on fees |
| **Notifications - Email** | ✅ Complete | EducationNotificationAdapter |
| **Notifications - WhatsApp** | ✅ Complete | Via notification adapter |
| **Notifications - In-App** | 🟡 Partial | Template-based |
| **Analytics & Reporting** | ✅ Complete | EducationAnalyticsAdapter + Risk Predictions |
| **RBAC** | ✅ Complete | Tenant isolation |
| **Pagination/Filtering** | 🟡 Partial | Basic listing |

---

### 1.5 Tourism/Travel Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Tour packages, bookings |
| **Backend CRUD** | ✅ Complete | Packages, Bookings, Itineraries, Travelers, Vendors |
| **Workflows** | ✅ Complete | Booking lifecycle, itinerary management |
| **Validations** | ✅ Complete | Zod schemas |
| **Web UI** | ✅ Complete | Tourism Dashboard |
| **Mobile (Flutter)** | 🟡 Partial | Repository in `mobile/lib/features/tourism/`, models exist, BLoC partial |
| **Financial - Invoicing** | ✅ Complete | Booking invoices via BaseFinancialService |
| **Financial - Payments** | ✅ Complete | Advance payments, balance tracking |
| **Financial - PDF** | ✅ Complete | `/api/tourism/bookings/:id/pdf` route |
| **Financial - Multi-Currency** | ❌ Not started | INR only |
| **Financial - Tax** | 🟡 Partial | GST calculation |
| **Notifications - Email** | ✅ Complete | TourismNotificationAdapter |
| **Notifications - WhatsApp** | ✅ Complete | Via notification adapter |
| **Notifications - In-App** | 🟡 Partial | Event logging |
| **Analytics & Reporting** | ✅ Complete | TourismAnalyticsAdapter |
| **RBAC** | ✅ Complete | Tenant isolation |
| **Pagination/Filtering** | 🟡 Partial | Basic listing |

---

### 1.6 Logistics Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Fleet management, shipments |
| **Backend CRUD** | ✅ Complete | Vehicles, Drivers, Trips, Shipments, Maintenance |
| **Workflows** | ✅ Complete | Trip lifecycle, delivery tracking |
| **Validations** | ✅ Complete | Zod schemas, soft-delete |
| **Web UI** | ✅ Complete | Logistics Dashboard |
| **Mobile (Flutter)** | 🟡 Partial | Models in `mobile/lib/features/logistics/`, BLoC/Repository partial |
| **Financial - Invoicing** | ✅ Complete | Shipment invoices via BaseFinancialService |
| **Financial - Payments** | ✅ Complete | Payment tracking |
| **Financial - PDF** | ✅ Complete | `/api/logistics/shipments/:id/pdf` route |
| **Financial - Multi-Currency** | ❌ Not started | INR only |
| **Financial - Tax** | 🟡 Partial | GST calculation |
| **Notifications - Email** | ✅ Complete | LogisticsNotificationAdapter |
| **Notifications - WhatsApp** | ✅ Complete | Via notification adapter |
| **Notifications - In-App** | 🟡 Partial | Event logging |
| **Analytics & Reporting** | ✅ Complete | LogisticsAnalyticsAdapter + Route Optimization |
| **RBAC** | ✅ Complete | Tenant isolation |
| **Pagination/Filtering** | 🟡 Partial | Basic listing |

---

### 1.7 Real Estate Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | ✅ Production-ready | Property listings, CRM |
| **Backend CRUD** | ✅ Complete | Properties, Agents, Leads, Site Visits, Listings, Commissions |
| **Workflows** | ✅ Complete | Lead lifecycle, commission tracking |
| **Validations** | ✅ Complete | Zod schemas |
| **Web UI** | ✅ Complete | Real Estate Dashboard |
| **Mobile (Flutter)** | 🟡 Partial | Models in `mobile/lib/features/real_estate/`, BLoC/Repository partial |
| **Financial - Invoicing** | ✅ Complete | Commission statements via BaseFinancialService |
| **Financial - Payments** | ✅ Complete | Commission payment tracking |
| **Financial - PDF** | ✅ Complete | `/api/real-estate/commissions/:id/pdf` route |
| **Financial - Multi-Currency** | 🟡 Partial | Currency field exists, conversion not implemented |
| **Financial - Tax** | 🟡 Partial | Tax amount field exists |
| **Notifications - Email** | ✅ Complete | RealEstateNotificationAdapter |
| **Notifications - WhatsApp** | ✅ Complete | Via notification adapter |
| **Notifications - In-App** | 🟡 Partial | Event logging |
| **Analytics & Reporting** | ✅ Complete | RealEstateAnalyticsAdapter |
| **RBAC** | ✅ Complete | Tenant isolation + permissions |
| **Pagination/Filtering** | 🟡 Partial | Basic listing |

---

### 1.8 PG/Hostel Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | 🟡 Partially implemented | Core structure exists |
| **Backend CRUD** | 🟡 Partial | Basic room/tenant CRUD via core module |
| **Workflows** | 🟡 Partial | Basic booking flow |
| **Validations** | 🟡 Partial | Generic service validations |
| **Web UI** | ✅ Complete | PG Dashboard |
| **Mobile (Flutter)** | 🟡 Scaffold | Models in `mobile/lib/features/pg_hostel/`, needs BLoC/Repository |
| **Financial - Invoicing** | ❌ Not started | Uses generic invoices table |
| **Financial - Payments** | ❌ Not started | Uses generic payments |
| **Financial - PDF** | ❌ Not started | No module-specific PDF |
| **Financial - Multi-Currency** | ❌ Not started | Not implemented |
| **Financial - Tax** | ❌ Not started | Not implemented |
| **Notifications - Email** | ❌ Not started | No module adapter |
| **Notifications - WhatsApp** | ❌ Not started | No module adapter |
| **Notifications - In-App** | ❌ Not started | Not implemented |
| **Analytics & Reporting** | ❌ Not started | No analytics adapter |
| **RBAC** | ✅ Complete | Uses core RBAC |
| **Pagination/Filtering** | ❌ Not started | Basic listing only |

---

### 1.9 Coworking Space Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | 🟡 Partially implemented | Core structure exists |
| **Backend CRUD** | 🟡 Partial | Spaces, Desks, Desk Bookings tables exist |
| **Workflows** | 🟡 Partial | Basic booking flow |
| **Validations** | 🟡 Partial | Generic validations |
| **Web UI** | ✅ Complete | Coworking Dashboard, Spaces page |
| **Mobile (Flutter)** | 🟡 Scaffold | Entry file in `mobile/lib/features/coworking/`, needs BLoC/Repository |
| **Financial - Invoicing** | ❌ Not started | Uses generic invoices |
| **Financial - Payments** | ❌ Not started | Uses generic payments |
| **Financial - PDF** | ❌ Not started | No module-specific PDF |
| **Financial - Multi-Currency** | ❌ Not started | Not implemented |
| **Financial - Tax** | ❌ Not started | Not implemented |
| **Notifications - Email** | ❌ Not started | No module adapter |
| **Notifications - WhatsApp** | ❌ Not started | No module adapter |
| **Notifications - In-App** | ❌ Not started | Not implemented |
| **Analytics & Reporting** | ❌ Not started | No analytics adapter |
| **RBAC** | ✅ Complete | Uses core RBAC |
| **Pagination/Filtering** | ❌ Not started | Basic listing only |

---

### 1.10 Clinic/Healthcare Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | 🟡 Partially implemented | Patient management exists |
| **Backend CRUD** | ✅ Complete | Patients, Doctors, Appointments, Medical Records tables |
| **Workflows** | 🟡 Partial | Appointment scheduling |
| **Validations** | 🟡 Partial | Generic validations |
| **Web UI** | ✅ Complete | Clinic Dashboard |
| **Mobile (Flutter)** | 🟡 Scaffold | Entry file in `mobile/lib/features/clinic/`, needs BLoC/Repository |
| **Financial - Invoicing** | ❌ Not started | Uses generic invoices |
| **Financial - Payments** | ❌ Not started | Uses generic payments |
| **Financial - PDF** | ❌ Not started | No module-specific PDF |
| **Financial - Multi-Currency** | ❌ Not started | Not implemented |
| **Financial - Tax** | ❌ Not started | Not implemented |
| **Notifications - Email** | ❌ Not started | No module adapter |
| **Notifications - WhatsApp** | ❌ Not started | No module adapter |
| **Notifications - In-App** | ❌ Not started | Not implemented |
| **Analytics & Reporting** | ❌ Not started | No analytics adapter |
| **RBAC** | ✅ Complete | Uses core RBAC |
| **Pagination/Filtering** | ❌ Not started | Basic listing only |

---

### 1.11 Salon/Spa Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | 🟡 Partially implemented | Core booking exists |
| **Backend CRUD** | 🟡 Partial | Uses generic services/bookings |
| **Workflows** | 🟡 Partial | Appointment booking |
| **Validations** | 🟡 Partial | Generic validations |
| **Web UI** | ✅ Complete | Salon Dashboard, Service Dashboard |
| **Mobile (Flutter)** | 🟡 Scaffold | Models in `mobile/lib/features/salon/`, needs BLoC/Repository |
| **Financial - Invoicing** | ❌ Not started | Uses generic invoices |
| **Financial - Payments** | ❌ Not started | Uses generic payments |
| **Financial - PDF** | ❌ Not started | No module-specific PDF |
| **Financial - Multi-Currency** | ❌ Not started | Not implemented |
| **Financial - Tax** | ❌ Not started | Not implemented |
| **Notifications - Email** | ❌ Not started | No module adapter |
| **Notifications - WhatsApp** | ❌ Not started | No module adapter |
| **Notifications - In-App** | ❌ Not started | Not implemented |
| **Analytics & Reporting** | ❌ Not started | No analytics adapter |
| **RBAC** | ✅ Complete | Uses core RBAC |
| **Pagination/Filtering** | ❌ Not started | Basic listing only |

---

### 1.12 Gym/Fitness Module

| Category | Status | Details |
|----------|--------|---------|
| **Module Status** | 🟡 Partially implemented | Core structure exists |
| **Backend CRUD** | 🟡 Partial | Uses membership plans, customer memberships |
| **Workflows** | 🟡 Partial | Membership lifecycle |
| **Validations** | 🟡 Partial | Generic validations |
| **Web UI** | ❌ Not started | No dedicated dashboard |
| **Mobile (Flutter)** | 🟡 Scaffold | Entry file in `mobile/lib/features/gym/`, needs full implementation |
| **Financial - Invoicing** | ❌ Not started | Uses generic invoices |
| **Financial - Payments** | ❌ Not started | Uses generic payments |
| **Financial - PDF** | ❌ Not started | No module-specific PDF |
| **Financial - Multi-Currency** | ❌ Not started | Not implemented |
| **Financial - Tax** | ❌ Not started | Not implemented |
| **Notifications - Email** | ❌ Not started | No module adapter |
| **Notifications - WhatsApp** | ❌ Not started | No module adapter |
| **Notifications - In-App** | ❌ Not started | Not implemented |
| **Analytics & Reporting** | ❌ Not started | No analytics adapter |
| **RBAC** | ✅ Complete | Uses core RBAC |
| **Pagination/Filtering** | ❌ Not started | Basic listing only |

---

## 2. Cross-Module Feature Parity Matrix

### 2A. Features in Furniture Module MISSING in Other Modules

| Feature | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| **Multi-Country Invoicing** | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Currency Conversion** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Tax Engines (5 countries)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Branded PDF Generation** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Server-Side Pagination** | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Field Filtering** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Server-Side Search** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Partial Payments Tracking** | N/A | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Exchange Rate Management** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI-Powered Insights** | ❌ | 🟡* | 🟡** | ❌ | 🟡*** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Dedicated Analytics Adapter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Module-Specific Notification Adapter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logging (Module-Level)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Financial Consistency Guards** | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Demo Data Seeding** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Complete Web UI (8+ Pages)** | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ |

**Notes:**
- *Legal has Case Summarization AI
- **Education has Risk Predictions AI
- ***Logistics has Route Optimization

---

### 2B. Features in OTHER Modules MISSING in Furniture

| Feature | Present In | Missing in Furniture |
|---------|-----------|---------------------|
| **AI Case Summarization** | Legal | ❌ Not applicable |
| **AI Risk Predictions** | Education | ❌ Could add production risk predictions |
| **Route Optimization** | Logistics | ❌ Could add delivery route optimization |
| **Appointment Scheduling** | Legal, Clinic | ❌ Could add installation appointments |
| **Time Tracking** | Legal, HRMS | ❌ Could add production time tracking |
| **Leave Management** | HRMS | ⚪ N/A (different domain) |
| **Payroll Processing** | HRMS | ⚪ N/A (different domain) |
| **EMR/Medical Records** | Clinic | ⚪ N/A (different domain) |
| **Project/Timesheet Tracking** | HRMS (IT Extensions) | ❌ Could add for custom orders |

---

### Feature Gap Summary

| Module | Missing Furniture Features | Priority |
|--------|---------------------------|----------|
| **HRMS** | Multi-currency payroll, PDF payslips, Tax deductions | HIGH |
| **Legal** | Multi-currency billing, Currency conversion, Server-side pagination | MEDIUM |
| **Education** | Multi-currency fees, Currency conversion, Server-side pagination | MEDIUM |
| **Tourism** | Multi-currency bookings, Currency conversion, Server-side pagination | HIGH |
| **Logistics** | Multi-currency billing, Currency conversion, Server-side pagination | MEDIUM |
| **Real Estate** | Currency conversion (has currency field), Server-side pagination | MEDIUM |
| **PG/Hostel** | Everything - needs full module build | CRITICAL |
| **Coworking** | Everything except Web UI | CRITICAL |
| **Clinic** | Everything except Web UI and CRUD | HIGH |
| **Salon** | Everything except Web UI | HIGH |
| **Gym** | Everything | CRITICAL |

---

## 3. HRMS Global Availability Check

### 3.1 HRMS Core Features - Available to ALL Business Types

The HRMS module provides **core HR functionality to ALL business types** without restrictions:

| Feature | Availability | Notes |
|---------|-------------|-------|
| Employee Management | ✅ All Business Types | CRUD, directory, profiles |
| Department Management | ✅ All Business Types | Create, assign employees |
| Attendance Tracking | ✅ All Business Types | Check-in/out, bulk marking |
| Leave Management | ✅ All Business Types | Applications, approvals, balances |
| Payroll Processing | ✅ All Business Types | Salary structures, payroll runs |
| HR Dashboard | ✅ All Business Types | Stats, summaries |

### 3.2 IT Extensions - Gated by Feature Flag

The following features are **gated by `hrms_it_extensions` feature flag** and only available to specific business types:

```typescript
// From server/routes/hrms/projects.ts
hrms_it_extensions: ["clinic", "coworking", "service", "education", "legal", "furniture_manufacturing"]
```

| Feature | Availability | Business Types |
|---------|-------------|----------------|
| Project Management | 🔒 Feature-Gated | Clinic, Coworking, Service, Education, Legal, Furniture |
| Resource Allocations | 🔒 Feature-Gated | Same as above |
| Timesheet Tracking | 🔒 Feature-Gated | Same as above |

### 3.3 HRMS Limitations by Industry

| Business Type | Core HRMS | IT Extensions | Limitations |
|---------------|-----------|---------------|-------------|
| Furniture Manufacturing | ✅ Full | ✅ Enabled | None |
| Clinic/Healthcare | ✅ Full | ✅ Enabled | None |
| Coworking | ✅ Full | ✅ Enabled | None |
| General Service | ✅ Full | ✅ Enabled | None |
| Education | ✅ Full | ✅ Enabled | None |
| Legal | ✅ Full | ✅ Enabled | None |
| Tourism | ✅ Full | ❌ Disabled | No project tracking |
| Logistics | ✅ Full | ❌ Disabled | No project tracking |
| Real Estate | ✅ Full | ❌ Disabled | No project tracking |
| PG/Hostel | ✅ Full | ❌ Disabled | No project tracking |
| Salon/Spa | ✅ Full | ❌ Disabled | No project tracking |
| Gym | ✅ Full | ❌ Disabled | No project tracking |

### 3.4 Shared vs Industry-Specific Features

| Category | Shared (All Industries) | Industry-Specific |
|----------|------------------------|-------------------|
| Employee Onboarding | ✅ | Industry-specific fields can be added |
| Leave Types | ✅ Standard types | Custom types per tenant |
| Attendance Rules | ✅ Basic rules | Shift patterns per industry |
| Payroll Components | ✅ Base salary | Industry-specific allowances |
| Departments | ✅ Generic | Industry naming conventions |
| Reporting Structure | ✅ Hierarchical | Per-tenant customization |

---

## 4. Tech Stack Canonical Document

### 4.1 Backend

| Component | Technology | Version/Details |
|-----------|------------|-----------------|
| **Runtime** | Node.js | v20.x (tsx for TypeScript) |
| **Language** | TypeScript | Strict mode enabled |
| **Framework** | Express.js | REST API architecture |
| **Database** | PostgreSQL | Neon-backed, managed by Replit |
| **ORM** | Drizzle ORM | Type-safe queries, migrations |
| **Validation** | Zod | Request/response validation |
| **Authentication** | Passport.js + Replit Auth | OIDC-based |
| **Session** | express-session | connect-pg-simple store |
| **JWT** | jsonwebtoken | Access + Refresh tokens |
| **Password Hashing** | bcrypt | Customer portal auth |
| **Caching** | ioredis / In-memory fallback | Optional Redis |
| **PDF Generation** | PDFKit | Invoice, receipt generation |
| **Email** | SendGrid / Resend | Notification delivery |
| **WhatsApp** | Twilio / Meta / Gupshup | Multi-provider support |
| **AI** | OpenAI | GPT-4 for insights |

### 4.2 Frontend

| Component | Technology | Version/Details |
|-----------|------------|-----------------|
| **Framework** | React | v18.x with TypeScript |
| **Build Tool** | Vite | Hot module replacement |
| **Styling** | Tailwind CSS | v4.x with PostCSS |
| **UI Components** | shadcn/ui | Radix UI primitives |
| **Icons** | Lucide React | + react-icons for logos |
| **State Management** | TanStack Query | v5, server state |
| **Forms** | React Hook Form | + zodResolver |
| **Routing** | Wouter | Lightweight router |
| **Theming** | next-themes | Dark/light mode |
| **Charts** | Recharts | Dashboard visualizations |
| **Date Handling** | date-fns | Date manipulation |
| **Animations** | Framer Motion | UI animations |

### 4.3 Database Schema Structure

| Category | Table Count | Key Tables |
|----------|------------|------------|
| **Core/Platform** | ~30 | tenants, users, roles, permissions, audit_logs |
| **Multi-tenancy** | ~10 | tenant_settings, tenant_branding, tenant_features |
| **Furniture Module** | ~15 | furniture_products, raw_materials, bom, production_orders, sales_orders |
| **HRMS Module** | ~12 | hr_employees, hr_departments, hr_attendance, hr_leaves, hr_payroll |
| **Legal Module** | ~10 | cases, legal_clients, legal_documents, legal_invoices |
| **Education Module** | ~8 | students, courses, batches, fees, exams |
| **Tourism Module** | ~6 | tour_packages, tour_bookings, itineraries, travelers |
| **Logistics Module** | ~6 | vehicles, drivers, trips, shipments |
| **Real Estate Module** | ~6 | properties, agents, real_estate_leads, site_visits, commissions |
| **Clinic Module** | ~4 | patients, doctors, appointments, medical_records |
| **Coworking Module** | ~3 | spaces, desks, desk_bookings |
| **Compliance** | ~15 | tax_rules, consent_records, dsar_requests, gdpr_config |
| **Billing/Payments** | ~10 | payments, invoices, subscriptions, exchange_rates |
| **Add-ons** | ~6 | addons, addon_versions, tenant_addons |
| **Reseller** | ~5 | reseller_profiles, revenue_agreements |

### 4.4 API Architecture

```
/api
├── /auth              # Authentication (Replit Auth + JWT)
├── /tenants           # Tenant management
├── /users             # User management
├── /customers         # Customer CRUD
├── /services          # Service catalog
├── /bookings          # Generic bookings
├── /invoices          # Generic invoices
├── /payments          # Payment processing
│
├── /furniture         # Furniture Manufacturing Module
│   ├── /products
│   ├── /raw-materials
│   ├── /bom
│   ├── /production-orders
│   ├── /sales-orders
│   ├── /deliveries
│   ├── /installations
│   └── /invoices
│
├── /hr                # HRMS Module
│   ├── /employees
│   ├── /departments
│   ├── /attendance
│   ├── /leaves
│   ├── /payroll
│   └── /projects      # (IT Extensions - gated)
│
├── /legal             # Legal Services Module
│   ├── /cases
│   ├── /clients
│   ├── /documents
│   ├── /appointments
│   └── /invoices
│
├── /education         # Education Module
│   ├── /students
│   ├── /courses
│   ├── /batches
│   ├── /attendance
│   ├── /exams
│   └── /fees
│
├── /tourism           # Tourism Module
│   ├── /packages
│   ├── /bookings
│   ├── /itineraries
│   ├── /travelers
│   └── /vendors
│
├── /logistics         # Logistics Module
│   ├── /vehicles
│   ├── /drivers
│   ├── /trips
│   ├── /shipments
│   └── /maintenance
│
├── /real-estate       # Real Estate Module
│   ├── /properties
│   ├── /agents
│   ├── /leads
│   ├── /site-visits
│   ├── /listings
│   └── /commissions
│
├── /admin             # Super Admin APIs
│   ├── /tenants
│   ├── /compliance
│   ├── /exchange-rates
│   ├── /tax-management
│   └── /platform-admins
│
├── /mobile            # Mobile API Layer
│   ├── /auth
│   ├── /sync
│   └── /devices
│
└── /compliance        # Country-Specific Compliance
    ├── /india
    ├── /uae
    └── /uk
```

### 4.5 Security Architecture

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Replit Auth (OIDC) + JWT tokens |
| **Authorization** | RBAC with permission matrix |
| **Tenant Isolation** | X-Tenant-ID header + JWT claims |
| **Rate Limiting** | Per-tenant, per-endpoint limits |
| **Session Security** | Secure cookies, CSRF protection |
| **Password Storage** | bcrypt with salt rounds |
| **Token Rotation** | Refresh token rotation on use |
| **Audit Logging** | All mutations logged |
| **Input Validation** | Zod schemas on all endpoints |
| **SQL Injection** | Parameterized queries via Drizzle |

### 4.6 Mobile Architecture (Flutter App Implemented)

**Flutter App Location:** `mobile/` directory

| Component | Status | Details |
|-----------|--------|---------|
| **Mobile API Router** | ✅ Implemented | JWT auth, versioning, rate limiting |
| **Device Registration** | ✅ Implemented | Platform detection, push tokens |
| **Token Management** | ✅ Implemented | Access/refresh tokens |
| **Sync Infrastructure** | ✅ Implemented | Delta sync, conflict resolution |
| **Offline Support** | ✅ Implemented | `SyncService` with `DatabaseHelper` (Hive) |
| **Flutter App** | ✅ Implemented | Clean Architecture with BLoC pattern |

#### Flutter App Architecture
- **State Management:** Flutter BLoC
- **HTTP Client:** Dio with interceptors (TenantInterceptor, AuthInterceptor, ErrorInterceptor)
- **Local Storage:** Hive for offline caching
- **Notifications:** Firebase Cloud Messaging + Local Notifications
- **Routing:** GoRouter with auth guards

#### Flutter Module Status
| Module | Status | Location |
|--------|--------|----------|
| Furniture | ✅ Complete | `mobile/lib/features/furniture/` (Products, Invoices, Analytics) |
| HRMS | ✅ Complete | `mobile/lib/features/hrms/` (Dashboard, Employees, Attendance, Leave, Payroll) |
| Legal | ✅ Complete | `mobile/lib/features/legal/` (Dashboard, Cases) |
| Education | ✅ Complete | `mobile/lib/features/education/` (Dashboard) |
| Tourism | 🟡 Partial | `mobile/lib/features/tourism/` (Models, Repository partial) |
| Logistics | 🟡 Partial | `mobile/lib/features/logistics/` (Models, BLoC partial) |
| Real Estate | 🟡 Partial | `mobile/lib/features/real_estate/` (Models, BLoC partial) |
| Clinic | 🟡 Scaffold | `mobile/lib/features/clinic/` (Entry only) |
| Coworking | 🟡 Scaffold | `mobile/lib/features/coworking/` (Entry only) |
| PG/Hostel | 🟡 Scaffold | `mobile/lib/features/pg_hostel/` (Models only) |
| Salon | 🟡 Scaffold | `mobile/lib/features/salon/` (Models only) |
| Gym | 🟡 Scaffold | `mobile/lib/features/gym/` (Entry only) |

### 4.7 Deployment Architecture

| Environment | Technology |
|-------------|------------|
| **Development** | Replit (single container) |
| **Production** | Replit Deployments (autoscaling) |
| **Database** | Neon PostgreSQL (managed) |
| **CDN** | Cloudflare (static assets) |
| **SSL** | Automatic via Replit |
| **Domains** | Custom domain support with verification |

---

## Summary

### Production-Ready Modules (Tier 1)
1. ✅ **Furniture Manufacturing** - Most complete, reference implementation
2. ✅ **HRMS** - Full HR suite, available to all business types
3. ✅ **Legal Services** - Case management + billing
4. ✅ **Education/Coaching** - Student management + fees
5. ✅ **Tourism/Travel** - Tour packages + bookings
6. ✅ **Logistics** - Fleet management + shipments
7. ✅ **Real Estate** - Property CRM + commissions

### Partially Implemented Modules (Tier 2)
1. 🟡 **Clinic/Healthcare** - CRUD exists, needs financial integration
2. 🟡 **Coworking** - CRUD exists, needs financial integration
3. 🟡 **PG/Hostel** - Basic structure, needs full implementation
4. 🟡 **Salon/Spa** - Uses generic services, needs module-specific features
5. 🟡 **Gym/Fitness** - Membership exists, needs full module

### Critical Gaps
1. **Flutter Tier 2 Modules**: Scaffold only, need complete BLoC/Repository implementation
2. **Multi-Currency**: Only Furniture has full implementation
3. **Server-Side Pagination**: Only Furniture/HRMS have full implementation
4. **Analytics Adapters**: Missing for Tier 2 modules
5. **Notification Adapters**: Missing for Tier 2 modules
6. **CSV Export**: Missing across ALL modules

---

*Document generated by MyBizStream System Audit Tool*
