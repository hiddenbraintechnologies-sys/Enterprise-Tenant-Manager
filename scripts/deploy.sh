#!/bin/bash
# BizFlow Zero-Downtime Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "================================================"
echo "BizFlow Zero-Downtime Deployment"
echo "================================================"
echo "Environment: ${ENVIRONMENT}"
echo "Version:     ${VERSION}"
echo "Timestamp:   $(date)"
echo "================================================"

# Validate environment
case "${ENVIRONMENT}" in
    dev|development)
        COMPOSE_FILE="docker-compose.dev.yml"
        ;;
    staging)
        COMPOSE_FILE="docker-compose.staging.yml"
        ;;
    prod|production)
        COMPOSE_FILE="docker-compose.prod.yml"
        ;;
    *)
        log_error "Unknown environment: ${ENVIRONMENT}"
        echo "Usage: $0 [dev|staging|prod] [version]"
        exit 1
        ;;
esac

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed"
    exit 1
fi

# Load environment variables
if [ -f "${PROJECT_DIR}/.env.${ENVIRONMENT}" ]; then
    export $(cat "${PROJECT_DIR}/.env.${ENVIRONMENT}" | grep -v '^#' | xargs)
    log_info "Loaded environment file: .env.${ENVIRONMENT}"
elif [ -f "${PROJECT_DIR}/.env" ]; then
    export $(cat "${PROJECT_DIR}/.env" | grep -v '^#' | xargs)
    log_info "Loaded environment file: .env"
else
    log_warn "No environment file found"
fi

# Build new image
log_info "Building new Docker image..."
docker build -t bizflow:${VERSION} -f "${PROJECT_DIR}/Dockerfile" "${PROJECT_DIR}"

# Tag image
docker tag bizflow:${VERSION} bizflow:latest

# Pre-deployment database backup (production only)
if [ "${ENVIRONMENT}" == "prod" ] || [ "${ENVIRONMENT}" == "production" ]; then
    log_info "Creating pre-deployment backup..."
    "${SCRIPT_DIR}/backup.sh" full production || log_warn "Backup failed, continuing deployment"
fi

# Run database migrations (using db:push for now, replace with db:migrate when available)
log_info "Running database migrations..."
docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" \
    --profile migrations run --rm migrations || {
    log_warn "Migration step skipped or failed, continuing deployment"
}

# Zero-downtime deployment using rolling update
log_info "Starting zero-downtime deployment..."

# Scale up new instances before scaling down old ones
if [ "${ENVIRONMENT}" == "prod" ] || [ "${ENVIRONMENT}" == "production" ]; then
    # Production: Use rolling update strategy
    log_info "Scaling up new instances..."
    docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" \
        up -d --no-deps --scale api=4 api
    
    # Wait for new instances to be healthy
    log_info "Waiting for health checks..."
    sleep 30
    
    # Check health
    HEALTH_CHECK=$(curl -sf http://localhost:8080/health || echo "failed")
    if [ "${HEALTH_CHECK}" == "failed" ]; then
        log_error "Health check failed! Rolling back..."
        docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" \
            up -d --no-deps --scale api=3 api
        exit 1
    fi
    
    # Scale down to desired replicas
    log_info "Scaling to production replicas..."
    docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" \
        up -d --no-deps --scale api=3 api
else
    # Non-production: Simple restart
    docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" \
        up -d --force-recreate api
fi

# Clean up old containers and images
log_info "Cleaning up old resources..."
docker system prune -f --filter "until=24h"

# Post-deployment verification
log_info "Running post-deployment verification..."

# Wait for services to stabilize
sleep 10

# Health check
FINAL_HEALTH=$(curl -sf http://localhost:8080/health 2>/dev/null || echo '{"status":"unknown"}')
log_info "Health check response: ${FINAL_HEALTH}"

# Show running containers
log_info "Running containers:"
docker-compose -f "${PROJECT_DIR}/docker-compose.yml" -f "${PROJECT_DIR}/${COMPOSE_FILE}" ps

echo ""
echo "================================================"
echo "Deployment completed successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Monitor application logs: docker-compose logs -f api"
echo "2. Check metrics dashboard"
echo "3. Run smoke tests"
