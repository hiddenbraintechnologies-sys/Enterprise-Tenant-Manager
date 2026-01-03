import { db } from "../db";
import { users, platformAdmins } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@bizflow.app";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SALT_ROUNDS = 12;

async function seedPlatformAdmin() {
  if (!SUPER_ADMIN_PASSWORD) {
    console.error("ERROR: SUPER_ADMIN_PASSWORD environment variable is required");
    console.error("Set a secure password via environment variables before running this script");
    process.exit(1);
  }

  if (SUPER_ADMIN_PASSWORD.length < 12) {
    console.error("ERROR: SUPER_ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
  }

  console.log("Seeding platform super admin...");

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL)).limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log(`User with email ${SUPER_ADMIN_EMAIL} already exists`);

      const existingAdmin = await db.select().from(platformAdmins).where(eq(platformAdmins.userId, userId)).limit(1);
      
      if (existingAdmin.length > 0) {
        console.log("Platform admin already exists, updating password...");
        const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);
        await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
        await db.update(platformAdmins).set({ 
          mustChangePassword: true,
          updatedAt: new Date()
        }).where(eq(platformAdmins.userId, userId));
        console.log("Password updated. Admin must change password on next login.");
        return;
      }
    } else {
      const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, SALT_ROUNDS);
      
      const [newUser] = await db.insert(users).values({
        email: SUPER_ADMIN_EMAIL,
        firstName: "Super",
        lastName: "Admin",
        passwordHash,
      }).returning();

      userId = newUser.id;
      console.log(`Created user: ${SUPER_ADMIN_EMAIL}`);
    }

    await db.insert(platformAdmins).values({
      userId,
      role: "super_admin",
      status: "active",
      permissions: ["*"],
      mustChangePassword: true,
      createdBy: "system",
    });

    console.log("Super Admin created successfully!");
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log("IMPORTANT: Admin must change password on first login");
    
  } catch (error) {
    console.error("Error seeding platform admin:", error);
    process.exit(1);
  }
}

seedPlatformAdmin()
  .then(() => {
    console.log("Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
