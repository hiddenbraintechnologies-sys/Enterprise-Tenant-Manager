-- Migration: Add missing columns to refresh_tokens table
-- This migration is idempotent and can be run multiple times safely
-- Created: 2026-02-05

-- Create enum type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refresh_token_revoke_reason') THEN
        CREATE TYPE refresh_token_revoke_reason AS ENUM ('rotation', 'logout', 'expired', 'force_logout', 'reuse_detected', 'session_invalidated', 'admin_revoke');
    END IF;
END$$;

-- Add staff_id column (references tenant_staff)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS staff_id VARCHAR REFERENCES tenant_staff(id) ON DELETE CASCADE;

-- Add token family tracking columns
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS family_id VARCHAR(100);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS parent_id VARCHAR(100);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by_token_id VARCHAR(100);

-- Add device/request metadata columns
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64);

-- Add timestamp columns with proper defaults
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoke_reason VARCHAR(50);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS suspicious_reuse_at TIMESTAMPTZ;

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant ON refresh_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_staff ON refresh_tokens(staff_id);

-- Comments for documentation
COMMENT ON COLUMN refresh_tokens.staff_id IS 'Reference to tenant_staff for staff-based sessions, nullable for owner/user-only sessions';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Token family ID for rotation tracking - all tokens in a family share this ID';
COMMENT ON COLUMN refresh_tokens.parent_id IS 'ID of the token this was rotated from';
COMMENT ON COLUMN refresh_tokens.suspicious_reuse_at IS 'Timestamp when reuse was detected for this token';
