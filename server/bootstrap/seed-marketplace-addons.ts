import { db } from "../db";
import { addons, addonVersions, addonPricing, addonCountryConfig, addonPlanEligibility } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
  requiredPlanTier: "free" | "basic" | "pro";
  allowedRoles?: string[];
  pricing: {
    name: string;
    pricingType: "free" | "one_time" | "monthly" | "yearly" | "usage_based";
    prices: { currency: string; price: number; unit?: string }[];
    trialDays?: number;
    features?: string[];
  }[];
}

const PHASE1_ADDONS: AddonSeedData[] = [
  // HRMS Add-ons - Per Employee Pricing (Basic plan required)
  {
    slug: "hrms-india",
    name: "HRMS (India)",
    shortDescription: "Complete HR management with employee records, attendance, and leave tracking",
    fullDescription: `Comprehensive HRMS solution designed for Indian businesses:
    
• Employee master database with document management
• Attendance tracking with biometric integration
• Leave management with customizable policies
• Timesheet management for projects
• Employee self-service portal
• Org chart and reporting hierarchy
• HR analytics and reports
• Statutory compliance ready (Shops & Est. Act)`,
    category: "compliance",
    supportedCountries: ["IN"],
    supportedBusinessTypes: [],
    tags: ["hrms", "hr", "employees", "attendance", "leave", "india"],
    featured: true,
    featuredOrder: 0,
    requiredPlanTier: "basic",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 49, unit: "per employee" },
        ],
        trialDays: 7,
        features: ["Employee records", "Attendance tracking", "Leave management", "Timesheets", "Self-service portal"],
      },
    ],
  },
  {
    slug: "hrms-malaysia",
    name: "HRMS (Malaysia)",
    shortDescription: "HR management with Malaysian labor law compliance",
    fullDescription: `Complete HRMS solution for Malaysian businesses:
    
• Employee master database
• Attendance and shift management
• Leave management (Annual, Medical, etc.)
• Timesheet tracking
• Employee self-service portal
• Malaysian labor law compliance
• HR analytics and reports
• Integration with payroll add-on`,
    category: "compliance",
    supportedCountries: ["MY"],
    supportedBusinessTypes: [],
    tags: ["hrms", "hr", "employees", "attendance", "leave", "malaysia"],
    featured: true,
    featuredOrder: 0,
    requiredPlanTier: "basic",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "MYR", price: 10, unit: "per employee" },
        ],
        trialDays: 7,
        features: ["Employee records", "Attendance tracking", "Leave management", "Timesheets", "Self-service portal"],
      },
    ],
  },
  {
    slug: "hrms-uk",
    name: "HRMS (UK)",
    shortDescription: "HR management with UK employment law compliance",
    fullDescription: `Complete HRMS solution for UK businesses:
    
• Employee master database with right-to-work tracking
• Attendance and shift management
• Leave management (Annual, Sick, etc.)
• Timesheet tracking
• Employee self-service portal
• UK employment law compliance
• GDPR-compliant data handling
• HR analytics and reports`,
    category: "compliance",
    supportedCountries: ["UK"],
    supportedBusinessTypes: [],
    tags: ["hrms", "hr", "employees", "attendance", "leave", "uk"],
    featured: true,
    featuredOrder: 0,
    requiredPlanTier: "basic",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "GBP", price: 2, unit: "per employee" },
        ],
        trialDays: 7,
        features: ["Employee records", "Attendance tracking", "Leave management", "Timesheets", "Self-service portal"],
      },
    ],
  },
  {
    slug: "hrms-global",
    name: "HRMS",
    shortDescription: "Complete HR management for any business",
    fullDescription: `Universal HRMS solution for businesses worldwide:
    
• Employee master database
• Attendance tracking
• Leave management with customizable policies
• Timesheet management
• Employee self-service portal
• Org chart and hierarchy management
• HR analytics and reports
• Configurable for any country`,
    category: "utilities",
    supportedCountries: [],
    supportedBusinessTypes: [],
    tags: ["hrms", "hr", "employees", "attendance", "leave", "global"],
    featured: false,
    requiredPlanTier: "basic",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "USD", price: 3, unit: "per employee" },
          { currency: "INR", price: 49, unit: "per employee" },
          { currency: "MYR", price: 10, unit: "per employee" },
          { currency: "GBP", price: 2, unit: "per employee" },
        ],
        trialDays: 7,
        features: ["Employee records", "Attendance tracking", "Leave management", "Timesheets", "Self-service portal"],
      },
    ],
  },
  // Payroll Add-ons (Pro plan required - high compliance value)
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
    requiredPlanTier: "pro",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 99, unit: "per employee" },
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
    requiredPlanTier: "pro",
    pricing: [
      {
        name: "Per Employee",
        pricingType: "monthly",
        prices: [
          { currency: "MYR", price: 20, unit: "per employee" },
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
    requiredPlanTier: "pro",
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
  // WhatsApp Automation (Basic plan - high margin)
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
    requiredPlanTier: "basic",
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
  // Advanced Analytics (Basic plan - owner focused)
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
    requiredPlanTier: "basic",
    pricing: [
      {
        name: "Standard",
        pricingType: "monthly",
        prices: [
          { currency: "INR", price: 399 },
          { currency: "MYR", price: 19 },
          { currency: "GBP", price: 8 },
          { currency: "USD", price: 10 },
        ],
        features: ["Custom dashboards", "Revenue forecasting", "Export reports", "Scheduled delivery"],
      },
    ],
  },
  // Extra Users (Free plan - easy upsell)
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
    requiredPlanTier: "free",
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
  // Extra Storage (Free plan)
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
    requiredPlanTier: "free",
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
  // GST Filing (Basic plan - India only)
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
    requiredPlanTier: "basic",
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
  // Document Management (Basic plan)
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
    requiredPlanTier: "basic",
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
  // Multi-Branch (Pro plan)
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
    requiredPlanTier: "pro",
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
  // API Access (Pro plan)
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
    requiredPlanTier: "pro",
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
        // Addon exists - preserve admin settings, don't overwrite
        addonId = existing.id;
        console.log(`[marketplace-addons] Addon exists, preserving: ${addonData.name}`);
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
            requiredPlanTier: addonData.requiredPlanTier,
            allowedRoles: addonData.allowedRoles || [],
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
            // Pricing exists - preserve admin settings, don't overwrite
            // console.log(`[marketplace-addons] Pricing exists for ${priceInfo.currency}, preserving`);
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
  
  await seedAddonCountryConfigs();
  await seedAddonPlanEligibility();
}

async function seedAddonCountryConfigs() {
  console.log("[marketplace-addons] Seeding addon country configs...");
  
  const countryConfigs = [
    { slug: "hrms-india", countryCode: "IN", currency: "INR", monthlyPrice: "49", isActive: true, status: "active" },
    { slug: "hrms-malaysia", countryCode: "MY", currency: "MYR", monthlyPrice: "10", isActive: true, status: "active" },
    { slug: "hrms-uk", countryCode: "UK", currency: "GBP", monthlyPrice: "2", isActive: true, status: "active" },
    { slug: "payroll-india", countryCode: "IN", currency: "INR", monthlyPrice: "99", isActive: true, status: "active" },
    { slug: "payroll-malaysia", countryCode: "MY", currency: "MYR", monthlyPrice: "20", isActive: true, status: "active" },
    { slug: "payroll-uk", countryCode: "UK", currency: "GBP", monthlyPrice: "5", isActive: true, status: "active" },
    { slug: "whatsapp-automation", countryCode: "IN", currency: "INR", monthlyPrice: "299", isActive: true, status: "active" },
    { slug: "whatsapp-automation", countryCode: "MY", currency: "MYR", monthlyPrice: "50", isActive: true, status: "active" },
    { slug: "whatsapp-automation", countryCode: "UK", currency: "GBP", monthlyPrice: "15", isActive: false, status: "coming_soon" },
    { slug: "advanced-analytics", countryCode: "IN", currency: "INR", monthlyPrice: "199", isActive: true, status: "active" },
    { slug: "advanced-analytics", countryCode: "MY", currency: "MYR", monthlyPrice: "35", isActive: true, status: "active" },
    { slug: "advanced-analytics", countryCode: "UK", currency: "GBP", monthlyPrice: "10", isActive: true, status: "active" },
  ];
  
  for (const config of countryConfigs) {
    try {
      const [addon] = await db.select().from(addons).where(eq(addons.slug, config.slug)).limit(1);
      if (!addon) continue;
      
      const [existing] = await db.select()
        .from(addonCountryConfig)
        .where(and(
          eq(addonCountryConfig.addonId, addon.id),
          eq(addonCountryConfig.countryCode, config.countryCode)
        ))
        .limit(1);
      
      const configValues = {
        addonId: addon.id,
        countryCode: config.countryCode,
        currencyCode: config.currency,
        monthlyPrice: config.monthlyPrice,
        isActive: config.isActive,
        status: config.status,
        trialDays: 7,
        trialEnabled: true,
      };
      
      if (existing) {
        // Config exists - preserve admin settings, don't overwrite
        console.log(`[marketplace-addons] Config exists, preserving: ${config.slug} for ${config.countryCode}`);
      } else {
        await db.insert(addonCountryConfig).values(configValues);
        console.log(`[marketplace-addons] Created config: ${config.slug} for ${config.countryCode}`);
      }
    } catch (error) {
      console.error(`[marketplace-addons] Error seeding config for ${config.slug}/${config.countryCode}:`, error);
    }
  }
  
  console.log("[marketplace-addons] Country configs seeded successfully");
}

async function seedAddonPlanEligibility() {
  console.log("[marketplace-addons] Seeding addon plan eligibility...");
  
  const eligibilityRules = [
    { slug: "hrms-india", countryCode: "IN", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-india", countryCode: "IN", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-india", countryCode: "IN", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-india", countryCode: "IN", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "hrms-malaysia", countryCode: "MY", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-malaysia", countryCode: "MY", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-malaysia", countryCode: "MY", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "hrms-malaysia", countryCode: "MY", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "payroll-india", countryCode: "IN", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-india", countryCode: "IN", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-india", countryCode: "IN", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-india", countryCode: "IN", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "payroll-malaysia", countryCode: "MY", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-malaysia", countryCode: "MY", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-malaysia", countryCode: "MY", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "payroll-malaysia", countryCode: "MY", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "whatsapp-automation", countryCode: "IN", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "IN", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "IN", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "IN", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "whatsapp-automation", countryCode: "MY", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "MY", planTier: "basic", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "MY", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "whatsapp-automation", countryCode: "MY", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "advanced-analytics", countryCode: "IN", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "IN", planTier: "basic", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "IN", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "IN", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
    
    { slug: "advanced-analytics", countryCode: "MY", planTier: "free", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "MY", planTier: "basic", canPurchase: false, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "MY", planTier: "pro", canPurchase: true, trialEnabled: true, trialDays: 14 },
    { slug: "advanced-analytics", countryCode: "MY", planTier: "enterprise", canPurchase: true, trialEnabled: true, trialDays: 14 },
  ];
  
  for (const rule of eligibilityRules) {
    try {
      const [addon] = await db.select().from(addons).where(eq(addons.slug, rule.slug)).limit(1);
      if (!addon) continue;
      
      const [existing] = await db.select()
        .from(addonPlanEligibility)
        .where(and(
          eq(addonPlanEligibility.addonId, addon.id),
          eq(addonPlanEligibility.countryCode, rule.countryCode),
          eq(addonPlanEligibility.planTier, rule.planTier)
        ))
        .limit(1);
      
      const ruleValues = {
        addonId: addon.id,
        countryCode: rule.countryCode,
        planTier: rule.planTier,
        canPurchase: rule.canPurchase,
        trialEnabled: rule.trialEnabled,
        trialDays: rule.trialDays || 14,
      };
      
      if (existing) {
        // Rule exists - preserve admin settings, don't overwrite
        console.log(`[marketplace-addons] Eligibility exists, preserving: ${rule.slug} for ${rule.countryCode}/${rule.planTier}`);
      } else {
        await db.insert(addonPlanEligibility).values(ruleValues);
        console.log(`[marketplace-addons] Created eligibility: ${rule.slug} for ${rule.countryCode}/${rule.planTier}`);
      }
    } catch (error) {
      console.error(`[marketplace-addons] Error seeding eligibility for ${rule.slug}/${rule.countryCode}/${rule.planTier}:`, error);
    }
  }
  
  console.log("[marketplace-addons] Plan eligibility rules seeded successfully");
}
