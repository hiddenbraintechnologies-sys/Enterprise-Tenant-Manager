/**
 * Startup Configuration Validation
 * Validates all required configuration at startup and supports degraded mode.
 */

export interface StartupConfigResult {
  valid: boolean;
  degradedMode: boolean;
  degradedReason: string | null;
  missing: string[];
  warnings: string[];
  services: {
    database: boolean;
    auth: boolean;
    email: boolean;
    whatsapp: boolean;
  };
}

interface ConfigRequirement {
  name: string;
  required: boolean;
  requiredInProduction: boolean;
  category: "database" | "auth" | "email" | "whatsapp" | "app";
  description: string;
}

const CONFIG_REQUIREMENTS: ConfigRequirement[] = [
  { name: "DATABASE_URL", required: true, requiredInProduction: true, category: "database", description: "PostgreSQL connection string" },
  { name: "JWT_ACCESS_SECRET", required: false, requiredInProduction: true, category: "auth", description: "JWT access token signing secret" },
  { name: "JWT_REFRESH_SECRET", required: false, requiredInProduction: true, category: "auth", description: "JWT refresh token signing secret" },
  { name: "SESSION_SECRET", required: false, requiredInProduction: true, category: "auth", description: "Express session secret" },
  { name: "REPLIT_DOMAINS", required: false, requiredInProduction: false, category: "auth", description: "SSO domains for OIDC" },
  { name: "ISSUER_URL", required: false, requiredInProduction: false, category: "auth", description: "OIDC issuer URL" },
  { name: "SENDGRID_API_KEY", required: false, requiredInProduction: false, category: "email", description: "SendGrid API key for email notifications" },
  { name: "RESEND_API_KEY", required: false, requiredInProduction: false, category: "email", description: "Resend API key for email notifications" },
  { name: "TWILIO_ACCOUNT_SID", required: false, requiredInProduction: false, category: "whatsapp", description: "Twilio account SID for WhatsApp" },
  { name: "TWILIO_AUTH_TOKEN", required: false, requiredInProduction: false, category: "whatsapp", description: "Twilio auth token for WhatsApp" },
  { name: "TWILIO_WHATSAPP_FROM", required: false, requiredInProduction: false, category: "whatsapp", description: "Twilio WhatsApp sender number" },
];

let startupConfig: StartupConfigResult | null = null;
let degradedModeActive = false;

export function validateStartupConfig(): StartupConfigResult {
  const isProduction = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  const services = {
    database: false,
    auth: false,
    email: false,
    whatsapp: false,
  };

  for (const config of CONFIG_REQUIREMENTS) {
    const value = process.env[config.name];
    const hasValue = value && value.trim() !== "";

    if (hasValue) {
      if (config.category === "database") services.database = true;
      if (config.category === "auth") services.auth = true;
      if (config.category === "email") services.email = true;
      if (config.category === "whatsapp") services.whatsapp = true;
    } else {
      if (config.requiredInProduction && isProduction) {
        missing.push(config.name);
      } else if (config.required) {
        missing.push(config.name);
      } else if (!isProduction && config.requiredInProduction) {
        warnings.push(`${config.name} not set (required in production)`);
      }
    }
  }

  const valid = missing.length === 0;
  
  // Enter degraded mode if any critical config is missing
  const hasCriticalMissing = missing.length > 0 || !services.database;
  const degradedMode = hasCriticalMissing;
  const degradedReason = !services.database 
    ? "DATABASE_URL not configured" 
    : missing.length > 0 
      ? `Missing required config: ${missing.join(", ")}`
      : null;

  startupConfig = {
    valid,
    degradedMode,
    degradedReason,
    missing,
    warnings,
    services,
  };

  // Activate degraded mode if needed
  if (degradedMode && isProduction) {
    setDegradedMode(true);
  }

  return startupConfig;
}

export function getStartupConfig(): StartupConfigResult | null {
  return startupConfig;
}

export function isDegradedMode(): boolean {
  return degradedModeActive;
}

export function setDegradedMode(active: boolean): void {
  degradedModeActive = active;
}

export function logStartupConfig(): void {
  const config = startupConfig || validateStartupConfig();
  const isProduction = process.env.NODE_ENV === "production";

  console.log("[startup-config] Configuration Validation");
  console.log(`[startup-config] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[startup-config] Database: ${config.services.database ? "configured" : "NOT configured"}`);
  console.log(`[startup-config] Auth: ${config.services.auth ? "configured" : "NOT configured"}`);
  console.log(`[startup-config] Email: ${config.services.email ? "configured" : "optional"}`);
  console.log(`[startup-config] WhatsApp: ${config.services.whatsapp ? "configured" : "optional"}`);

  if (config.warnings.length > 0 && !isProduction) {
    for (const warning of config.warnings) {
      console.warn(`[startup-config] WARNING: ${warning}`);
    }
  }

  if (config.degradedMode && isProduction) {
    console.warn("[startup-config] DEGRADED MODE: Only /health endpoints will work");
    console.warn(`[startup-config] Reason: ${config.degradedReason}`);
    setDegradedMode(true);
  }

  if (!config.valid && isProduction) {
    console.error(`[startup-config] FATAL: Missing required config: ${config.missing.join(", ")}`);
    console.error("[startup-config] Entering degraded mode - only health endpoints will respond");
  }
}

export function getRequiredEnvVarsList(): Array<{ name: string; description: string; required: boolean }> {
  return CONFIG_REQUIREMENTS.map(c => ({
    name: c.name,
    description: c.description,
    required: c.requiredInProduction,
  }));
}
