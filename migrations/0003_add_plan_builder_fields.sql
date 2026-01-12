-- Migration: Add Plan Builder fields for Super Admin management
-- Adds missing columns and backfills defaults for billing plan management
-- Idempotent: Safe to run multiple times

-- Step 1: Add is_recommended column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'global_pricing_plans' AND column_name = 'is_recommended'
    ) THEN
        ALTER TABLE global_pricing_plans ADD COLUMN is_recommended BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added column: is_recommended';
    ELSE
        RAISE NOTICE 'Column is_recommended already exists';
    END IF;
END
$$;

-- Step 2: Backfill any NULL values for existing columns with safe defaults
UPDATE global_pricing_plans SET billing_cycle = 'monthly' WHERE billing_cycle IS NULL;
UPDATE global_pricing_plans SET is_public = true WHERE is_public IS NULL;
UPDATE global_pricing_plans SET sort_order = 100 WHERE sort_order IS NULL;
UPDATE global_pricing_plans SET feature_flags = '{}'::jsonb WHERE feature_flags IS NULL;
UPDATE global_pricing_plans SET limits = '{}'::jsonb WHERE limits IS NULL;
UPDATE global_pricing_plans SET is_recommended = false WHERE is_recommended IS NULL;
UPDATE global_pricing_plans SET version = 1 WHERE version IS NULL;
UPDATE global_pricing_plans SET is_active = true WHERE is_active IS NULL;

-- Step 3: Set recommended=true for india_basic plan
UPDATE global_pricing_plans 
SET is_recommended = true, updated_at = NOW()
WHERE code = 'india_basic';

-- Step 4: Ensure correct sort_order for India plans
UPDATE global_pricing_plans SET sort_order = 10, updated_at = NOW() WHERE code = 'india_free';
UPDATE global_pricing_plans SET sort_order = 20, updated_at = NOW() WHERE code = 'india_basic';
UPDATE global_pricing_plans SET sort_order = 30, updated_at = NOW() WHERE code = 'india_pro';

-- Step 5: Add index on archived_at for efficient filtering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'global_pricing_plans' AND indexname = 'idx_global_pricing_plans_archived'
    ) THEN
        CREATE INDEX idx_global_pricing_plans_archived ON global_pricing_plans (archived_at);
        RAISE NOTICE 'Added index: idx_global_pricing_plans_archived';
    ELSE
        RAISE NOTICE 'Index idx_global_pricing_plans_archived already exists';
    END IF;
END
$$;

-- Step 6: Verify India currency constraint exists (from previous migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_india_plans_inr_currency'
    ) THEN
        ALTER TABLE global_pricing_plans
        ADD CONSTRAINT chk_india_plans_inr_currency
        CHECK (country_code != 'IN' OR currency_code = 'INR');
        RAISE NOTICE 'Added CHECK constraint: chk_india_plans_inr_currency';
    ELSE
        RAISE NOTICE 'CHECK constraint chk_india_plans_inr_currency already exists';
    END IF;
END
$$;
