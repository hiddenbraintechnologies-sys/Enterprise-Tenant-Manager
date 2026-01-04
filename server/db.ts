import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout to prevent hanging
  idleTimeoutMillis: 30000,
  max: 20,
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });
