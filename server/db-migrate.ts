import { sql } from "drizzle-orm";
import { db } from "./db";

export async function runMigrations(): Promise<void> {
  console.log("[db-migrate] Running database migrations...");
  
  try {
    // Test database connection first
    await db.execute(sql`SELECT 1`);
    console.log("[db-migrate] Database connection successful");
    
    // Create enums if they don't exist
    await createEnumsIfNotExist();
    
    // Create tables if they don't exist
    await createTablesIfNotExist();
    
    console.log("[db-migrate] Migrations completed successfully");
  } catch (error) {
    console.error("[db-migrate] Migration error:", error);
    // Don't throw - let the app try to start and show the actual error
  }
}

async function createEnumsIfNotExist(): Promise<void> {
  // Create tenant_country enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE tenant_country AS ENUM ('india', 'uae', 'uk', 'malaysia', 'singapore');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create tenant_region enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE tenant_region AS ENUM ('asia_pacific', 'middle_east', 'europe');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create whatsapp_provider enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE whatsapp_provider AS ENUM ('meta', 'gupshup', 'twilio');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create whatsapp_template_status enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE whatsapp_template_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create ai_audit_action enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE ai_audit_action AS ENUM ('invoke', 'complete', 'error', 'denied', 'rate_limited');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create region_status enum
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE region_status AS ENUM ('enabled', 'disabled', 'maintenance', 'coming_soon');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  
  console.log("[db-migrate] Enums created/verified");
}

async function createTablesIfNotExist(): Promise<void> {
  // Add country column to tenants if missing
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country tenant_country DEFAULT 'india';
    EXCEPTION WHEN undefined_column THEN null;
    END $$;
  `);
  
  // Create whatsapp_provider_configs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS whatsapp_provider_configs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      country tenant_country NOT NULL,
      primary_provider whatsapp_provider NOT NULL,
      fallback_provider whatsapp_provider,
      business_phone_number VARCHAR(20),
      business_phone_number_id VARCHAR(100),
      provider_config JSONB DEFAULT '{}',
      monthly_quota INTEGER DEFAULT 10000,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create country_pricing_configs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS country_pricing_configs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      country tenant_country NOT NULL UNIQUE,
      currency_code VARCHAR(3) NOT NULL,
      currency_symbol VARCHAR(5) NOT NULL,
      tax_name VARCHAR(50) DEFAULT 'Tax',
      tax_rate NUMERIC(5,2) DEFAULT 0,
      min_transaction_amount NUMERIC(10,2) DEFAULT 0,
      payment_methods JSONB DEFAULT '[]',
      locale VARCHAR(10) DEFAULT 'en',
      date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create plan_local_prices table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plan_local_prices (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      plan_id VARCHAR NOT NULL,
      country tenant_country NOT NULL,
      monthly_price NUMERIC(10,2) NOT NULL,
      yearly_price NUMERIC(10,2),
      currency_code VARCHAR(3) NOT NULL,
      stripe_price_id_monthly VARCHAR(255),
      stripe_price_id_yearly VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create platform_region_configs table (matches shared/schema.ts exactly)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_region_configs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
      country_code VARCHAR(5) NOT NULL UNIQUE,
      country_name VARCHAR(100) NOT NULL,
      region tenant_region NOT NULL,
      status region_status DEFAULT 'enabled' NOT NULL,
      registration_enabled BOOLEAN DEFAULT true NOT NULL,
      billing_enabled BOOLEAN DEFAULT true NOT NULL,
      compliance_packs_enabled BOOLEAN DEFAULT true NOT NULL,
      allowed_business_types JSONB,
      allowed_subscription_tiers JSONB,
      default_currency VARCHAR(5) NOT NULL,
      default_timezone VARCHAR(50) NOT NULL,
      required_compliance_packs JSONB DEFAULT '[]',
      data_residency_required BOOLEAN DEFAULT false NOT NULL,
      data_residency_region VARCHAR(50),
      tax_type VARCHAR(20),
      tax_rate NUMERIC(5,2),
      tax_inclusive BOOLEAN DEFAULT false NOT NULL,
      sms_enabled BOOLEAN DEFAULT true NOT NULL,
      whatsapp_enabled BOOLEAN DEFAULT true NOT NULL,
      email_enabled BOOLEAN DEFAULT true NOT NULL,
      maintenance_message TEXT,
      maintenance_start_at TIMESTAMP,
      maintenance_end_at TIMESTAMP,
      launch_date TIMESTAMP,
      beta_access_only BOOLEAN DEFAULT false NOT NULL,
      beta_access_codes JSONB DEFAULT '[]',
      created_by VARCHAR,
      updated_by VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  console.log("[db-migrate] Tables created/verified");
}
