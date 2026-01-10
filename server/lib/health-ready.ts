/**
 * Health Ready Module
 * Provides comprehensive readiness checks for the application.
 */

import { pool } from "../db";
import { getStartupConfig } from "./startup-config";

export interface ReadinessCheck {
  name: string;
  status: "ok" | "degraded" | "unhealthy";
  message?: string;
  latencyMs?: number;
}

export interface ReadinessResult {
  ready: boolean;
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  checks: ReadinessCheck[];
}

async function checkDatabase(): Promise<ReadinessCheck> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return {
      name: "database",
      status: "ok",
      message: "Database connection successful",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "database",
      status: "unhealthy",
      message: "Database connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkMigrations(): Promise<ReadinessCheck> {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tenants'
      ) as exists
    `);
    
    if (result.rows[0]?.exists) {
      return {
        name: "migrations",
        status: "ok",
        message: "Database schema is present",
      };
    }
    return {
      name: "migrations",
      status: "degraded",
      message: "Database schema may need migration",
    };
  } catch {
    return {
      name: "migrations",
      status: "degraded",
      message: "Unable to verify migration status",
    };
  }
}

function checkConfiguration(): ReadinessCheck {
  const config = getStartupConfig();
  
  if (!config) {
    return {
      name: "configuration",
      status: "degraded",
      message: "Configuration not validated",
    };
  }

  if (!config.valid) {
    return {
      name: "configuration",
      status: "unhealthy",
      message: `Missing required config: ${config.missing.join(", ")}`,
    };
  }

  if (config.degradedMode) {
    return {
      name: "configuration",
      status: "degraded",
      message: config.degradedReason || "Running in degraded mode",
    };
  }

  return {
    name: "configuration",
    status: "ok",
    message: "All required configuration present",
  };
}

function checkEssentialServices(): ReadinessCheck {
  const config = getStartupConfig();
  
  if (!config) {
    return {
      name: "essential_services",
      status: "degraded",
      message: "Service status unknown",
    };
  }

  const services = config.services;
  const critical = services.database && services.auth;
  
  if (!services.database) {
    return {
      name: "essential_services",
      status: "unhealthy",
      message: "Database not configured",
    };
  }

  if (!critical) {
    return {
      name: "essential_services",
      status: "degraded",
      message: "Some services not fully configured",
    };
  }

  return {
    name: "essential_services",
    status: "ok",
    message: "All essential services configured",
  };
}

export async function performReadinessCheck(): Promise<ReadinessResult> {
  const checks: ReadinessCheck[] = [];

  const dbCheck = await checkDatabase();
  checks.push(dbCheck);

  if (dbCheck.status === "ok") {
    const migrationCheck = await checkMigrations();
    checks.push(migrationCheck);
  }

  checks.push(checkConfiguration());
  checks.push(checkEssentialServices());

  const hasUnhealthy = checks.some(c => c.status === "unhealthy");
  const hasDegraded = checks.some(c => c.status === "degraded");

  let overallStatus: "ok" | "degraded" | "unhealthy" = "ok";
  if (hasUnhealthy) overallStatus = "unhealthy";
  else if (hasDegraded) overallStatus = "degraded";

  return {
    ready: !hasUnhealthy,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  };
}
