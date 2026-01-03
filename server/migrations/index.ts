/**
 * BizFlow Database Migrations Runner
 * 
 * This module provides utilities for running database migrations in order.
 * All migrations are idempotent and can be safely re-run.
 * 
 * Usage:
 *   npx tsx server/migrations/index.ts
 * 
 * Or import and run programmatically:
 *   import { runAllMigrations } from './migrations';
 *   await runAllMigrations();
 */

import { runMigration as addBusinessTypes } from "./001_add_business_types";

interface MigrationResult {
  name: string;
  success: boolean;
  added?: string[];
  skipped?: string[];
  error?: string;
}

interface MigrationDefinition {
  name: string;
  run: () => Promise<{ success: boolean; added?: string[]; skipped?: string[] }>;
}

const MIGRATIONS: MigrationDefinition[] = [
  { name: "001_add_business_types", run: addBusinessTypes },
];

export async function runAllMigrations(): Promise<MigrationResult[]> {
  console.log("\n" + "=".repeat(70));
  console.log("BizFlow Database Migrations");
  console.log("=".repeat(70) + "\n");
  console.log(`Found ${MIGRATIONS.length} migration(s) to run\n`);

  const results: MigrationResult[] = [];

  for (const migration of MIGRATIONS) {
    console.log(`\n>>> Running: ${migration.name}`);
    
    try {
      const result = await migration.run();
      results.push({
        name: migration.name,
        success: result.success,
        added: result.added,
        skipped: result.skipped,
      });
    } catch (error: any) {
      console.error(`Migration failed: ${migration.name}`, error.message);
      results.push({
        name: migration.name,
        success: false,
        error: error.message,
      });
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Migration Summary");
  console.log("=".repeat(70));
  
  for (const result of results) {
    const status = result.success ? "SUCCESS" : "FAILED";
    console.log(`  ${status}: ${result.name}`);
    if (result.error) {
      console.log(`         Error: ${result.error}`);
    }
  }
  
  console.log("=".repeat(70) + "\n");

  return results;
}

export async function checkMigrationStatus(): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("Migration Status Check");
  console.log("=".repeat(50) + "\n");
  
  console.log(`Total migrations defined: ${MIGRATIONS.length}`);
  for (const migration of MIGRATIONS) {
    console.log(`  - ${migration.name}`);
  }
  
  console.log("\nNote: All migrations are idempotent and can be safely re-run.");
  console.log("=".repeat(50) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === "status") {
    checkMigrationStatus()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Status check failed:", error);
        process.exit(1);
      });
  } else {
    runAllMigrations()
      .then((results) => {
        const allSuccess = results.every((r) => r.success);
        process.exit(allSuccess ? 0 : 1);
      })
      .catch((error) => {
        console.error("Migrations failed:", error);
        process.exit(1);
      });
  }
}
