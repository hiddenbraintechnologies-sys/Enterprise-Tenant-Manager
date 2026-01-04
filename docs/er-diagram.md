# BizFlow Platform - Entity Relationship Diagram

## Entity Hierarchy

```
PLATFORM LEVEL (Global)
├── BusinessTypeRegistry
├── ModuleRegistry
├── FeatureRegistry
├── CompliancePacks
├── PlatformAdmins
├── Resellers
└── AddOns

TENANT LEVEL (Scoped)
├── Tenants
├── Users
├── Roles
├── Subscriptions
├── Invoices
├── TenantFeatureOverride
├── AuditLogs
└── AIUsageLogs
```

## Complete ER Diagram

```mermaid
erDiagram
    %% ==========================================
    %% PLATFORM-LEVEL ENTITIES (No tenant_id)
    %% ==========================================

    BusinessTypeRegistry {
        varchar id PK "gen_random_uuid()"
        varchar code UK "e.g., PG_HOSTEL, SALON"
        varchar name "Display name"
        text description
        boolean enabled "Default: true"
        varchar icon
        varchar category
        jsonb default_modules "Array of module codes"
        jsonb default_features "Array of feature codes"
        jsonb compliance_packs "Array of pack codes"
        varchar onboarding_flow_id FK
        varchar active_version_id FK
        integer latest_version_number
        timestamp created_at
        timestamp updated_at
    }

    ModuleRegistry {
        varchar id PK "gen_random_uuid()"
        varchar code UK "e.g., CRM, BILLING"
        varchar name
        text description
        varchar category "core, optional, addon"
        varchar icon
        boolean is_active "Default: true"
        jsonb dependencies "Other module codes"
        jsonb settings_schema "JSON Schema"
        timestamp created_at
        timestamp updated_at
    }

    FeatureRegistry {
        varchar id PK "gen_random_uuid()"
        varchar code UK "e.g., SMS_NOTIFICATIONS"
        varchar name
        text description
        varchar scope "GLOBAL, BUSINESS, TENANT"
        varchar module_id FK
        boolean enabled "Default: true"
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    CompliancePacks {
        varchar id PK "gen_random_uuid()"
        varchar code UK "GDPR, DPDP, HIPAA"
        varchar name
        text description
        varchar country_code "IN, AE, UK, SG, MY"
        jsonb requirements "Array of checklist items"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    AddOns {
        varchar id PK "gen_random_uuid()"
        varchar code UK
        varchar name
        text description
        varchar category
        varchar pricing_model "free, subscription, one_time"
        numeric price
        varchar currency
        boolean is_active
        varchar version
        jsonb features "Included features"
        timestamp created_at
        timestamp updated_at
    }

    PlatformAdmins {
        varchar id PK "gen_random_uuid()"
        varchar email UK
        varchar name
        varchar password_hash
        varchar role "SUPER_ADMIN, PLATFORM_ADMIN"
        boolean is_active
        timestamp last_login_at
        timestamp created_at
    }

    %% ==========================================
    %% RESELLER / WHITE-LABEL ENTITIES
    %% ==========================================

    Resellers {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK UK "Reseller's own tenant"
        varchar company_name
        varchar contact_email
        varchar status "active, suspended, pending"
        varchar revenue_share_type "percentage, fixed, tiered"
        numeric revenue_share_value
        jsonb branding_config
        jsonb allowed_business_types
        integer max_tenants
        timestamp approved_at
        varchar approved_by FK
        timestamp created_at
        timestamp updated_at
    }

    ResellerTenantMap {
        varchar id PK "gen_random_uuid()"
        varchar reseller_id FK
        varchar tenant_id FK UK
        varchar status "active, suspended"
        timestamp assigned_at
        timestamp created_at
    }

    %% ==========================================
    %% TENANT-LEVEL ENTITIES (Include tenant_id)
    %% ==========================================

    Tenants {
        varchar id PK "gen_random_uuid()"
        varchar name
        varchar slug UK
        varchar business_type FK "BusinessTypeRegistry.code"
        varchar tenant_type "platform, reseller, direct"
        varchar parent_tenant_id FK "For reseller hierarchy"
        varchar status "active, suspended, trial"
        varchar subscription_tier "free, pro, enterprise"
        varchar pinned_version_id FK "Version override"
        jsonb settings
        jsonb branding
        timestamp onboarding_completed_at
        timestamp created_at
        timestamp updated_at
    }

    Users {
        varchar id PK "gen_random_uuid()"
        varchar email UK
        varchar username
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar phone
        boolean is_active
        boolean email_verified
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
    }

    UserTenants {
        varchar id PK "gen_random_uuid()"
        varchar user_id FK
        varchar tenant_id FK
        varchar role_id FK
        boolean is_default
        boolean is_active
        timestamp joined_at
        varchar invited_by FK
    }

    Roles {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK "NULL for system roles"
        varchar name
        text description
        boolean is_system "Default: false"
        timestamp created_at
    }

    Permissions {
        varchar id PK "gen_random_uuid()"
        varchar code UK "resource:action format"
        varchar resource
        varchar action
        text description
        timestamp created_at
    }

    RolePermissions {
        varchar id PK "gen_random_uuid()"
        varchar role_id FK
        varchar permission_id FK
        timestamp created_at
    }

    %% ==========================================
    %% BUSINESS CONFIGURATION MAPPINGS
    %% ==========================================

    BusinessModuleMap {
        varchar id PK "gen_random_uuid()"
        varchar business_type_id FK
        varchar module_id FK
        boolean is_required
        boolean default_enabled
        integer display_order
        timestamp created_at
    }

    BusinessFeatureMap {
        varchar id PK "gen_random_uuid()"
        varchar business_type_id FK
        varchar feature_id FK
        boolean is_required
        boolean default_enabled
        integer display_order
        timestamp created_at
    }

    TenantFeatureOverride {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar feature_id FK
        boolean enabled
        varchar override_reason
        varchar overridden_by FK
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% VERSIONING TABLES
    %% ==========================================

    BusinessTypeVersions {
        varchar id PK "gen_random_uuid()"
        varchar business_type_id FK
        integer version_number
        varchar status "draft, published, retired"
        varchar name
        text description
        jsonb module_snapshot
        jsonb feature_snapshot
        varchar created_by
        varchar published_by
        timestamp published_at
        timestamp retired_at
        timestamp created_at
    }

    %% ==========================================
    %% BILLING & SUBSCRIPTIONS
    %% ==========================================

    Subscriptions {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar plan_code
        varchar status "active, cancelled, past_due"
        timestamp current_period_start
        timestamp current_period_end
        numeric amount
        varchar currency
        varchar payment_method
        varchar external_id "Stripe subscription ID"
        timestamp created_at
        timestamp updated_at
    }

    Invoices {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar subscription_id FK
        varchar invoice_number UK
        varchar status "draft, sent, paid, overdue"
        numeric subtotal
        numeric tax_amount
        numeric total
        varchar currency
        timestamp due_date
        timestamp paid_at
        jsonb line_items
        timestamp created_at
    }

    TenantAddOns {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar addon_id FK
        varchar status "active, cancelled"
        timestamp activated_at
        timestamp expires_at
        jsonb config
        timestamp created_at
    }

    %% ==========================================
    %% COMPLIANCE & AUDIT
    %% ==========================================

    TenantCompliancePacks {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar compliance_pack_id FK
        varchar status "not_started, in_progress, completed"
        integer progress_percentage
        jsonb checklist_status
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }

    AuditLogs {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar user_id FK
        varchar action "create, update, delete, login"
        varchar resource_type
        varchar resource_id
        jsonb old_value
        jsonb new_value
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }

    %% ==========================================
    %% AI GOVERNANCE
    %% ==========================================

    AIFeatures {
        varchar id PK "gen_random_uuid()"
        varchar code UK
        varchar name
        text description
        varchar category
        boolean is_active
        varchar risk_level "low, medium, high"
        integer default_usage_limit
        timestamp created_at
    }

    TenantAISettings {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK UK
        boolean ai_enabled
        boolean consent_given
        timestamp consent_given_at
        varchar preferred_provider
        integer monthly_token_limit
        integer tokens_used_this_month
        jsonb allowed_features
        timestamp created_at
    }

    AIRoleSettings {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar role_id FK
        varchar feature_id FK
        boolean is_enabled
        integer usage_limit
        varchar reset_window "daily, weekly, monthly"
        timestamp created_at
    }

    AIUsageLogs {
        varchar id PK "gen_random_uuid()"
        varchar tenant_id FK
        varchar user_id FK
        varchar feature_code
        varchar action "invoke, complete, error, deny"
        integer tokens_used
        integer latency_ms
        jsonb request_metadata
        jsonb response_metadata
        boolean was_cached
        timestamp created_at
    }

    %% ==========================================
    %% RELATIONSHIPS
    %% ==========================================

    %% Platform-level relationships
    BusinessTypeRegistry ||--o{ BusinessModuleMap : "has modules"
    BusinessTypeRegistry ||--o{ BusinessFeatureMap : "has features"
    BusinessTypeRegistry ||--o{ BusinessTypeVersions : "has versions"
    BusinessTypeRegistry ||--o{ Tenants : "defines type"

    ModuleRegistry ||--o{ BusinessModuleMap : "mapped to"
    ModuleRegistry ||--o{ FeatureRegistry : "contains"

    FeatureRegistry ||--o{ BusinessFeatureMap : "mapped to"
    FeatureRegistry ||--o{ TenantFeatureOverride : "overridden by"

    CompliancePacks ||--o{ TenantCompliancePacks : "assigned to"

    AddOns ||--o{ TenantAddOns : "purchased by"

    %% Reseller relationships
    Resellers ||--o{ ResellerTenantMap : "manages"
    Tenants ||--o| Resellers : "is reseller"
    ResellerTenantMap }o--|| Tenants : "managed tenant"

    %% Tenant relationships
    Tenants ||--o{ UserTenants : "has members"
    Tenants ||--o{ Roles : "has roles"
    Tenants ||--o{ TenantFeatureOverride : "has overrides"
    Tenants ||--o{ Subscriptions : "has subscription"
    Tenants ||--o{ Invoices : "has invoices"
    Tenants ||--o{ TenantAddOns : "has addons"
    Tenants ||--o{ TenantCompliancePacks : "has compliance"
    Tenants ||--o{ AuditLogs : "has logs"
    Tenants ||--o{ TenantAISettings : "has AI config"
    Tenants ||--o{ AIRoleSettings : "has AI role settings"
    Tenants ||--o{ AIUsageLogs : "has AI logs"
    Tenants }o--o| Tenants : "parent (reseller)"

    %% User relationships
    Users ||--o{ UserTenants : "belongs to"
    Users ||--o{ AuditLogs : "performed by"
    Users ||--o{ AIUsageLogs : "used by"

    %% Role relationships
    Roles ||--o{ UserTenants : "assigned to"
    Roles ||--o{ RolePermissions : "has permissions"
    Roles ||--o{ AIRoleSettings : "has AI settings"
    Permissions ||--o{ RolePermissions : "granted to"

    %% Billing relationships
    Subscriptions ||--o{ Invoices : "generates"

    %% AI relationships
    AIFeatures ||--o{ AIRoleSettings : "configured per role"
```

## Entity Classification

### Platform-Level Entities (No tenant_id)
These entities are managed by SuperAdmin/PlatformAdmin and shared across all tenants:

| Entity | Purpose |
|--------|---------|
| `BusinessTypeRegistry` | Defines available business types (PG, Salon, Gym, etc.) |
| `ModuleRegistry` | Catalog of all modules (CRM, Billing, Inventory, etc.) |
| `FeatureRegistry` | Catalog of all features with scopes |
| `CompliancePacks` | Country-specific compliance requirements |
| `AddOns` | Marketplace add-ons available for purchase |
| `PlatformAdmins` | Platform administrators (SuperAdmin, PlatformAdmin) |
| `Resellers` | White-label reseller profiles |

### Tenant-Level Entities (Include tenant_id)
These entities are scoped to individual tenants for data isolation:

| Entity | Purpose |
|--------|---------|
| `Tenants` | Individual tenant organizations |
| `Users` | User accounts (linked to tenants via UserTenants) |
| `UserTenants` | User-tenant membership with roles |
| `Roles` | Tenant-specific roles |
| `Subscriptions` | Tenant billing subscriptions |
| `Invoices` | Billing invoices |
| `TenantFeatureOverride` | Per-tenant feature toggles |
| `TenantCompliancePacks` | Compliance status per tenant |
| `TenantAddOns` | Purchased add-ons per tenant |
| `AuditLogs` | Audit trail per tenant |
| `TenantAISettings` | AI configuration per tenant |
| `AIRoleSettings` | AI feature access per role |
| `AIUsageLogs` | AI usage tracking |

### Mapping Entities (Configuration)
These bridge platform registries to business types:

| Entity | Purpose |
|--------|---------|
| `BusinessModuleMap` | Which modules apply to which business type |
| `BusinessFeatureMap` | Which features apply to which business type |
| `BusinessTypeVersions` | Versioned snapshots of business definitions |
| `ResellerTenantMap` | Which tenants belong to which reseller |

## Key Constraints

### Unique Constraints
- `BusinessTypeRegistry.code` - Unique business type codes
- `ModuleRegistry.code` - Unique module codes
- `FeatureRegistry.code` - Unique feature codes
- `Tenants.slug` - Unique tenant slugs
- `Users.email` - Unique user emails
- `(tenant_id, feature_id)` on TenantFeatureOverride
- `(user_id, tenant_id)` on UserTenants
- `(role_id, permission_id)` on RolePermissions

### Foreign Key Cascades
- `ON DELETE CASCADE` for tenant-scoped child records
- `ON DELETE RESTRICT` for platform-level references

### Indexes
- All `tenant_id` columns indexed for query performance
- Composite indexes on frequently queried combinations
- Unique indexes on business keys

## Data Flow

```
1. SuperAdmin creates BusinessType in Registry
                    ↓
2. BusinessModuleMap/FeatureMap defines defaults
                    ↓
3. Tenant onboards with BusinessType (immutable)
                    ↓
4. Feature Resolution: BusinessDefaults → TenantOverrides
                    ↓
5. Runtime API evaluates enabled features per tenant
```
