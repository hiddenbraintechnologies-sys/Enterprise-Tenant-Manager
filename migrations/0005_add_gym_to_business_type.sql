-- Migration: Add 'gym' to business_type enum
-- Safe idempotent migration - only adds if not already present

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'business_type' AND e.enumlabel = 'gym'
  ) THEN
    ALTER TYPE business_type ADD VALUE 'gym';
  END IF;
END $$;
