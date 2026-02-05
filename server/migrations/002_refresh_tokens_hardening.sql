-- Migration: Harden refresh_tokens table for production load
-- Adds UNIQUE constraint, partial indexes, and staff index
-- Created: 2026-02-05

-- Step 1: Clean up any duplicate token_hash entries (keep newest, revoke others)
-- This is a safety measure before adding UNIQUE constraint
WITH dups AS (
  SELECT token_hash, array_agg(id ORDER BY created_at DESC) AS ids
  FROM refresh_tokens
  GROUP BY token_hash
  HAVING COUNT(*) > 1
)
UPDATE refresh_tokens rt
SET is_revoked = TRUE,
    revoked_at = NOW(),
    revoke_reason = 'security_event'
FROM dups
WHERE rt.token_hash = dups.token_hash
  AND rt.id <> dups.ids[1];

-- Step 2: Add UNIQUE constraint on token_hash (critical for rotation/reuse detection)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_token_hash_unique'
  ) THEN
    ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash);
  END IF;
END$$;

-- Step 3: Add partial index for active token queries (hot path optimization)
-- Filters: revoked_at IS NULL AND is_revoked = false
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
ON refresh_tokens (tenant_id, user_id, expires_at)
WHERE revoked_at IS NULL AND is_revoked = false;

-- Step 4: Add index on staff_id for staff-based token revocation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_staff
ON refresh_tokens (staff_id)
WHERE staff_id IS NOT NULL;

-- Step 5: Add index on revoked_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at
ON refresh_tokens (revoked_at)
WHERE revoked_at IS NOT NULL;

-- Step 6: Add index on expires_at for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
ON refresh_tokens (expires_at)
WHERE revoked_at IS NULL;

-- Comments for documentation
COMMENT ON CONSTRAINT refresh_tokens_token_hash_unique ON refresh_tokens 
IS 'Ensures each token hash is unique - critical for rotation security';
COMMENT ON INDEX idx_refresh_tokens_active 
IS 'Partial index for active (non-revoked) token lookups';
