# BizFlow AWS Global Deployment Architecture

## Overview

This document outlines the comprehensive AWS multi-region deployment architecture for BizFlow, a multi-tenant SaaS business management platform. The architecture is designed to meet data residency requirements, ensure high availability, and comply with regional data protection regulations.

## Target Regions

| Region | AWS Region | Primary Use Case | Compliance |
|--------|------------|------------------|------------|
| India | ap-south-1 | Primary region, India operations | DPDP Act |
| Singapore | ap-southeast-1 | APAC operations | PDPA Singapore/Malaysia |
| UAE | me-south-1 | Middle East operations | UAE Data Protection Law |
| UK | eu-west-2 | European operations | GDPR |

## Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                        GLOBAL LAYER                          │
                                    │                                                              │
                                    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
                                    │  │  Route 53   │───▶│  CloudFront │───▶│   WAF + Shield  │  │
                                    │  │ Geo Routing │    │     CDN     │    │    Advanced     │  │
                                    │  └─────────────┘    └─────────────┘    └─────────────────┘  │
                                    └─────────────────────────────────────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
    ┌───────────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────────────┐
    │      INDIA (ap-south-1)       │     │   SINGAPORE (ap-southeast-1) │     │       UAE (me-south-1)        │
    │         PRIMARY HUB           │     │                               │     │                               │
    │                               │     │                               │     │                               │
    │  ┌─────────────────────────┐  │     │  ┌─────────────────────────┐  │     │  ┌─────────────────────────┐  │
    │  │    Application Load    │  │     │  │    Application Load    │  │     │  │    Application Load    │  │
    │  │       Balancer         │  │     │  │       Balancer         │  │     │  │       Balancer         │  │
    │  └───────────┬─────────────┘  │     │  └───────────┬─────────────┘  │     │  └───────────┬─────────────┘  │
    │              │                │     │              │                │     │              │                │
    │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │
    │  │     EKS Cluster        │  │     │  │     EKS Cluster        │  │     │  │     EKS Cluster        │  │
    │  │  ┌─────────────────┐   │  │     │  │  ┌─────────────────┐   │  │     │  │  ┌─────────────────┐   │  │
    │  │  │ BizFlow API     │   │  │     │  │  │ BizFlow API     │   │  │     │  │  │ BizFlow API     │   │  │
    │  │  │ (Node.js)       │   │  │     │  │  │ (Node.js)       │   │  │     │  │  │ (Node.js)       │   │  │
    │  │  └─────────────────┘   │  │     │  │  └─────────────────┘   │  │     │  │  └─────────────────┘   │  │
    │  │  ┌─────────────────┐   │  │     │  │  ┌─────────────────┐   │  │     │  │  ┌─────────────────┐   │  │
    │  │  │ WhatsApp Worker │   │  │     │  │  │ WhatsApp Worker │   │  │     │  │  │ WhatsApp Worker │   │  │
    │  │  │ (Fargate)       │   │  │     │  │  │ (Fargate)       │   │  │     │  │  │ (Fargate)       │   │  │
    │  │  └─────────────────┘   │  │     │  │  └─────────────────┘   │  │     │  │  └─────────────────┘   │  │
    │  └─────────────────────────┘  │     │  └─────────────────────────┘  │     │  └─────────────────────────┘  │
    │              │                │     │              │                │     │              │                │
    │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │
    │  │   ElastiCache Redis    │  │     │  │   ElastiCache Redis    │  │     │  │   ElastiCache Redis    │  │
    │  │   (Multi-AZ, TLS)      │  │     │  │   (Multi-AZ, TLS)      │  │     │  │   (Multi-AZ, TLS)      │  │
    │  └─────────────────────────┘  │     │  └─────────────────────────┘  │     │  └─────────────────────────┘  │
    │              │                │     │              │                │     │              │                │
    │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │
    │  │  RDS PostgreSQL        │  │     │  │  RDS PostgreSQL        │  │     │  │  RDS PostgreSQL        │  │
    │  │  (Multi-AZ Primary)    │◀─┼─────┼──│  (Cross-Region Replica) │  │     │  │  (Cross-Region Replica) │  │
    │  └─────────────────────────┘  │     │  └─────────────────────────┘  │     │  └─────────────────────────┘  │
    │              │                │     │              │                │     │              │                │
    │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │     │  ┌───────────▼─────────────┐  │
    │  │      S3 Bucket         │  │     │  │      S3 Bucket         │  │     │  │      S3 Bucket         │  │
    │  │  (Regional, KMS)       │──┼─────┼──│  (Replication Target)  │  │     │  │  (Regional, KMS)       │  │
    │  └─────────────────────────┘  │     │  └─────────────────────────┘  │     │  └─────────────────────────┘  │
    │                               │     │                               │     │                               │
    │  ┌─────────────────────────┐  │     │  ┌─────────────────────────┐  │     │  ┌─────────────────────────┐  │
    │  │   Secrets Manager      │  │     │  │   Secrets Manager      │  │     │  │   Secrets Manager      │  │
    │  └─────────────────────────┘  │     │  └─────────────────────────┘  │     │  └─────────────────────────┘  │
    └───────────────────────────────┘     └───────────────────────────────┘     └───────────────────────────────┘
                    │                                         │                                         │
                    └─────────────────────────────────────────┼─────────────────────────────────────────┘
                                                              │
                                    ┌─────────────────────────▼───────────────────────────────┐
                                    │                  TRANSIT GATEWAY HUB                     │
                                    │                    (ap-south-1)                          │
                                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
                                    │  │ VPC Peering │  │ Direct      │  │ AWS PrivateLink │  │
                                    │  │ Attachments │  │ Connect     │  │ Endpoints       │  │
                                    │  └─────────────┘  └─────────────┘  └─────────────────┘  │
                                    └─────────────────────────────────────────────────────────┘
```

## Service Selection: EKS vs ECS

### Recommendation: EKS (Elastic Kubernetes Service)

**Rationale:**
1. **Multi-tenant Isolation**: Kubernetes namespaces and network policies provide fine-grained tenant isolation
2. **Service Mesh**: AWS App Mesh integration for observability and traffic management
3. **Portability**: Kubernetes-native workloads can be migrated to other cloud providers if needed
4. **Ecosystem**: Rich ecosystem of tools for monitoring, security, and deployment

**EKS Configuration:**
- Managed Node Groups for baseline workloads
- Fargate Profiles for bursty/async tasks (WhatsApp workers)
- Karpenter for intelligent auto-scaling
- IRSA (IAM Roles for Service Accounts) for secure AWS access

## Database Strategy

### Primary/Replica Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE REPLICATION TOPOLOGY                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────┐                                                       │
│  │   INDIA (Primary)    │                                                       │
│  │   ap-south-1         │                                                       │
│  │  ┌────────────────┐  │     Async Replication                                 │
│  │  │ RDS PostgreSQL │──┼────────────────────────┐                              │
│  │  │ Multi-AZ Write │  │                        │                              │
│  │  │ db.r6g.2xlarge │  │                        ▼                              │
│  │  └────────────────┘  │          ┌──────────────────────┐                     │
│  │         │            │          │ SINGAPORE (DR)       │                     │
│  │         │ Sync       │          │ ap-southeast-1       │                     │
│  │         ▼            │          │ ┌────────────────┐   │                     │
│  │  ┌────────────────┐  │          │ │ RDS PostgreSQL │   │                     │
│  │  │ Multi-AZ       │  │          │ │ Read Replica   │   │                     │
│  │  │ Standby        │  │          │ │ (Promotable)   │   │                     │
│  │  └────────────────┘  │          │ └────────────────┘   │                     │
│  └──────────────────────┘          └──────────────────────┘                     │
│                                                                                  │
│  Regional Write Primaries (Data Residency):                                      │
│  ┌──────────────────────┐          ┌──────────────────────┐                     │
│  │      UAE             │          │        UK            │                     │
│  │   me-south-1         │          │     eu-west-2        │                     │
│  │  ┌────────────────┐  │          │  ┌────────────────┐  │                     │
│  │  │ RDS PostgreSQL │  │          │  │ RDS PostgreSQL │  │                     │
│  │  │ Multi-AZ Write │  │          │  │ Multi-AZ Write │  │                     │
│  │  │ (Local Data)   │  │          │  │ (EU Data Only) │  │                     │
│  │  └────────────────┘  │          │  └────────────────┘  │                     │
│  └──────────────────────┘          └──────────────────────┘                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Database Configuration

| Region | Role | Instance Type | Storage | Retention |
|--------|------|---------------|---------|-----------|
| ap-south-1 | Primary Writer | db.r6g.2xlarge | 500GB gp3 | 35 days |
| ap-southeast-1 | DR Replica | db.r6g.xlarge | 500GB gp3 | 35 days |
| me-south-1 | Regional Writer | db.r6g.xlarge | 200GB gp3 | 35 days |
| eu-west-2 | Regional Writer | db.r6g.xlarge | 200GB gp3 | 35 days |

### Data Residency Strategy

```sql
-- Per-tenant row-level security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customers
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Regional data routing via tenant country
-- India tenants → ap-south-1
-- Singapore/Malaysia tenants → ap-southeast-1
-- UAE tenants → me-south-1
-- UK/EU tenants → eu-west-2
```

## Networking Architecture

### VPC Design (Per Region)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REGIONAL VPC (10.{region}.0.0/16)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    PUBLIC SUBNETS (per AZ)                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │ │
│  │  │  AZ-a        │  │  AZ-b        │  │  AZ-c        │          │ │
│  │  │  10.x.1.0/24 │  │  10.x.2.0/24 │  │  10.x.3.0/24 │          │ │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │ │
│  │  │  │  ALB   │  │  │  │  NAT   │  │  │  │  NAT   │  │          │ │
│  │  │  │Ingress │  │  │  │Gateway │  │  │  │Gateway │  │          │ │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   PRIVATE SUBNETS (per AZ)                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │ │
│  │  │  AZ-a        │  │  AZ-b        │  │  AZ-c        │          │ │
│  │  │ 10.x.11.0/24 │  │ 10.x.12.0/24 │  │ 10.x.13.0/24 │          │ │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │ │
│  │  │  │  EKS   │  │  │  │  EKS   │  │  │  │  EKS   │  │          │ │
│  │  │  │ Nodes  │  │  │  │ Nodes  │  │  │  │ Nodes  │  │          │ │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   DATABASE SUBNETS (per AZ)                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │ │
│  │  │  AZ-a        │  │  AZ-b        │  │  AZ-c        │          │ │
│  │  │ 10.x.21.0/24 │  │ 10.x.22.0/24 │  │ 10.x.23.0/24 │          │ │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │ │
│  │  │  │  RDS   │  │  │  │  RDS   │  │  │  │ Redis  │  │          │ │
│  │  │  │Primary │  │  │  │Standby │  │  │  │Cluster │  │          │ │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  VPC Endpoints: S3, Secrets Manager, CloudWatch, ECR, STS           │
└─────────────────────────────────────────────────────────────────────┘
```

### CIDR Allocation

| Region | VPC CIDR | Public Subnets | Private Subnets | DB Subnets |
|--------|----------|----------------|-----------------|------------|
| ap-south-1 | 10.1.0.0/16 | 10.1.1-3.0/24 | 10.1.11-13.0/24 | 10.1.21-23.0/24 |
| ap-southeast-1 | 10.2.0.0/16 | 10.2.1-3.0/24 | 10.2.11-13.0/24 | 10.2.21-23.0/24 |
| me-south-1 | 10.3.0.0/16 | 10.3.1-3.0/24 | 10.3.11-13.0/24 | 10.3.21-23.0/24 |
| eu-west-2 | 10.4.0.0/16 | 10.4.1-3.0/24 | 10.4.11-13.0/24 | 10.4.21-23.0/24 |

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Edge Protection                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  AWS Shield Advanced │ AWS WAF │ CloudFront │ Route53 DNSSEC   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 2: Network Security                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  VPC Security Groups │ NACLs │ AWS Network Firewall │ Flow Logs│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 3: Application Security                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Calico Network Policies │ Pod Security Standards │ IRSA      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 4: Data Protection                                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  KMS Encryption │ Secrets Manager │ RDS/S3 Encryption │ TLS    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Layer 5: Detection & Response                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  GuardDuty │ Macie │ Security Hub │ CloudTrail │ Config        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### WAF Rules

```yaml
WAF Rule Groups:
  - OWASP Top 10 Protection:
      - SQL Injection
      - Cross-Site Scripting (XSS)
      - Path Traversal
      - Remote File Inclusion
  
  - Rate Limiting:
      - API: 1000 requests/5 min per IP
      - Login: 10 requests/min per IP
      - Webhook: 100 requests/min per IP
  
  - Geo Blocking:
      - Block high-risk countries (configurable)
      - Allow only target market countries for admin
  
  - Bot Control:
      - Block known bad bots
      - CAPTCHA challenge for suspicious traffic
```

### KMS Key Strategy

| Key Alias | Region | Purpose | Rotation |
|-----------|--------|---------|----------|
| bizflow/db-{region} | Regional | RDS encryption | Annual |
| bizflow/s3-{region} | Regional | S3 bucket encryption | Annual |
| bizflow/secrets | Multi-region | Secrets Manager | Automatic |
| bizflow/app | Multi-region | Application-level encryption | Annual |

## Route53 Configuration

### Geo Routing Policy

```yaml
Route53 Health Checks:
  - Endpoint: /health
  - Interval: 10 seconds
  - Failure Threshold: 3
  - Regions: us-east-1, eu-west-1, ap-southeast-1

Routing Policies:
  api.bizflow.app:
    type: Geolocation
    rules:
      - location: IN
        endpoint: ap-south-1.alb.bizflow.internal
        health_check: hc-india
      
      - location: SG, MY
        endpoint: ap-southeast-1.alb.bizflow.internal
        health_check: hc-singapore
      
      - location: AE
        endpoint: me-south-1.alb.bizflow.internal
        health_check: hc-uae
      
      - location: GB, EU
        endpoint: eu-west-2.alb.bizflow.internal
        health_check: hc-uk
      
      - location: default
        endpoint: ap-south-1.alb.bizflow.internal
        health_check: hc-india

  # Latency-based for non-geo-sensitive traffic
  cdn.bizflow.app:
    type: Latency
    endpoints:
      - ap-south-1
      - ap-southeast-1
      - me-south-1
      - eu-west-2
```

## CI/CD Pipeline

### GitOps Deployment Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CI/CD PIPELINE                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐   │
│  │  GitHub │───▶│  CodeBuild  │───▶│     ECR     │───▶│   Argo CD       │   │
│  │  Push   │    │  (Build+Test│    │  (Container │    │  (GitOps Deploy)│   │
│  │         │    │   Scan)     │    │   Registry) │    │                 │   │
│  └─────────┘    └─────────────┘    └─────────────┘    └────────┬────────┘   │
│                                                                  │            │
│                    ┌────────────────────────────────────────────┘            │
│                    │                                                          │
│                    ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     PROGRESSIVE ROLLOUT                                  │ │
│  │                                                                          │ │
│  │   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐  │ │
│  │   │  Canary    │───▶│  10% Roll  │───▶│  50% Roll  │───▶│  100% Roll │  │ │
│  │   │  (5 min)   │    │  (10 min)  │    │  (15 min)  │    │  Complete  │  │ │
│  │   └────────────┘    └────────────┘    └────────────┘    └────────────┘  │ │
│  │         │                                                                │ │
│  │         └──── Auto-rollback on error rate > 1% ────────────────────────▶│ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

```yaml
Pipeline:
  Source:
    - GitHub webhook trigger
    - Branch: main (production), develop (staging)
  
  Build:
    - Docker build (multi-stage, Graviton-optimized)
    - Unit tests
    - Security scan (Snyk, Trivy)
    - Push to ECR (all regions)
  
  Deploy-Staging:
    - Argo CD sync to staging cluster
    - Integration tests
    - Performance tests
    - Security scan (DAST)
  
  Deploy-Production:
    - Manual approval gate
    - Canary deployment (5% traffic)
    - Automated health checks
    - Progressive rollout
    - Rollback on failure
```

## Monitoring & Observability

### CloudWatch Configuration

```yaml
CloudWatch Dashboards:
  Global Overview:
    - Request count by region
    - Error rates by region
    - Latency percentiles (p50, p95, p99)
    - Active users by region
  
  Per-Region:
    - EKS cluster health
    - RDS performance insights
    - Redis metrics
    - ALB request metrics
  
  Business Metrics:
    - Tenant activity
    - API usage by tenant
    - WhatsApp message volume
    - Billing/subscription status

CloudWatch Alarms:
  Critical:
    - Error rate > 5% (5 min) → PagerDuty
    - Latency p99 > 3s (5 min) → PagerDuty
    - Database CPU > 80% (10 min) → PagerDuty
    - Redis memory > 80% → PagerDuty
  
  Warning:
    - Error rate > 2% (10 min) → Slack
    - Latency p95 > 1s (10 min) → Slack
    - Certificate expiry < 30 days → Email
```

### Distributed Tracing

```yaml
Observability Stack:
  - AWS X-Ray for distributed tracing
  - AWS Distro for OpenTelemetry
  - CloudWatch Logs Insights for log analysis
  - CloudWatch Container Insights for EKS metrics

Trace Sampling:
  - Production: 5% of requests
  - Errors: 100% of errors
  - Slow requests: 100% of requests > 2s
```

## Disaster Recovery

### RPO/RTO Targets

| Tier | RPO | RTO | Strategy |
|------|-----|-----|----------|
| Critical (Primary DB) | 15 min | 1 hour | Cross-region async replication |
| High (Regional DB) | 1 hour | 4 hours | Automated snapshots |
| Standard (S3 Data) | 24 hours | 8 hours | Cross-region replication |
| Low (Logs/Analytics) | 24 hours | 24 hours | Daily backups |

### Failover Procedures

#### Database Failover (ap-south-1 → ap-southeast-1)

```bash
#!/bin/bash
# Disaster Recovery Runbook: Primary Region Failure

# Step 1: Verify primary region is unavailable
aws rds describe-db-instances \
  --region ap-south-1 \
  --db-instance-identifier bizflow-primary

# Step 2: Promote read replica in DR region
aws rds promote-read-replica \
  --region ap-southeast-1 \
  --db-instance-identifier bizflow-replica-singapore

# Step 3: Update Route53 to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-dns-change.json

# Step 4: Promote Redis Global Datastore
aws elasticache failover-global-replication-group \
  --global-replication-group-id bizflow-redis-global \
  --primary-region ap-southeast-1 \
  --primary-replication-group-id bizflow-redis-singapore

# Step 5: Verify application health
curl -s https://api.bizflow.app/health | jq .

# Step 6: Notify stakeholders
aws sns publish \
  --topic-arn arn:aws:sns:ap-southeast-1:123456789:dr-notifications \
  --message "DR failover complete. Primary region: ap-southeast-1"
```

#### Recovery Checklist

```markdown
## Pre-Failover
- [ ] Confirm primary region is unavailable (not false positive)
- [ ] Notify on-call team and stakeholders
- [ ] Document timeline and decision rationale

## Failover Execution
- [ ] Promote RDS read replica
- [ ] Update Route53 DNS records
- [ ] Failover Redis Global Datastore
- [ ] Verify EKS pods are running in DR region
- [ ] Confirm application health checks pass

## Post-Failover
- [ ] Monitor error rates and latency
- [ ] Verify data integrity (spot checks)
- [ ] Update status page
- [ ] Begin root cause analysis
- [ ] Plan failback when primary region recovers
```

## Cost Optimization

### Reserved Capacity

| Service | Commitment | Savings |
|---------|------------|---------|
| EKS Compute | 3-year Savings Plan | ~50% |
| RDS | 3-year Partial Upfront | ~55% |
| ElastiCache | 1-year Reserved | ~35% |

### Cost-Saving Strategies

1. **Graviton Processors**: Use ARM-based instances (20% cheaper, 40% better performance)
2. **Fargate Spot**: Use for non-critical async workloads (70% savings)
3. **S3 Intelligent Tiering**: Automatic cost optimization for storage
4. **Karpenter**: Right-size EKS nodes based on actual workload
5. **Cross-Region Data Transfer**: Minimize through regional data locality
6. **Reserved Capacity**: Pre-purchase predictable baseline capacity

### Estimated Monthly Costs (Production)

| Service | ap-south-1 | ap-southeast-1 | me-south-1 | eu-west-2 | Total |
|---------|------------|----------------|------------|-----------|-------|
| EKS | $1,500 | $800 | $600 | $800 | $3,700 |
| RDS | $1,200 | $600 | $600 | $600 | $3,000 |
| ElastiCache | $400 | $200 | $200 | $200 | $1,000 |
| S3 + Transfer | $300 | $150 | $100 | $150 | $700 |
| ALB + WAF | $400 | $200 | $200 | $200 | $1,000 |
| Other | $300 | $150 | $150 | $150 | $750 |
| **Total** | **$4,100** | **$2,100** | **$1,850** | **$2,100** | **$10,150** |

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up AWS Control Tower and Landing Zone
- [ ] Create VPCs in all four regions
- [ ] Configure Transit Gateway hub
- [ ] Deploy baseline security controls

### Phase 2: Core Infrastructure (Weeks 5-8)
- [ ] Deploy EKS clusters per region
- [ ] Set up RDS PostgreSQL instances
- [ ] Configure ElastiCache Redis clusters
- [ ] Implement S3 buckets with replication

### Phase 3: Application Deployment (Weeks 9-12)
- [ ] Configure CI/CD pipeline
- [ ] Deploy application to EKS
- [ ] Set up Route53 geo routing
- [ ] Configure CloudFront and WAF

### Phase 4: Operations (Weeks 13-16)
- [ ] Implement monitoring dashboards
- [ ] Configure alerting
- [ ] Document runbooks
- [ ] Conduct DR drills

## Terraform Module Structure

```
terraform/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── node-groups.tf
│   │   ├── fargate-profiles.tf
│   │   └── addons.tf
│   ├── rds/
│   │   ├── main.tf
│   │   ├── read-replica.tf
│   │   └── monitoring.tf
│   ├── elasticache/
│   ├── s3/
│   └── security/
│       ├── waf.tf
│       ├── kms.tf
│       └── secrets.tf
├── environments/
│   ├── production/
│   │   ├── ap-south-1/
│   │   ├── ap-southeast-1/
│   │   ├── me-south-1/
│   │   └── eu-west-2/
│   └── staging/
└── global/
    ├── route53.tf
    ├── cloudfront.tf
    └── iam.tf
```

## Appendix: Environment Variables

```yaml
# Application Configuration
NODE_ENV: production
AWS_REGION: ${aws_region}
AWS_DEFAULT_REGION: ${aws_region}

# Database
DATABASE_URL: secretsmanager://${db_secret_arn}
DATABASE_POOL_SIZE: 20
DATABASE_SSL: true

# Redis
REDIS_URL: secretsmanager://${redis_secret_arn}
REDIS_TLS: true

# WhatsApp Providers
GUPSHUP_API_KEY: secretsmanager://${gupshup_secret_arn}
META_WHATSAPP_TOKEN: secretsmanager://${meta_secret_arn}
TWILIO_ACCOUNT_SID: secretsmanager://${twilio_secret_arn}
TWILIO_AUTH_TOKEN: secretsmanager://${twilio_auth_secret_arn}

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT: https://xray.${aws_region}.amazonaws.com
LOG_LEVEL: info
```

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: BizFlow Platform Team
