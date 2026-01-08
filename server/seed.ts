import { db } from "./db";
import {
  platformAdmins,
  platformAdminPermissions,
  adminSecurityConfig,
  tenants,
  PLATFORM_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_SECURITY_CONFIG,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { runAllMigrations } from "./migrations";

const SALT_ROUNDS = 12;

interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    code: PLATFORM_ADMIN_PERMISSIONS.READ_TENANTS,
    name: "Read Tenants",
    description: "View tenant information and details",
    category: "tenants",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_TENANTS,
    name: "Manage Tenants",
    description: "Create, update, suspend, and delete tenants",
    category: "tenants",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.READ_USERS,
    name: "Read Users",
    description: "View user information across tenants",
    category: "users",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_USERS,
    name: "Manage Users",
    description: "Create, update, and delete users across tenants",
    category: "users",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.RESET_PASSWORDS,
    name: "Reset Passwords",
    description: "Reset user passwords and force password changes",
    category: "users",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.VIEW_LOGS,
    name: "View Logs",
    description: "View audit logs and system activity",
    category: "logs",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_LOGS,
    name: "Manage Logs",
    description: "Export, archive, and manage log retention",
    category: "logs",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.READ_ADMINS,
    name: "Read Admins",
    description: "View platform admin information",
    category: "admins",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_ADMINS,
    name: "Manage Admins",
    description: "Create, update, and manage platform admins",
    category: "admins",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.VIEW_ANALYTICS,
    name: "View Analytics",
    description: "Access platform-wide analytics and reports",
    category: "analytics",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_FEATURES,
    name: "Manage Features",
    description: "Enable/disable features for tenants",
    category: "features",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.VIEW_BILLING,
    name: "View Billing",
    description: "View subscription and billing information",
    category: "billing",
  },
  {
    code: PLATFORM_ADMIN_PERMISSIONS.MANAGE_BILLING,
    name: "Manage Billing",
    description: "Manage subscriptions, invoices, and payments",
    category: "billing",
  },
];

interface SecurityConfigDefinition {
  key: string;
  value: any;
  description: string;
}

const SECURITY_CONFIG_DEFINITIONS: SecurityConfigDefinition[] = [
  {
    key: "maxLoginAttempts",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.maxLoginAttempts,
    description: "Maximum failed login attempts before account lockout",
  },
  {
    key: "lockoutDurationMinutes",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.lockoutDurationMinutes,
    description: "Duration in minutes for account lockout",
  },
  {
    key: "sessionTimeoutMinutes",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.sessionTimeoutMinutes,
    description: "Session inactivity timeout in minutes",
  },
  {
    key: "sessionAbsoluteTimeoutHours",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.sessionAbsoluteTimeoutHours,
    description: "Maximum session duration in hours",
  },
  {
    key: "requireIpWhitelist",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.requireIpWhitelist,
    description: "Require IP whitelist for admin access",
  },
  {
    key: "require2FA",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.require2FA,
    description: "Require 2FA for all platform admins",
  },
  {
    key: "require2FAForSuperAdmin",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.require2FAForSuperAdmin,
    description: "Require 2FA specifically for super admins",
  },
  {
    key: "passwordExpiryDays",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.passwordExpiryDays,
    description: "Password expiry period in days",
  },
  {
    key: "minPasswordLength",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.minPasswordLength,
    description: "Minimum password length requirement",
  },
  {
    key: "auditLogRetentionDays",
    value: DEFAULT_ADMIN_SECURITY_CONFIG.auditLogRetentionDays,
    description: "Audit log retention period in days",
  },
  {
    key: "highRiskActions",
    value: [...DEFAULT_ADMIN_SECURITY_CONFIG.highRiskActions],
    description: "Actions that require enhanced logging and verification",
  },
];

export async function seedSuperAdmin(): Promise<{
  created: boolean;
  email: string;
  password?: string;
}> {
  const isProduction = process.env.NODE_ENV === "production";
  
  const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL || "superadmin@bizflow.local";
  const adminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_SUPER_ADMIN_NAME || "Super Admin";

  if (isProduction && !adminPassword) {
    console.error("ERROR: INITIAL_SUPER_ADMIN_PASSWORD environment variable is required in production");
    console.error("Set this securely and remove it after initial setup");
    throw new Error("Missing required environment variable: INITIAL_SUPER_ADMIN_PASSWORD");
  }

  const [existing] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, adminEmail));

  if (existing) {
    console.log(`Super Admin already exists: ${adminEmail}`);
    return { created: false, email: adminEmail };
  }

  const finalPassword = adminPassword || generateSecurePassword();
  const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

  await db.insert(platformAdmins).values({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "SUPER_ADMIN",
    isActive: true,
    forcePasswordReset: true,
  });

  console.log(`Created Super Admin: ${adminEmail}`);
  
  if (isProduction) {
    console.log("Super Admin created successfully.");
    console.log("IMPORTANT: Remove INITIAL_SUPER_ADMIN_PASSWORD from environment after setup!");
    console.log("Password change will be required on first login.");
    return { created: true, email: adminEmail };
  } else {
    console.log(`Initial password: ${finalPassword}`);
    console.log("IMPORTANT: Change this password immediately after first login!");
    return { created: true, email: adminEmail, password: finalPassword };
  }
}

export async function seedPlatformPermissions(): Promise<number> {
  let seededCount = 0;

  for (const perm of PERMISSION_DEFINITIONS) {
    const [existing] = await db
      .select()
      .from(platformAdminPermissions)
      .where(eq(platformAdminPermissions.code, perm.code));

    if (!existing) {
      await db.insert(platformAdminPermissions).values({
        code: perm.code,
        name: perm.name,
        description: perm.description,
        category: perm.category,
      });
      seededCount++;
      console.log(`Created permission: ${perm.code}`);
    }
  }

  console.log(`Seeded ${seededCount} new permissions (${PERMISSION_DEFINITIONS.length} total defined)`);
  return seededCount;
}

export async function seedSecurityConfig(): Promise<number> {
  let seededCount = 0;

  for (const config of SECURITY_CONFIG_DEFINITIONS) {
    const [existing] = await db
      .select()
      .from(adminSecurityConfig)
      .where(eq(adminSecurityConfig.configKey, config.key));

    if (!existing) {
      await db.insert(adminSecurityConfig).values({
        configKey: config.key,
        configValue: config.value,
        description: config.description,
      });
      seededCount++;
      console.log(`Created security config: ${config.key}`);
    }
  }

  console.log(`Seeded ${seededCount} new security configs (${SECURITY_CONFIG_DEFINITIONS.length} total defined)`);
  return seededCount;
}

// Test Platform Admins - can be disabled later in production
interface TestAdminDefinition {
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN" | "PLATFORM_ADMIN";
}

const TEST_PLATFORM_ADMINS: TestAdminDefinition[] = [
  {
    name: "John Smith",
    email: "john.smith@bizflow.app",
    password: "Test@123!",
    role: "PLATFORM_ADMIN",
  },
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@bizflow.app",
    password: "Test@123!",
    role: "PLATFORM_ADMIN",
  },
  {
    name: "Mike Chen",
    email: "mike.chen@bizflow.app",
    password: "Test@123!",
    role: "SUPER_ADMIN",
  },
];

export async function seedTestPlatformAdmins(): Promise<number> {
  let seededCount = 0;

  for (const admin of TEST_PLATFORM_ADMINS) {
    const [existing] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, admin.email));

    if (!existing) {
      const passwordHash = await bcrypt.hash(admin.password, SALT_ROUNDS);
      await db.insert(platformAdmins).values({
        name: admin.name,
        email: admin.email,
        passwordHash,
        role: admin.role,
        isActive: true,
        forcePasswordReset: false,
      });
      seededCount++;
      console.log(`  Created test admin: ${admin.name} (${admin.role})`);
    } else {
      console.log(`  Test admin exists: ${admin.name}`);
    }
  }

  console.log(`Seeded ${seededCount} new test admins (${TEST_PLATFORM_ADMINS.length} total defined)`);
  return seededCount;
}

interface SampleTenantDefinition {
  name: string;
  slug: string;
  businessType: "clinic" | "salon" | "pg" | "coworking" | "service" | "real_estate" | "tourism" | "education" | "logistics" | "legal" | "furniture_manufacturing";
  country: "india" | "uae" | "uk" | "malaysia" | "singapore" | "other";
  region: "asia_pacific" | "middle_east" | "europe";
  subscriptionTier: string;
  email: string;
}

const SAMPLE_TENANTS: SampleTenantDefinition[] = [
  {
    name: "Urban Realty",
    slug: "urban-realty",
    businessType: "real_estate",
    country: "india",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "contact@urbanrealty.example.com",
  },
  {
    name: "Skyline Properties UAE",
    slug: "skyline-properties-uae",
    businessType: "real_estate",
    country: "uae",
    region: "middle_east",
    subscriptionTier: "enterprise",
    email: "info@skylineproperties.example.com",
  },
  {
    name: "Wanderlust Tours",
    slug: "wanderlust-tours",
    businessType: "tourism",
    country: "india",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "bookings@wanderlusttours.example.com",
  },
  {
    name: "Singapore Explorer",
    slug: "singapore-explorer",
    businessType: "tourism",
    country: "singapore",
    region: "asia_pacific",
    subscriptionTier: "starter",
    email: "tours@sgexplorer.example.com",
  },
  {
    name: "London Estate Agents",
    slug: "london-estate-agents",
    businessType: "real_estate",
    country: "uk",
    region: "europe",
    subscriptionTier: "enterprise",
    email: "sales@londonestateagents.example.com",
  },
  {
    name: "Malaysia Heritage Tours",
    slug: "malaysia-heritage-tours",
    businessType: "tourism",
    country: "malaysia",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "heritage@mytours.example.com",
  },
  {
    name: "EduTech Academy",
    slug: "edutech-academy",
    businessType: "education",
    country: "india",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "admin@edutechacademy.example.com",
  },
  {
    name: "Oxford Learning Center",
    slug: "oxford-learning-center",
    businessType: "education",
    country: "uk",
    region: "europe",
    subscriptionTier: "enterprise",
    email: "info@oxfordlearning.example.com",
  },
  {
    name: "Swift Logistics",
    slug: "swift-logistics",
    businessType: "logistics",
    country: "uae",
    region: "middle_east",
    subscriptionTier: "enterprise",
    email: "ops@swiftlogistics.example.com",
  },
  {
    name: "Asia Freight Solutions",
    slug: "asia-freight-solutions",
    businessType: "logistics",
    country: "singapore",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "cargo@asiafreight.example.com",
  },
  {
    name: "Justice Partners LLP",
    slug: "justice-partners-llp",
    businessType: "legal",
    country: "uk",
    region: "europe",
    subscriptionTier: "enterprise",
    email: "legal@justicepartners.example.com",
  },
  {
    name: "Mumbai Legal Associates",
    slug: "mumbai-legal-associates",
    businessType: "legal",
    country: "india",
    region: "asia_pacific",
    subscriptionTier: "pro",
    email: "contact@mumbailegal.example.com",
  },
];

export async function seedSampleTenants(): Promise<number> {
  let seededCount = 0;

  for (const tenant of SAMPLE_TENANTS) {
    const [existing] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenant.slug));

    if (!existing) {
      await db.insert(tenants).values({
        name: tenant.name,
        slug: tenant.slug,
        businessType: tenant.businessType,
        country: tenant.country,
        region: tenant.region,
        subscriptionTier: tenant.subscriptionTier,
        email: tenant.email,
        isActive: true,
        status: "active",
        maxUsers: tenant.subscriptionTier === "enterprise" ? 50 : tenant.subscriptionTier === "pro" ? 20 : 5,
        maxCustomers: tenant.subscriptionTier === "enterprise" ? 10000 : tenant.subscriptionTier === "pro" ? 1000 : 100,
      });
      seededCount++;
      console.log(`  Created tenant: ${tenant.name} (${tenant.businessType})`);
    } else {
      console.log(`  Tenant exists: ${tenant.name}`);
    }
  }

  console.log(`Seeded ${seededCount} new sample tenants (${SAMPLE_TENANTS.length} total defined)`);
  return seededCount;
}

function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%^&*";

  let password = "";

  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 0; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export async function runAllSeeds(options?: { skipMigrations?: boolean; skipSampleData?: boolean }): Promise<void> {
  console.log("Starting database seed...");
  console.log("=".repeat(50));

  if (!options?.skipMigrations) {
    console.log("\n0. Running Database Migrations...");
    try {
      const migrationResults = await runAllMigrations();
      const failedMigrations = migrationResults.filter(r => !r.success);
      if (failedMigrations.length > 0) {
        console.warn(`Warning: ${failedMigrations.length} migration(s) had issues, but continuing with seeds...`);
      }
    } catch (error) {
      console.error("Migration error (continuing with seeds):", error);
    }
  }

  console.log("\n1. Seeding Platform Permissions...");
  await seedPlatformPermissions();

  console.log("\n2. Seeding Security Configuration...");
  await seedSecurityConfig();

  console.log("\n3. Seeding Super Admin...");
  const adminResult = await seedSuperAdmin();

  console.log("\n4. Seeding Test Platform Admins...");
  await seedTestPlatformAdmins();

  if (!options?.skipSampleData) {
    console.log("\n5. Seeding Sample Tenants (Real Estate & Tourism)...");
    await seedSampleTenants();
  }

  console.log("\n" + "=".repeat(50));
  console.log("Seed completed successfully!");

  if (adminResult.created && adminResult.password) {
    console.log("\n*** IMPORTANT - SAVE THESE CREDENTIALS ***");
    console.log(`Email: ${adminResult.email}`);
    console.log(`Password: ${adminResult.password}`);
    console.log("You will be required to change this password on first login.");
    console.log("*".repeat(50));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
