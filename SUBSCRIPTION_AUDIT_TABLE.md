# MyBizStream Subscription Enforcement Audit Table

**Generated**: January 09, 2026  
**Auditor**: Platform System Audit  
**Version**: Phase 2 Global Parity Framework

---

## 1. Audit Summary

| Metric | Value |
|--------|-------|
| Total Business Modules | 12 |
| Subscription Tiers | 4 (Free, Starter, Pro, Enterprise) |
| Countries Covered | 6 (India, UAE, UK, Malaysia, US, Singapore) |
| Example Tenant | Acme Furniture Co. |

---

## 2. Module Tier Access Matrix

### Legend
- ✅ **Included** - Module available in tier
- 💰 **Add-on** - Available for purchase as add-on
- ❌ **Locked** - Not available in tier

| Module | Free | Starter | Pro | Enterprise |
|--------|------|---------|-----|------------|
| **Furniture Manufacturing** | ❌ | 💰 | ✅ | ✅ |
| **Clinic/Healthcare** | ❌ | ❌ | 💰 | ✅ |
| **Salon/Spa** | ✅ | ✅ | ✅ | ✅ |
| **PG/Hostel** | ✅ | ✅ | ✅ | ✅ |
| **Coworking Space** | ✅ | ✅ | ✅ | ✅ |
| **General Service** | ✅ | ✅ | ✅ | ✅ |
| **Real Estate** | ❌ | 💰 | ✅ | ✅ |
| **Tourism/Travel** | ❌ | 💰 | ✅ | ✅ |
| **Education/Coaching** | ❌ | 💰 | ✅ | ✅ |
| **Logistics** | ❌ | 💰 | ✅ | ✅ |
| **Legal Services** | ❌ | 💰 | ✅ | ✅ |
| **Gym/Fitness** | ✅ | ✅ | ✅ | ✅ |

---

## 3. Premium Features by Tier

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| AI Insights | N | N | N | Y |
| Multi-Currency | N | N | Y | Y |
| White-Label | N | N | N | Y |
| Max Users | 1 | 5 | 25 | Unlimited |
| Max Customers | 25 | 100 | 500 | Unlimited |
| API Rate Limit | 100/hr | 1,000/hr | 10,000/hr | Unlimited |
| HRMS Module | N | Y | Y | Y |
| Analytics | N | Y | Y | Y |
| Marketplace | N | Y | Y | Y |
| Reseller Portal | N | N | 💰 | Y |

---

## 4. Country-Specific Pricing Configuration

### Base Prices (USD)

| Tier | Monthly (USD) | Quarterly (USD) | Yearly (USD) |
|------|---------------|-----------------|--------------|
| Free | $0 | $0 | $0 |
| Starter | $29 | $79 | $290 |
| Pro | $99 | $269 | $990 |
| Enterprise | $299 | $809 | $2,990 |

### Local Currency Pricing & Tax Rates

| Country | Currency | Tax Name | Tax Rate | Primary Gateway | Exchange Rate |
|---------|----------|----------|----------|-----------------|---------------|
| India | INR | GST | 18% | Razorpay | 83.50 |
| UAE | AED | VAT | 5% | Stripe | 3.67 |
| UK | GBP | VAT | 20% | Stripe | 0.79 |
| Malaysia | MYR | SST | 6% | Billplz | 4.72 |
| US | USD | Sales Tax | 0-10%* | Stripe | 1.00 |
| Singapore | SGD | GST | 8% | Stripe | 1.35 |

*US Sales Tax varies by state (nexus-based)

---

## 5. Complete Audit Table: Example Tenant "Acme Furniture Co."

### Tenant Profile
- **Tenant ID**: `acme-furniture-001`
- **Business Type**: Furniture Manufacturing
- **Current Tier**: Pro
- **Country**: India

### Full Module × Tier × Country Matrix

#### INDIA (INR, GST 18%, Razorpay)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 $15/mo | ✅ | ✅ | ₹1,250/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 $25/mo | ✅ | ₹2,090/mo | Web ✅, Mobile 🟡, API ✅ |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 $12/mo | ✅ | ✅ | ₹1,000/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 $12/mo | ✅ | ✅ | ₹1,000/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 $12/mo | ✅ | ✅ | ₹1,000/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 $12/mo | ✅ | ✅ | ₹1,000/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 $12/mo | ✅ | ✅ | ₹1,000/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

**Premium Features (India - Pro Tier):**
| Feature | Status | Price Impact |
|---------|--------|--------------|
| AI Insights | N | +₹500/mo Enterprise only |
| Multi-Currency | Y | Included |
| White-Label | N | Enterprise only |
| GST Compliance | Y | Included (all tiers) |

---

#### UAE (AED, VAT 5%, Stripe)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 $15/mo | ✅ | ✅ | AED 55/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 $25/mo | ✅ | AED 92/mo | Web ✅, Mobile 🟡, API ✅ |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 $12/mo | ✅ | ✅ | AED 44/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 $12/mo | ✅ | ✅ | AED 44/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 $12/mo | ✅ | ✅ | AED 44/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 $12/mo | ✅ | ✅ | AED 44/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 $12/mo | ✅ | ✅ | AED 44/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

**Premium Features (UAE - All Tiers):**
| Feature | Status | Notes |
|---------|--------|-------|
| Arabic Language Support | Y | RTL ready, dual-language invoices |
| VAT Compliance (TRN) | Y | 5% VAT calculation |
| Emirates ID Validation | Y | Enterprise only |

---

#### UK (GBP, VAT 20%, Stripe)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 £12/mo | ✅ | ✅ | £12/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 £20/mo | ✅ | £20/mo | HIPAA gap - Web ✅, Mobile 🟡 |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 £10/mo | ✅ | ✅ | £10/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 £10/mo | ✅ | ✅ | £10/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 £10/mo | ✅ | ✅ | £10/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 £10/mo | ✅ | ✅ | £10/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 £10/mo | ✅ | ✅ | £10/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

**Premium Features (UK - All Tiers):**
| Feature | Status | Notes |
|---------|--------|-------|
| GDPR Compliance | Y | ICO registration, DPO support |
| Data Retention | Y | HMRC 6-year requirements |
| DSAR Handling | Y | 30-day tracking |
| MTD VAT | Y | Pro/Enterprise only |

---

#### MALAYSIA (MYR, SST 6%, Billplz)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 RM71/mo | ✅ | ✅ | RM71/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 RM118/mo | ✅ | RM118/mo | Web ✅, Mobile 🟡, API ✅ |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 RM57/mo | ✅ | ✅ | RM57/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 RM57/mo | ✅ | ✅ | RM57/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 RM57/mo | ✅ | ✅ | RM57/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 RM57/mo | ✅ | ✅ | RM57/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 RM57/mo | ✅ | ✅ | RM57/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

**Premium Features (Malaysia):**
| Feature | Status | Notes |
|---------|--------|-------|
| SST Compliance | Y | 6% service tax |
| PDPA Compliance | Y | Data protection |
| Billplz Integration | Y | Primary gateway |

---

#### US (USD, Sales Tax 0-10%*, Stripe)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 $15/mo | ✅ | ✅ | $15/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 $25/mo | ✅ | $25/mo | HIPAA compliant - Enterprise |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 $12/mo | ✅ | ✅ | $12/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 $12/mo | ✅ | ✅ | $12/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 $12/mo | ✅ | ✅ | $12/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 $12/mo | ✅ | ✅ | $12/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 $12/mo | ✅ | ✅ | $12/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

*Sales tax calculated by state/county/city/special district (nexus-based)

---

#### SINGAPORE (SGD, GST 8%, Stripe)

| Module | Free | Starter | Pro | Enterprise | Add-on Price | Notes |
|--------|------|---------|-----|------------|--------------|-------|
| Furniture Manufacturing | ❌ | 💰 S$20/mo | ✅ | ✅ | S$20/mo | Web ✅, Mobile ✅, API ✅ |
| Clinic/Healthcare | ❌ | ❌ | 💰 S$34/mo | ✅ | S$34/mo | Web ✅, Mobile 🟡, API ✅ |
| Salon/Spa | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| PG/Hostel | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| Coworking Space | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |
| General Service | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile ✅, API ✅ |
| Real Estate | ❌ | 💰 S$16/mo | ✅ | ✅ | S$16/mo | Web ✅, Mobile 🟡, API ✅ |
| Tourism/Travel | ❌ | 💰 S$16/mo | ✅ | ✅ | S$16/mo | Web ✅, Mobile 🟡, API ✅ |
| Education/Coaching | ❌ | 💰 S$16/mo | ✅ | ✅ | S$16/mo | Web ✅, Mobile ✅, API ✅ |
| Logistics | ❌ | 💰 S$16/mo | ✅ | ✅ | S$16/mo | Web ✅, Mobile 🟡, API ✅ |
| Legal Services | ❌ | 💰 S$16/mo | ✅ | ✅ | S$16/mo | Web ✅, Mobile ✅, API ✅ |
| Gym/Fitness | ✅ | ✅ | ✅ | ✅ | - | Web ✅, Mobile 🟡, API ✅ |

---

## 6. Implementation Status Summary

### Tier 1 Modules (Fully Implemented)

| Module | Web | Mobile (Flutter) | API | Maturity Score |
|--------|-----|-----------------|-----|----------------|
| Furniture Manufacturing | ✅ | ✅ | ✅ | 75/100 |
| HRMS | ✅ | ✅ | ✅ | 70/100 |
| Legal Services | ✅ | ✅ | ✅ | 65/100 |
| Education | ✅ | ✅ | ✅ | 60/100 |

### Tier 2 Modules (Partial Implementation)

| Module | Web | Mobile (Flutter) | API | Gap Notes |
|--------|-----|-----------------|-----|-----------|
| Clinic/Healthcare | ✅ | 🟡 Scaffold | ✅ | Mobile: Needs dashboard, appointments, EMR |
| Salon/Spa | ✅ | 🟡 Scaffold | ✅ | Mobile: Needs booking, staff mgmt |
| PG/Hostel | ✅ | 🟡 Scaffold | ✅ | Mobile: Needs room mgmt, tenant portal |
| Coworking | ✅ | 🟡 Scaffold | ✅ | Mobile: Needs desk booking, access control |
| Gym/Fitness | ✅ | 🟡 Scaffold | ✅ | Mobile: Needs membership, class booking |
| Tourism | ✅ | 🟡 Partial | ✅ | Mobile: Models + BLoC only |
| Logistics | ✅ | 🟡 Partial | ✅ | Mobile: Models + BLoC only |
| Real Estate | ✅ | 🟡 Partial | ✅ | Mobile: Models + BLoC only |

---

## 7. Enforcement Status

### Backend Middleware Enforcement

| Middleware | Status | Description |
|------------|--------|-------------|
| `requireModule(moduleId)` | ✅ Active | Blocks module access without subscription |
| `requireTier(tiers...)` | ✅ Active | Enforces minimum tier requirement |
| `requireFeature(feature)` | ✅ Active | Gates premium features |
| `softSubscriptionCheck()` | ✅ Active | Enriches context without blocking |

### Route Protection

| Route Group | Middleware | Enforcement |
|-------------|------------|-------------|
| `/api/furniture/*` | `requireModule("furniture_manufacturing")` | ✅ Hard |
| `/api/hr/*` | `requireModule("hrms")` | ✅ Hard |
| `/api/real-estate/*` | `requireModule("real_estate")` | ✅ Hard |
| `/api/tourism/*` | `requireModule("tourism")` | ✅ Hard |
| `/api/education/*` | `requireModule("education")` | ✅ Hard |
| `/api/logistics/*` | `requireModule("logistics")` | ✅ Hard |
| `/api/legal/*` | `requireModule("legal")` | ✅ Hard |

### Response Codes

| Code | Meaning | Upgrade URL |
|------|---------|-------------|
| 402 | Payment Required | `/billing/upgrade` |
| 403 | Forbidden (tier/feature) | `/billing/upgrade?tier={required}` |

---

## 8. Known Gaps & Action Items

| Gap | Impact | Priority | Action |
|-----|--------|----------|--------|
| Tier 2 Mobile Scaffolds | 5 modules need Flutter implementation | High | Complete mobile dashboards |
| Clinic HIPAA Compliance | US healthcare customers blocked | Medium | Add PHI encryption, audit logs |
| Add-on Persistence | Addon purchases not persisted | High | Store in tenant_addons table |
| Analytics Realtime | Not in MODULE_TIER_ACCESS | Medium | Add to tier matrix |
| Reseller White-Label | Pro addon, Enterprise included | Low | Verify branding isolation |

---

## 9. Audit Verification Checklist

- [x] All 12 business modules have tier assignments
- [x] 6 countries have pricing configurations
- [x] Tax rates applied per country
- [x] Premium features gated by tier
- [x] Backend middleware enforces subscription
- [x] API returns 402/403 for unauthorized access
- [ ] All modules have mobile implementation (5 scaffolds pending)
- [ ] Add-on entitlements persisted to database
- [ ] Exchange rates auto-updated from external API

---

**Document Prepared By**: System Audit  
**Review Required By**: Platform Owner, Engineering Manager  
**Next Audit Date**: February 09, 2026
