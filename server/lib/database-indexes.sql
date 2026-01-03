-- BizFlow Performance Indexes
-- Run these indexes to optimize database performance

-- ============================================
-- MULTI-TENANT INDEXES (Critical for performance)
-- ============================================

-- Users: Tenant and email lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- User Tenants: Fast user-tenant association lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id) WHERE is_active = true;

-- Roles: Tenant-scoped role lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

-- Role Permissions: Permission checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- ============================================
-- BILLING INDEXES
-- ============================================

-- Invoices: Tenant and date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_date ON invoices(tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');

-- Payments: Transaction lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_reference) WHERE gateway_reference IS NOT NULL;

-- Subscriptions: Active subscription lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(tenant_id, status) WHERE status = 'active';

-- ============================================
-- WHATSAPP INDEXES
-- ============================================

-- Messages: Status and delivery tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(tenant_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(tenant_id, phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_provider_id ON whatsapp_messages(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- Conversations: Active conversation lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(tenant_id, phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_conversations_last_msg ON whatsapp_conversations(tenant_id, last_message_at DESC);

-- Templates: Template lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(tenant_id, status);

-- ============================================
-- DASHBOARD & ANALYTICS INDEXES
-- ============================================

-- Bookings: Date range analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_date ON bookings(tenant_id, booking_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);

-- Customers: Tenant and search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant ON customers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);

-- Services: Active services
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_tenant ON services(tenant_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_category ON services(tenant_id, category);

-- ============================================
-- AUDIT & COMPLIANCE INDEXES
-- ============================================

-- Audit Logs: Time-series queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- PHI Access Logs: Compliance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phi_access_tenant ON phi_access_logs(tenant_id, accessed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phi_access_patient ON phi_access_logs(patient_id);

-- ============================================
-- HEALTHCARE INDEXES
-- ============================================

-- Patients: Search and lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_tenant ON patients(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_mrn ON patients(tenant_id, mrn);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_phone ON patients(tenant_id, phone);

-- Appointments: Schedule queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, appointment_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, appointment_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_status ON appointments(tenant_id, status) WHERE status IN ('scheduled', 'confirmed');

-- EMR Records: Patient history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emr_records_patient ON emr_records(patient_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emr_records_doctor ON emr_records(doctor_id);

-- ============================================
-- FEATURE FLAGS & CONFIGURATION
-- ============================================

-- Tenant Features: Feature checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_features_tenant ON tenant_features(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_features_code ON tenant_features(feature_code);

-- Tenant Settings: Fast config lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- ============================================
-- FULL-TEXT SEARCH INDEXES (Optional)
-- ============================================

-- Customer search (requires pg_trgm extension)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_trgm ON customers USING gin (email gin_trgm_ops);

-- ============================================
-- ANALYZE TABLES AFTER CREATING INDEXES
-- ============================================

-- Run ANALYZE to update statistics
-- ANALYZE users;
-- ANALYZE user_tenants;
-- ANALYZE tenants;
-- ANALYZE invoices;
-- ANALYZE payments;
-- ANALYZE bookings;
-- ANALYZE customers;
-- ANALYZE audit_logs;
