#!/bin/bash
# BizFlow Load Test Runner
# Usage: ./run-tests.sh [test-name] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"

# Default values
TEST_NAME="${1:-full-suite}"
BASE_URL="${K6_BASE_URL:-http://localhost:5000}"
VUS="${K6_VUS:-10}"
DURATION="${K6_DURATION:-1m}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "================================================"
echo "BizFlow Load Test Runner"
echo "================================================"
echo "Test:     ${TEST_NAME}"
echo "Base URL: ${BASE_URL}"
echo "VUs:      ${VUS}"
echo "Duration: ${DURATION}"
echo "================================================"

# Create reports directory
mkdir -p "${REPORTS_DIR}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    log_warn "k6 is not installed. Installing..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
fi

# Run tests
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

case "${TEST_NAME}" in
    auth)
        log_info "Running Authentication Load Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --out json="${REPORTS_DIR}/auth_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/auth-load-test.js"
        ;;
    dashboard)
        log_info "Running Dashboard Load Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --out json="${REPORTS_DIR}/dashboard_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/dashboard-load-test.js"
        ;;
    billing)
        log_info "Running Billing Load Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --out json="${REPORTS_DIR}/billing_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/billing-load-test.js"
        ;;
    whatsapp)
        log_info "Running WhatsApp Load Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --out json="${REPORTS_DIR}/whatsapp_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/whatsapp-load-test.js"
        ;;
    full-suite|full|all)
        log_info "Running Full Platform Load Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --out json="${REPORTS_DIR}/full_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/full-suite.js"
        ;;
    quick)
        log_info "Running Quick Smoke Test..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            --vus "${VUS}" \
            --duration "${DURATION}" \
            --out json="${REPORTS_DIR}/quick_${TIMESTAMP}.json" \
            "${SCRIPTS_DIR}/full-suite.js"
        ;;
    seed)
        log_info "Seeding test data..."
        k6 run \
            --env K6_BASE_URL="${BASE_URL}" \
            "${SCRIPTS_DIR}/seed-test-data.js"
        ;;
    *)
        echo "Unknown test: ${TEST_NAME}"
        echo ""
        echo "Available tests:"
        echo "  auth       - Authentication endpoints"
        echo "  dashboard  - Dashboard and analytics"
        echo "  billing    - Billing and payments"
        echo "  whatsapp   - WhatsApp messaging"
        echo "  full-suite - Complete platform test"
        echo "  quick      - Quick smoke test (1 minute)"
        echo "  seed       - Seed test data (run once)"
        echo ""
        echo "Options:"
        echo "  K6_BASE_URL=<url>    - Target URL (default: http://localhost:5000)"
        echo "  K6_VUS=<number>      - Virtual users for quick test (default: 10)"
        echo "  K6_DURATION=<time>   - Duration for quick test (default: 1m)"
        exit 1
        ;;
esac

log_info "Test completed! Reports saved to: ${REPORTS_DIR}"
echo ""
echo "To view HTML report, open:"
echo "  ${REPORTS_DIR}/summary-*.html"
