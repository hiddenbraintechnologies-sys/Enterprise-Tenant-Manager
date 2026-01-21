import { db } from "../db";
import { addons, addonVersions, addonPricing } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AddonSeedData {
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: "analytics" | "automation" | "billing" | "booking" | "communication" | "compliance" | "crm" | "healthcare" | "integration" | "inventory" | "marketing" | "payments" | "reporting" | "scheduling" | "security" | "utilities";
  supportedCountries: string[];
  supportedBusinessTypes: string[];
  tags: string[];
  featured: boolean;
  featuredOrder?: number;
  pricing: {
    name: string;
    pricingType: "free" | "one_time" | "monthly" | "yearly" | "usage_based";
    prices: { currency: string; price: number; unit?: string }[];
    trialDays?: number;
    features?: string[];
  }[];
}

const PHASE1_ADDONS: AddonSeedData[] = [
  {
    slug: "payroll-india",
    name: "Payroll (India)",
    shortDescription: "Complete payroll management with EPF, ESI, and TDS compliance",
    fullDescription: `Comprehensive payroll solution designed for Indian businesses:
    
• Automatic EPF, ESI, and Professional Tax calculations
• TDS computation and Form 16 generation
• Salary slip generation with customizable templates
• Bank file generation for salary disbursement
• PF ECR file generation
• Leave encashment and bonus calculations
• Statutory compliance reports`,
    category: "compliance",
    supportedCountries: ["IN"],
    supportedBusinessTypes: [],
    tags: ["payroll", "compliance", "india", "epf", "esi", "tds"],
    featured: true,
    featuredOrder: 1,
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 49, unit: "per employee" },
        ],
        trialDays: 14,
        features: ["EPF/ESI calculations", "Salary slips", "Bank files", "TDS reports"],
      },
    ],
  },
  {
    slug: "payroll-malaysia",
    name: "Payroll (Malaysia)",
    shortDescription: "EPF, SOCSO, and EIS compliant payroll for Malaysian businesses",
    fullDescription: `Complete payroll solution for Malaysian businesses:
    
• EPF, SOCSO, and EIS automatic deductions
• PCB/MTD tax calculations
• EA Form generation
• HRDF contributions
• Bank file generation (Maybank, CIMB, etc.)
• Statutory compliance reports
• Leave management integration`,
    category: "compliance",
    supportedCountries: ["MY"],
    supportedBusinessTypes: [],
    tags: ["payroll", "compliance", "malaysia", "epf", "socso", "eis"],
    featured: true,
    featuredOrder: 2,
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "MYR", price: 15, unit: "per employee" },
        ],
        trialDays: 14,
        features: ["EPF/SOCSO/EIS", "PCB calculations", "EA Forms", "Bank files"],
      },
    ],
  },
  {
    slug: "payroll-uk",
    name: "Payroll (UK)",
    shortDescription: "PAYE, NIC, and pension compliant payroll for UK businesses",
    fullDescription: `HMRC-compliant payroll solution for UK businesses:
    
• PAYE and National Insurance calculations
• Auto-enrolment pension management
• RTI submissions to HMRC
• P60 and P45 generation
• Student loan deductions
• Statutory sick pay and maternity pay
• BACS file generation`,
    category: "compliance",
    supportedCountries: ["UK"],
    supportedBusinessTypes: [],
    tags: ["payroll", "compliance", "uk", "paye", "nic", "pension"],
    featured: true,
    featuredOrder: 3,
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "GBP", price: 3, unit: "per employee" },
        ],
        trialDays: 14,
        features: ["PAYE/NIC", "Auto-enrolment", "RTI submissions", "P60/P45"],
      },
    ],
  },
  {
    slug: "whatsapp-automation",
    name: "WhatsApp Automation",
    shortDescription: "Automated WhatsApp notifications and customer communication",
    fullDescription: `Powerful WhatsApp automation for business communication:
    
• Booking confirmations and reminders
• Invoice and payment notifications
• Appointment reminders
• Custom template messages
• Bulk messaging campaigns
• Two-way customer chat
• Message analytics and tracking`,
    category: "communication",
    supportedCountries: ["IN", "MY", "UK", "US", "AE"],
    supportedBusinessTypes: [],
    tags: ["whatsapp", "automation", "notifications", "messaging"],
    featured: true,
    featuredOrder: 4,
    pricing: [
      {
        name: "Standard",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 799 },
          { currency: "MYR", price: 39 },
          { currency: "GBP", price: 15 },
          { currency: "USD", price: 19 },
        ],
        trialDays: 7,
        features: ["1000 messages/month", "Booking reminders", "Invoice notifications", "Custom templates"],
      },
    ],
  },
  {
    slug: "advanced-analytics",
    name: "Advanced Analytics",
    shortDescription: "Deep business insights with custom reports and dashboards",
    fullDescription: `Comprehensive analytics for data-driven decisions:
    
• Custom dashboard builder
• Revenue forecasting
• Customer behavior analysis
• Staff performance metrics
• Inventory turnover reports
• Trend analysis and predictions
• Export to Excel/PDF
• Scheduled report delivery`,
    category: "analytics",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["analytics", "reports", "dashboards", "insights"],
    featured: true,
    featuredOrder: 5,
    pricing: [
      {
        name: "Standard",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 499 },
          { currency: "MYR", price: 25 },
          { currency: "GBP", price: 10 },
          { currency: "USD", price: 12 },
        ],
        features: ["Custom dashboards", "Revenue forecasting", "Export reports", "Scheduled delivery"],
      },
    ],
  },
  {
    slug: "extra-users",
    name: "Extra Users",
    shortDescription: "Add more team members beyond your plan limit",
    fullDescription: `Expand your team without upgrading your plan:
    
• Add users in packs of 5
• Same permissions as plan users
• No feature restrictions
• Instant activation
• Prorated billing`,
    category: "utilities",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["users", "team", "seats", "expansion"],
    featured: false,
    pricing: [
      {
        name: "5 Users Pack",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 199, unit: "per 5 users" },
          { currency: "MYR", price: 10, unit: "per 5 users" },
          { currency: "GBP", price: 4, unit: "per 5 users" },
          { currency: "USD", price: 5, unit: "per 5 users" },
        ],
        features: ["5 additional user seats", "Full feature access", "Instant activation"],
      },
    ],
  },
  {
    slug: "extra-storage",
    name: "Extra Storage",
    shortDescription: "Additional file storage for documents and media",
    fullDescription: `Expand your storage capacity:
    
• Add storage in 10GB increments
• Store documents, images, and files
• Secure cloud storage
• Automatic backup
• No file type restrictions`,
    category: "utilities",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["storage", "files", "documents", "cloud"],
    featured: false,
    pricing: [
      {
        name: "10GB Pack",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 99, unit: "per 10GB" },
          { currency: "MYR", price: 5, unit: "per 10GB" },
          { currency: "GBP", price: 2, unit: "per 10GB" },
          { currency: "USD", price: 2.50, unit: "per 10GB" },
        ],
        features: ["10GB additional storage", "Secure cloud storage", "Automatic backup"],
      },
    ],
  },
  {
    slug: "gst-filing-india",
    name: "GST Filing Pack",
    shortDescription: "Automated GST return preparation and filing for India",
    fullDescription: `Complete GST compliance solution:
    
• GSTR-1, GSTR-3B auto-generation
• HSN/SAC code management
• E-way bill generation
• Input tax credit reconciliation
• GSTR-2A/2B matching
• GST audit reports
• Multi-GSTIN support`,
    category: "compliance",
    supportedCountries: ["IN"],
    supportedBusinessTypes: [],
    tags: ["gst", "tax", "compliance", "india", "filing"],
    featured: true,
    featuredOrder: 6,
    pricing: [
      {
        name: "Standard",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 499 },
        ],
        features: ["GSTR-1/3B generation", "E-way bills", "ITC reconciliation", "Audit reports"],
      },
    ],
  },
  {
    slug: "document-management",
    name: "Document Management",
    shortDescription: "Organize, store, and share business documents securely",
    fullDescription: `Professional document management system:
    
• Folder organization
• Version control
• Document templates
• E-signature integration
• Secure sharing links
• Access permissions
• Full-text search
• Audit trail`,
    category: "utilities",
    supportedCountries: [],
    supportedBusinessTypes: ["legal", "healthcare", "service"],
    tags: ["documents", "files", "storage", "organization"],
    featured: false,
    pricing: [
      {
        name: "Standard",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 299 },
          { currency: "MYR", price: 15 },
          { currency: "GBP", price: 6 },
          { currency: "USD", price: 7 },
        ],
        features: ["Unlimited documents", "Version control", "E-signatures", "Secure sharing"],
      },
    ],
  },
  {
    slug: "multi-branch",
    name: "Multi-Branch Support",
    shortDescription: "Manage multiple locations from a single dashboard",
    fullDescription: `Centralized multi-location management:
    
• Branch-wise reporting
• Centralized inventory
• Staff allocation across branches
• Cross-branch bookings
• Consolidated analytics
• Branch-specific settings
• Inter-branch transfers`,
    category: "utilities",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["branches", "locations", "multi-location", "expansion"],
    featured: false,
    pricing: [
      {
        name: "Per Branch",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 999, unit: "per branch" },
          { currency: "MYR", price: 49, unit: "per branch" },
          { currency: "GBP", price: 20, unit: "per branch" },
          { currency: "USD", price: 25, unit: "per branch" },
        ],
        features: ["Unlimited branches", "Centralized management", "Cross-branch analytics"],
      },
    ],
  },
  {
    slug: "api-access",
    name: "API Access",
    shortDescription: "Programmatic access to your business data",
    fullDescription: `Full API access for developers:
    
• RESTful API endpoints
• Webhook integrations
• API key management
• Rate limit: 10,000 requests/day
• Comprehensive documentation
• Sandbox environment
• Technical support`,
    category: "integration",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["api", "integration", "developers", "automation"],
    featured: false,
    pricing: [
      {
        name: "Developer",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 499 },
          { currency: "MYR", price: 25 },
          { currency: "GBP", price: 10 },
          { currency: "USD", price: 12 },
        ],
        features: ["10,000 API calls/day", "Webhooks", "Sandbox access", "Tech support"],
      },
    ],
  },
];

export async function seedMarketplaceAddons(): Promise<void> {
  console.log("[marketplace-addons] Seeding Phase 1 add-ons...");

  for (const addonData of PHASE1_ADDONS) {
    try {
      const [existing] = await db.select().from(addons).where(eq(addons.slug, addonData.slug));

      let addonId: string;

      if (existing) {
        await db.update(addons)
          .set({
            name: addonData.name,
            shortDescription: addonData.shortDescription,
            fullDescription: addonData.fullDescription,
            category: addonData.category,
            supportedCountries: addonData.supportedCountries,
            supportedBusinessTypes: addonData.supportedBusinessTypes,
            tags: addonData.tags,
            featured: addonData.featured,
            featuredOrder: addonData.featuredOrder,
            status: "published",
            developerName: "MyBizStream",
            updatedAt: new Date(),
            publishedAt: new Date(),
          })
          .where(eq(addons.id, existing.id));
        addonId = existing.id;
        console.log(`[marketplace-addons] Updated: ${addonData.name}`);
      } else {
        const [newAddon] = await db.insert(addons)
          .values({
            slug: addonData.slug,
            name: addonData.name,
            shortDescription: addonData.shortDescription,
            fullDescription: addonData.fullDescription,
            category: addonData.category,
            supportedCountries: addonData.supportedCountries,
            supportedBusinessTypes: addonData.supportedBusinessTypes,
            tags: addonData.tags,
            featured: addonData.featured,
            featuredOrder: addonData.featuredOrder,
            status: "published",
            developerName: "MyBizStream",
            publishedAt: new Date(),
          })
          .returning();
        addonId = newAddon.id;
        console.log(`[marketplace-addons] Created: ${addonData.name}`);
      }

      const [existingVersion] = await db.select()
        .from(addonVersions)
        .where(eq(addonVersions.addonId, addonId));

      let versionId: string;
      if (!existingVersion) {
        const [newVersion] = await db.insert(addonVersions)
          .values({
            addonId,
            version: "1.0.0",
            semverMajor: 1,
            semverMinor: 0,
            semverPatch: 0,
            isStable: true,
            isLatest: true,
            releaseNotes: "Initial release",
            publishedAt: new Date(),
          })
          .returning();
        versionId = newVersion.id;
      } else {
        versionId = existingVersion.id;
      }

      for (const pricingData of addonData.pricing) {
        for (const priceInfo of pricingData.prices) {
          const [existingPricing] = await db.select()
            .from(addonPricing)
            .where(eq(addonPricing.addonId, addonId));

          const pricingValues = {
            addonId,
            name: pricingData.name,
            pricingType: pricingData.pricingType,
            price: priceInfo.price.toString(),
            currency: priceInfo.currency,
            billingPeriod: pricingData.pricingType === "monthly" ? "month" : pricingData.pricingType === "yearly" ? "year" : null,
            trialDays: pricingData.trialDays || null,
            features: pricingData.features || [],
            isDefault: priceInfo.currency === "INR",
            isActive: true,
          };

          const existingForCurrency = await db.select()
            .from(addonPricing)
            .where(eq(addonPricing.addonId, addonId));

          const matchingPricing = existingForCurrency.find(p => p.currency === priceInfo.currency);

          if (matchingPricing) {
            await db.update(addonPricing)
              .set(pricingValues)
              .where(eq(addonPricing.id, matchingPricing.id));
          } else {
            await db.insert(addonPricing).values(pricingValues);
          }
        }
      }
    } catch (error) {
      console.error(`[marketplace-addons] Error seeding ${addonData.slug}:`, error);
    }
  }

  console.log("[marketplace-addons] Phase 1 add-ons seeded successfully");
}
