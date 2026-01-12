-- Migration: Enforce India plans must use INR currency
-- This adds a database-level guardrail ensuring country_code='IN' requires currency_code='INR'
-- Idempotent: Safe to run multiple times

-- Step 1: Fix any existing India plans with incorrect currency (safe update first)
UPDATE global_pricing_plans
SET 
    currency_code = 'INR',
    updated_at = NOW()
WHERE country_code = 'IN' 
  AND (currency_code IS NULL OR currency_code != 'INR');

-- Step 2: Add CHECK constraint to prevent future invalid data
-- The constraint ensures: if country_code is 'IN', then currency_code must be 'INR'
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
