# BizFlow Load Testing Suite

Performance and load testing for the BizFlow SaaS platform using k6.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Quick Start

```bash
# (Optional) Seed test data first
k6 run --env K6_BASE_URL=http://localhost:5000 scripts/seed-test-data.js

# Run full test suite
./run-tests.sh full-suite

# Run quick smoke test
./run-tests.sh quick

# Run specific test
./run-tests.sh auth
./run-tests.sh dashboard
./run-tests.sh billing
./run-tests.sh whatsapp
```

## Authentication

The load tests use a smart authentication helper that:
1. Attempts real login against the auth endpoint
2. Caches tokens to reduce login requests
3. Falls back to mock tokens if auth is unavailable

This allows tests to run in both mock and real environments.

## Available Tests

| Test | Description | Duration |
|------|-------------|----------|
| `auth` | Authentication flow (login/logout/refresh) | ~22 min |
| `dashboard` | Dashboard and analytics loading | ~21 min |
| `billing` | Billing operations and checkout | ~23 min |
| `whatsapp` | WhatsApp message sending and conversations | ~20 min |
| `full-suite` | Complete platform simulation | ~20 min |
| `quick` | Quick smoke test | 1 min |

## Configuration

Set environment variables to customize tests:

```bash
# Target URL
export K6_BASE_URL=https://staging.bizflow.app

# For quick tests
export K6_VUS=50        # Virtual users
export K6_DURATION=5m   # Test duration

# Run test
./run-tests.sh quick
```

## Test Scenarios

### Authentication Test (`auth-load-test.js`)

Tests the authentication system under load:

- **Steady State**: 50 VUs for 5 minutes
- **Ramp Up**: 10 → 100 → 200 VUs over 16 minutes
- **Spike**: 0 → 500 VUs sudden burst

Metrics tracked:
- Login success rate (target: >95%)
- Login duration (p95 < 500ms)
- Token refresh time (p95 < 200ms)

### Dashboard Test (`dashboard-load-test.js`)

Simulates typical workday traffic pattern:

- Morning ramp-up
- Morning peak
- Lunch dip
- Afternoon peak
- Evening wind-down

Metrics tracked:
- Dashboard load time (p95 < 1s)
- Analytics load time (p95 < 2s)
- Real-time metrics load time (p95 < 500ms)

### Billing Test (`billing-load-test.js`)

Tests billing operations including:

- Subscription management
- Invoice retrieval
- Usage tracking
- Payment processing

Scenarios:
- Normal billing operations
- End-of-month invoice rush
- Checkout stress test

### WhatsApp Test (`whatsapp-load-test.js`)

Tests messaging system at scale:

- **Normal Messaging**: 100 msg/sec for 10 minutes
- **Broadcast Campaign**: Ramps to 500 msg/sec
- **Conversation Load**: 50 concurrent users browsing

Metrics tracked:
- Message send time (p95 < 1s)
- Message delivery rate (>95%)
- Template load time (p95 < 500ms)

### Full Suite (`full-suite.js`)

Complete platform simulation with realistic user journey distribution:

- 40% Dashboard users
- 20% WhatsApp users
- 15% Billing users
- 25% Mixed usage

## Multi-Tenant Simulation

Tests simulate traffic from 5 different tenants:

| Tenant | Tier | Users |
|--------|------|-------|
| Acme Corp | Enterprise | 10 |
| Beta Inc | Pro | 10 |
| Gamma LLC | Starter | 10 |
| Delta Co | Pro | 10 |
| Echo Ltd | Enterprise | 10 |

Each virtual user randomly selects a tenant and user for realistic multi-tenant traffic patterns.

## Thresholds

Default performance thresholds:

| Metric | Target |
|--------|--------|
| HTTP Request Duration (p95) | < 500ms |
| HTTP Request Duration (p99) | < 1000ms |
| HTTP Request Failure Rate | < 1% |
| Requests per Second | > 100 |

## Reports

Reports are saved to `reports/` directory:

- `summary-<timestamp>.json` - Raw metrics data
- `summary-<timestamp>.html` - Visual HTML report

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run Load Tests
  run: |
    docker run --rm -v $(pwd)/load-tests:/tests \
      -e K6_BASE_URL=https://staging.bizflow.app \
      grafana/k6 run /tests/scripts/full-suite.js
```

## Extending Tests

### Adding New Endpoints

1. Update `scripts/config.js` with new endpoints
2. Create test file in `scripts/`
3. Add to `run-tests.sh`

### Custom Metrics

```javascript
import { Trend, Rate, Counter } from 'k6/metrics';

const myMetric = new Trend('my_custom_metric');
myMetric.add(responseTime);
```

## Troubleshooting

### Connection Refused

Ensure the application is running and accessible:

```bash
curl http://localhost:5000/health
```

### Rate Limiting

If you see many 429 errors, the rate limiter is working. Adjust test parameters or temporarily increase rate limits for testing.

### Memory Issues

For large tests, increase system resources:

```bash
# Run with more memory
K6_OPTIONS="--no-vu-connection-reuse" k6 run script.js
```
