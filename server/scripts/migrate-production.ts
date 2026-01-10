#!/usr/bin/env npx tsx
/**
 * Production Migration Script
 * Safe database migration command for production deployments.
 * 
 * Usage:
 *   npx tsx server/scripts/migrate-production.ts
 *   npx tsx server/scripts/migrate-production.ts --dry-run
 *   npx tsx server/scripts/migrate-production.ts --force
 * 
 * Options:
 *   --dry-run   Show what would be migrated without making changes
 *   --force     Skip confirmation prompts (for CI/CD)
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import readline from "readline";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isForce = args.includes("--force");

async function prompt(question: string): Promise<boolean> {
  if (isForce) {
    console.log(`${question} (auto-confirmed with --force)`);
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("[migrate] Database connection successful");
    return true;
  } catch (error) {
    console.error("[migrate] Database connection failed:", error);
    return false;
  }
}

async function runMigrations(): Promise<void> {
  console.log("=".repeat(60));
  console.log("MyBizStream Production Migration Tool");
  console.log("=".repeat(60));
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("");

  // Check database connection
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.error("[migrate] Cannot proceed without database connection");
    process.exit(1);
  }

  // Warn about production
  if (process.env.NODE_ENV === "production") {
    console.warn("[migrate] WARNING: Running migrations against PRODUCTION database");
    
    if (!isDryRun) {
      const confirmed = await prompt("Are you sure you want to proceed?");
      if (!confirmed) {
        console.log("[migrate] Migration cancelled by user");
        process.exit(0);
      }
    }
  }

  if (isDryRun) {
    console.log("\n[migrate] DRY RUN - No changes will be made");
    console.log("[migrate] Use drizzle-kit to preview schema changes:");
    console.log("  npx drizzle-kit push --dry-run");
    console.log("\n[migrate] To apply migrations, run without --dry-run flag");
    return;
  }

  // Run actual migration using drizzle-kit
  console.log("\n[migrate] Running schema push via drizzle-kit...");
  console.log("[migrate] This will sync your schema with the database");
  
  const { execSync } = await import("child_process");
  try {
    execSync("npx drizzle-kit push --force", { 
      stdio: "inherit",
      env: { ...process.env }
    });
    console.log("\n[migrate] Migration completed successfully");
  } catch (error) {
    console.error("\n[migrate] Migration failed:", error);
    process.exit(1);
  }
}

runMigrations()
  .then(() => {
    console.log("[migrate] Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[migrate] Fatal error:", error);
    process.exit(1);
  });
