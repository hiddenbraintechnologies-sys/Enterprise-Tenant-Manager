# MyBizStream India Pricing Launch Report

**Deployment Date:** January 11, 2026  
**Target Domain:** payodsoft.co.uk

## Pricing Configuration

### Plans Launched

| Plan | Monthly Price (INR) | Users | Records | Key Features |
|------|---------------------|-------|---------|--------------|
| **FREE** | ₹0 | 1 | 50 | Basic features, Email support |
| **BASIC** | ₹99 | 3 | 500 | GST invoicing, Reports |
| **PRO** | ₹199 | 10 | Unlimited | WhatsApp automation, GST filing, Priority support |

### Feature Breakdown

#### Free Tier
- Single user access
- 50 record limit
- Basic invoicing
- Email support
- Core module access

#### Basic Tier
- 3 team members
- 500 record limit
- GST-compliant invoicing
- Basic reporting
- Standard support

#### Pro Tier
- 10 team members
- Unlimited records
- WhatsApp business automation
- GST filing integration
- Advanced analytics
- Priority support

## RBAC Security Measures

### Pricing Modification Access
- **SUPER_ADMIN only** can create, update, or delete pricing plans
- Platform admins can view pricing but cannot modify
- Country-specific pricing follows same security model

### Routes Protected
- `POST /api/subscriptions/admin/plans` - SUPER_ADMIN
- `PUT /api/subscriptions/admin/plans/:id` - SUPER_ADMIN
- `DELETE /api/subscriptions/admin/plans/:id` - SUPER_ADMIN
- `PUT /api/subscriptions/admin/country-pricing/:country` - SUPER_ADMIN
- `POST /api/subscriptions/admin/local-prices` - SUPER_ADMIN

## Onboarding Components

### WelcomeCard
- Displays once per tenant (localStorage with tenant-scoped key)
- Shows current plan details
- Links to pricing page for upgrade options

### Upgrade Nudges
- **Banner**: Non-intrusive top banner for upgrade suggestions
- **Modal**: Shown only on explicit upgrade actions
- **Feature Lock**: Graceful degradation when feature requires upgrade

## Technical Implementation

### Auto-Seeding
India pricing is automatically seeded on server startup via `bootstrap.ts`:
- Creates/updates FREE, BASIC, PRO plans
- Sets India-specific country pricing
- Configures INR currency display

### Database Tables
- `global_pricing_plans` - Plan definitions
- `country_pricing_config` - India-specific pricing (INR, GST)
- `tenant_subscriptions` - Tenant plan assignments

## Post-Deployment Verification Checklist

- [ ] Server health check (`/health`)
- [ ] Pricing endpoint returns INR prices (`/api/subscriptions/plans?country=IN`)
- [ ] WelcomeCard displays for new tenants
- [ ] Upgrade nudge appears for Free tier users
- [ ] SUPER_ADMIN can modify pricing
- [ ] Regular PLATFORM_ADMIN cannot modify pricing
- [ ] All three tiers visible on pricing page

## Monitoring

### Key Metrics to Track
- Plan conversion rates (Free → Basic → Pro)
- Feature usage by tier
- Upgrade nudge click-through rates
- GST feature adoption

### Alert Thresholds
- Payment failures > 5%
- Plan downgrades spike
- API errors on subscription endpoints

---

*Report generated: January 11, 2026*
