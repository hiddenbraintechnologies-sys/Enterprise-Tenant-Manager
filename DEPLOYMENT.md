# MyBizStream Production Deployment Guide

This document covers production deployment, environment configuration, migrations, and operational procedures.

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Database Migrations](#database-migrations)
3. [Health Checks](#health-checks)
4. [Production Guardrails](#production-guardrails)
5. [Monitoring](#monitoring)
6. [Rollback Procedures](#rollback-procedures)
7. [Backup & Restore](#backup--restore)

---

## Environment Variables

### Required Variables (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_ACCESS_SECRET` | JWT access token signing secret (min 32 chars) | `your-secure-random-string-here` |
| `JWT_REFRESH_SECRET` | JWT refresh token signing secret (min 32 chars) | `another-secure-random-string` |
| `SESSION_SECRET` | Express session secret (min 32 chars) | `session-secret-string` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `SLOW_QUERY_THRESHOLD` | Slow query logging threshold (ms) | `500` |
| `REPLIT_DOMAINS` | Replit domain configuration | Auto-detected |
| `ISSUER_URL` | OIDC issuer URL | Auto-detected |

### Third-Party Integration Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For WhatsApp |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For WhatsApp |
| `SENDGRID_API_KEY` | SendGrid API key | For Email |
| `OPENAI_API_KEY` | OpenAI API key | For AI features |

### Setting Environment Variables

```bash
# Replit Secrets (recommended for production)
# Use the Secrets tab in Replit to set sensitive values

# For local development
export DATABASE_URL="postgresql://..."
export JWT_ACCESS_SECRET="your-secret"
export NODE_ENV="development"
```

---

## Database Migrations

### Safe Production Migration

Always use the production migration script for database changes:

```bash
# Dry run - preview what will change
npx tsx server/scripts/migrate-production.ts --dry-run

# Run migration with confirmation prompt
npx tsx server/scripts/migrate-production.ts

# CI/CD - skip confirmation (use with caution)
npx tsx server/scripts/migrate-production.ts --force
```

### Migration Best Practices

1. **Always backup before migrating** (see Backup section)
2. **Run dry-run first** to preview changes
3. **Test migrations in staging** before production
4. **Never auto-migrate on boot** in production (controlled by script)

### Drizzle Kit Commands

```bash
# Generate migration files
npx drizzle-kit generate

# Push schema changes (development only)
npx drizzle-kit push

# View current schema status
npx drizzle-kit studio
```

---

## Health Checks

### Available Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Basic health check | `200 OK` with `{"status":"ok"}` |
| `GET /health/db` | Database connectivity | `200 OK` or `503` if DB unavailable |

### Monitoring Health

```bash
# Basic health check
curl -s https://your-app.replit.app/health | jq .

# Database health check
curl -s https://your-app.replit.app/health/db | jq .

# Expected healthy response
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Replit Deployment Health

Replit automatically monitors `/health` for deployment provisioning. The server:
- Starts responding to `/health` immediately
- Runs migrations and initialization in the background
- Returns `503` with retry message if still initializing

---

## Production Guardrails

### Automatic Protections

The following protections are **automatically enabled** in production:

| Protection | Description |
|------------|-------------|
| Environment Validation | Fails fast if required env vars missing |
| Seed/Demo Endpoint Block | Returns 403 for `/api/seed`, `/api/demo`, etc. |
| Rate Limit Enforcement | SKIP_RATE_LIMIT is ignored in production |
| Error Sanitization | Stack traces hidden in error responses |
| Correlation IDs | All requests get X-Correlation-Id header |

### Blocked Endpoints in Production

These endpoints return `403 Forbidden` in production:
- `/api/seed`
- `/api/demo`
- `/api/test-data`
- `/api/mock`
- `/api/reset-demo`
- `/api/clear-data`

### Rate Limiting

- Rate limiting is **always enforced** in production
- `SKIP_RATE_LIMIT=true` is ignored in production
- Rate limit status is logged at boot

---

## Monitoring

### Request Logging

All API requests are logged with:
- Method, path, status code, latency
- Correlation ID for request tracing
- Slow request warnings (>1000ms)

Example log format:
```
[request] GET /api/users 200 45ms [abc123def456]
[request] SLOW POST /api/reports 200 2500ms [xyz789abc012]
```

### Slow Query Logging

Queries exceeding threshold (default 500ms) are logged:
```
[slow-query] SELECT on users took 850ms (threshold: 500ms) [correlation-id]
```

Configure threshold:
```bash
export SLOW_QUERY_THRESHOLD=1000  # 1 second
```

### Error Tracking

All errors include correlation ID:
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "correlationId": "abc123def456",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Metrics Endpoints

| Endpoint | Format | Description |
|----------|--------|-------------|
| `/metrics` | Prometheus | Prometheus-format metrics |
| `/metrics/json` | JSON | JSON-format metrics |

---

## Rollback Procedures

### Application Rollback (Replit)

1. **Use Replit Checkpoints**
   - Go to Version History in Replit
   - Select a previous checkpoint
   - Click "Restore"

2. **Via Git** (if using external Git)
   ```bash
   git log --oneline -10  # Find target commit
   git checkout <commit-hash>
   ```

### Database Rollback

**Before any migration, create a backup!**

For Replit PostgreSQL (Neon):
1. Use the Database panel in Replit
2. Export data before migrations
3. Restore from backup if needed

For external databases:
```bash
# Restore from backup
pg_restore -d $DATABASE_URL backup.dump
```

### Emergency Rollback Steps

1. **Stop traffic** - If possible, pause incoming requests
2. **Identify issue** - Check logs for correlation ID
3. **Restore checkpoint** - Use Replit's checkpoint system
4. **Restore database** - If schema changed, restore from backup
5. **Verify health** - Check `/health` and `/health/db`
6. **Monitor** - Watch logs for recurring issues

---

## Backup & Restore

### Database Backup

**Replit PostgreSQL (Neon):**
- Automatic backups via Neon's infrastructure
- Manual export via Database panel
- Point-in-time recovery available

**Manual Backup (pg_dump):**
```bash
# Full backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Custom format (recommended for restore)
pg_dump -Fc $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Database Restore

```bash
# From SQL file
psql $DATABASE_URL < backup.sql

# From custom format
pg_restore -d $DATABASE_URL backup.dump

# With clean (drop existing)
pg_restore --clean -d $DATABASE_URL backup.dump
```

### Backup Schedule Recommendations

| Environment | Frequency | Retention |
|-------------|-----------|-----------|
| Production | Daily | 30 days |
| Before Migration | Always | Until verified |
| Before Major Update | Always | 7 days |

### Critical Data Export

For GDPR/DPDP compliance, export specific data:
```bash
# Export specific tables
pg_dump -t users -t customers $DATABASE_URL > users_backup.sql
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] Migration dry-run reviewed
- [ ] Rollback plan documented

### Deployment

- [ ] Run migrations with confirmation
- [ ] Deploy application
- [ ] Verify `/health` returns 200
- [ ] Verify `/health/db` returns 200
- [ ] Check logs for errors

### Post-Deployment

- [ ] Smoke test critical flows
- [ ] Monitor error rates
- [ ] Check slow query logs
- [ ] Verify rate limiting active
- [ ] Confirm seed endpoints blocked

---

## Troubleshooting

### Application Won't Start

1. Check environment variables: `echo $DATABASE_URL`
2. Check logs for `[env-validation] FATAL`
3. Ensure all required secrets are set

### Database Connection Failed

1. Verify `DATABASE_URL` is correct
2. Check `/health/db` endpoint
3. Verify network connectivity to database
4. Check database server status

### Rate Limiting Issues

1. Check boot logs for rate limit status
2. Verify `SKIP_RATE_LIMIT` is not set in production
3. Check `X-RateLimit-*` response headers

### Missing Correlation ID

1. Ensure `requestLoggerMiddleware` is active
2. Check for `X-Correlation-Id` response header
3. Verify middleware order in index.ts

---

## Support

For issues not covered in this guide:
1. Check application logs with correlation ID
2. Review recent deployments/changes
3. Check database connectivity and performance
4. Review rate limit and security logs
