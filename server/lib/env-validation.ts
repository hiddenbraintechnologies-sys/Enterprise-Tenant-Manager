/**
 * Environment Validation Module
 * Validates required environment variables at startup.
 * In production, fails fast with clear errors (no secrets logged).
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  requiredInProduction: boolean;
  sensitive: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  // Database
  { name: "DATABASE_URL", required: true, requiredInProduction: true, sensitive: true, description: "PostgreSQL connection string" },
  
  // JWT Secrets
  { name: "JWT_ACCESS_SECRET", required: false, requiredInProduction: true, sensitive: true, description: "JWT access token signing secret" },
  { name: "JWT_REFRESH_SECRET", required: false, requiredInProduction: true, sensitive: true, description: "JWT refresh token signing secret" },
  
  // Session
  { name: "SESSION_SECRET", required: false, requiredInProduction: true, sensitive: true, description: "Express session secret" },
  
  // Application
  { name: "NODE_ENV", required: false, requiredInProduction: false, sensitive: false, description: "Node environment (development/production)" },
  { name: "PORT", required: false, requiredInProduction: false, sensitive: false, description: "Server port (default: 5000)" },
  
  // Replit Auth (optional but recommended)
  { name: "REPLIT_DOMAINS", required: false, requiredInProduction: false, sensitive: false, description: "Replit domain configuration" },
  { name: "ISSUER_URL", required: false, requiredInProduction: false, sensitive: false, description: "OIDC issuer URL" },
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  environment: string;
}

export function validateEnvironment(): ValidationResult {
  const environment = process.env.NODE_ENV || "development";
  const isProduction = environment === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VARS) {
    const value = process.env[config.name];
    const isMissing = !value || value.trim() === "";

    if (isMissing) {
      if (config.requiredInProduction && isProduction) {
        missing.push(config.name);
      } else if (config.required) {
        missing.push(config.name);
      } else if (config.requiredInProduction && !isProduction) {
        warnings.push(`${config.name} is not set (required in production)`);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    environment,
  };
}

export function enforceEnvironmentValidation(): void {
  const result = validateEnvironment();
  const isProduction = result.environment === "production";

  console.log(`[env-validation] Environment: ${result.environment}`);

  if (result.warnings.length > 0 && !isProduction) {
    for (const warning of result.warnings) {
      console.warn(`[env-validation] WARNING: ${warning}`);
    }
  }

  if (!result.valid) {
    const errorMessage = `Missing required environment variables: ${result.missing.join(", ")}`;
    console.error(`[env-validation] FATAL: ${errorMessage}`);
    
    if (isProduction) {
      console.error("[env-validation] Application cannot start in production with missing required environment variables.");
      console.error("[env-validation] Please configure all required environment variables before deploying.");
      process.exit(1);
    } else {
      console.warn("[env-validation] Continuing in development mode with missing variables...");
    }
  } else {
    console.log("[env-validation] All required environment variables are configured");
  }
}

export function getEnvironmentInfo(): { environment: string; isProduction: boolean; isDevelopment: boolean } {
  const environment = process.env.NODE_ENV || "development";
  return {
    environment,
    isProduction: environment === "production",
    isDevelopment: environment === "development",
  };
}
