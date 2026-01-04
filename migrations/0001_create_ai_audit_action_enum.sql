-- Migration: Create ai_audit_action enum
-- Idempotent: Safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_audit_action') THEN
        CREATE TYPE ai_audit_action AS ENUM (
            'invoke',
            'complete',
            'error',
            'denied',
            'rate_limited'
        );
    END IF;
END
$$;
