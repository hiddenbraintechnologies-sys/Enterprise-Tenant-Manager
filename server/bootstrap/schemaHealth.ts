import { db } from "../db";
import { sql } from "drizzle-orm";

export interface SchemaHealthResult {
  ok: boolean;
  missing: string[];
  checked: string[];
}

const REQUIRED_TABLES = [
  "user_sessions",
  "refresh_tokens",
  "audit_logs",
  "step_up_challenges",
];

let schemaHealthy = true;

export async function schemaHealthCheck(): Promise<SchemaHealthResult> {
  try {
    const rows = await db.execute(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const existing = new Set((rows.rows as { tablename: string }[]).map(r => r.tablename));
    const missing = REQUIRED_TABLES.filter(t => !existing.has(t));

    schemaHealthy = missing.length === 0;

    return {
      ok: missing.length === 0,
      missing,
      checked: REQUIRED_TABLES,
    };
  } catch (error) {
    console.error("[schema-health] Failed to check schema:", error);
    schemaHealthy = false;
    return {
      ok: false,
      missing: REQUIRED_TABLES,
      checked: REQUIRED_TABLES,
    };
  }
}

export function isSchemaHealthy(): boolean {
  return schemaHealthy;
}

export function setSchemaHealthy(healthy: boolean): void {
  schemaHealthy = healthy;
}
