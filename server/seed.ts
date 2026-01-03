import { db } from "./db";
import {
  platformAdmins,
  platformAdminPermissions,
  adminSecurityConfig,
  PLATFORM_ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_SECURITY_CONFIG,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

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
  const defaultEmail = "superadmin@bizflow.local";

  const [existing] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, defaultEmail));

  if (existing) {
    console.log(`Super Admin already exists: ${defaultEmail}`);
    return { created: false, email: defaultEmail };
  }

  const defaultPassword = generateSecurePassword();
  const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  await db.insert(platformAdmins).values({
    name: "Super Admin",
    email: defaultEmail,
    passwordHash,
    role: "SUPER_ADMIN",
    isActive: true,
    forcePasswordReset: true,
  });

  console.log(`Created Super Admin: ${defaultEmail}`);
  console.log(`Initial password: ${defaultPassword}`);
  console.log("IMPORTANT: Change this password immediately after first login!");

  return { created: true, email: defaultEmail, password: defaultPassword };
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

export async function runAllSeeds(): Promise<void> {
  console.log("Starting database seed...");
  console.log("=".repeat(50));

  console.log("\n1. Seeding Platform Permissions...");
  await seedPlatformPermissions();

  console.log("\n2. Seeding Security Configuration...");
  await seedSecurityConfig();

  console.log("\n3. Seeding Super Admin...");
  const adminResult = await seedSuperAdmin();

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
