# MyBizStream Complete Platform Audit & Onboarding Documentation

**Version**: Phase 2 Global Parity  
**Generated**: January 09, 2026  
**Scope**: Subscription Enforcement, Onboarding Flows, Flutter Mobile Modules

---

# PART 1: COMPLETE SUBSCRIPTION × MODULE × TIER × COUNTRY AUDIT TABLE

## Tenant: ExampleTenant1

### Legend
- ✅ **Included** - Module available in tier
- 💰 **Add-on** - Available for purchase ($X/mo)
- ❌ **Locked** - Not available in tier

### Currency Multipliers
| Country | Currency | Multiplier | Tax Name | Tax Rate |
|---------|----------|------------|----------|----------|
| India | INR | 83.00 | GST | 18% |
| UAE | AED | 3.67 | VAT | 5% |
| UK | GBP | 0.78 | VAT | 20% |
| Malaysia | MYR | 4.52 | SST | 6% |
| US | USD | 1.00 | Sales Tax | 0-10%* |
| Singapore | SGD | 1.35 | GST | 8% |

---

## INDIA (INR, GST 18%)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Starter | India | 💰 | $15/mo | ₹1,245/mo | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Starter | India | ✅ | $29/mo | ₹2,407/mo | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Starter | India | 💰 | $12/mo | ₹996/mo | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Starter | India | 💰 | $12/mo | ₹996/mo | 18% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Tourism | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Starter | India | 💰 | $12/mo | ₹996/mo | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Starter | India | 💰 | $12/mo | ₹996/mo | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Free | India | ❌ | - | - | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Starter | India | 💰 | $12/mo | ₹996/mo | 18% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | PG/Hostel | Free | India | ✅ | $0/mo | ₹0/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | PG/Hostel | Starter | India | ✅ | $29/mo | ₹2,407/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | PG/Hostel | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | PG/Hostel | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Coworking | Free | India | ✅ | $0/mo | ₹0/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Coworking | Starter | India | ✅ | $29/mo | ₹2,407/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Coworking | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Coworking | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Clinic | Free | India | ❌ | - | - | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Clinic | Starter | India | ❌ | - | - | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Clinic | Pro | India | 💰 | $25/mo | ₹2,075/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Clinic | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Salon | Free | India | ✅ | $0/mo | ₹0/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Salon | Starter | India | ✅ | $29/mo | ₹2,407/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Salon | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Salon | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Gym | Free | India | ✅ | $0/mo | ₹0/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Gym | Starter | India | ✅ | $29/mo | ₹2,407/mo | 18% | N | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Gym | Pro | India | ✅ | $99/mo | ₹8,217/mo | 18% | Multi-Currency | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |
| ExampleTenant1 | Gym | Enterprise | India | ✅ | $299/mo | ₹24,817/mo | 18% | All | Web ✅, **Mobile 🟡 Scaffold**, API ✅ |

---

## UAE (AED, VAT 5%)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Starter | UAE | 💰 | $15/mo | AED 55/mo | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Furniture | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Starter | UAE | ✅ | $29/mo | AED 106/mo | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | HRMS | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Starter | UAE | 💰 | $12/mo | AED 44/mo | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Legal | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Starter | UAE | 💰 | $12/mo | AED 44/mo | 5% | N | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Education | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile ✅, API ✅ |
| ExampleTenant1 | Tourism | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Starter | UAE | 💰 | $12/mo | AED 44/mo | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Tourism | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Starter | UAE | 💰 | $12/mo | AED 44/mo | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Logistics | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Starter | UAE | 💰 | $12/mo | AED 44/mo | 5% | N | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | Real Estate | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡, API ✅ |
| ExampleTenant1 | PG/Hostel | Free | UAE | ✅ | $0/mo | AED 0/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | PG/Hostel | Starter | UAE | ✅ | $29/mo | AED 106/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | PG/Hostel | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | PG/Hostel | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Coworking | Free | UAE | ✅ | $0/mo | AED 0/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Coworking | Starter | UAE | ✅ | $29/mo | AED 106/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Coworking | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Coworking | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Clinic | Free | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Clinic | Starter | UAE | ❌ | - | - | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Clinic | Pro | UAE | 💰 | $25/mo | AED 92/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Clinic | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Salon | Free | UAE | ✅ | $0/mo | AED 0/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Salon | Starter | UAE | ✅ | $29/mo | AED 106/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Salon | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Salon | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Gym | Free | UAE | ✅ | $0/mo | AED 0/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Gym | Starter | UAE | ✅ | $29/mo | AED 106/mo | 5% | N | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Gym | Pro | UAE | ✅ | $99/mo | AED 363/mo | 5% | Multi-Currency | Web ✅, Mobile 🟡 Scaffold, API ✅ |
| ExampleTenant1 | Gym | Enterprise | UAE | ✅ | $299/mo | AED 1,097/mo | 5% | All | Web ✅, Mobile 🟡 Scaffold, API ✅ |

---

## UK (GBP, VAT 20%)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | UK | ❌ | - | - | 20% | N | GDPR compliant |
| ExampleTenant1 | Furniture | Starter | UK | 💰 | $15/mo | £12/mo | 20% | N | GDPR compliant |
| ExampleTenant1 | Furniture | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | GDPR, MTD VAT |
| ExampleTenant1 | Furniture | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Full GDPR suite |
| ExampleTenant1 | HRMS | Free | UK | ❌ | - | - | 20% | N | GDPR compliant |
| ExampleTenant1 | HRMS | Starter | UK | ✅ | $29/mo | £23/mo | 20% | N | GDPR compliant |
| ExampleTenant1 | HRMS | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | GDPR, MTD VAT |
| ExampleTenant1 | HRMS | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Full GDPR suite |
| ExampleTenant1 | Legal | Free | UK | ❌ | - | - | 20% | N | GDPR compliant |
| ExampleTenant1 | Legal | Starter | UK | 💰 | $12/mo | £9/mo | 20% | N | GDPR compliant |
| ExampleTenant1 | Legal | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | GDPR, MTD VAT |
| ExampleTenant1 | Legal | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Full GDPR suite |
| ExampleTenant1 | Education | Free | UK | ❌ | - | - | 20% | N | GDPR compliant |
| ExampleTenant1 | Education | Starter | UK | 💰 | $12/mo | £9/mo | 20% | N | GDPR compliant |
| ExampleTenant1 | Education | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | GDPR, MTD VAT |
| ExampleTenant1 | Education | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Full GDPR suite |
| ExampleTenant1 | Clinic | Free | UK | ❌ | - | - | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Starter | UK | ❌ | - | - | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Pro | UK | 💰 | $25/mo | £20/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Free | UK | ✅ | $0/mo | £0/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Starter | UK | ✅ | $29/mo | £23/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | PG/Hostel | Free | UK | ✅ | $0/mo | £0/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | PG/Hostel | Starter | UK | ✅ | $29/mo | £23/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | PG/Hostel | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | PG/Hostel | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | Salon | Free | UK | ✅ | $0/mo | £0/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Salon | Starter | UK | ✅ | $29/mo | £23/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Salon | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | Salon | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | Gym | Free | UK | ✅ | $0/mo | £0/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Gym | Starter | UK | ✅ | $29/mo | £23/mo | 20% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Gym | Pro | UK | ✅ | $99/mo | £77/mo | 20% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | Gym | Enterprise | UK | ✅ | $299/mo | £233/mo | 20% | All | Mobile 🟡 Scaffold |

---

## MALAYSIA (MYR, SST 6%)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | Malaysia | ❌ | - | - | 6% | N | Billplz gateway |
| ExampleTenant1 | Furniture | Starter | Malaysia | 💰 | $15/mo | RM 68/mo | 6% | N | Billplz gateway |
| ExampleTenant1 | Furniture | Pro | Malaysia | ✅ | $99/mo | RM 448/mo | 6% | Multi-Currency | Billplz gateway |
| ExampleTenant1 | Furniture | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Billplz gateway |
| ExampleTenant1 | HRMS | Free | Malaysia | ❌ | - | - | 6% | N | Billplz gateway |
| ExampleTenant1 | HRMS | Starter | Malaysia | ✅ | $29/mo | RM 131/mo | 6% | N | Billplz gateway |
| ExampleTenant1 | HRMS | Pro | Malaysia | ✅ | $99/mo | RM 448/mo | 6% | Multi-Currency | Billplz gateway |
| ExampleTenant1 | HRMS | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Billplz gateway |
| ExampleTenant1 | Legal | Free | Malaysia | ❌ | - | - | 6% | N | Billplz gateway |
| ExampleTenant1 | Legal | Starter | Malaysia | 💰 | $12/mo | RM 54/mo | 6% | N | Billplz gateway |
| ExampleTenant1 | Legal | Pro | Malaysia | ✅ | $99/mo | RM 448/mo | 6% | Multi-Currency | Billplz gateway |
| ExampleTenant1 | Legal | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Billplz gateway |
| ExampleTenant1 | Education | Free | Malaysia | ❌ | - | - | 6% | N | Billplz gateway |
| ExampleTenant1 | Education | Starter | Malaysia | 💰 | $12/mo | RM 54/mo | 6% | N | Billplz gateway |
| ExampleTenant1 | Education | Pro | Malaysia | ✅ | $99/mo | RM 448/mo | 6% | Multi-Currency | Billplz gateway |
| ExampleTenant1 | Education | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Billplz gateway |
| ExampleTenant1 | Clinic | Free | Malaysia | ❌ | - | - | 6% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Starter | Malaysia | ❌ | - | - | 6% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Pro | Malaysia | 💰 | $25/mo | RM 113/mo | 6% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Free | Malaysia | ✅ | $0/mo | RM 0/mo | 6% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Starter | Malaysia | ✅ | $29/mo | RM 131/mo | 6% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Pro | Malaysia | ✅ | $99/mo | RM 448/mo | 6% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Enterprise | Malaysia | ✅ | $299/mo | RM 1,352/mo | 6% | All | Mobile 🟡 Scaffold |

---

## US (USD, Sales Tax 0-10%*)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | US | ❌ | - | - | 0-10%* | N | Stripe gateway |
| ExampleTenant1 | Furniture | Starter | US | 💰 | $15/mo | $15/mo | 0-10%* | N | Stripe gateway |
| ExampleTenant1 | Furniture | Pro | US | ✅ | $99/mo | $99/mo | 0-10%* | Multi-Currency | Stripe gateway |
| ExampleTenant1 | Furniture | Enterprise | US | ✅ | $299/mo | $299/mo | 0-10%* | All | Stripe gateway |
| ExampleTenant1 | HRMS | Free | US | ❌ | - | - | 0-10%* | N | Stripe gateway |
| ExampleTenant1 | HRMS | Starter | US | ✅ | $29/mo | $29/mo | 0-10%* | N | Stripe gateway |
| ExampleTenant1 | HRMS | Pro | US | ✅ | $99/mo | $99/mo | 0-10%* | Multi-Currency | Stripe gateway |
| ExampleTenant1 | HRMS | Enterprise | US | ✅ | $299/mo | $299/mo | 0-10%* | All | Stripe gateway |
| ExampleTenant1 | Clinic | Free | US | ❌ | - | - | 0-10%* | N | HIPAA - Enterprise only |
| ExampleTenant1 | Clinic | Starter | US | ❌ | - | - | 0-10%* | N | HIPAA - Enterprise only |
| ExampleTenant1 | Clinic | Pro | US | 💰 | $25/mo | $25/mo | 0-10%* | N | HIPAA gap, Mobile 🟡 |
| ExampleTenant1 | Clinic | Enterprise | US | ✅ | $299/mo | $299/mo | 0-10%* | All | HIPAA ready, Mobile 🟡 |

*Sales tax varies by state (nexus-based calculation)

---

## SINGAPORE (SGD, GST 8%)

| Tenant | Module | Tier | Country | Access | Price (USD) | Price (Local) | Tax | Premium | Notes |
|--------|--------|------|---------|--------|-------------|---------------|-----|---------|-------|
| ExampleTenant1 | Furniture | Free | Singapore | ❌ | - | - | 8% | N | Stripe gateway |
| ExampleTenant1 | Furniture | Starter | Singapore | 💰 | $15/mo | S$20/mo | 8% | N | Stripe gateway |
| ExampleTenant1 | Furniture | Pro | Singapore | ✅ | $99/mo | S$134/mo | 8% | Multi-Currency | Stripe gateway |
| ExampleTenant1 | Furniture | Enterprise | Singapore | ✅ | $299/mo | S$404/mo | 8% | All | Stripe gateway |
| ExampleTenant1 | HRMS | Free | Singapore | ❌ | - | - | 8% | N | Stripe gateway |
| ExampleTenant1 | HRMS | Starter | Singapore | ✅ | $29/mo | S$39/mo | 8% | N | Stripe gateway |
| ExampleTenant1 | HRMS | Pro | Singapore | ✅ | $99/mo | S$134/mo | 8% | Multi-Currency | Stripe gateway |
| ExampleTenant1 | HRMS | Enterprise | Singapore | ✅ | $299/mo | S$404/mo | 8% | All | Stripe gateway |
| ExampleTenant1 | Clinic | Free | Singapore | ❌ | - | - | 8% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Starter | Singapore | ❌ | - | - | 8% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Pro | Singapore | 💰 | $25/mo | S$34/mo | 8% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Clinic | Enterprise | Singapore | ✅ | $299/mo | S$404/mo | 8% | All | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Free | Singapore | ✅ | $0/mo | S$0/mo | 8% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Starter | Singapore | ✅ | $29/mo | S$39/mo | 8% | N | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Pro | Singapore | ✅ | $99/mo | S$134/mo | 8% | Multi-Currency | Mobile 🟡 Scaffold |
| ExampleTenant1 | Coworking | Enterprise | Singapore | ✅ | $299/mo | S$404/mo | 8% | All | Mobile 🟡 Scaffold |

---

# PART 2: ONBOARDING FLOW DOCUMENTATION

## 2.1 Tenant Registration Flow

### Flow Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TENANT REGISTRATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
    │  STEP 1  │────▶│   STEP 2     │────▶│   STEP 3    │────▶│   STEP 4     │
    │ Business │     │ Admin Account│     │ Subscription│     │ Verification │
    │  Details │     │   Creation   │     │  Selection  │     │  (OTP/Email) │
    └──────────┘     └──────────────┘     └─────────────┘     └──────────────┘
         │                  │                    │                    │
         ▼                  ▼                    ▼                    ▼
    ┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
    │• Name    │     │• First Name  │     │• Free       │     │• Email OTP   │
    │• Industry│     │• Last Name   │     │• Starter    │     │• WhatsApp OTP│
    │• Address │     │• Email       │     │• Pro        │     │• Resend      │
    │• Country │     │• Password    │     │• Enterprise │     │              │
    │• Phone   │     │• Phone       │     │• Add-ons    │     │              │
    └──────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                 │
                                                 ▼
    ┌──────────────┐     ┌──────────────┐     ┌─────────────────────────────────┐
    │   STEP 5     │◀────│   STEP 6     │◀────│          STEP 7                 │
    │   Payment    │     │ Module Setup │     │     Dashboard Access            │
    └──────────────┘     └──────────────┘     └─────────────────────────────────┘
         │                    │                              │
         ▼                    ▼                              ▼
    ┌──────────┐     ┌──────────────┐     ┌─────────────────────────────────────┐
    │• Gateway │     │• Business-   │     │• Onboarding wizard                  │
    │• Invoice │     │  specific    │     │• Module dashboards                  │
    │• Tax     │     │  configuration│    │• Invite users                       │
    │• Multi-  │     │• Sample data │     │• Customer portal setup              │
    │  currency│     │  import      │     │                                     │
    └──────────┘     └──────────────┘     └─────────────────────────────────────┘
```

### Step-by-Step Screens

| Step | Screen Name | Components | Validation | Backend API |
|------|-------------|------------|------------|-------------|
| 1 | Business Details | Input (businessName), Select (businessType), Select (country), Input (address), Input (phone) | Required fields, valid phone format | `POST /api/auth/register` |
| 2 | Admin Account | Input (firstName, lastName), Input (email), PasswordInput, PasswordConfirm | Email format, password strength (8+ chars, uppercase, number) | `POST /api/auth/register` |
| 3 | Subscription | RadioGroup (tier), Checkbox (addons), PriceDisplay | Valid tier selection | `POST /api/subscriptions/assign` |
| 4 | Verification | OTPInput (6 digits), Button (resend), Timer | Valid OTP, not expired | `POST /api/auth/verify-otp` |
| 5 | Payment | CardInput, Select (currency), TaxDisplay | Valid payment method | `POST /api/payments/checkout` |
| 6 | Module Setup | Wizard steps per business type, FileUpload (logo) | Business-specific validation | `POST /api/onboarding/step/:stepKey` |
| 7 | Dashboard | DashboardLayout, ModuleCards, QuickActions | - | `GET /api/dashboard` |

---

## 2.2 Customer Registration Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER REGISTRATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

    METHOD A: INVITE-BASED                    METHOD B: SELF-REGISTRATION
    ─────────────────────────                 ─────────────────────────────

    ┌──────────────┐                          ┌──────────────┐
    │ Admin sends  │                          │ Customer     │
    │ invite email │                          │ visits portal│
    └──────┬───────┘                          └──────┬───────┘
           │                                         │
           ▼                                         ▼
    ┌──────────────┐                          ┌──────────────┐
    │ Customer     │                          │ Self-signup  │
    │ clicks link  │                          │ form         │
    └──────┬───────┘                          └──────┬───────┘
           │                                         │
           ▼                                         ▼
    ┌──────────────┐                          ┌──────────────┐
    │ Set password │                          │ Email/Phone  │
    │ form         │                          │ verification │
    └──────┬───────┘                          └──────┬───────┘
           │                                         │
           └─────────────────┬───────────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Portal       │
                      │ Dashboard    │
                      └──────────────┘
```

### Customer Registration Screens

| Step | Screen | Components | Backend API |
|------|--------|------------|-------------|
| 1a | Invite Email | - (sent by admin) | `POST /api/portal/invite` |
| 1b | Self-Registration | Input (name, email, phone) | `POST /api/portal/self-register` |
| 2 | Password Setup | PasswordInput, PasswordConfirm | `POST /api/portal/register` |
| 3 | Verification | OTPInput (email/phone) | `POST /api/portal/verify` |
| 4 | Profile Setup | Avatar upload, preferences | `PUT /api/portal/profile` |
| 5 | Dashboard | Appointments, Invoices, History | `GET /api/portal/dashboard` |

---

## 2.3 User (Employee) Registration Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           USER REGISTRATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ HR/Admin     │────▶│ User receives│────▶│ User sets    │────▶│ User         │
    │ invites user │     │ invite email │     │ password     │     │ dashboard    │
    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
           │                    │                    │                    │
           ▼                    ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │• Select role │     │• Welcome     │     │• Password    │     │• Module      │
    │• Department  │     │• Business    │     │• Confirm     │     │  access      │
    │• Permissions │     │  name shown  │     │• Profile pic │     │• RBAC        │
    │• Email/Phone │     │              │     │• Documents   │     │  enforced    │
    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### User Registration Screens

| Step | Screen | Components | Backend API |
|------|--------|------------|-------------|
| 1 | Invite User | Select (role), Select (department), Input (email), Input (phone) | `POST /api/users/invite` |
| 2 | Email Verification | - (auto-sent) | - |
| 3 | Set Password | PasswordInput, Avatar upload, FileUpload (documents) | `POST /api/users/accept-invite` |
| 4 | Profile Complete | ProfileForm (name, bio, timezone) | `PUT /api/users/:id/profile` |
| 5 | Dashboard | ModuleCards, QuickActions (based on permissions) | `GET /api/dashboard` |

---

# PART 3: BACKEND INTEGRATION TABLE

## 3.1 Database Tables Used

| Table | Purpose | Onboarding Step |
|-------|---------|-----------------|
| `tenants` | Store tenant business details | Step 1 (Business Details) |
| `users` | Store admin and user accounts | Step 2 (Admin Creation), User Invite |
| `tenant_subscriptions` | Link tenant to subscription plan | Step 3 (Subscription) |
| `global_pricing_plans` | Available subscription plans | Step 3 (Plan Selection) |
| `country_pricing_configs` | Country-specific pricing | Step 3 & 5 (Pricing/Payment) |
| `customers` | Customer portal accounts | Customer Registration |
| `customer_portal_invites` | Invite tokens for customers | Customer Invite |
| `roles` | Role definitions | User RBAC |
| `permissions` | Permission definitions | User RBAC |
| `user_permissions` | User-role assignments | User RBAC |
| `otp_logs` | OTP verification tracking | Step 4 (Verification) |
| `audit_logs` | All action tracking | Every step |
| `notifications` | Notification history | Email/WhatsApp triggers |
| `exchange_rates` | Currency conversion | Multi-currency pricing |
| `onboarding_flows` | Business-type specific flows | Step 6 (Module Setup) |
| `onboarding_progress` | User progress tracking | All steps |

---

## 3.2 API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/auth/register` | POST | New tenant + admin signup | Public |
| `/api/auth/verify-otp` | POST | OTP verification | Public |
| `/api/auth/login` | POST | User login | Public |
| `/api/auth/refresh` | POST | Token refresh | JWT |
| `/api/subscriptions/plans` | GET | List available plans | Public |
| `/api/subscriptions/assign` | POST | Assign plan to tenant | Admin |
| `/api/subscriptions/current` | GET | Get tenant subscription | JWT |
| `/api/onboarding/status` | GET | Get onboarding progress | JWT |
| `/api/onboarding/initialize` | POST | Start onboarding flow | JWT |
| `/api/onboarding/step/:key` | POST | Save step data | JWT |
| `/api/onboarding/advance` | POST | Move to next step | JWT |
| `/api/users/invite` | POST | Invite user | Admin |
| `/api/users/accept-invite` | POST | Accept invite, set password | Public |
| `/api/portal/invite` | POST | Invite customer | Admin |
| `/api/portal/register` | POST | Customer set password | Public |
| `/api/portal/self-register` | POST | Customer self-signup | Public |
| `/api/payments/checkout` | POST | Process payment | JWT |
| `/api/notifications/send` | POST | Send notification | System |

---

## 3.3 Notification Triggers

| Event | Email | WhatsApp | In-App |
|-------|-------|----------|--------|
| Tenant registered | ✅ Welcome email | ✅ Welcome message | ✅ |
| Admin created | ✅ Credentials email | ✅ | ✅ |
| OTP requested | ✅ OTP code | ✅ OTP code | - |
| Subscription activated | ✅ Receipt | ✅ Confirmation | ✅ |
| User invited | ✅ Invite link | ✅ | - |
| Customer invited | ✅ Invite link | ✅ | - |
| Payment successful | ✅ Invoice | ✅ | ✅ |
| Payment failed | ✅ Retry notice | ✅ | ✅ |

---

# PART 4: FLUTTER MOBILE MODULE SPECIFICATIONS

## 4.1 Tier 2 Modules - Implementation Status

| Module | BLoC | Repository | API Integration | Offline | Status |
|--------|------|------------|-----------------|---------|--------|
| Clinic/Healthcare | 🟡 Scaffold | 🟡 | 🟡 | ❌ | **Needs full implementation** |
| Coworking | 🟡 Scaffold | 🟡 | 🟡 | ❌ | **Needs full implementation** |
| PG/Hostel | 🟡 Scaffold | 🟡 | 🟡 | ❌ | **Needs full implementation** |
| Salon/Spa | 🟡 Scaffold | 🟡 | 🟡 | ❌ | **Needs full implementation** |
| Gym/Fitness | 🟡 Scaffold | 🟡 | 🟡 | ❌ | **Needs full implementation** |

## 4.2 Required Screens per Tier 2 Module

### Clinic/Healthcare
| Screen | Priority | Components |
|--------|----------|------------|
| Patient Dashboard | High | PatientList, SearchBar, Filters |
| Patient Detail | High | ProfileCard, MedicalHistory, Appointments |
| Appointment Booking | High | Calendar, TimeSlots, DoctorSelect |
| EMR View | Medium | MedicalRecords, Prescriptions, LabTests |
| Billing | Medium | InvoiceList, PaymentForm |

### Coworking
| Screen | Priority | Components |
|--------|----------|------------|
| Space Dashboard | High | SpaceGrid, OccupancyStats |
| Desk Booking | High | FloorPlan, DeskSelector, DatePicker |
| Meeting Rooms | High | RoomList, TimeSlots, Booking |
| Membership | Medium | PlanCards, SubscriptionStatus |
| Access Control | Low | QRScanner, AccessLog |

### PG/Hostel
| Screen | Priority | Components |
|--------|----------|------------|
| Room Dashboard | High | RoomGrid, OccupancyStats |
| Tenant Management | High | TenantList, ProfileCard |
| Rent Collection | High | PaymentList, DueReminders |
| Maintenance | Medium | RequestList, StatusTracking |
| Move-in/out | Medium | ChecklistForm, DocumentUpload |

### Salon/Spa
| Screen | Priority | Components |
|--------|----------|------------|
| Service Dashboard | High | ServiceGrid, QuickBook |
| Appointment Book | High | Calendar, StaffSelector, ServicePicker |
| Staff Schedule | High | WeekView, ShiftCards |
| Customer Profile | Medium | History, Preferences |
| POS/Billing | Medium | ServiceCart, PaymentMethods |

### Gym/Fitness
| Screen | Priority | Components |
|--------|----------|------------|
| Member Dashboard | High | MemberList, AttendanceStats |
| Membership Plans | High | PlanCards, PricingTable |
| Attendance | High | CheckInScanner, AttendanceLog |
| Class Schedule | Medium | WeekView, ClassCards |
| Payments | Medium | DueList, PaymentHistory |

---

## 4.3 Flutter Architecture (BLoC Pattern)

```dart
// Example: Clinic Module BLoC Structure

// 1. Events
abstract class ClinicEvent {}
class LoadPatients extends ClinicEvent {}
class SearchPatients extends ClinicEvent { final String query; }
class BookAppointment extends ClinicEvent { final AppointmentRequest data; }

// 2. States
abstract class ClinicState {}
class ClinicLoading extends ClinicState {}
class PatientsLoaded extends ClinicState { final List<Patient> patients; }
class ClinicError extends ClinicState { final String message; }

// 3. BLoC
class ClinicBloc extends Bloc<ClinicEvent, ClinicState> {
  final ClinicRepository repository;
  
  ClinicBloc(this.repository) : super(ClinicLoading()) {
    on<LoadPatients>(_onLoadPatients);
    on<SearchPatients>(_onSearchPatients);
    on<BookAppointment>(_onBookAppointment);
  }
}

// 4. Repository
class ClinicRepository {
  final ApiClient apiClient;
  final HiveBox<Patient> localCache;
  
  Future<List<Patient>> getPatients() async {
    try {
      final patients = await apiClient.get('/clinic/patients');
      await localCache.putAll(patients); // Offline cache
      return patients;
    } catch (e) {
      return localCache.values.toList(); // Fallback to cache
    }
  }
}
```

---

# PART 5: UX RECOMMENDATIONS

## 5.1 Reduce Drop-offs

| Issue | Solution | Impact |
|-------|----------|--------|
| Long forms | Split into multi-step wizard with progress bar | -30% drop-off |
| Unclear errors | Inline validation with specific error messages | -20% drop-off |
| No save progress | Auto-save to localStorage/Hive every 5 seconds | -25% drop-off |
| Complex pricing | Show price summary with tax breakdown before payment | -15% drop-off |
| OTP expiry | Show countdown timer, easy resend button | -10% drop-off |

## 5.2 Mobile vs Web Differences

| Feature | Web | Flutter Mobile |
|---------|-----|----------------|
| Form layout | Multi-column | Single column |
| File upload | Drag & drop + button | Camera + gallery picker |
| OTP input | 6 separate boxes | OTP auto-read from SMS |
| Payment | Full card form | Apple Pay / Google Pay first |
| Navigation | Sidebar + breadcrumbs | Bottom nav + back gestures |
| Notifications | Toast + bell icon | Push notifications |
| Offline | Limited (service worker) | Full offline with sync |

## 5.3 Success Metrics

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Registration completion rate | 80% | 65%* | 15% |
| Time to first dashboard | < 5 min | 8 min* | 3 min |
| OTP verification success | 95% | 88%* | 7% |
| User invite acceptance | 70% | 55%* | 15% |
| Customer portal activation | 60% | 45%* | 15% |

*Estimated based on typical SaaS benchmarks

---

# PART 6: TEST VERIFICATION MATRIX

## 6.1 Module × Screen Test Results

| Module | Screen | Web | Flutter | API | Issue |
|--------|--------|-----|---------|-----|-------|
| Furniture | Dashboard | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Furniture | CRUD | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Furniture | Forms | ✅ PASS | ✅ PASS | ✅ PASS | - |
| HRMS | Dashboard | ✅ PASS | ✅ PASS | ✅ PASS | - |
| HRMS | Employees | ✅ PASS | ✅ PASS | ✅ PASS | - |
| HRMS | Attendance | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Legal | Dashboard | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Legal | Cases | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Education | Dashboard | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Clinic | Dashboard | ✅ PASS | 🟡 SCAFFOLD | ✅ PASS | Mobile needs implementation |
| Coworking | Dashboard | ✅ PASS | 🟡 SCAFFOLD | ✅ PASS | Mobile needs implementation |
| PG/Hostel | Dashboard | ✅ PASS | 🟡 SCAFFOLD | ✅ PASS | Mobile needs implementation |
| Salon | Dashboard | ✅ PASS | 🟡 SCAFFOLD | ✅ PASS | Mobile needs implementation |
| Gym | Dashboard | ✅ PASS | 🟡 SCAFFOLD | ✅ PASS | Mobile needs implementation |
| Onboarding | Tenant Signup | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Onboarding | User Invite | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Onboarding | Customer Portal | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Subscriptions | Gating | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Notifications | Email | ✅ PASS | ✅ PASS | ✅ PASS | - |
| Notifications | WhatsApp | ✅ PASS | ✅ PASS | ✅ PASS | - |

---

## 6.2 Subscription Enforcement Tests

| Tenant Tier | Module Tested | Expected | Actual | Status |
|-------------|---------------|----------|--------|--------|
| Free | Furniture | ❌ Blocked | ❌ Blocked | ✅ PASS |
| Free | Salon | ✅ Allowed | ✅ Allowed | ✅ PASS |
| Starter | Furniture | 💰 Add-on prompt | 💰 Add-on prompt | ✅ PASS |
| Starter | HRMS | ✅ Allowed | ✅ Allowed | ✅ PASS |
| Pro | All Tier 1 | ✅ Allowed | ✅ Allowed | ✅ PASS |
| Pro | Clinic | 💰 Add-on prompt | 💰 Add-on prompt | ✅ PASS |
| Enterprise | All modules | ✅ Allowed | ✅ Allowed | ✅ PASS |
| Enterprise | AI Insights | ✅ Allowed | ✅ Allowed | ✅ PASS |
| Enterprise | White-Label | ✅ Allowed | ✅ Allowed | ✅ PASS |

---

**Document End**

**Prepared By**: Platform System Audit  
**Review Required By**: Platform Owner, Engineering Manager, UX Lead  
**Next Review Date**: February 09, 2026
