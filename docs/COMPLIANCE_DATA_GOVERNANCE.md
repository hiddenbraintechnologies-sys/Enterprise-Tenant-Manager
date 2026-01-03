# BizFlow Compliance & Data Governance Layer

## Overview

BizFlow implements a comprehensive compliance and data governance layer that supports multiple regional data protection regulations. This system provides consent management, data subject access request (DSAR) handling, sensitive data access logging, and role-based data masking.

## Supported Regulations

| Regulation | Region | Key Requirements |
|------------|--------|------------------|
| GDPR | UK/EU | Explicit consent, 72h breach notification, 30-day DSAR response |
| PDPA Singapore | Singapore | Consent required, reasonable security, data retention limits |
| PDPA Malaysia | Malaysia | Data processor registration, consent requirements |
| DPDP Act | India | Consent-based processing, data localization, breach notification |
| UAE DPL | UAE | Controller registration, cross-border transfer restrictions |

## Features

### 1. Consent Management

#### Recording Consent
```typescript
POST /api/compliance/consents
{
  "subjectType": "customer",
  "subjectId": "cust_123",
  "subjectEmail": "customer@example.com",
  "consentType": "marketing",
  "purpose": "Email marketing campaigns",
  "legalBasis": "consent",
  "consentText": "I agree to receive marketing emails...",
  "version": "1.0",
  "collectionMethod": "web_form"
}
```

#### Consent Types
- `marketing` - Marketing communications
- `data_processing` - General data processing
- `data_sharing` - Third-party data sharing
- `profiling` - Automated profiling/decisions
- `cross_border_transfer` - Cross-border data transfer
- `health_data` - Health/medical data processing (PHI)
- `biometric` - Biometric data processing
- `location_tracking` - Location data collection

#### Checking Consent
```typescript
GET /api/compliance/consents/check?subjectType=customer&subjectId=cust_123&consentType=marketing

Response:
{
  "hasConsent": true,
  "record": {
    "id": "consent_abc123",
    "status": "granted",
    "grantedAt": "2024-01-15T10:30:00Z",
    "expiresAt": null
  }
}
```

#### Withdrawing Consent
```typescript
POST /api/compliance/consents/withdraw
{
  "subjectType": "customer",
  "subjectId": "cust_123",
  "consentType": "marketing",
  "reason": "Customer requested via email"
}
```

### 2. Data Subject Access Requests (DSAR)

#### Submitting a DSAR (Public Endpoint)
```typescript
POST /api/compliance/dsar
{
  "tenantId": "tenant_123",
  "requestType": "access",
  "subjectEmail": "user@example.com",
  "subjectName": "John Doe",
  "subjectPhone": "+1234567890",
  "requestDetails": "I want a copy of all my personal data",
  "dataCategories": ["pii", "financial", "location"],
  "regulation": "gdpr"
}

Response:
{
  "id": "dsar_xyz789",
  "message": "Your request has been submitted. You will receive an acknowledgement within 72 hours.",
  "responseDeadline": "2024-02-15T10:30:00Z"
}
```

#### Request Types
- `access` - Right to access personal data
- `rectification` - Right to correct inaccurate data
- `erasure` - Right to be forgotten
- `portability` - Right to data portability
- `restriction` - Right to restrict processing
- `objection` - Right to object to processing

#### DSAR Status Flow
```
submitted → acknowledged → in_progress → pending_verification → completed
                                      ↘ rejected
                                      ↘ expired
```

#### Managing DSARs (Tenant)
```typescript
GET /api/compliance/dsar?status=in_progress&limit=20
PATCH /api/compliance/dsar/:dsarId/status
{
  "status": "completed",
  "notes": "Data export provided via secure download link"
}
```

### 3. Sensitive Data Access Logging

#### Automatic Logging
The middleware automatically logs access to sensitive data based on route patterns:

| Route Pattern | Data Category | Requires Reason |
|---------------|---------------|-----------------|
| `/api/patients/*` | PHI | Yes |
| `/api/emr/*` | PHI | Yes |
| `/api/medical-records/*` | PHI | Yes |
| `/api/customers/*` | PII | No |
| `/api/payments/*` | Financial | No |
| `/api/billing/*` | Financial | No |

#### Access Reason Header
For PHI access, include the reason in the request header:
```
X-Access-Reason: customer_request
X-Access-Reason-Details: Support ticket #12345
X-Support-Ticket-Id: 12345
```

Valid access reasons:
- `customer_request`
- `support_ticket`
- `compliance_audit`
- `legal_requirement`
- `system_maintenance`
- `debugging`
- `authorized_investigation`

#### Viewing Access Logs (Platform Admin)
```typescript
GET /api/platform-admin/compliance/access-logs?dataCategory=phi&riskLevel=high&flagged=true

Response:
{
  "logs": [
    {
      "id": "log_123",
      "accessorType": "platform_admin",
      "accessorEmail": "admin@bizflow.app",
      "dataCategory": "phi",
      "resourceType": "patient",
      "resourceId": "patient_456",
      "accessType": "view",
      "accessReason": "support_ticket",
      "riskLevel": "high",
      "flagged": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### Flagging Suspicious Access
```typescript
POST /api/platform-admin/compliance/access-logs/:logId/flag
{
  "reason": "Unusual access pattern detected - multiple PHI accesses in short timeframe"
}
```

### 4. Data Masking

#### Role-Based Masking Rules
Data masking is configured per role and data category:

| Role | Email | Phone | SSN/ID | Financial |
|------|-------|-------|--------|-----------|
| super_admin | visible | visible | last 4 | last 4 |
| admin | visible | visible | last 4 | last 4 |
| manager | visible | visible | masked | masked |
| staff | partial | partial | masked | masked |
| support | partial | partial | masked | masked |

#### Masking Types
- `full` - Complete masking (********)
- `partial` - Partial reveal (jo**@example.com)
- `hash` - Hashed representation ([HASH:abc1...])
- `redact` - Simple redaction ([REDACTED])
- `tokenize` - Tokenized value ([TOKEN:xyz123])

#### Common Masking Patterns
```typescript
// Email: jo**@example.com
// Phone: ******1234
// PAN: AB****12
// Aadhaar: XXXX-XXXX-1234
// Credit Card: **** **** **** 1234
```

### 5. Unusual Access Detection

The system automatically detects unusual access patterns:
- High volume of access in short period (>50/hour)
- Excessive PHI access (>10 PHI records/hour)
- High daily access volume (>200/day)

Risk scores are calculated and suspicious patterns are logged for review.

### 6. Data Breach Management

#### Reporting a Breach (Platform Admin)
```typescript
POST /api/platform-admin/compliance/breaches
{
  "tenantId": "tenant_123",
  "breachType": "unauthorized_access",
  "severity": "high",
  "regulation": "gdpr",
  "discoveredAt": "2024-01-15T10:30:00Z",
  "affectedDataCategories": ["pii", "phi"],
  "affectedSubjectsCount": 150,
  "description": "Unauthorized access to patient records detected",
  "impactAssessment": "Personal and health data potentially exposed",
  "containmentActions": "Access revoked, credentials reset"
}
```

#### Breach Severity Levels
- `low` - Minor incident, limited exposure
- `medium` - Moderate incident, some data exposed
- `high` - Significant incident, sensitive data exposed
- `critical` - Major incident, widespread exposure

#### Notification Deadlines
- GDPR: 72 hours to supervisory authority
- DPDP: 72 hours to Data Protection Board
- PDPA: "As soon as practicable"

## API Endpoints

### Platform Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform-admin/compliance/configs` | Get all compliance configurations |
| GET | `/api/platform-admin/compliance/configs/:regulation` | Get specific regulation config |
| GET | `/api/platform-admin/compliance/access-logs` | Get sensitive access logs |
| POST | `/api/platform-admin/compliance/access-logs/:id/flag` | Flag suspicious access |
| GET | `/api/platform-admin/compliance/dsar` | Get all DSARs |
| GET | `/api/platform-admin/compliance/dsar/:id` | Get DSAR with activity log |
| PATCH | `/api/platform-admin/compliance/dsar/:id/status` | Update DSAR status |
| POST | `/api/platform-admin/compliance/breaches` | Report data breach |

### Tenant Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compliance/settings` | Get tenant compliance settings |
| PATCH | `/api/compliance/settings` | Update compliance settings |
| POST | `/api/compliance/consents` | Record consent |
| GET | `/api/compliance/consents/check` | Check consent status |
| POST | `/api/compliance/consents/withdraw` | Withdraw consent |
| GET | `/api/compliance/consents/:subjectType/:subjectId` | Get subject consents |
| GET | `/api/compliance/dsar` | Get tenant's DSARs |
| PATCH | `/api/compliance/dsar/:id/status` | Update DSAR status |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compliance/dsar` | Submit DSAR (for data subjects) |

## Database Schema

### Core Tables

```sql
-- Regional compliance configurations
compliance_configs (
  regulation, display_name, data_retention_days,
  breach_notification_hours, consent_expiry_days,
  require_explicit_consent, cross_border_rules
)

-- Tenant compliance settings
tenant_compliance_settings (
  tenant_id, primary_regulation, additional_regulations,
  data_retention_days, enable_data_masking, dpo_email
)

-- Consent records
consent_records (
  tenant_id, subject_type, subject_id, consent_type,
  status, purpose, legal_basis, granted_at, expires_at
)

-- DSARs
dsar_requests (
  tenant_id, request_type, status, subject_email,
  verification_status, response_deadline, completed_at
)

-- Sensitive access logs
sensitive_data_access_logs (
  accessor_type, accessor_id, data_category,
  resource_type, access_reason, risk_level, flagged
)

-- Data masking rules
data_masking_rules (
  role_id, data_category, resource_type,
  field_name, masking_type, is_enabled
)

-- Data breach records
data_breach_records (
  breach_type, severity, discovered_at,
  report_deadline, affected_subjects_count, status
)
```

## Configuration

### Tenant Compliance Settings

```typescript
PATCH /api/compliance/settings
{
  "primaryRegulation": "gdpr",
  "additionalRegulations": ["pdpa_sg"],
  "dataRetentionDays": 365,
  "autoDeleteExpiredData": false,
  "requireConsentForMarketing": true,
  "enableDataMasking": true,
  "enableAuditLogging": true,
  "dpoEmail": "dpo@company.com",
  "dpoName": "Jane Smith",
  "privacyPolicyUrl": "https://company.com/privacy"
}
```

## Best Practices

### 1. Consent Collection
- Always obtain explicit consent before processing personal data
- Provide clear, understandable consent text
- Allow granular consent options
- Record the method of collection
- Set appropriate expiry dates

### 2. DSAR Handling
- Acknowledge requests within 72 hours
- Verify requester identity before disclosing data
- Complete requests within regulatory deadlines (30 days for GDPR)
- Document all actions in the activity log
- Use secure methods for data export delivery

### 3. Access Logging
- Always provide access reasons for PHI
- Review flagged access patterns regularly
- Investigate high-risk access promptly
- Maintain audit logs for regulatory retention periods

### 4. Data Masking
- Configure appropriate masking rules per role
- Never expose full sensitive data to support staff
- Use partial masking where possible for usability
- Review masking rules when adding new roles

### 5. Breach Response
- Report breaches immediately upon discovery
- Document all containment actions
- Notify affected subjects as required
- Conduct post-incident reviews

---

**Document Version**: 1.0
**Last Updated**: January 2026
**Author**: BizFlow Platform Team
