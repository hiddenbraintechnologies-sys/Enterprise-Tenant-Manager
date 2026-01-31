-- Add grace_until column to tenant_addons table for entitlement grace period support
-- This migration adds the graceUntil field for configurable grace periods

ALTER TABLE tenant_addons 
ADD COLUMN IF NOT EXISTS grace_until TIMESTAMP;

-- Add index for querying by grace period
CREATE INDEX IF NOT EXISTS idx_tenant_addons_grace_until ON tenant_addons(grace_until) WHERE grace_until IS NOT NULL;
