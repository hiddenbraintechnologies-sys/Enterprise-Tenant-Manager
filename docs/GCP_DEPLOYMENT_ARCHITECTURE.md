# BizFlow - Google Cloud Platform Global Deployment Architecture

## Overview

This document describes the global deployment architecture for BizFlow on Google Cloud Platform (GCP), designed for multi-region deployment with data residency compliance across India, Singapore, UAE/Malaysia, and UK markets.

## Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │        Cloud DNS                     │
                                    │    app.bizflow.com (geo-routing)     │
                                    └─────────────────┬───────────────────┘
                                                      │
                                    ┌─────────────────▼───────────────────┐
                                    │   Global HTTP(S) Load Balancer      │
                                    │   + Cloud CDN + Cloud Armor (WAF)   │
                                    └─────────────────┬───────────────────┘
                                                      │
              ┌───────────────────────────────────────┼───────────────────────────────────────┐
              │                                       │                                       │
    ┌─────────▼─────────┐                 ┌───────────▼───────────┐               ┌───────────▼───────────┐
    │  asia-south1      │                 │  asia-southeast1      │               │  europe-west2         │
    │  (Mumbai)         │                 │  (Singapore)          │               │  (London)             │
    │  PRIMARY HUB      │                 │  DR + PDPA            │               │  GDPR                 │
    └─────────┬─────────┘                 └───────────┬───────────┘               └───────────┬───────────┘
              │                                       │                                       │
    ┌─────────▼─────────┐                 ┌───────────▼───────────┐               ┌───────────▼───────────┐
    │ VPC: bizflow-vpc  │                 │ VPC: bizflow-vpc      │               │ VPC: bizflow-vpc      │
    │ Subnet: 10.1.0/20 │                 │ Subnet: 10.2.0.0/20   │               │ Subnet: 10.4.0.0/20   │
    └─────────┬─────────┘                 └───────────┬───────────┘               └───────────┬───────────┘
              │                                       │                                       │
    ┌─────────▼─────────┐                 ┌───────────▼───────────┐               ┌───────────▼───────────┐
    │   Cloud Run       │                 │   Cloud Run           │               │   Cloud Run           │
    │   (2-10 instances)│                 │   (2-8 instances)     │               │   (2-8 instances)     │
    └─────────┬─────────┘                 └───────────┬───────────┘               └───────────┬───────────┘
              │                                       │                                       │
    ┌─────────┴─────────┐                 ┌───────────┴───────────┐               ┌───────────┴───────────┐
    │                   │                 │                       │               │                       │
┌───▼───┐          ┌────▼────┐       ┌────▼────┐            ┌─────▼─────┐   ┌─────▼─────┐          ┌──────▼──────┐
│Cloud  │          │Memory-  │       │Cloud    │            │Memorystore│   │Cloud      │          │Memorystore  │
│SQL    │          │store    │       │SQL      │            │Redis      │   │SQL        │          │Redis        │
│PRIMARY│          │Redis    │       │Replica  │            │           │   │Replica    │          │             │
└───┬───┘          └─────────┘       └─────────┘            └───────────┘   └───────────┘          └─────────────┘
    │
    │ Cross-Region Replication (Async)
    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              Cloud SQL Cross-Region Read Replicas                                               │
│   asia-south1 (PRIMARY) ──────► asia-southeast1 (REPLICA) ──────► europe-west2 (REPLICA)                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Target Regions

| Region | Location | Purpose | Compliance |
|--------|----------|---------|------------|
| asia-south1 | Mumbai, India | Primary Hub | DPDP Act |
| asia-southeast1 | Singapore | DR + Southeast Asia | PDPA Singapore |
| asia-southeast2 | Jakarta | Malaysia coverage | PDPA Malaysia |
| me-central1 | Doha | UAE alternative | UAE DPL |
| europe-west2 | London | UK/EU | GDPR |

## Component Architecture

### 1. Global Load Balancing

```yaml
Global HTTP(S) Load Balancer:
  Frontend:
    - IP: Static Anycast IP
    - Protocols: HTTPS (443), HTTP redirect (80)
    - SSL Policy: MODERN (TLS 1.2+)
    - Certificates: Managed SSL (auto-renewal)
    
  Cloud CDN:
    - Cache Mode: CACHE_ALL_STATIC
    - TTL: Default 3600s, API responses: no-cache
    - Negative Caching: Enabled (404, 500)
    
  Cloud Armor (WAF):
    - OWASP ModSecurity Core Rule Set
    - Rate Limiting: 1000 req/min per IP
    - Geo-blocking: Configurable per tenant
    - Bot Detection: reCAPTCHA Enterprise
    
  Backend Services:
    - Serverless NEGs per region
    - Health Checks: /health (HTTP 200)
    - Connection Draining: 300s
    - Locality Load Balancing: ROUND_ROBIN
    
  URL Map:
    - /api/* → Backend Service (Cloud Run)
    - /static/* → Cloud Storage bucket
    - /* → Backend Service (Cloud Run)
```

### 2. Cloud Run Configuration

```yaml
Cloud Run Service:
  Name: bizflow-api
  
  Container:
    Image: gcr.io/bizflow-prod/bizflow-api:latest
    Port: 8080
    CPU: 2
    Memory: 2Gi
    
  Scaling:
    Min Instances: 2 (production)
    Max Instances: 100
    Concurrency: 80
    CPU Throttling: Disabled
    
  VPC Connector:
    Name: bizflow-vpc-connector
    Egress: PRIVATE_RANGES_ONLY
    Machine Type: e2-micro
    Min Instances: 2
    Max Instances: 10
    
  Environment Variables:
    - NODE_ENV: production
    - REGION: ${REGION}
    - DATABASE_URL: (from Secret Manager)
    - REDIS_URL: (from Secret Manager)
    
  Annotations:
    run.googleapis.com/ingress: internal-and-cloud-load-balancing
    run.googleapis.com/vpc-access-egress: private-ranges-only
    
  Regional Deployments:
    asia-south1:
      min_instances: 2
      max_instances: 50
    asia-southeast1:
      min_instances: 2
      max_instances: 30
    europe-west2:
      min_instances: 2
      max_instances: 30
```

### 3. Cloud SQL PostgreSQL

```yaml
Primary Instance (asia-south1):
  Name: bizflow-db-primary
  Database Version: POSTGRES_15
  
  Machine Type:
    Production: db-custom-8-32768 (8 vCPU, 32 GB RAM)
    Staging: db-custom-2-8192
    
  Storage:
    Type: SSD
    Size: 500 GB (auto-increase enabled)
    Max Size: 2 TB
    
  High Availability:
    Mode: Regional (synchronous standby)
    Failover: Automatic
    
  Backup:
    Automated: Daily at 02:00 UTC
    Retention: 30 days
    PITR: Enabled (7-day window)
    Location: asia-south1 + asia-southeast1
    
  Maintenance:
    Window: Sunday 04:00-05:00 UTC
    Update Track: stable
    
  Flags:
    - max_connections: 500
    - shared_buffers: 8GB
    - effective_cache_size: 24GB
    - work_mem: 64MB
    - log_statement: ddl
    - log_min_duration_statement: 1000
    
  SSL:
    Mode: ENCRYPTED_ONLY
    Certificate: Managed
    
Read Replicas:
  asia-southeast1:
    Name: bizflow-db-replica-sg
    Machine Type: db-custom-4-16384
    Purpose: DR, Analytics, Read scaling
    
  europe-west2:
    Name: bizflow-db-replica-uk
    Machine Type: db-custom-4-16384
    Purpose: GDPR compliance, UK read performance
```

### 4. Memorystore (Redis)

```yaml
Redis Instances:
  asia-south1:
    Name: bizflow-redis-india
    Tier: STANDARD_HA
    Memory: 5 GB
    Version: REDIS_7_0
    Replica Count: 2
    Read Replicas: Enabled
    
  asia-southeast1:
    Name: bizflow-redis-singapore
    Tier: STANDARD_HA
    Memory: 3 GB
    Version: REDIS_7_0
    Replica Count: 1
    
  europe-west2:
    Name: bizflow-redis-uk
    Tier: STANDARD_HA
    Memory: 3 GB
    Version: REDIS_7_0
    Replica Count: 1
    
  Configuration:
    maxmemory-policy: volatile-lru
    notify-keyspace-events: Ex
    
  Use Cases:
    - Session storage (user sessions, JWT tokens)
    - Rate limiting counters
    - Feature flag cache
    - API response cache
    - Pub/Sub for real-time features
```

### 5. Cloud Storage

```yaml
Buckets:
  Primary Storage:
    Name: bizflow-data-${PROJECT_ID}
    Location: asia-south1
    Storage Class: STANDARD
    Versioning: Enabled
    
  Multi-Region Assets:
    Name: bizflow-assets-${PROJECT_ID}
    Location: asia (multi-region)
    Storage Class: STANDARD
    CDN Integration: Yes
    
  EU Compliance Bucket:
    Name: bizflow-eu-data-${PROJECT_ID}
    Location: europe-west2
    Storage Class: STANDARD
    Data Residency: EU only
    
  Backup Storage:
    Name: bizflow-backups-${PROJECT_ID}
    Location: asia (multi-region)
    Storage Class: NEARLINE
    Lifecycle:
      - Age > 90 days → COLDLINE
      - Age > 365 days → ARCHIVE
      - Age > 2555 days → DELETE
    
  Configuration:
    Uniform Bucket Level Access: Enabled
    Public Access Prevention: Enforced
    Encryption: Google-managed keys (CMEK for sensitive data)
    CORS: Configured for app domains
    
  Cross-Region Replication:
    Source: bizflow-data-asia
    Destination: bizflow-data-eu-backup
    Filter: objects/tenant-*/
```

### 6. Secret Manager

```yaml
Secrets Organization:
  Naming Convention: bizflow/{env}/{region}/{secret-name}
  
  Global Secrets:
    - bizflow/prod/global/jwt-signing-key
    - bizflow/prod/global/encryption-master-key
    - bizflow/prod/global/stripe-api-key
    - bizflow/prod/global/twilio-auth-token
    
  Regional Secrets:
    - bizflow/prod/asia-south1/database-url
    - bizflow/prod/asia-south1/redis-url
    - bizflow/prod/asia-southeast1/database-url
    - bizflow/prod/asia-southeast1/redis-url
    - bizflow/prod/europe-west2/database-url
    - bizflow/prod/europe-west2/redis-url
    
  WhatsApp Provider Secrets:
    - bizflow/prod/global/gupshup-api-key (India)
    - bizflow/prod/global/meta-whatsapp-token (UAE/SG/UK)
    - bizflow/prod/global/twilio-whatsapp-sid (fallback)
    
  Rotation:
    Database Passwords: 90 days (automated via Cloud Functions)
    API Keys: 180 days (manual with notification)
    JWT Signing Keys: 365 days
    
  Access Control:
    - Cloud Run SA → secretAccessor (specific secrets)
    - Cloud Functions SA → secretAccessor (rotation secrets)
    - Admins → secretVersionManager
```

## Network Architecture

### VPC Design

```yaml
Shared VPC:
  Name: bizflow-vpc
  Mode: Custom
  
  Subnets:
    asia-south1:
      Primary: 10.1.0.0/20 (4096 IPs)
      Serverless: 10.1.16.0/24
      Database: 10.1.17.0/24
      Services: 10.1.18.0/24
      
    asia-southeast1:
      Primary: 10.2.0.0/20
      Serverless: 10.2.16.0/24
      Database: 10.2.17.0/24
      Services: 10.2.18.0/24
      
    asia-southeast2:
      Primary: 10.3.0.0/20
      Serverless: 10.3.16.0/24
      Database: 10.3.17.0/24
      Services: 10.3.18.0/24
      
    europe-west2:
      Primary: 10.4.0.0/20
      Serverless: 10.4.16.0/24
      Database: 10.4.17.0/24
      Services: 10.4.18.0/24
      
  Private Google Access: Enabled (all subnets)
  Flow Logs: Enabled (sampling 50%)
```

### Firewall Rules

```yaml
Firewall Rules:
  allow-lb-health-checks:
    Priority: 1000
    Direction: INGRESS
    Source: 35.191.0.0/16, 130.211.0.0/22
    Target: All instances
    Ports: TCP 8080
    
  allow-cloud-run-to-sql:
    Priority: 1000
    Direction: EGRESS
    Target: Cloud Run VPC Connector
    Destination: Private Service Connect ranges
    Ports: TCP 5432
    
  allow-cloud-run-to-redis:
    Priority: 1000
    Direction: EGRESS
    Target: Cloud Run VPC Connector
    Destination: Memorystore IP ranges
    Ports: TCP 6379
    
  deny-all-egress:
    Priority: 65000
    Direction: EGRESS
    Target: All
    Action: DENY
    Log: True
```

### Private Service Connect

```yaml
Private Service Connect:
  Cloud SQL:
    - bizflow-db-primary.asia-south1.sql.goog
    - bizflow-db-replica-sg.asia-southeast1.sql.goog
    - bizflow-db-replica-uk.europe-west2.sql.goog
    
  Memorystore:
    - Private IP allocation per region
    
  Cloud Storage:
    - storage.googleapis.com via PSC endpoint
```

## Monitoring & Alerting

### Cloud Monitoring

```yaml
Dashboards:
  Global Overview:
    - Request rate by region
    - Error rate by service
    - P50/P95/P99 latency
    - Active users by region
    - Database connections
    
  Regional Health:
    - Cloud Run instance count
    - CPU/Memory utilization
    - Request queue depth
    - Redis memory usage
    - Cloud SQL connections
    
  Business Metrics:
    - Tenant activity
    - API usage by tenant
    - WhatsApp message delivery rates
    - Payment processing success rate
    
Custom Metrics:
  - bizflow/api/request_duration
  - bizflow/api/error_count
  - bizflow/db/query_duration
  - bizflow/redis/cache_hit_rate
  - bizflow/whatsapp/message_count
  - bizflow/compliance/dsar_count
```

### Alerting Policies

```yaml
Critical Alerts (PagerDuty + SMS):
  - Error rate > 5% for 5 minutes
  - P99 latency > 5s for 10 minutes
  - Cloud Run instances at max capacity
  - Database connection failures
  - Redis unavailable
  - SSL certificate expiring < 7 days
  
Warning Alerts (Email + Slack):
  - Error rate > 1% for 15 minutes
  - P95 latency > 2s for 15 minutes
  - Database CPU > 80% for 30 minutes
  - Storage usage > 80%
  - Memory usage > 90%
  
Compliance Alerts:
  - DSAR deadline approaching (48 hours)
  - Data breach detected
  - Unusual PHI access pattern
  - Failed backup job
```

### Uptime Checks

```yaml
Uptime Checks:
  Global API Health:
    - URL: https://api.bizflow.com/health
    - Frequency: 1 minute
    - Regions: All GCP regions
    - Timeout: 10s
    
  Regional Endpoints:
    - URL: https://api.bizflow.com/health?region=asia-south1
    - Frequency: 1 minute
    - Timeout: 5s
    
  Database Connectivity:
    - Type: TCP
    - Port: 5432 (via private endpoint)
    - Frequency: 1 minute
```

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO | 15 minutes | Async replication to read replicas |
| RTO | 45-60 minutes | Automated failover runbooks |
| Data Durability | 99.999999999% | Multi-region storage |

### Failover Procedures

```yaml
Database Failover:
  Trigger: Primary instance unavailable > 5 minutes
  
  Steps:
    1. Promote asia-southeast1 replica to primary
    2. Update Secret Manager with new connection string
    3. Redeploy Cloud Run services
    4. Update DNS if needed
    5. Notify on-call team
    
  Automation:
    - Cloud Functions trigger on instance health
    - Terraform for infrastructure changes
    - Cloud Build for service redeployment
    
Region Failover:
  Trigger: Region-wide outage
  
  Steps:
    1. Update Load Balancer to exclude failed region
    2. Scale up instances in healthy regions
    3. Promote regional replica if primary affected
    4. Monitor traffic redistribution
    5. Document incident
    
  Automation:
    - Load Balancer automatic health checks
    - Cloud Run auto-scaling
    - Alerting to operations team
```

### Backup Strategy

```yaml
Database Backups:
  Automated:
    Frequency: Daily
    Retention: 30 days
    Location: Multi-region (asia + europe)
    
  Point-in-Time Recovery:
    Enabled: Yes
    Window: 7 days
    Binary Log Retention: 7 days
    
  Cross-Region:
    Primary → asia-southeast1: Continuous replication
    Primary → europe-west2: Continuous replication
    
Storage Backups:
  Versioning: Enabled (all buckets)
  Cross-Region: asia → eu backup bucket
  Lifecycle: Archive after 365 days
  
Configuration Backups:
  Tool: Terraform state in GCS
  Frequency: On every change
  Encryption: CMEK
```

## Cost Optimization

### Estimated Monthly Costs

| Component | asia-south1 | asia-southeast1 | europe-west2 | Total |
|-----------|-------------|-----------------|--------------|-------|
| Cloud Run | $800 | $400 | $400 | $1,600 |
| Cloud SQL | $1,200 | $400 | $400 | $2,000 |
| Memorystore | $250 | $150 | $150 | $550 |
| Load Balancer | - | - | - | $200 |
| Cloud Storage | - | - | - | $300 |
| Networking | - | - | - | $500 |
| Monitoring | - | - | - | $200 |
| Secret Manager | - | - | - | $50 |
| **Total** | | | | **$5,400** |

### Cost Optimization Strategies

```yaml
Committed Use Discounts:
  Cloud SQL: 1-year commitment (37% savings)
  Cloud Run: Committed CPU (17% savings)
  
Auto-Scaling Optimization:
  Min Instances: Tuned per region based on traffic
  CPU Throttling: Enabled for non-critical services
  
Storage Tiering:
  STANDARD: Active data (< 30 days)
  NEARLINE: Infrequent access (30-90 days)
  COLDLINE: Archival (90-365 days)
  ARCHIVE: Long-term retention (> 365 days)
  
Regional Optimization:
  - Primary workloads in asia-south1 (lowest cost in Asia)
  - Scale down non-primary regions during off-peak
  - Use preemptible VMs for batch processing
  
Networking:
  - Cloud CDN for static assets
  - Premium Tier only for customer-facing traffic
  - Standard Tier for internal/batch traffic
```

## Security Configuration

### Identity & Access Management

```yaml
Service Accounts:
  cloud-run-sa@bizflow-prod.iam.gserviceaccount.com:
    - roles/cloudsql.client
    - roles/secretmanager.secretAccessor
    - roles/storage.objectViewer
    
  cloud-build-sa@bizflow-prod.iam.gserviceaccount.com:
    - roles/run.developer
    - roles/storage.objectCreator
    - roles/secretmanager.secretAccessor
    
  monitoring-sa@bizflow-prod.iam.gserviceaccount.com:
    - roles/monitoring.viewer
    - roles/logging.viewer
    
Workload Identity:
  Enabled: Yes
  Kubernetes → GCP SA mapping: Automatic
```

### Security Command Center

```yaml
Security Command Center:
  Tier: Premium
  
  Features:
    - Vulnerability scanning
    - Threat detection
    - Compliance monitoring
    - Security posture management
    
  Findings:
    - Critical: Immediate remediation
    - High: 24-hour SLA
    - Medium: 1-week SLA
    - Low: Next sprint
```

### Encryption

```yaml
Encryption at Rest:
  Default: Google-managed keys
  Sensitive Data: Customer-managed keys (CMEK)
  
  CMEK Configuration:
    Key Ring: bizflow-keys
    Keys:
      - bizflow-database-key (Cloud SQL)
      - bizflow-storage-key (Cloud Storage)
      - bizflow-secrets-key (Secret Manager)
    Rotation: Automatic (365 days)
    
Encryption in Transit:
  External: TLS 1.3
  Internal: mTLS where supported
  Database: SSL required
```

## Terraform Structure

```
terraform/
├── environments/
│   ├── prod/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── dev/
├── modules/
│   ├── vpc/
│   ├── cloud-run/
│   ├── cloud-sql/
│   ├── memorystore/
│   ├── load-balancer/
│   ├── storage/
│   ├── monitoring/
│   └── iam/
├── shared/
│   ├── versions.tf
│   └── providers.tf
└── README.md
```

## Deployment Pipeline

```yaml
Cloud Build Pipeline:
  Triggers:
    - Push to main → Deploy to staging
    - Tag v*.*.* → Deploy to production
    
  Steps:
    1. Run tests
    2. Build container image
    3. Push to Artifact Registry
    4. Deploy to Cloud Run (canary 10%)
    5. Run smoke tests
    6. Gradual rollout (25% → 50% → 100%)
    7. Update traffic in Load Balancer
    
  Rollback:
    - Automatic on health check failure
    - Manual via Cloud Console or gcloud
    
Blue/Green Deployment:
  - Two Cloud Run revisions active
  - Traffic splitting via Load Balancer
  - Instant rollback capability
```

## Compliance Considerations

### Data Residency

| Region | Regulation | Data Types Allowed |
|--------|------------|-------------------|
| asia-south1 | DPDP | All Indian tenant data |
| asia-southeast1 | PDPA SG | Singapore tenant data |
| asia-southeast2 | PDPA MY | Malaysia tenant data |
| europe-west2 | GDPR | UK/EU tenant data |

### Audit Logging

```yaml
Cloud Audit Logs:
  Admin Activity: Always enabled
  Data Access: Enabled for all services
  System Events: Enabled
  
  Retention:
    Cloud Logging: 30 days
    BigQuery Export: 7 years (compliance)
    Cloud Storage Archive: 10 years
    
  Sinks:
    - BigQuery dataset for analytics
    - Cloud Storage for long-term archival
    - Pub/Sub for real-time SIEM integration
```

---

## Comparison: GCP vs AWS

| Capability | GCP | AWS |
|------------|-----|-----|
| Global Load Balancing | Global HTTP(S) LB | ALB + CloudFront |
| Container Orchestration | Cloud Run | EKS/Fargate |
| Database | Cloud SQL | RDS |
| Cache | Memorystore | ElastiCache |
| Object Storage | Cloud Storage | S3 |
| Secrets | Secret Manager | Secrets Manager |
| Monitoring | Cloud Monitoring | CloudWatch |
| WAF | Cloud Armor | AWS WAF + Shield |
| DNS | Cloud DNS | Route 53 |
| Estimated Cost | ~$5,400/month | ~$10,150/month |

**Key Advantages of GCP:**
- 50% lower estimated cost
- Simpler global load balancing (single resource)
- Cloud Run is more cost-effective than EKS for variable workloads
- Better BigQuery integration for analytics

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: BizFlow Platform Team
