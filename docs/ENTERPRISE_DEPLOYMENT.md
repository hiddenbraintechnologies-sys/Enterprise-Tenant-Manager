# BizFlow Enterprise Deployment Guide

## Overview

This document provides comprehensive guidance for deploying BizFlow in enterprise environments with Docker, CI/CD pipelines, database migrations, and zero-downtime deployment support.

## Quick Start

### Development Environment

```bash
# Clone repository
git clone https://github.com/bizflow/bizflow.git
cd bizflow

# Copy environment file
cp .env.example .env

# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f api
```

### Production Environment

```bash
# Copy and configure environment
cp .env.example .env.production
# Edit .env.production with production values

# Deploy
./scripts/deploy.sh production v1.0.0
```

## Docker Architecture

### Multi-Stage Build

The Dockerfile uses multi-stage builds for optimal image size and security:

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: base                                              │
│  - Node.js 20 Alpine                                        │
│  - Security updates                                         │
│  - dumb-init for signal handling                           │
└─────────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  Stage 2: deps                                              │
│  - Install all dependencies                                 │
└─────────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  Stage 3: builder                                           │
│  - TypeScript compilation                                   │
│  - Frontend build                                           │
└─────────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  Stage 4: prod-deps                                         │
│  - Production dependencies only                             │
└─────────────────────────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────────┐
│  Stage 5: runner (Final Image)                              │
│  - Minimal footprint                                        │
│  - Non-root user                                            │
│  - Health checks                                            │
└─────────────────────────────────────────────────────────────┘
```

### Image Size Optimization

| Stage | Size | Purpose |
|-------|------|---------|
| base | ~180MB | Node.js runtime |
| deps | ~500MB | All dependencies |
| builder | ~800MB | Build artifacts |
| runner | ~250MB | Production image |

## Environment Configuration

### Environment Files

| File | Purpose |
|------|---------|
| `.env.example` | Template with all variables |
| `.env` | Local development |
| `.env.development` | Development environment |
| `.env.staging` | Staging environment |
| `.env.production` | Production environment |

### Required Variables

```bash
# Core
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Cache
REDIS_URL=redis://:password@host:6379

# Security
SESSION_SECRET=<32+ character random string>
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<32+ character random string>
```

### Secret Generation

```bash
# Generate secure secrets
openssl rand -hex 32  # For session/JWT secrets
openssl rand -base64 48  # Alternative method
```

## Database Migrations

### Drizzle ORM Setup

BizFlow uses Drizzle ORM for type-safe database migrations.

#### Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema directly (development only)
npm run db:push

# Run pending migrations
npm run db:migrate

# View migration status
npm run db:status
```

#### Migration Workflow

```
1. Modify shared/schema.ts
          │
          ▼
2. npm run db:generate
   (Creates migration SQL in drizzle/)
          │
          ▼
3. Review generated migration
   (Check drizzle/*.sql files)
          │
          ▼
4. npm run db:migrate
   (Apply to development database)
          │
          ▼
5. Commit migration files
          │
          ▼
6. Deploy (migrations run automatically)
```

### Migration Best Practices

1. **Always review generated migrations** before applying
2. **Never modify applied migrations** - create new ones
3. **Test migrations on staging** before production
4. **Backup database** before production migrations
5. **Use transactions** for data migrations

### Rollback Strategy

```bash
# View migration history
npm run db:status

# Manual rollback (create reverse migration)
# 1. Create new migration that reverses changes
# 2. Apply the rollback migration
```

## Backup & Restore

### Automated Backups

```bash
# Full backup
./scripts/backup.sh full production

# Schema-only backup
./scripts/backup.sh schema production

# Incremental backup (requires WAL archiving)
./scripts/backup.sh incremental production
```

### Backup Schedule (Recommended)

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full | Daily | 30 days |
| Schema | Weekly | 90 days |
| Incremental | Hourly | 7 days |
| Transaction Logs | Continuous | 7 days |

### Restore Process

```bash
# Restore from backup
./scripts/restore.sh /backups/bizflow_production_full_20240115.dump

# Restore to different database
./scripts/restore.sh /backups/bizflow_production_full_20240115.dump bizflow_restored
```

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 15 minutes

```bash
# Emergency restore procedure
1. Stop application traffic
2. Restore latest backup: ./scripts/restore.sh <backup_file>
3. Run pending migrations: npm run db:migrate
4. Verify data integrity
5. Resume traffic
```

## CI/CD Pipeline

### GitHub Actions Workflows

#### CI Pipeline (`ci.yml`)

```yaml
Triggers: Push/PR to main, develop

Jobs:
  1. lint        - TypeScript + ESLint
  2. test        - Unit tests with PostgreSQL/Redis
  3. build       - Build verification
  4. docker      - Docker image build
  5. security    - npm audit + Trivy scan
```

#### Deploy Pipeline (`deploy.yml`)

```yaml
Triggers: Version tags (v*.*.*), Manual dispatch

Jobs:
  1. build-and-push   - Build and push to registry
  2. deploy-staging   - Deploy to staging
  3. deploy-production - Canary → Full rollout
  4. rollback         - Automatic on failure
```

### Deployment Stages

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Build    │────►│   Staging   │────►│ Production  │
│             │     │    (100%)   │     │  (Canary)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┤
                    │                          │
              ┌─────▼─────┐            ┌───────▼───────┐
              │  Rollback │            │  Full Rollout │
              │ (if fail) │            │    (100%)     │
              └───────────┘            └───────────────┘
```

## Zero-Downtime Deployment

### Strategy: Rolling Update

1. **Scale Up**: Add new instances with new version
2. **Health Check**: Wait for new instances to pass health checks
3. **Traffic Shift**: Gradually shift traffic to new instances
4. **Scale Down**: Remove old instances

### Configuration

```yaml
# docker-compose.prod.yml
deploy:
  update_config:
    parallelism: 1          # Update one container at a time
    delay: 30s              # Wait between updates
    failure_action: rollback # Rollback on failure
    order: start-first      # Start new before stopping old
```

### Health Check Endpoint

```typescript
// GET /health
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Deployment Commands

```bash
# Zero-downtime deployment
./scripts/deploy.sh production v1.0.0

# Manual rollback
docker-compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --no-deps api

# Emergency rollback (previous image)
docker tag bizflow:previous bizflow:latest
docker-compose up -d --force-recreate api
```

## Container Orchestration

### Docker Compose (Single Node)

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes (Multi-Node)

See `k8s/` directory for Kubernetes manifests (coming soon).

### Cloud Run (GCP)

```bash
# Deploy to Cloud Run
gcloud run deploy bizflow \
  --image gcr.io/PROJECT/bizflow:VERSION \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

## Monitoring

### Health Checks

| Endpoint | Purpose | Frequency |
|----------|---------|-----------|
| `/health` | Application health | 30s |
| `/health/db` | Database connectivity | 60s |
| `/health/redis` | Redis connectivity | 60s |

### Logging

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 api
```

### Metrics (Prometheus)

```yaml
# Available metrics
bizflow_http_requests_total
bizflow_http_request_duration_seconds
bizflow_database_connections
bizflow_redis_operations_total
```

## Security Checklist

### Pre-Deployment

- [ ] All secrets rotated and stored securely
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] Non-root user in containers
- [ ] Security scan passed

### Post-Deployment

- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Backup verified
- [ ] Rollback tested

## Troubleshooting

### Common Issues

#### Container won't start

```bash
# Check logs
docker-compose logs api

# Check container status
docker-compose ps

# Inspect container
docker inspect bizflow-api
```

#### Database connection failed

```bash
# Test connectivity
docker-compose exec api pg_isready -h postgres -U bizflow

# Check network
docker network inspect bizflow-network
```

#### Memory issues

```bash
# Check resource usage
docker stats

# Increase limits in docker-compose
deploy:
  resources:
    limits:
      memory: 4G
```

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: BizFlow Platform Team
