#!/bin/bash
# BizFlow Database Restore Script
# Usage: ./scripts/restore.sh <backup_file> [target_database]

set -e

# Configuration
BACKUP_FILE="${1}"
TARGET_DB="${2:-bizflow}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-bizflow}"

# Validate arguments
if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup_file> [target_database]"
    echo ""
    echo "Examples:"
    echo "  $0 /backups/bizflow_production_full_20240115_120000.dump"
    echo "  $0 /backups/bizflow_production_full_20240115_120000.sql.gz bizflow_restored"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "================================================"
echo "BizFlow Database Restore"
echo "================================================"
echo "Backup File:     ${BACKUP_FILE}"
echo "Target Database: ${TARGET_DB}"
echo "Host:            ${PGHOST}:${PGPORT}"
echo "================================================"
echo ""

# Confirm restore
read -p "WARNING: This will overwrite the target database. Continue? (yes/no): " confirm
if [ "${confirm}" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Determine backup type based on file extension
case "${BACKUP_FILE}" in
    *.dump)
        echo "[$(date)] Restoring from custom format backup..."
        
        # Drop and recreate database
        echo "[$(date)] Dropping existing database..."
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};" || true
        
        echo "[$(date)] Creating fresh database..."
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "CREATE DATABASE ${TARGET_DB};"
        
        echo "[$(date)] Restoring data..."
        pg_restore \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${TARGET_DB}" \
            --no-owner \
            --no-acl \
            --clean \
            --if-exists \
            "${BACKUP_FILE}"
        ;;
        
    *.sql.gz)
        echo "[$(date)] Restoring from SQL backup..."
        
        # Drop and recreate database
        echo "[$(date)] Dropping existing database..."
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};" || true
        
        echo "[$(date)] Creating fresh database..."
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "CREATE DATABASE ${TARGET_DB};"
        
        echo "[$(date)] Restoring data..."
        gunzip -c "${BACKUP_FILE}" | psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${TARGET_DB}"
        ;;
        
    *.sql)
        echo "[$(date)] Restoring from SQL backup..."
        
        # Drop and recreate database
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};" || true
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c "CREATE DATABASE ${TARGET_DB};"
        
        psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${TARGET_DB}" < "${BACKUP_FILE}"
        ;;
        
    *)
        echo "Error: Unknown backup format. Supported: .dump, .sql.gz, .sql"
        exit 1
        ;;
esac

# Verify restore
echo ""
echo "[$(date)] Verifying restore..."
TABLE_COUNT=$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${TARGET_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables restored: ${TABLE_COUNT}"

# Run post-restore migrations if available
if [ -f "./scripts/post-restore.sql" ]; then
    echo "[$(date)] Running post-restore migrations..."
    psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${TARGET_DB}" < ./scripts/post-restore.sql
fi

echo ""
echo "================================================"
echo "Restore completed successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Run database migrations: npm run db:migrate"
echo "2. Verify application connectivity"
echo "3. Run smoke tests"
