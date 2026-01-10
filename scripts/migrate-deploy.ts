#!/usr/bin/env npx tsx
/**
 * Migration Deploy Script
 * Runs database migrations in a production-safe manner.
 * 
 * Usage: npx tsx scripts/migrate-deploy.ts
 * Or: npm run migrate:deploy
 */

import { Pool } from "pg";

async function main() {
  console.log("[migrate:deploy] Starting migration deployment...");
  console.log(`[migrate:deploy] Environment: ${process.env.NODE_ENV || "development"}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[migrate:deploy] FATAL: DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log("[migrate:deploy] Testing database connection...");
    await pool.query("SELECT 1");
    console.log("[migrate:deploy] Database connection successful");

    console.log("[migrate:deploy] Running drizzle-kit push...");
    const { execSync } = await import("child_process");
    
    execSync("npx drizzle-kit push", {
      stdio: "inherit",
      env: { ...process.env },
    });

    console.log("[migrate:deploy] Verifying schema...");
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`[migrate:deploy] Found ${result.rows[0].count} tables in public schema`);

    const tenantCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      ) as exists
    `);

    if (!tenantCheck.rows[0].exists) {
      console.error("[migrate:deploy] WARNING: Core 'tenants' table not found - migration may have failed");
      process.exit(1);
    }

    console.log("[migrate:deploy] Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("[migrate:deploy] FATAL: Migration failed");
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
