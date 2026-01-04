/**
 * Migration: Add new usage types to the usage_type enum for business-specific billing
 * 
 * This migration safely adds usage types for education, logistics, and legal business types.
 * 
 * Features:
 * - Idempotent: Can be run multiple times without errors
 * - No data loss: Only adds new values, doesn't modify existing data
 * - Backward compatible: Existing usage types remain unchanged
 * 
 * Usage:
 *   npx tsx server/migrations/002_add_usage_types.ts
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

const MIGRATION_NAME = "002_add_usage_types";

const NEW_USAGE_TYPES = [
  "students",
  "courses", 
  "exams",
  "vehicles",
  "trips",
  "shipments",
  "cases",
  "clients",
  "documents",
] as const;

async function checkEnumValueExists(enumTypeName: string, value: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = ${enumTypeName}
      AND e.enumlabel = ${value}
    ) as exists
  `);
  return (result.rows[0] as any)?.exists === true;
}

async function addEnumValue(enumTypeName: string, value: string): Promise<boolean> {
  const exists = await checkEnumValueExists(enumTypeName, value);
  
  if (exists) {
    console.log(`  [SKIP] Value '${value}' already exists in enum '${enumTypeName}'`);
    return false;
  }
  
  try {
    const escapedValue = value.replace(/'/g, "''");
    await db.execute(sql.raw(`ALTER TYPE ${enumTypeName} ADD VALUE IF NOT EXISTS '${escapedValue}'`));
    console.log(`  [ADD] Added value '${value}' to enum '${enumTypeName}'`);
    return true;
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log(`  [SKIP] Value '${value}' already exists (concurrent add)`);
      return false;
    }
    throw error;
  }
}

export async function runMigration(): Promise<{
  success: boolean;
  added: string[];
  skipped: string[];
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running Migration: ${MIGRATION_NAME}`);
  console.log(`${"=".repeat(60)}\n`);
  
  const added: string[] = [];
  const skipped: string[] = [];
  
  console.log("Adding new usage types to 'usage_type' enum...\n");
  
  for (const usageType of NEW_USAGE_TYPES) {
    const wasAdded = await addEnumValue("usage_type", usageType);
    if (wasAdded) {
      added.push(usageType);
    } else {
      skipped.push(usageType);
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Migration Complete: ${MIGRATION_NAME}`);
  console.log(`  Added: ${added.length > 0 ? added.join(", ") : "none"}`);
  console.log(`  Skipped: ${skipped.length > 0 ? skipped.join(", ") : "none"}`);
  console.log(`${"=".repeat(60)}\n`);
  
  return { success: true, added, skipped };
}

export async function rollbackMigration(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Rollback: ${MIGRATION_NAME}`);
  console.log(`${"=".repeat(60)}\n`);
  
  console.log("WARNING: PostgreSQL does not support removing enum values safely.");
  console.log("To rollback, you would need to:");
  console.log("  1. Create a new enum without the values");
  console.log("  2. Migrate all data to use the new enum");
  console.log("  3. Drop the old enum and rename the new one");
  console.log("\nThis migration is designed to be additive only.");
  console.log("If rollback is truly needed, ensure no data uses the new values first.\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
