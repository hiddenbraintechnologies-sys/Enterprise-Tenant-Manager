import { sql } from "drizzle-orm";
import { db } from "./db";

export async function runMigrations(): Promise<void> {
  console.log("[db-migrate] Checking database connection...");
  
  try {
    // Lightweight connection test only - no heavy DDL
    // Full schema sync should be done via: npx drizzle-kit push --force
    const connectionTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection timeout after 5s")), 5000)
    );
    
    await Promise.race([
      db.execute(sql`SELECT 1`),
      connectionTimeout
    ]);
    console.log("[db-migrate] Database connection successful");
    
    // Note: Heavy schema migrations have been removed to speed up deployment
    // Schema is synced during build phase via drizzle-kit push
    
  } catch (error) {
    console.error("[db-migrate] Database check failed:", error);
    // Don't throw - server can still handle requests that don't need DB
  }
}
