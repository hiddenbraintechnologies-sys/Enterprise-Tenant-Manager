#!/bin/bash
# BizFlow Database Backup Script
# Usage: ./scripts/backup.sh [full|incremental] [environment]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENVIRONMENT="${2:-production}"
BACKUP_TYPE="${1:-full}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="bizflow_${ENVIRONMENT}_${BACKUP_TYPE}_${TIMESTAMP}"

# Database connection (from environment variables)
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-bizflow}"
PGDATABASE="${PGDATABASE:-bizflow}"

echo "================================================"
echo "BizFlow Database Backup"
echo "================================================"
echo "Environment: ${ENVIRONMENT}"
echo "Backup Type: ${BACKUP_TYPE}"
echo "Timestamp:   ${TIMESTAMP}"
echo "Destination: ${BACKUP_DIR}/${BACKUP_NAME}"
echo "================================================"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup based on type
case "${BACKUP_TYPE}" in
    full)
        echo "[$(date)] Starting full backup..."
        
        # Create custom format backup (most flexible)
        pg_dump \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${PGDATABASE}" \
            -F custom \
            -Z 9 \
            -f "${BACKUP_DIR}/${BACKUP_NAME}.dump"
        
        # Also create SQL backup for disaster recovery
        pg_dump \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${PGDATABASE}" \
            --no-owner \
            --no-acl \
            | gzip > "${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"
        
        echo "[$(date)] Full backup completed"
        ;;
        
    incremental)
        echo "[$(date)] Starting incremental backup (WAL archiving)..."
        # For incremental backups, use pg_basebackup with WAL archiving
        # This requires proper PostgreSQL configuration for WAL archiving
        
        pg_basebackup \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -D "${BACKUP_DIR}/${BACKUP_NAME}_base" \
            -Ft \
            -z \
            -P
        
        echo "[$(date)] Incremental backup completed"
        ;;
        
    schema)
        echo "[$(date)] Starting schema-only backup..."
        
        pg_dump \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${PGDATABASE}" \
            --schema-only \
            --no-owner \
            --no-acl \
            | gzip > "${BACKUP_DIR}/${BACKUP_NAME}_schema.sql.gz"
        
        echo "[$(date)] Schema backup completed"
        ;;
        
    *)
        echo "Unknown backup type: ${BACKUP_TYPE}"
        echo "Usage: $0 [full|incremental|schema] [environment]"
        exit 1
        ;;
esac

# Calculate backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}"* 2>/dev/null | cut -f1 || echo "N/A")
echo "[$(date)] Backup size: ${BACKUP_SIZE}"

# Create backup manifest
cat > "${BACKUP_DIR}/${BACKUP_NAME}.manifest.json" <<EOF
{
    "backup_name": "${BACKUP_NAME}",
    "environment": "${ENVIRONMENT}",
    "backup_type": "${BACKUP_TYPE}",
    "timestamp": "${TIMESTAMP}",
    "database": "${PGDATABASE}",
    "host": "${PGHOST}",
    "size": "${BACKUP_SIZE}",
    "created_at": "$(date -Iseconds)"
}
EOF

# Cleanup old backups
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "bizflow_${ENVIRONMENT}_*" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "bizflow_${ENVIRONMENT}_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "${BACKUP_DIR}"/bizflow_${ENVIRONMENT}_*.dump 2>/dev/null | tail -5 || echo "No backups found"

echo ""
echo "================================================"
echo "Backup completed successfully!"
echo "================================================"
