import { execSync } from "child_process";
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function runMigrations(): Promise<void> {
  console.log("[db-migrate] Checking database schema...");
  
  try {
    // Test database connection first
    await db.execute(sql`SELECT 1`);
    console.log("[db-migrate] Database connection successful");
    
    // Check if a key table exists with expected columns
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_provider_configs' 
      AND column_name = 'country'
    `);
    
    if (result.rows.length > 0) {
      console.log("[db-migrate] Schema appears to be up to date");
      return;
    }
    
    console.log("[db-migrate] Schema needs updating, running migrations...");
    
    // Only run in production - development should use db:push manually
    if (process.env.NODE_ENV === "production") {
      try {
        execSync("node ./node_modules/drizzle-kit/bin.cjs push --force", {
          stdio: "inherit",
          timeout: 120000
        });
        console.log("[db-migrate] Migrations completed successfully");
      } catch (migrationError) {
        console.error("[db-migrate] Migration failed, but continuing startup...");
        // Don't throw - let the app try to start anyway
      }
    } else {
      console.log("[db-migrate] Development mode - run 'npm run db:push' manually if needed");
    }
  } catch (error) {
    console.error("[db-migrate] Database check failed:", error);
    // Don't throw - let the app try to start and show the actual error
  }
}
