# MyBizStream - Multi-Tenant SaaS Business Management Platform

## Overview
MyBizStream is an enterprise-grade, multi-tenant SaaS platform designed to streamline operations and manage customer relationships for small and medium businesses across various sectors. It provides scalable and secure solutions for bookings, analytics, invoicing, and business management with a vision for diverse business needs and global market potential.

## Business Modules

### 1. Clinic/Healthcare Module
- Patient management with medical history
- Doctor profiles and specializations
- Appointment scheduling and calendar management
- EMR (Electronic Medical Records) - feature-flagged for enterprise
- Prescription management
- Lab test tracking
- Medical billing with GST/tax compliance

### 2. Salon/Spa Module
- Service catalog with pricing and duration
- Staff management with availability schedules
- Appointment booking with time slots
- Customer preferences and history
- Package and membership plans
- Walk-in vs scheduled appointments
- Service add-ons and upselling

### 3. PG/Hostel Module
- Room inventory management
- Bed allocation and occupancy tracking
- Tenant/resident profiles
- Rent collection and payment tracking
- Maintenance request handling
- Utility billing
- Move-in/move-out management

### 4. Coworking Space Module
- Desk and space inventory
- Hot desk vs dedicated desk booking
- Meeting room reservations
- Membership plans (daily/weekly/monthly)
- Access control integration
- Amenity management
- Community events

### 5. General Service Business Module
- Service catalog management
- Customer database
- Booking and scheduling
- Invoice generation
- Payment tracking
- Staff assignment

### 6. Real Estate Module
- Property listings management
- Lead tracking and CRM
- Site visit scheduling
- Document management
- Commission tracking
- Property analytics

### 7. Tourism/Travel Module
- Tour package management
- Booking management
- Itinerary planning
- Customer preferences
- Group tour handling
- Payment and refund tracking

### 8. Education/Coaching Module
- Course catalog
- Student enrollment
- Batch management
- Class scheduling
- Fee collection
- Progress tracking
- Certificate generation

### 9. Logistics Module
- Fleet management
- Order tracking
- Route optimization
- Delivery scheduling
- Driver assignment
- Proof of delivery

### 10. Legal Services Module
- Case management
- Client database
- Document management
- Court date tracking
- Billing and invoicing
- Time tracking

### 11. Furniture Manufacturing Module (Comprehensive)
- **Product Catalog**: Ready-made, made-to-order, semi-finished products with dimensions, pricing (cost/selling/wholesale), GST/HSN codes, customization options
- **Raw Materials Inventory**: Material categories, inventory items with units of measure, stock levels, batch tracking, supplier info, reorder points
- **Stock Movements**: In/out/adjustment tracking with reference to production orders, batch/lot numbers, cost tracking
- **Bill of Materials (BOM)**: Versioned BOMs per product, component lists with waste allowance, labor/overhead costs, yield quantities
- **Production Orders**: Auto-generated order numbers, status workflow (draft/pending/in_progress/on_hold/completed/cancelled), scheduling, priority, wastage tracking
- **Production Stages**: Default stages (cutting/assembly/finishing/quality_check/ready_for_dispatch), custom stages, stage status tracking
- **Delivery Orders**: Delivery scheduling with time slots, address management, driver/vehicle assignment, proof of delivery (signature/photo)
- **Installation Orders**: Post-delivery installation, installer assignment with helpers, completion tracking with customer feedback/ratings
- **Sales Orders**: Retail/wholesale/B2B order types, advance payments, multi-currency support, GST invoicing
- **Multi-Country Invoicing System**:
  - Invoice management with multi-currency selection and automatic exchange rate lookup
  - Country-specific tax calculations (India GST, Malaysia SST, US Sales Tax, UAE VAT, UK VAT)
  - PDF invoice generation with tenant branding
  - Payment recording with cross-currency conversion
  - Invoice lifecycle (draft/issued/partially_paid/paid/overdue/cancelled/refunded)
- **Customer Notifications**:
  - WhatsApp notifications via Twilio
  - Email notifications via SendGrid/Resend
  - Configurable templates per tenant with multi-language support
  - Event triggers (invoice created, payment reminder, payment received, overdue, cancelled)
  - Retry mechanism with exponential backoff (3 attempts)
  - Audit logging of all notification events
  - Bulk reminder sending for overdue invoices

## Core Platform Features

### Authentication & Security
- Replit Auth (OIDC) for initial authentication
- JWT (Access + Refresh tokens) with rotation and revocation
- Session management with secure storage
- Login rate limiting with account lockout
- IP whitelist/blacklist
- 2FA readiness

### Multi-Tenancy
- Tenant isolation via JWT claims
- X-Tenant-ID header enforcement
- Subdomain support
- Per-tenant feature flags
- Subscription tier management (Free/Pro/Enterprise)

### Role-Based Access Control (RBAC)
- **Roles**: Super Admin, Admin, Manager, Staff, Customer
- Permission matrix with `resource:action` format
- Module-level access control
- Feature-flag gating

### Platform Admin System
- Five-tier hierarchy: SUPER_ADMIN, PLATFORM_ADMIN, TECH_SUPPORT_MANAGER, MANAGER, SUPPORT_TEAM
- Granular permissions: VIEW_SYSTEM_HEALTH, VIEW_API_METRICS, MANAGE_APIS, VIEW_ERROR_LOGS, MANAGE_ALERTS, VIEW_PERFORMANCE
- Country/region assignment for admins
- Audit trail for all admin actions

### Customer Portal
- Self-service portal for tenant customers
- Configurable permissions per tenant (self-registration, profile edit, invoice view, payments)
- Separate authentication with bcrypt password hashing
- 24-hour session tokens with rate limiting
- Invite system with 7-day expiration
- Customer dashboard with profile and invoice management

### White-Label & Reseller System
- Tenant hierarchy (Platform, Reseller, Direct)
- Reseller profiles with revenue agreements
- Branding configuration per reseller
- Revenue tracking and reporting
- White-label theming

### Tenant Branding
- Custom logos (light/dark mode)
- Color palettes
- Typography settings
- Theme tokens
- Custom CSS injection
- 13 types of email template customization

### Compliance & Data Protection
- HIPAA/DPDP-aligned features
- PHI access logging
- Role-based data masking
- Consent management
- Unusual access detection
- Secure configuration

### Country-Specific Compliance

#### India
- GST Compliance: GSTIN validation, CGST/SGST/IGST calculation, e-invoice generation, HSN/SAC codes
- WhatsApp/SMS DLT: Template registration, sender ID management, consent scrubbing
- Aadhaar Data Protection: Verhoeff checksum validation, secure masking, access logging
- RBI Payment Guidelines: Card tokenization, 2FA verification, recurring mandate compliance

#### UAE
- VAT Compliance: TRN validation, 5% VAT calculation, zero-rated/exempt handling, reverse charge
- TRA Messaging: Sender ID registration, template approval workflow
- Data Residency: Data classification tagging, storage location tracking
- Arabic Language Support: Business terms translation, dual-language invoices, RTL readiness
- Emirates ID: Validation with country code check, secure masking

#### UK
- GDPR Controls: ICO registration, lawful basis documentation, privacy policy management, DPO support, DPIA
- Data Retention: Configurable periods per category, automated deletion, HMRC 6-year requirements
- UK VAT Invoicing: VAT number validation (Mod 97), 20%/5%/0% rates, MTD compliance
- Consent Management: Granular consent types, proof/evidence, withdrawal mechanism
- DSAR Handling: 30-day tracking, request types, identity verification
- Data Breach Register: Severity assessment, ICO notification (72 hours), remediation tracking

#### Malaysia
- SST Compliance: Sales Tax (10% on goods), Service Tax (6% on services)
- PDPA compliance framework

#### US
- Multi-state sales tax calculation (state/county/city/special district)
- Nexus-based tax requirements

### Multi-Currency Support
- 15 supported currencies: INR, AED, GBP, MYR, SGD, USD, EUR, AUD, CAD, JPY, CNY, SAR, ZAR, NGN, BRL
- Historical exchange rate tracking
- Currency-specific decimal precision (JPY=0, BHD=3, most=2)
- Base currency conversion for reporting
- Super Admin API for exchange rate management

### Add-on Marketplace
- Modular plugin system
- Semantic versioning (major.minor.patch)
- Per-tenant installation with configuration
- Pricing models: Free, one-time, subscription, usage-based
- Reviews and ratings
- Auto-update settings (stable/prerelease channels)

### Audit Logging
- Tracks: create, update, delete, login, logout, access actions
- Entity-level audit trails
- User attribution
- Timestamp tracking
- Compliance-ready exports

## Technical Architecture

### Frontend
- React 18 with TypeScript
- Tailwind CSS with shadcn/ui components
- TanStack Query v5 for data fetching
- Wouter for routing
- Inter font (primary), JetBrains Mono (monospace)
- Professional blue color scheme
- Dark/light mode support

### Backend
- Express.js with TypeScript
- RESTful API design
- Zod for request validation
- Middleware-based authentication
- Rate limiting and security headers

### Database
- PostgreSQL with Drizzle ORM
- Type-safe schema definitions
- Migration support via drizzle-kit
- Connection pooling

### Mobile (Flutter)
- Clean Architecture (presentation, domain, data layers)
- Flutter BLoC for state management
- Dio HTTP client with interceptors
- Secure storage for tokens
- GoRouter with authentication guards
- Multi-tenant support via TenantInterceptor

### Deployment
- Global deployment on AWS (EKS, RDS, ElastiCache, S3, CloudFront) and GCP (Cloud Run, Cloud SQL, Memorystore)
- Multi-region support with DR capabilities
- RPO 15 mins, RTO 45-60 mins

## API Structure

### Core APIs
- `/api/auth/*` - Authentication endpoints
- `/api/tenants/*` - Tenant management
- `/api/users/*` - User management
- `/api/customers/*` - Customer CRUD
- `/api/services/*` - Service catalog
- `/api/bookings/*` - Booking management
- `/api/invoices/*` - Invoice management

### Furniture Module APIs
- `/api/furniture/products/*` - Product catalog
- `/api/furniture/raw-materials/*` - Raw materials inventory
- `/api/furniture/bom/*` - Bill of materials
- `/api/furniture/production-orders/*` - Production orders
- `/api/furniture/sales-orders/*` - Sales orders
- `/api/furniture/deliveries/*` - Delivery orders
- `/api/furniture/installations/*` - Installation orders
- `/api/furniture/invoices/*` - Invoice management with notifications
- `/api/furniture/invoices/:id/notify` - Send notification
- `/api/furniture/invoices/:id/notifications` - Notification history
- `/api/furniture/invoices/bulk-reminders` - Bulk overdue reminders

### Admin APIs
- `/api/admin/*` - Super admin endpoints
- `/api/admin/tenants/*` - Tenant administration
- `/api/admin/exchange-rates/*` - Currency management
- `/api/admin/compliance/*` - Compliance management

## Documentation Files
- **MYBIZSTREAM_DOCUMENTATION.md**: Comprehensive platform documentation
- **TESTING_WORKFLOW.md**: Testing strategy, tools, and CI/CD guidelines
- **TEST_SCENARIOS.md**: Detailed test scenarios (200+ test cases)
- **design_guidelines.md**: Frontend design guidelines

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
