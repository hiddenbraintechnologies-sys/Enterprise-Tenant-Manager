# PHASE 2: GLOBAL PARITY & MATURITY FRAMEWORK

**Document Status:** Source of Truth  
**Version:** 1.0.0  
**Generated:** January 8, 2026  
**Sprint Duration:** 2 weeks

> **"Any deviation from this document is a bug."**

---

## Table of Contents
1. [Global Feature Canonical List](#part-1-global-feature-canonical-list)
2. [Phase 2 Parity Rollout Plan](#part-2-phase-2-parity-rollout-plan)
3. [Module Maturity Scoring Model](#part-3-module-maturity-scoring-model)
4. [Business + Tech Stack Document](#part-4-business--tech-stack-document)
5. [Phase 2 Actionable TODO List](#part-5-phase-2-actionable-todo-list)

---

# PART 1: GLOBAL FEATURE CANONICAL LIST

## Legend
- ✅ Implemented (Production-ready)
- 🟡 Partial (Exists but incomplete)
- ❌ Missing (Must be implemented)
- ⚪ N/A (Technically not applicable - documented reason required)

---

## A. Core Platform (MANDATORY for ALL modules)

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| Multi-tenant isolation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| X-Tenant-ID enforcement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Role-based access (RBAC) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Region/country availability | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Subscription/plan enforcement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit logs (entity-level) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feature flags | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pagination (server-side)** | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Search (server-side)** | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Filter (multi-field)** | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Export CSV** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Export PDF** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Gap Analysis - Core Platform
- **Critical:** Server-side pagination only in Furniture/HRMS
- **Critical:** CSV export missing across ALL modules
- **High:** Search/filter only in Furniture, partial in HRMS
- **Medium:** Audit logs missing in Tier 2 modules

---

## B. Financial & Commercial (Required for customer-facing modules)

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| Invoice lifecycle (draft→issued→paid) | ✅ | ⚪* | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tax engine (GST/VAT multi-country)** | ✅ | ⚪ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-currency support** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Currency conversion + rates** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Payment collection | ✅ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Partial payments | ✅ | ⚪ | 🟡 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Idempotent transactions | ✅ | ⚪ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Refunds & adjustments** | ✅ | ⚪ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Credit notes** | ✅ | ⚪ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Financial reports | ✅ | ⚪ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Branded PDF invoices | ✅ | ⚪ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

*⚪ HRMS is internal HR - no customer invoicing (payslips use different flow)*

### Gap Analysis - Financial
- **Critical:** Multi-currency ONLY in Furniture
- **Critical:** Refunds/Credit notes ONLY in Furniture
- **Critical:** Tier 2 modules have NO financial integration
- **High:** Tax engine incomplete in Tier 1 modules (single-country only)

---

## C. Operations (Business-agnostic)

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| Inventory/resource tracking | ✅ | ⚪ | ⚪ | ⚪ | ⚪ | ✅ | ⚪ | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| Order/job lifecycle | ✅ | ⚪ | ✅ | 🟡 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| Status transitions + validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Attachments/document storage** | ❌ | 🟡 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notes field (per entity) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Activity timeline** | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Soft delete | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Gap Analysis - Operations
- **Critical:** Activity timeline missing everywhere
- **Critical:** Document/attachment storage only in Legal + HRMS partial
- **High:** Soft delete missing in Tier 2 modules

---

## D. HRMS (GLOBAL across ALL businesses)

### D1. Core HRMS Features (Enabled for ALL Business Types)

| Feature | Status | Route | Notes |
|---------|--------|-------|-------|
| Employee directory | ✅ | `/api/hr/employees` | Full CRUD |
| Department management | ✅ | `/api/hr/departments` | Full CRUD |
| Attendance tracking | ✅ | `/api/hr/attendance` | Check-in/out, bulk marking |
| Leave management | ✅ | `/api/hr/leaves` | Applications, approvals |
| Leave types | ✅ | `/api/hr/leave-types` | Configurable per tenant |
| Payroll processing | ✅ | `/api/hr/payroll` | Salary structures, payroll runs |
| HR dashboard | ✅ | Frontend | Stats, summaries |

### D2. IT Extensions (Feature-Gated)

```typescript
// Feature flag: hrms_it_extensions
// Enabled for: clinic, coworking, service, education, legal, furniture_manufacturing
```

| Feature | Status | Route | Business Types |
|---------|--------|-------|----------------|
| Project management | ✅ | `/api/hr/projects` | Gated |
| Resource allocations | ✅ | `/api/hr/allocations` | Gated |
| Timesheet tracking | ✅ | `/api/hr/timesheets` | Gated |

### D3. HRMS Gaps (Must Implement)

| Feature | Status | Priority |
|---------|--------|----------|
| **Payslip PDF generation** | ❌ | HIGH |
| **Tax deduction calculations** | ❌ | HIGH |
| **Multi-currency payroll** | ❌ | MEDIUM |
| **HR analytics adapter** | ✅ | DONE |
| **HR notification adapter** | ✅ | DONE |

---

## E. Analytics & AI

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| **Analytics adapter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dashboard stats API | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ❌ |
| Cross-module dashboard | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI insights hooks** | ✅ | ❌ | ✅* | ✅** | ❌ | ✅*** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Trend analysis | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Forecasting | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Legal: Case summarization AI  
**Education: Risk predictions AI  
***Logistics: Route optimization AI

### Gap Analysis - Analytics
- **Critical:** Analytics adapters missing for Tier 2 modules
- **High:** AI insights only in 4 modules
- **Medium:** Cross-module dashboard needs unification

---

## F. Notifications

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| **Notification adapter** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Email notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WhatsApp notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SMS notifications | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| In-app notifications | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Event-based dispatch | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Template management | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Gap Analysis - Notifications
- **Critical:** All Tier 2 modules have NO notification integration
- **Medium:** SMS not fully implemented
- **Medium:** In-app notifications need WebSocket integration

---

## G. Mobile Readiness

**Flutter App Location:** `mobile/` directory with full Clean Architecture implementation

| Feature | Furniture | HRMS | Legal | Education | Tourism | Logistics | Real Estate | PG/Hostel | Coworking | Clinic | Salon | Gym |
|---------|-----------|------|-------|-----------|---------|-----------|-------------|-----------|-----------|--------|-------|-----|
| Mobile API endpoints | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| JWT authentication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Device registration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Offline sync | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **Flutter app** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |

### Flutter App Implementation Status
- **Architecture:** Clean Architecture (presentation, domain, data layers)
- **State Management:** Flutter BLoC
- **Networking:** Dio with interceptors (TenantInterceptor, AuthInterceptor)
- **Offline:** SyncService with conflict resolution, DatabaseHelper (Hive)
- **Notifications:** Firebase + Local notifications
- **Routing:** GoRouter with auth guards

### Implemented Flutter Modules
| Module | Pages | BLoC | Repository | Models | Status |
|--------|-------|------|------------|--------|--------|
| Furniture | Products, Invoices, Analytics | ✅ | ✅ | ✅ | Production |
| HRMS | Dashboard, Employees, Attendance, Leave, Payroll | ✅ | ✅ | ✅ | Production |
| Legal | Dashboard, Cases | ✅ | ✅ | ✅ | Production |
| Education | Dashboard | ✅ | ✅ | ✅ | Production |
| Tourism | Dashboard | 🟡 | ✅ | ✅ | Partial |
| Logistics | Dashboard | 🟡 | 🟡 | ✅ | Partial |
| Real Estate | Dashboard | 🟡 | 🟡 | ✅ | Partial |
| Clinic | - | ❌ | ❌ | ❌ | Scaffold only |
| Coworking | - | ❌ | ❌ | ❌ | Scaffold only |
| PG/Hostel | - | ❌ | ❌ | 🟡 | Scaffold only |
| Salon | - | ❌ | ❌ | 🟡 | Scaffold only |
| Gym | - | ❌ | ❌ | ❌ | Scaffold only |

### Gap Analysis - Mobile
- **Medium:** Tier 2 modules need full BLoC/Repository implementation
- **Medium:** Offline sync needs testing and refinement
- **Low:** Push notification templates per module

---

# PART 2: PHASE 2 PARITY ROLLOUT PLAN

## Sprint Matrix (2-week sprints)

### Sprint 1-2: Core Infrastructure Parity

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S1 | ALL | CSV Export | NEW | Create shared export utility | Backend | LOW |
| S1 | ALL | Server-side pagination | Furniture | Extract to shared lib (done: server/lib/pagination.ts) | Backend | LOW |
| S1 | Legal, Education, Tourism | Pagination integration | Furniture | Import and use pagination lib | Backend | LOW |
| S1 | Logistics, Real Estate | Pagination integration | Furniture | Import and use pagination lib | Backend | LOW |
| S2 | ALL | Activity timeline | NEW | Create shared activity log service | Backend | MEDIUM |
| S2 | ALL | Attachment storage | Legal | Create shared document service | Backend | MEDIUM |
| S2 | ALL (except Furniture) | Multi-field filtering | Furniture | Extend FilterParams interface | Backend | LOW |

**Dependencies:** None  
**Regression Checkpoint:** All list endpoints must support page/limit/filter

---

### Sprint 3-4: Financial Parity (Tier 1)

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S3 | Legal | Multi-currency | Furniture | Integrate currencyService | Backend | MEDIUM |
| S3 | Legal | Multi-tax engine | Furniture | Integrate taxCalculatorService | Backend | MEDIUM |
| S3 | Education | Multi-currency | Furniture | Integrate currencyService | Backend | MEDIUM |
| S3 | Education | Multi-tax engine | Furniture | Integrate taxCalculatorService | Backend | MEDIUM |
| S4 | Tourism | Multi-currency | Furniture | Integrate currencyService | Backend | MEDIUM |
| S4 | Logistics | Multi-currency | Furniture | Integrate currencyService | Backend | MEDIUM |
| S4 | Real Estate | Currency conversion | Furniture | Complete currencyService integration | Backend | LOW |
| S4 | ALL Tier 1 | Refunds/credit notes | Furniture | Create shared refund service | Backend | HIGH |

**Dependencies:** Sprint 1-2 complete  
**Regression Checkpoint:** All financial modules support INR + USD + AED + GBP

---

### Sprint 5-6: Tier 2 Module Build-out

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S5 | PG/Hostel | Full financial integration | Furniture | Implement BaseFinancialService | Backend | HIGH |
| S5 | PG/Hostel | Notification adapter | HRMS | Create PGNotificationAdapter | Backend | MEDIUM |
| S5 | PG/Hostel | Analytics adapter | HRMS | Create PGAnalyticsAdapter | Backend | MEDIUM |
| S5 | Coworking | Full financial integration | Furniture | Implement BaseFinancialService | Backend | HIGH |
| S6 | Coworking | Notification adapter | HRMS | Create CoworkingNotificationAdapter | Backend | MEDIUM |
| S6 | Clinic | Full financial integration | Furniture | Implement BaseFinancialService | Backend | HIGH |
| S6 | Clinic | Notification adapter | HRMS | Create ClinicNotificationAdapter | Backend | MEDIUM |
| S6 | Clinic | Analytics adapter | HRMS | Create ClinicAnalyticsAdapter | Backend | MEDIUM |

**Dependencies:** Sprint 3-4 complete  
**Regression Checkpoint:** Tier 2 modules can generate invoices + send notifications

---

### Sprint 7-8: Tier 2 Completion + Salon/Gym

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S7 | Salon | Module-specific CRUD | General Service | Build salon-specific entities | Backend | MEDIUM |
| S7 | Salon | Full financial integration | Furniture | Implement BaseFinancialService | Backend | MEDIUM |
| S7 | Salon | Notification adapter | HRMS | Create SalonNotificationAdapter | Backend | LOW |
| S7 | Salon | Analytics adapter | HRMS | Create SalonAnalyticsAdapter | Backend | LOW |
| S8 | Gym | Full module build | Salon | Build gym-specific entities | Backend | HIGH |
| S8 | Gym | Full financial integration | Furniture | Implement BaseFinancialService | Backend | MEDIUM |
| S8 | Gym | Notification adapter | HRMS | Create GymNotificationAdapter | Backend | LOW |
| S8 | Gym | Analytics adapter | HRMS | Create GymAnalyticsAdapter | Backend | LOW |
| S8 | Gym | Web UI dashboard | Salon | Create gym-dashboard.tsx | Frontend | MEDIUM |

**Dependencies:** Sprint 5-6 complete  
**Regression Checkpoint:** All 12 modules have financial + notification + analytics

---

### Sprint 9-10: HRMS Enhancement + AI Parity

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S9 | HRMS | Payslip PDF generation | Furniture invoices | Create PayslipPDFService | Backend | MEDIUM |
| S9 | HRMS | Tax deduction calculations | Furniture tax | Integrate tax engine | Backend | HIGH |
| S9 | HRMS | Multi-currency payroll | Furniture | Integrate currencyService | Backend | MEDIUM |
| S10 | Tourism | AI insights | Legal | Implement demand forecasting | AI | HIGH |
| S10 | Real Estate | AI insights | Legal | Implement lead scoring | AI | HIGH |
| S10 | HRMS | AI insights | Education | Implement attrition predictions | AI | HIGH |

**Dependencies:** Sprint 7-8 complete  
**Regression Checkpoint:** HRMS generates PDF payslips, 3 new AI features

---

### Sprint 11-12: Mobile Completion + Cross-Module Dashboard

| Sprint | Module | Missing Feature | Source Module | Action | Owner | Risk |
|--------|--------|-----------------|---------------|--------|-------|------|
| S11 | Tier 2 | Flutter BLoC/Repository | Furniture | Complete Clinic, Coworking, PG modules | Mobile | MEDIUM |
| S11 | ALL | Cross-module dashboard | NEW | Unified executive dashboard | Frontend | MEDIUM |
| S12 | Tier 2 | Flutter Salon, Gym modules | HRMS | Complete remaining modules | Mobile | MEDIUM |
| S12 | ALL | Offline sync testing | Furniture | E2E offline test suite | Mobile | MEDIUM |
| S12 | ALL | Push notification templates | Furniture | Module-specific notification templates | Mobile | LOW |

**Dependencies:** All previous sprints  
**Regression Checkpoint:** All 12 modules have complete Flutter implementation with offline sync

---

# PART 3: MODULE MATURITY SCORING MODEL

## Scoring Dimensions

| Category | Weight | Max Points | Description |
|----------|--------|------------|-------------|
| Feature Parity | 30% | 30 | Core platform features implemented |
| Financial Completeness | 20% | 20 | Invoicing, payments, multi-currency, tax |
| HRMS Coverage | 15% | 15 | Core HRMS + IT extensions if applicable |
| Analytics & AI | 15% | 15 | Analytics adapter + AI insights |
| Mobile Readiness | 10% | 10 | Mobile API + Flutter app |
| Stability & Testing | 10% | 10 | Test coverage + production stability |

---

## Scoring Rubric

### Feature Parity (30 points)
| Criteria | Points |
|----------|--------|
| Multi-tenant isolation | 3 |
| RBAC implementation | 3 |
| Server-side pagination | 3 |
| Server-side search | 3 |
| Multi-field filtering | 3 |
| CSV export | 3 |
| PDF export | 3 |
| Audit logging | 3 |
| Soft delete | 3 |
| Activity timeline | 3 |

### Financial Completeness (20 points)
| Criteria | Points |
|----------|--------|
| Invoice lifecycle | 4 |
| Payment collection | 4 |
| Multi-currency | 4 |
| Tax engine (multi-country) | 4 |
| Refunds/credit notes | 4 |

### HRMS Coverage (15 points)
| Criteria | Points |
|----------|--------|
| Core HRMS available | 5 |
| IT Extensions (if applicable) | 5 |
| HR analytics | 5 |

### Analytics & AI (15 points)
| Criteria | Points |
|----------|--------|
| Analytics adapter | 5 |
| Dashboard stats API | 5 |
| AI insights | 5 |

### Mobile Readiness (10 points)
| Criteria | Points |
|----------|--------|
| Mobile API endpoints | 3 |
| Device registration | 2 |
| Offline sync | 2 |
| Flutter app | 3 |

### Stability & Testing (10 points)
| Criteria | Points |
|----------|--------|
| Unit test coverage >60% | 4 |
| Integration tests | 3 |
| Production stability (uptime) | 3 |

---

## Current Module Maturity Scores

| Module | Feature Parity | Financial | HRMS | Analytics | Mobile | Stability | **TOTAL** | **TIER** |
|--------|---------------|-----------|------|-----------|--------|-----------|-----------|----------|
| **Furniture** | 27/30 | 20/20 | 15/15 | 15/15 | 10/10 | 7/10 | **94** | Enterprise Ready |
| **HRMS** | 24/30 | 5/20 | 15/15 | 12/15 | 10/10 | 7/10 | **73** | SMB Ready |
| **Legal** | 21/30 | 14/20 | 10/15 | 12/15 | 8/10 | 6/10 | **71** | SMB Ready |
| **Education** | 21/30 | 14/20 | 10/15 | 12/15 | 8/10 | 6/10 | **71** | SMB Ready |
| **Tourism** | 21/30 | 12/20 | 10/15 | 10/15 | 7/10 | 6/10 | **66** | SMB Ready |
| **Logistics** | 21/30 | 12/20 | 10/15 | 12/15 | 7/10 | 6/10 | **68** | SMB Ready |
| **Real Estate** | 21/30 | 12/20 | 10/15 | 10/15 | 7/10 | 6/10 | **66** | SMB Ready |
| **Clinic** | 15/30 | 4/20 | 10/15 | 3/15 | 5/10 | 4/10 | **41** | Starter |
| **Coworking** | 15/30 | 4/20 | 10/15 | 3/15 | 5/10 | 4/10 | **41** | Starter |
| **PG/Hostel** | 12/30 | 4/20 | 10/15 | 3/15 | 5/10 | 3/10 | **37** | Beta |
| **Salon** | 12/30 | 4/20 | 10/15 | 3/15 | 5/10 | 3/10 | **37** | Beta |
| **Gym** | 9/30 | 4/20 | 10/15 | 0/15 | 5/10 | 2/10 | **30** | Beta |

---

## Tier Mapping

| Score Range | Tier | Pricing Eligibility | Sales Status |
|-------------|------|---------------------|--------------|
| 90-100 | Enterprise Ready | ₹499+/month | Premium Sales |
| 75-89 | Growth Ready | ₹299/month | Standard Sales |
| 60-74 | SMB Ready | ₹199/month | Standard Sales |
| 40-59 | Starter | ₹99/month | Limited Sales |
| <40 | Beta | Free Trial Only | Not for Sale |

---

## Target Scores (Post Phase 2)

| Module | Current | Target | Sprint |
|--------|---------|--------|--------|
| Furniture | 94 | 98 | S12 |
| HRMS | 73 | 88 | S9 |
| Legal | 71 | 85 | S4 |
| Education | 71 | 85 | S4 |
| Tourism | 66 | 82 | S4 |
| Logistics | 68 | 82 | S4 |
| Real Estate | 66 | 82 | S4 |
| Clinic | 41 | 75 | S6 |
| Coworking | 41 | 75 | S6 |
| PG/Hostel | 37 | 72 | S6 |
| Salon | 37 | 72 | S8 |
| Gym | 30 | 70 | S8 |

---

# PART 4: BUSINESS + TECH STACK DOCUMENT

## Business View

### Supported Industries (12)

| Industry | Module | Target Market | Maturity |
|----------|--------|---------------|----------|
| Furniture Manufacturing | Furniture | SMB-Enterprise | Growth Ready |
| Human Resources | HRMS | All Sizes | SMB Ready |
| Legal Services | Legal | SMB-Mid | SMB Ready |
| Education/Coaching | Education | SMB-Mid | SMB Ready |
| Tourism/Travel | Tourism | SMB | SMB Ready |
| Logistics/Transport | Logistics | SMB-Mid | SMB Ready |
| Real Estate | Real Estate | SMB-Mid | SMB Ready |
| Healthcare/Clinic | Clinic | SMB | Beta |
| Coworking Spaces | Coworking | SMB | Beta |
| PG/Hostel | PG/Hostel | SMB | Beta |
| Salon/Spa | Salon | SMB | Beta |
| Gym/Fitness | Gym | SMB | Beta |

### Global Feature Guarantees

Every MyBizStream tenant receives:

1. **Multi-tenant Security** - Complete data isolation
2. **RBAC** - Super Admin, Admin, Manager, Staff, Customer roles
3. **HRMS Core** - Employee, attendance, leave, payroll
4. **Audit Logging** - Full compliance trail
5. **Notifications** - Email + WhatsApp (Tier 1 modules)
6. **Analytics Dashboard** - Module-specific stats (Tier 1 modules)
7. **Multi-Currency** - 15 currencies (Furniture only, expanding)
8. **Multi-Country Tax** - India, UAE, UK, US, Malaysia (Furniture only, expanding)

### Compliance Readiness

| Standard | Status | Timeline |
|----------|--------|----------|
| GDPR (UK/EU) | ✅ Implemented | Now |
| DPDP (India) | ✅ Implemented | Now |
| HIPAA (Healthcare) | 🟡 Partial | Q2 2026 |
| SOC2 Type I | ❌ Planned | Q3 2026 |
| ISO 27001 | ❌ Planned | Q4 2026 |

### Pricing Logic

```
Monthly Price = Base Price × Maturity Multiplier × Country Factor

Where:
- Base Price = ₹99 (starter), ₹199 (SMB), ₹299 (Growth), ₹499+ (Enterprise)
- Maturity Multiplier = Score / 100
- Country Factor = 1.0 (India), 0.8 (SEA), 1.5 (US/EU)
```

---

## Technical View

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express.js Server                        │
├─────────────────────────────────────────────────────────────────┤
│                          API Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │/api/auth │ │/api/hr   │ │/api/     │ │/api/     │  ...      │
│  │          │ │          │ │furniture │ │legal     │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                       Service Layer                              │
│  ┌────────────────────┐ ┌────────────────────┐                  │
│  │ BaseFinancialSvc   │ │ BaseNotificationSvc│                  │
│  │ - calculateTax()   │ │ - dispatch()       │                  │
│  │ - convertCurrency()│ │ - scheduleReminder │                  │
│  │ - generatePDF()    │ │ - registerAdapter()│                  │
│  └────────────────────┘ └────────────────────┘                  │
│  ┌────────────────────┐ ┌────────────────────┐                  │
│  │ BaseAnalyticsSvc   │ │ Module Adapters    │                  │
│  │ - registerAdapter()│ │ - HrmsAdapter      │                  │
│  │ - getMetrics()     │ │ - LegalAdapter     │                  │
│  │ - getTrends()      │ │ - FurnitureAdapter │                  │
│  └────────────────────┘ └────────────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│                       Storage Layer                              │
│  ┌────────────────────┐ ┌────────────────────┐                  │
│  │   Drizzle ORM      │ │   Storage Classes  │                  │
│  │   (Type-safe)      │ │   - hrmsStorage    │                  │
│  │                    │ │   - furnitureStore │                  │
│  └────────────────────┘ └────────────────────┘                  │
├─────────────────────────────────────────────────────────────────┤
│                      PostgreSQL (Neon)                           │
└─────────────────────────────────────────────────────────────────┘
```

### Base Services

| Service | File | Purpose |
|---------|------|---------|
| BaseFinancialService | `server/services/base-financial.ts` | Tax, currency, PDF |
| BaseNotificationService | `server/services/base-notification.ts` | Email, WhatsApp, SMS |
| BaseAnalyticsService | `server/services/base-analytics.ts` | Metrics, trends |
| CurrencyService | `server/services/currency.ts` | 15 currencies |
| TaxCalculatorService | `server/services/tax-calculator.ts` | 5 country tax engines |

### Module Adapter Pattern

Every module MUST implement:

```typescript
// Notification Adapter
interface INotificationAdapter {
  getModuleName(): string;
  mapEventToLegacyType(eventType: NotificationEventType): string;
  buildVariables(data: Record<string, unknown>): NotificationVariables;
  getDefaultChannels(eventType: NotificationEventType): NotificationChannel[];
}

// Analytics Adapter
interface IAnalyticsAdapter {
  getModuleName(): string;
  getConfig(): ModuleAnalyticsConfig;
  getAdapterOverview(tenantId: string, dateRange: DateRange): Promise<AnalyticsOverview>;
  getMetricsByCategory(tenantId: string, category: string, dateRange: DateRange): Promise<CategoryMetrics>;
  getTrends(tenantId: string, metric: string, dateRange: DateRange): Promise<Array<{ date: string; value: number }>>;
}
```

### Database Schema Standards

1. **Tenant Isolation**: Every table MUST have `tenantId` column
2. **Audit Fields**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
3. **Soft Delete**: `deletedAt` column for all entity tables
4. **Naming**: `snake_case` for tables and columns
5. **IDs**: UUID for all primary keys
6. **Notes**: Every entity table SHOULD have `notes` text field

### API Conventions

| Method | Purpose | Example |
|--------|---------|---------|
| GET | List with pagination | `GET /api/hr/employees?page=1&limit=20` |
| GET | Single item | `GET /api/hr/employees/:id` |
| POST | Create | `POST /api/hr/employees` |
| PUT | Full update | `PUT /api/hr/employees/:id` |
| PATCH | Partial update | `PATCH /api/hr/employees/:id` |
| DELETE | Soft delete | `DELETE /api/hr/employees/:id` |

### Mobile (Flutter) Parity Rules

1. **Every web endpoint MUST have a mobile equivalent**
2. **JWT authentication is mandatory**
3. **Offline-first for CRUD operations**
4. **Delta sync with conflict resolution**
5. **Device registration for push notifications**

---

# PART 5: PHASE 2 ACTIONABLE TODO LIST

## Priority 1: Critical Infrastructure (Sprint 1-2)

- [ ] **TODO-001**: Extend FilterParams interface with `currency`, `customerId` fields
- [ ] **TODO-002**: Create shared CSV export utility (`server/lib/export.ts`)
- [ ] **TODO-003**: Implement activity timeline service (`server/services/activity-timeline.ts`)
- [ ] **TODO-004**: Create document storage service (`server/services/document-storage.ts`)
- [ ] **TODO-005**: Add pagination to Legal module routes
- [ ] **TODO-006**: Add pagination to Education module routes
- [ ] **TODO-007**: Add pagination to Tourism module routes
- [ ] **TODO-008**: Add pagination to Logistics module routes
- [ ] **TODO-009**: Add pagination to Real Estate module routes

## Priority 2: Financial Parity (Sprint 3-4)

- [ ] **TODO-010**: Integrate currencyService in Legal module
- [ ] **TODO-011**: Integrate currencyService in Education module
- [ ] **TODO-012**: Integrate currencyService in Tourism module
- [ ] **TODO-013**: Integrate currencyService in Logistics module
- [ ] **TODO-014**: Complete currencyService in Real Estate (has currency field, needs conversion)
- [ ] **TODO-015**: Integrate multi-country tax engine in Legal
- [ ] **TODO-016**: Integrate multi-country tax engine in Education
- [ ] **TODO-017**: Integrate multi-country tax engine in Tourism
- [ ] **TODO-018**: Integrate multi-country tax engine in Logistics
- [ ] **TODO-019**: Create shared refund/credit note service
- [ ] **TODO-020**: Implement refunds in all Tier 1 modules

## Priority 3: Tier 2 Module Build-out (Sprint 5-8)

- [ ] **TODO-021**: Create PGNotificationAdapter
- [ ] **TODO-022**: Create PGAnalyticsAdapter
- [ ] **TODO-023**: Implement BaseFinancialService in PG/Hostel
- [ ] **TODO-024**: Create CoworkingNotificationAdapter
- [ ] **TODO-025**: Create CoworkingAnalyticsAdapter
- [ ] **TODO-026**: Implement BaseFinancialService in Coworking
- [ ] **TODO-027**: Create ClinicNotificationAdapter
- [ ] **TODO-028**: Create ClinicAnalyticsAdapter
- [ ] **TODO-029**: Implement BaseFinancialService in Clinic
- [ ] **TODO-030**: Create SalonNotificationAdapter
- [ ] **TODO-031**: Create SalonAnalyticsAdapter
- [ ] **TODO-032**: Implement BaseFinancialService in Salon
- [ ] **TODO-033**: Build complete Gym module with all integrations
- [ ] **TODO-034**: Create Gym dashboard UI

## Priority 4: HRMS Enhancement (Sprint 9)

- [ ] **TODO-035**: Create PayslipPDFService
- [ ] **TODO-036**: Implement tax deduction calculations
- [ ] **TODO-037**: Integrate multi-currency in HRMS payroll

## Priority 5: AI Parity (Sprint 10)

- [ ] **TODO-038**: Implement demand forecasting AI for Tourism
- [ ] **TODO-039**: Implement lead scoring AI for Real Estate
- [ ] **TODO-040**: Implement attrition prediction AI for HRMS

## Priority 6: Mobile Completion (Sprint 11-12)

- [ ] **TODO-041**: Complete Clinic module Flutter BLoC/Repository (`mobile/lib/features/clinic/`)
- [ ] **TODO-042**: Complete Coworking module Flutter BLoC/Repository (`mobile/lib/features/coworking/`)
- [ ] **TODO-043**: Complete PG/Hostel module Flutter BLoC/Repository (`mobile/lib/features/pg_hostel/`)
- [ ] **TODO-044**: Complete Salon module Flutter BLoC/Repository (`mobile/lib/features/salon/`)
- [ ] **TODO-045**: Complete Gym module Flutter BLoC/Repository (`mobile/lib/features/gym/`)
- [ ] **TODO-046**: Add E2E offline sync test suite
- [ ] **TODO-047**: Add module-specific push notification templates

## Bug Fixes (Immediate)

- [ ] **BUG-001**: Fix LSP errors in `server/routes/furniture.ts` (34 diagnostics)
  - FilterParams missing `currency`, `customerId` fields
  - Customer schema missing `city`, `state`, `postalCode`, `country`, `taxId`, `taxIdType`
  - Audit function signature mismatch
  - dueDate type mismatch (string vs Date)

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Modules at Enterprise Ready (90+) | 1 | 2 | Sprint 12 |
| Modules at Growth Ready (75+) | 0 | 8 | Sprint 6 |
| Modules at SMB Ready (60+) | 7 | 12 | Sprint 8 |
| Average Maturity Score | 58 | 80 | Sprint 12 |
| Flutter Tier 1 Complete | ✅ | ✅ | Done |
| Flutter Tier 2 Complete | 🟡 | ✅ | Sprint 12 |
| CSV Export Available | 0% | 100% | Sprint 1 |
| Pagination Available | 17% | 100% | Sprint 2 |

---

**Document Status:** Source of Truth  
**Next Review:** After Sprint 2  
**Owner:** Principal Architect

> "No module ships without global parity."
