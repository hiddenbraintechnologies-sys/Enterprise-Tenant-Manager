import { db } from "../db";
import { sql } from "drizzle-orm";

export const migration_003_add_onboarding = {
  name: "003_add_onboarding",
  
  async run(): Promise<void> {
    console.log("\n============================================================");
    console.log("Running Migration: 003_add_onboarding");
    console.log("============================================================\n");

    // Add onboarding columns to tenants table
    console.log("Adding onboarding columns to tenants table...\n");

    // Check and add onboarding_completed column
    const onboardingCompletedExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'onboarding_completed'
      );
    `);
    
    if (!onboardingCompletedExists.rows[0]?.exists) {
      await db.execute(sql`
        ALTER TABLE tenants 
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
      `);
      console.log("  [ADD] Added column 'onboarding_completed' to tenants");
    } else {
      console.log("  [SKIP] Column 'onboarding_completed' already exists");
    }

    // Check and add business_type_locked column
    const businessTypeLockedExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'business_type_locked'
      );
    `);
    
    if (!businessTypeLockedExists.rows[0]?.exists) {
      await db.execute(sql`
        ALTER TABLE tenants 
        ADD COLUMN business_type_locked BOOLEAN DEFAULT false;
      `);
      console.log("  [ADD] Added column 'business_type_locked' to tenants");
    } else {
      console.log("  [SKIP] Column 'business_type_locked' already exists");
    }

    // Create onboarding_status enum if not exists
    const statusEnumExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'onboarding_status'
      );
    `);
    
    if (!statusEnumExists.rows[0]?.exists) {
      await db.execute(sql`
        CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');
      `);
      console.log("  [ADD] Created enum 'onboarding_status'");
    } else {
      console.log("  [SKIP] Enum 'onboarding_status' already exists");
    }

    // Create onboarding_flows table if not exists
    const flowsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_flows'
      );
    `);
    
    if (!flowsTableExists.rows[0]?.exists) {
      await db.execute(sql`
        CREATE TABLE onboarding_flows (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          business_type VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          version INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_flows_business_type ON onboarding_flows(business_type);
      `);
      console.log("  [ADD] Created table 'onboarding_flows'");
    } else {
      console.log("  [SKIP] Table 'onboarding_flows' already exists");
    }

    // Create onboarding_steps table if not exists
    const stepsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_steps'
      );
    `);
    
    if (!stepsTableExists.rows[0]?.exists) {
      await db.execute(sql`
        CREATE TABLE onboarding_steps (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          flow_id VARCHAR NOT NULL REFERENCES onboarding_flows(id) ON DELETE CASCADE,
          step_order INTEGER NOT NULL,
          step_key VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          component VARCHAR(255) NOT NULL,
          is_required BOOLEAN DEFAULT true,
          is_skippable BOOLEAN DEFAULT false,
          config JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_steps_flow_id ON onboarding_steps(flow_id);
      `);
      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_steps_flow_order ON onboarding_steps(flow_id, step_order);
      `);
      console.log("  [ADD] Created table 'onboarding_steps'");
    } else {
      console.log("  [SKIP] Table 'onboarding_steps' already exists");
    }

    // Create onboarding_progress table if not exists
    const progressTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'onboarding_progress'
      );
    `);
    
    if (!progressTableExists.rows[0]?.exists) {
      await db.execute(sql`
        CREATE TABLE onboarding_progress (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          flow_id VARCHAR NOT NULL REFERENCES onboarding_flows(id) ON DELETE CASCADE,
          current_step_index INTEGER DEFAULT 0,
          status onboarding_status DEFAULT 'not_started',
          step_data JSONB DEFAULT '{}',
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          last_activity_at TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, flow_id)
        );
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant_id ON onboarding_progress(tenant_id);
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_progress_status ON onboarding_progress(status);
      `);
      console.log("  [ADD] Created table 'onboarding_progress'");
    } else {
      console.log("  [SKIP] Table 'onboarding_progress' already exists");
    }

    console.log("\n============================================================");
    console.log("Migration Complete: 003_add_onboarding");
    console.log("============================================================\n");
  }
};
