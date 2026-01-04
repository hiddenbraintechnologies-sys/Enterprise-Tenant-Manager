# Reseller Monetization Model

## Overview

BizFlow supports a white-label reseller model where partners can onboard and manage multiple tenants while maintaining complete data isolation and receiving configurable revenue shares.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLATFORM OWNER                               │
│  - Sets base pricing                                            │
│  - Configures revenue share per reseller                        │
│  - Can override any pricing rule                                │
│  - Full visibility into all billing                             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  RESELLER A   │    │  RESELLER B   │    │  RESELLER C   │
│  (India)      │    │  (UAE)        │    │  (UK)         │
│  30% share    │    │  25% share    │    │  20% share    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
   ┌────┴────┐           ┌────┴────┐           ┌────┴────┐
   ▼         ▼           ▼         ▼           ▼         ▼
┌──────┐ ┌──────┐    ┌──────┐ ┌──────┐    ┌──────┐ ┌──────┐
│Tenant│ │Tenant│    │Tenant│ │Tenant│    │Tenant│ │Tenant│
│  1   │ │  2   │    │  3   │ │  4   │    │  5   │ │  6   │
└──────┘ └──────┘    └──────┘ └──────┘    └──────┘ └──────┘
```

## Data Model

### Reseller Profile
```typescript
resellers {
  id: varchar PK
  tenant_id: varchar FK UNIQUE  // Reseller's own tenant account
  company_name: varchar
  company_registration: varchar
  tax_id: varchar               // GST/TRN/VAT number
  contact_email: varchar
  contact_phone: varchar
  country_code: varchar         // IN, AE, GB
  currency: varchar             // INR, AED, GBP
  status: enum                  // pending_approval, active, suspended, terminated
  
  // Revenue Configuration
  revenue_share_type: enum      // percentage, fixed, tiered
  revenue_share_value: numeric  // e.g., 30 for 30%
  revenue_share_tiers: jsonb    // For tiered models
  
  // Billing
  billing_cycle: enum           // monthly, quarterly, annual
  payment_terms_days: integer   // Net 15, Net 30
  minimum_guarantee: numeric    // Minimum monthly payout
  
  // Limits
  max_tenants: integer
  allowed_business_types: jsonb // Array of codes or null for all
  allowed_tiers: jsonb          // Which subscription tiers can sell
  
  // White-label
  branding_config: jsonb
  custom_domain: varchar
  
  // Metadata
  approved_at: timestamp
  approved_by: varchar
  created_at: timestamp
  updated_at: timestamp
}
```

### Revenue Share Tiers (Example)
```jsonc
{
  "revenue_share_tiers": [
    { "min_revenue": 0, "max_revenue": 50000, "percentage": 20 },
    { "min_revenue": 50001, "max_revenue": 200000, "percentage": 25 },
    { "min_revenue": 200001, "max_revenue": null, "percentage": 30 }
  ]
}
```

### Reseller-Tenant Mapping
```typescript
reseller_tenant_map {
  id: varchar PK
  reseller_id: varchar FK
  tenant_id: varchar FK UNIQUE  // Each tenant belongs to ONE reseller
  status: enum                  // active, suspended
  onboarded_at: timestamp
  commission_override: numeric  // Per-tenant override if needed
  notes: text
  created_at: timestamp
}
```

### Reseller Transactions
```typescript
reseller_transactions {
  id: varchar PK
  reseller_id: varchar FK
  tenant_id: varchar FK
  invoice_id: varchar FK
  
  // Amounts
  gross_amount: numeric         // Total invoice amount
  platform_fee: numeric         // Platform's share
  reseller_share: numeric       // Reseller's share
  tax_amount: numeric
  net_payout: numeric           // After tax
  
  // Currency
  original_currency: varchar
  original_amount: numeric
  exchange_rate: numeric
  payout_currency: varchar
  payout_amount: numeric
  
  // Status
  status: enum                  // pending, processed, paid, failed
  payout_date: timestamp
  payout_reference: varchar
  
  created_at: timestamp
}
```

### Reseller Payouts
```typescript
reseller_payouts {
  id: varchar PK
  reseller_id: varchar FK
  period_start: date
  period_end: date
  
  // Aggregated amounts
  gross_revenue: numeric
  total_platform_fee: numeric
  total_reseller_share: numeric
  adjustments: numeric          // Refunds, credits
  tax_withheld: numeric
  net_payout: numeric
  
  // Payment
  status: enum                  // pending, processing, paid, failed
  payment_method: varchar       // bank_transfer, paypal
  payment_reference: varchar
  paid_at: timestamp
  
  // Breakdown
  transaction_count: integer
  tenant_count: integer
  details: jsonb                // Per-tenant breakdown
  
  created_at: timestamp
}
```

## Pricing Flow

### 1. Plan Definition (Platform Level)
```typescript
subscription_plans {
  id: varchar PK
  code: varchar UK              // "pro_monthly_inr"
  name: varchar
  tier: enum                    // free, pro, enterprise
  
  // Pricing
  base_price: numeric
  currency: varchar
  billing_interval: enum        // monthly, quarterly, annual
  
  // Features
  included_modules: jsonb
  included_features: jsonb
  limits: jsonb                 // users, storage, etc.
  
  // Regional
  country_code: varchar         // null for global
  tax_inclusive: boolean
  
  is_active: boolean
  created_at: timestamp
}
```

### 2. Pricing Override (Reseller Level)
```typescript
reseller_pricing_overrides {
  id: varchar PK
  reseller_id: varchar FK
  plan_id: varchar FK
  
  // Override pricing
  custom_price: numeric         // null = use base price
  custom_name: varchar          // White-label plan name
  is_enabled: boolean           // Can reseller sell this plan?
  
  // Commission override
  commission_override: numeric  // Override default revenue share
  
  created_at: timestamp
}
```

### 3. Subscription Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Tenant selects plan on Reseller's white-label portal   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: System calculates price                                 │
│   - Base price from subscription_plans                          │
│   - Apply reseller override if exists                           │
│   - Apply platform override if exists (highest priority)        │
│   - Calculate tax based on tenant country                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Payment processed via Stripe Connect                   │
│   - Payment goes to Platform's Stripe account                   │
│   - Automatic split to Reseller's connected account             │
│   - Platform retains its share                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Record transaction                                      │
│   - Create reseller_transaction                                 │
│   - Update subscription status                                  │
│   - Generate invoice                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Revenue Split Calculation

### Formula
```
Gross Amount = Base Price + Add-ons
Tax Amount = Gross Amount × Tax Rate
Net Amount = Gross Amount - Tax Amount

Reseller Share = Net Amount × Revenue Share %
Platform Fee = Net Amount - Reseller Share

# For tiered model:
Reseller Share = Sum of (Amount in Tier × Tier %)
```

### Example Calculation (India)
```
Plan: Pro Monthly
Base Price: ₹2,999/month
GST Rate: 18%

Gross Amount: ₹2,999
GST (18%): ₹539.82
Net Amount: ₹2,459.18

Reseller Revenue Share: 30%
Reseller Share: ₹2,459.18 × 0.30 = ₹737.75
Platform Share: ₹2,459.18 × 0.70 = ₹1,721.43

Reseller Payout: ₹737.75
Platform Retains: ₹1,721.43 + ₹539.82 (GST) = ₹2,261.25
```

## Regional Pricing Examples

### India (INR)
| Plan | Monthly | Quarterly | Annual | Features |
|------|---------|-----------|--------|----------|
| Starter | ₹999 | ₹2,697 (10% off) | ₹9,590 (20% off) | 5 users, 1GB storage |
| Pro | ₹2,999 | ₹8,097 | ₹28,790 | 25 users, 10GB storage, AI features |
| Enterprise | ₹9,999 | ₹26,997 | ₹95,990 | Unlimited users, 100GB, dedicated support |

**Tax:** GST 18% (CGST 9% + SGST 9% or IGST 18%)
**Reseller Share:** 25-35% based on volume

### UAE (AED)
| Plan | Monthly | Quarterly | Annual | Features |
|------|---------|-----------|--------|----------|
| Starter | AED 149 | AED 402 | AED 1,432 | 5 users, 1GB storage |
| Pro | AED 449 | AED 1,212 | AED 4,310 | 25 users, 10GB storage, AI features |
| Enterprise | AED 1,499 | AED 4,047 | AED 14,390 | Unlimited users, 100GB, dedicated support |

**Tax:** VAT 5%
**Reseller Share:** 20-30% based on volume

### UK (GBP)
| Plan | Monthly | Quarterly | Annual | Features |
|------|---------|-----------|--------|----------|
| Starter | £29 | £78 | £278 | 5 users, 1GB storage |
| Pro | £89 | £240 | £854 | 25 users, 10GB storage, AI features |
| Enterprise | £299 | £807 | £2,870 | Unlimited users, 100GB, dedicated support |

**Tax:** VAT 20%
**Reseller Share:** 15-25% based on volume

## White-Label Branding

### Branding Configuration
```jsonc
{
  "branding_config": {
    "company_name": "TechSolutions India",
    "logo_url": "https://cdn.reseller.com/logo.png",
    "favicon_url": "https://cdn.reseller.com/favicon.ico",
    
    "colors": {
      "primary": "#2563EB",
      "secondary": "#64748B",
      "accent": "#10B981"
    },
    
    "email": {
      "from_name": "TechSolutions",
      "from_email": "noreply@techsolutions.in",
      "reply_to": "support@techsolutions.in",
      "footer_text": "TechSolutions India Pvt Ltd"
    },
    
    "support": {
      "email": "support@techsolutions.in",
      "phone": "+91-1800-XXX-XXXX",
      "hours": "Mon-Sat 9AM-6PM IST"
    },
    
    "legal": {
      "terms_url": "https://techsolutions.in/terms",
      "privacy_url": "https://techsolutions.in/privacy"
    },
    
    "custom_domain": "app.techsolutions.in",
    "hide_platform_branding": true
  }
}
```

### What Resellers CAN Customize
- Logo, colors, typography
- Email templates (from name, footer)
- Support contact information
- Terms and privacy policy links
- Custom domain (CNAME)
- Invoice branding

### What Resellers CANNOT Access
- Individual tenant data
- User PII within tenants
- Tenant audit logs
- Tenant feature overrides
- Tenant-level configurations

## Reseller Billing Dashboard

### Dashboard Components

1. **Revenue Overview**
   - Total revenue (MTD, QTD, YTD)
   - Revenue by plan tier
   - Revenue by tenant
   - Growth trends

2. **Tenant Management**
   - Active tenants count
   - Onboarding pipeline
   - Churn rate
   - Tenant health scores

3. **Payout Summary**
   - Pending payouts
   - Payout history
   - Next payout date
   - Bank account status

4. **Commission Details**
   - Current tier/rate
   - Progress to next tier
   - Adjustments/credits
   - Transaction history

### API Endpoints
```
GET  /api/reseller/dashboard/overview
GET  /api/reseller/dashboard/revenue?period=mtd
GET  /api/reseller/dashboard/tenants
GET  /api/reseller/dashboard/payouts
GET  /api/reseller/transactions
GET  /api/reseller/invoices
POST /api/reseller/tenants/invite
```

## Platform Override Rules

### Override Hierarchy
```
1. Platform Global Override (Highest Priority)
   ↓
2. Platform Per-Reseller Override
   ↓
3. Reseller Pricing Override
   ↓
4. Base Plan Pricing (Lowest Priority)
```

### Platform Override Capabilities
```typescript
platform_pricing_overrides {
  id: varchar PK
  scope: enum                   // global, reseller, tenant
  reseller_id: varchar FK       // null for global
  tenant_id: varchar FK         // null for reseller/global
  plan_id: varchar FK
  
  // Override type
  override_type: enum           // price, discount, feature
  
  // Pricing overrides
  fixed_price: numeric
  discount_percentage: numeric
  discount_amount: numeric
  
  // Feature overrides
  additional_features: jsonb
  removed_features: jsonb
  
  // Validity
  valid_from: timestamp
  valid_until: timestamp
  
  // Metadata
  reason: text
  created_by: varchar
  created_at: timestamp
}
```

## Failure and Refund Handling

### Payment Failure Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ Payment Attempt Failed                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Retry Logic (Stripe Smart Retries)                              │
│ - Attempt 1: Immediate                                          │
│ - Attempt 2: 24 hours later                                     │
│ - Attempt 3: 72 hours later                                     │
│ - Attempt 4: 7 days later                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │ Payment       │                   │ All Retries   │
    │ Successful    │                   │ Failed        │
    └───────────────┘                   └───────────────┘
            │                                   │
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │ Normal        │                   │ Grace Period  │
    │ Operation     │                   │ (7 days)      │
    └───────────────┘                   └───────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │ Subscription  │
                                        │ Suspended     │
                                        └───────────────┘
```

### Refund Processing
```typescript
refunds {
  id: varchar PK
  invoice_id: varchar FK
  tenant_id: varchar FK
  reseller_id: varchar FK
  
  // Amounts
  refund_amount: numeric
  currency: varchar
  
  // Type
  refund_type: enum             // full, partial, credit
  reason: enum                  // customer_request, service_issue, duplicate, fraud
  reason_details: text
  
  // Impact on reseller
  reseller_clawback: numeric    // Amount deducted from reseller
  platform_clawback: numeric
  
  // Status
  status: enum                  // pending, approved, processed, rejected
  processed_at: timestamp
  stripe_refund_id: varchar
  
  // Approval
  requested_by: varchar
  approved_by: varchar
  
  created_at: timestamp
}
```

### Refund Rules
| Scenario | Tenant Refund | Reseller Impact | Platform Impact |
|----------|---------------|-----------------|-----------------|
| Within 7 days, no usage | 100% | Clawback 100% of share | Clawback 100% |
| Within 30 days, partial usage | 50% | Clawback 50% of share | Clawback 50% |
| After 30 days | Credit only | No clawback | No clawback |
| Service outage (platform fault) | Pro-rata | No clawback | Platform absorbs |
| Fraud/chargeback | 100% | Clawback 100% + fee | Platform absorbs fee |

### Dispute Handling
```
1. Tenant raises dispute → Logged in system
2. Reseller reviews (if reseller-managed) or Platform reviews
3. Evidence collected (usage logs, communication)
4. Decision made within 5 business days
5. Refund processed or dispute rejected
6. Reseller commission adjusted in next payout
```

## Data Isolation Enforcement

### What Resellers CAN See
- Aggregated tenant counts
- Aggregated revenue metrics
- Subscription status per tenant
- Basic tenant profile (company name, plan)
- Support ticket summaries (not content)

### What Resellers CANNOT See
- Tenant user data (names, emails, etc.)
- Tenant business data (customers, transactions)
- Tenant audit logs
- Tenant feature configurations
- Tenant API keys or secrets
- Tenant file storage

### Technical Enforcement
```typescript
// Middleware: Reseller data access filter
const resellerDataFilter = (resellerId: string) => {
  return {
    // Only allow access to:
    select: ['id', 'name', 'plan', 'status', 'created_at'],
    
    // Never expose:
    exclude: ['users', 'settings', 'audit_logs', 'data'],
    
    // Filter to reseller's tenants only:
    where: { reseller_id: resellerId }
  };
};
```

## Implementation Checklist

- [ ] Reseller onboarding flow with KYC
- [ ] Revenue share configuration UI
- [ ] Stripe Connect integration
- [ ] White-label branding editor
- [ ] Reseller billing dashboard
- [ ] Automated payout processing
- [ ] Refund workflow with clawback
- [ ] Data isolation middleware
- [ ] Regional tax calculation
- [ ] Multi-currency support
