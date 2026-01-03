# BizFlow Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing BizFlow platform performance based on load test analysis and production monitoring.

## Performance Analysis Tools

### Load Test Analyzer

Run after load tests to get actionable insights:

```bash
# Analyze latest results
node load-tests/analysis/analyze-results.js --latest

# Generate HTML report
node load-tests/analysis/analyze-results.js --latest --html

# CI mode (fails on SLO breach)
node load-tests/analysis/analyze-results.js --latest --ci
```

### Key Metrics to Monitor

| Metric | SLO Target | Critical Threshold |
|--------|------------|-------------------|
| Response Time (p95) | < 500ms | > 1000ms |
| Response Time (p99) | < 1000ms | > 2000ms |
| Error Rate | < 1% | > 5% |
| Throughput | > 100 req/s | < 50 req/s |

## Database Optimization

### 1. Enable Query Logging

```sql
-- PostgreSQL configuration
ALTER SYSTEM SET log_min_duration_statement = 200;
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 2. Query Analysis

```sql
-- Find slowest queries
SELECT 
  calls,
  mean_time::numeric(10,2) as avg_ms,
  total_time::numeric(10,2) as total_ms,
  query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Find most called queries
SELECT 
  calls,
  mean_time::numeric(10,2) as avg_ms,
  query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

### 3. Essential Indexes

```sql
-- Multi-tenant indexes (critical for performance)
CREATE INDEX CONCURRENTLY idx_users_tenant 
ON users(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_invoices_tenant_date 
ON invoices(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_tenant_status 
ON whatsapp_messages(tenant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_tenant_date 
ON audit_logs(tenant_id, created_at DESC);
```

### 4. N+1 Query Detection

The query tracker middleware automatically detects N+1 patterns:

```typescript
import { queryTrackerMiddleware } from './middleware/performance/query-tracker';

app.use(queryTrackerMiddleware);
```

Signs of N+1 issues:
- Same query executed 3+ times in one request
- Total query count > 10 per request
- High variance in response times

**Fix N+1 with eager loading:**

```typescript
// Bad: N+1 pattern
const users = await db.select().from(users).where(eq(tenantId, id));
for (const user of users) {
  const profile = await db.select().from(profiles).where(eq(userId, user.id));
}

// Good: Join query
const usersWithProfiles = await db
  .select()
  .from(users)
  .leftJoin(profiles, eq(users.id, profiles.userId))
  .where(eq(users.tenantId, id));
```

### 5. Connection Pooling

```typescript
// Recommended pool settings
const pool = new Pool({
  max: 20,                    // Max connections
  min: 5,                     // Min connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000,
});
```

For high traffic, use PgBouncer:

```ini
# pgbouncer.ini
[databases]
bizflow = host=localhost dbname=bizflow

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

## Caching Strategy

### 1. Redis Caching

```typescript
// Cache dashboard analytics
const CACHE_TTL = 300; // 5 minutes

async function getDashboardAnalytics(tenantId: string) {
  const cacheKey = `dashboard:${tenantId}:analytics`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query database
  const data = await queryAnalytics(tenantId);
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  
  return data;
}
```

### 2. Cache Invalidation

```typescript
// Invalidate on data change
async function updateTenantData(tenantId: string, data: any) {
  await db.update(tenants).set(data).where(eq(id, tenantId));
  
  // Invalidate related caches
  await redis.del(`dashboard:${tenantId}:*`);
  await redis.del(`tenant:${tenantId}:config`);
}
```

### 3. Cache Warming

```typescript
// Pre-warm cache during off-peak
async function warmCaches() {
  const activeTenants = await getActiveTenants();
  
  for (const tenant of activeTenants) {
    await getDashboardAnalytics(tenant.id);
    await getTenantConfig(tenant.id);
  }
}
```

## API Optimization

### 1. Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024,  // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

### 2. Pagination

```typescript
// Always paginate list endpoints
app.get('/api/invoices', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    db.select().from(invoices).limit(limit).offset(offset),
    db.select({ count: count() }).from(invoices),
  ]);
  
  res.json({
    data: items,
    pagination: { page, limit, total: total[0].count },
  });
});
```

### 3. Request Timeouts

```typescript
// Set timeouts for all requests
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
```

### 4. Slow Endpoint Optimization

| Endpoint | Issue | Solution |
|----------|-------|----------|
| `/api/dashboard/analytics` | Heavy aggregation | Materialized views + caching |
| `/api/billing/invoices` | Large result sets | Pagination + selective fields |
| `/api/whatsapp/send` | External API calls | Queue + async processing |
| `/api/auth/login` | Password hashing | Reduce bcrypt rounds (10-12) |

## Resource Monitoring

### 1. Prometheus Metrics

Access metrics at `/metrics`:

```
# CPU
process_cpu_user_seconds_total

# Memory
nodejs_heap_used_bytes
nodejs_heap_total_bytes

# HTTP
http_requests_total{method,path,status}
http_request_duration_seconds{method,path}

# Database
database_queries_total{operation}
database_query_duration_seconds{operation}
```

### 2. Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {},
  };
  
  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    health.checks.database = 'ok';
  } catch (e) {
    health.status = 'unhealthy';
    health.checks.database = 'error';
  }
  
  // Redis check
  try {
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (e) {
    health.checks.redis = 'error';
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 3. Resource Limits

```yaml
# Kubernetes resource limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Performance Checklist

### Pre-Deployment

- [ ] Run load tests against staging
- [ ] Analyze results with `analyze-results.js`
- [ ] Verify no SLO breaches
- [ ] Check for N+1 query warnings
- [ ] Review slow query logs

### Database

- [ ] All multi-tenant tables have tenant_id indexes
- [ ] Slow queries (>200ms) are identified and optimized
- [ ] Connection pool sized appropriately
- [ ] pg_stat_statements enabled

### Caching

- [ ] Dashboard analytics cached
- [ ] Tenant configuration cached
- [ ] Cache invalidation implemented
- [ ] Cache TTLs appropriate for data freshness needs

### API

- [ ] Response compression enabled
- [ ] All list endpoints paginated
- [ ] Request timeouts configured
- [ ] Slow endpoints identified and queued

### Monitoring

- [ ] Prometheus metrics exposed
- [ ] Health check endpoint working
- [ ] Alerting configured for SLO breaches
- [ ] Dashboard for key metrics

## Common Performance Issues

### 1. High Response Time Variance

**Symptoms:** Max response time 10x+ higher than average

**Causes:**
- Cold database cache
- Connection pool exhaustion
- N+1 queries
- Garbage collection pauses

**Solutions:**
- Pre-warm caches
- Increase connection pool size
- Fix N+1 patterns
- Tune Node.js GC settings

### 2. Throughput Degradation Under Load

**Symptoms:** Response times increase linearly with load

**Causes:**
- CPU-bound operations
- Blocking I/O
- Insufficient horizontal scaling

**Solutions:**
- Move heavy computation to workers
- Use async I/O consistently
- Add more API replicas

### 3. Memory Leaks

**Symptoms:** Memory usage grows over time

**Causes:**
- Unclosed connections
- Growing caches without eviction
- Event listener accumulation

**Solutions:**
- Implement proper cleanup
- Use LRU cache with max size
- Remove event listeners on cleanup

---

**Document Version:** 1.0  
**Last Updated:** January 2026
