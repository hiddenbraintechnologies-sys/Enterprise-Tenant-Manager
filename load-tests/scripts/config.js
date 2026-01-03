// BizFlow Load Testing Configuration
// Shared configuration for all k6 test scripts

export const config = {
  // Base URL - override with K6_BASE_URL environment variable
  baseUrl: __ENV.K6_BASE_URL || 'http://localhost:5000',
  
  // Test tenants for multi-tenant simulation
  // Covers all business types: clinic, salon, pg, coworking, service, real_estate, tourism, education, logistics, legal
  tenants: [
    { id: 'tenant-001', name: 'Acme Corp', tier: 'enterprise', businessType: 'service' },
    { id: 'tenant-002', name: 'Beta Inc', tier: 'pro', businessType: 'clinic' },
    { id: 'tenant-003', name: 'Gamma LLC', tier: 'starter', businessType: 'salon' },
    { id: 'tenant-004', name: 'Delta Co', tier: 'pro', businessType: 'pg' },
    { id: 'tenant-005', name: 'Echo Ltd', tier: 'enterprise', businessType: 'coworking' },
    { id: 'tenant-006', name: 'Urban Realty', tier: 'pro', businessType: 'real_estate' },
    { id: 'tenant-007', name: 'Skyline Properties', tier: 'enterprise', businessType: 'real_estate' },
    { id: 'tenant-008', name: 'Wanderlust Tours', tier: 'pro', businessType: 'tourism' },
    { id: 'tenant-009', name: 'Explorer Adventures', tier: 'starter', businessType: 'tourism' },
    { id: 'tenant-010', name: 'EduTech Academy', tier: 'pro', businessType: 'education' },
    { id: 'tenant-011', name: 'Swift Logistics', tier: 'enterprise', businessType: 'logistics' },
    { id: 'tenant-012', name: 'Justice Partners LLP', tier: 'pro', businessType: 'legal' },
  ],
  
  // Test users per tenant
  usersPerTenant: 10,
  
  // API endpoints
  endpoints: {
    auth: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh',
      me: '/api/auth/me',
    },
    dashboard: {
      overview: '/api/dashboard/overview',
      analytics: '/api/dashboard/analytics',
      metrics: '/api/dashboard/metrics',
      recent: '/api/dashboard/recent-activity',
    },
    billing: {
      subscription: '/api/billing/subscription',
      invoices: '/api/billing/invoices',
      usage: '/api/billing/usage',
      paymentMethods: '/api/billing/payment-methods',
      checkout: '/api/billing/checkout',
    },
    whatsapp: {
      send: '/api/whatsapp/messages/send',
      status: '/api/whatsapp/messages/status',
      templates: '/api/whatsapp/templates',
      conversations: '/api/whatsapp/conversations',
    },
  },
  
  // Thresholds for performance requirements
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>100'],
  },
};

// Helper to get random tenant
export function getRandomTenant() {
  const idx = Math.floor(Math.random() * config.tenants.length);
  return config.tenants[idx];
}

// Helper to generate test user credentials
export function generateTestUser(tenantId, userIndex) {
  return {
    email: `user${userIndex}@${tenantId}.test`,
    password: 'TestPassword123!',
    tenantId: tenantId,
  };
}

// Helper to build full URL
export function buildUrl(path) {
  return `${config.baseUrl}${path}`;
}

// Common headers
export function getHeaders(token = null, tenantId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  return headers;
}
