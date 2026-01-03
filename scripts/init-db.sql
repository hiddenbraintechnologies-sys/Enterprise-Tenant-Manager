-- BizFlow Database Initialization Script
-- This script runs when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone TO 'UTC';

-- Create application user if not exists (for production)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bizflow_app') THEN
--         CREATE ROLE bizflow_app WITH LOGIN PASSWORD 'change_me_in_production';
--     END IF;
-- END
-- $$;

-- Grant privileges
-- GRANT ALL PRIVILEGES ON DATABASE bizflow TO bizflow_app;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'BizFlow database initialized at %', now();
END $$;
