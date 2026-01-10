# MyBizStream Production Launch Runbook

## Overview
This runbook provides comprehensive guidance for deploying, monitoring, and maintaining MyBizStream in production environments.

---

## 1. Required Environment Variables

### Critical (Required in Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_ACCESS_SECRET` | JWT access token signing secret (min 32 chars) | `your-secure-random-string-min-32-chars` |
| `JWT_REFRESH_SECRET` | JWT refresh token signing secret (min 32 chars) | `another-secure-random-string-min-32-chars` |
| `SESSION_SECRET` | Express session secret (min 32 chars) | `session-secret-min-32-characters` |
| `NODE_ENV` | Environment mode | `production` |

### Recommended (For Full Functionality)

| Variable | Description | Example |
|----------|-------------|---------|
| `REPLIT_DOMAINS` | Replit domain configuration | `mybizstream.replit.app` |
| `ISSUER_URL` | OIDC issuer URL | `https://replit.com` |
| `BASE_URL` | Application base URL | `https://mybizstream.example.com` |

### Optional (For Notification Services)

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key for email | `SG.xxxxx` |
| `RESEND_API_KEY` | Resend API key for email | `re_xxxxx` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `xxxxx` |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender | `whatsapp:+1234567890` |

### Optional (For Monitoring)

| Variable | Description | Example |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry DSN for error tracking | `https://xxx@sentry.io/xxx` |
| `LOG_LEVEL` | Logging verbosity | `info` |

---

## 2. Pre-Deployment Checklist

### Environment Preparation
- [ ] All required environment variables are set
- [ ] Database is accessible from production environment
- [ ] SSL certificates are configured (handled by Replit/cloud provider)
- [ ] DNS records are configured for custom domains

### Security Verification
- [ ] Rate limiting is enabled (enforced automatically in production)
- [ ] CORS is configured for production domains
- [ ] Session cookies use `secure` and `httpOnly` flags
- [ ] No secrets are logged (verified via structured logging)
- [ ] Dev/seed endpoints return 403 in production

### Run Pre-Publish Check
```bash
./scripts/prepublish-check.sh
```

---

## 3. Deployment Steps

### Replit Deployment
1. Ensure all environment variables are set in Secrets
2. Run pre-publish check: `./scripts/prepublish-check.sh`
3. Click "Publish" in Replit UI
4. Verify health endpoints after deployment
5. Run smoke tests: `npx tsx scripts/smoke-prod-check.ts https://your-app.replit.app`

### AWS Deployment (EKS)
1. Build container: `docker build -t mybizstream .`
2. Push to ECR: `docker push <ecr-repo>/mybizstream:latest`
3. Run migrations: `npx tsx scripts/migrate-deploy.ts`
4. Deploy to EKS: `kubectl apply -f k8s/`
5. Verify: `kubectl get pods -l app=mybizstream`
6. Run smoke tests against load balancer URL

### GCP Deployment (Cloud Run)
1. Build: `gcloud builds submit --tag gcr.io/<project>/mybizstream`
2. Deploy: `gcloud run deploy mybizstream --image gcr.io/<project>/mybizstream`
3. Run migrations against Cloud SQL
4. Run smoke tests against Cloud Run URL

---

## 4. Database Migrations

### Running Migrations
```bash
# Using drizzle-kit directly
npx drizzle-kit push

# Using migration script (with validation)
npx tsx scripts/migrate-deploy.ts
```

### Migration Safety Rules
1. Never modify primary key column types
2. Never drop columns in production without data migration
3. Always test migrations on staging first
4. Migrations are idempotent - safe to run multiple times

### Migration Status Check
The `/health/ready` endpoint includes migration status verification.

---

## 5. Health Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Basic liveness check | `{"status": "ok"}` |
| `GET /health/db` | Database connectivity | `{"status": "ok", "database": "connected"}` |
| `GET /health/ready` | Full readiness check | `{"ready": true, "status": "ok", "checks": [...]}` |

### Health Check Response Codes
- `200` - All checks passed
- `503` - One or more checks failed (degraded/unhealthy)

---

## 6. Smoke Tests

### Running Smoke Tests
```bash
# Local development
npx tsx scripts/smoke-prod-check.ts http://localhost:5000

# Production
npx tsx scripts/smoke-prod-check.ts https://your-app.example.com

# With environment variable
SMOKE_TEST_URL=https://your-app.example.com npx tsx scripts/smoke-prod-check.ts
```

### What Smoke Tests Verify
1. Health endpoints respond correctly
2. API endpoints require authentication
3. Tenant isolation blocks cross-tenant access
4. Dev/seed endpoints are blocked in production
5. Rate limiting headers are present

---

## 7. Rollback Plan

### Replit Rollback
1. Open the Replit project
2. Go to Version History / Checkpoints
3. Select the last known working checkpoint
4. Click "Restore"

### Database Rollback
1. **STOP** - Assess the severity of the issue
2. For schema issues:
   - Revert code to previous version
   - Schema will auto-sync on restart (if using drizzle-kit push)
3. For data issues:
   - Use point-in-time recovery (if available)
   - Or restore from backup

### AWS/GCP Rollback
```bash
# AWS EKS
kubectl rollout undo deployment/mybizstream

# GCP Cloud Run
gcloud run services update-traffic mybizstream --to-revisions=<previous-revision>=100
```

---

## 8. Monitoring Checklist

### Endpoints to Monitor

| Endpoint | Alert Threshold | Priority |
|----------|-----------------|----------|
| `GET /health` | Response time > 500ms or 5xx | P1 |
| `GET /health/db` | 503 for > 30s | P1 |
| `GET /health/ready` | 503 for > 2min | P2 |
| `POST /api/auth/login` | Error rate > 5% | P2 |
| API endpoints | Error rate > 1% | P3 |

### Key Metrics to Track
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database connection pool utilization
- Memory usage
- Request throughput

### Structured Logging Categories
- `auth` - Authentication events
- `tenant-isolation` - Cross-tenant access blocks
- `database` - Database connection issues
- `config` - Configuration errors
- `security` - Security events (rate limits, blocked requests)

---

## 9. Incident Response Checklists

### Database Unavailable (P1)
1. Check `/health/db` endpoint
2. Verify DATABASE_URL is correct
3. Check database server status (Neon dashboard, AWS RDS, etc.)
4. Check connection pool status
5. If persistent, failover to replica (if available)
6. Communicate to stakeholders

### Authentication System Down (P1)
1. Check `/health/ready` for auth service status
2. Verify JWT secrets are configured
3. Check Replit Auth / OIDC provider status
4. Verify session store connectivity
5. Check rate limiting hasn't locked out all users

### WhatsApp/Email Notifications Failing (P3)
1. Check Twilio/SendGrid dashboard
2. Verify API keys are valid
3. Check for rate limiting from provider
4. Review structured logs for `whatsapp` category
5. Notifications are non-critical - service continues

### High Error Rate (P2)
1. Check `/health/ready` for system status
2. Review recent deployments
3. Check structured logs for patterns
4. Check database performance
5. Consider rollback if deployment-related

---

## 10. Degraded Mode

When critical configuration is missing, the application enters "degraded mode":
- Only `/health`, `/health/db`, `/health/ready` endpoints respond
- All other endpoints return `503 Service Unavailable`
- Check startup logs for missing configuration

### Exiting Degraded Mode
1. Configure missing environment variables
2. Restart the application
3. Verify `/health/ready` returns `200`

---

## 11. Security Notes

### Rate Limiting
- **Always enforced in production** (SKIP_RATE_LIMIT is ignored)
- Login endpoints: 5 requests/15 minutes per IP
- API endpoints: 100 requests/minute per user

### Blocked Endpoints in Production
- `/api/seed/*`
- `/api/demo/*`
- `/api/test-data/*`
- `/api/mock/*`

### Cookie Security (Production)
- `httpOnly: true`
- `secure: true` (HTTPS only)
- `sameSite: 'lax'`

---

## 12. Support Contacts

- **Technical Issues**: Check GitHub issues or Replit support
- **Database Issues**: Contact your database provider (Neon, AWS RDS, etc.)
- **Auth Issues**: Check Replit Auth documentation
- **Billing**: Contact Replit support

---

## Appendix: Quick Reference Commands

```bash
# Check TypeScript compilation
npx tsc -p tsconfig.release.json --noEmit

# Run tests
npx jest --no-coverage

# Run migrations
npx tsx scripts/migrate-deploy.ts

# Run smoke tests
npx tsx scripts/smoke-prod-check.ts <URL>

# Pre-publish check
./scripts/prepublish-check.sh

# Start in production mode
NODE_ENV=production node dist/index.cjs
```
