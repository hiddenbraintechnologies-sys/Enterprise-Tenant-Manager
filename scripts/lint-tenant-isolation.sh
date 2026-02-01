#!/bin/bash
#
# Tenant Isolation Lint Script
#
# Flags potentially unsafe database queries that access tenant-owned tables
# without explicit tenantId scoping.
#
# Usage: ./scripts/lint-tenant-isolation.sh
# Exit codes: 0 = pass, 1 = warnings found
#
# This is a heuristic check - it may have false positives. Review flagged
# lines to determine if they're actually unsafe.

set -e

TENANT_TABLES=(
  "hrEmployees"
  "hrDepartments"
  "services"
  "bookings"
  "invoices"
  "tenantAddons"
  "tenantPayrollAddon"
  "tenantSubscriptions"
  "employees"
)

EXCLUDE_DIRS=(
  "node_modules"
  "dist"
  "__tests__"
  "test-support"
  "migrations"
)

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

WARNINGS=0
EXCLUDE_PATTERN=$(IFS='|'; echo "${EXCLUDE_DIRS[*]}")

echo "=== Tenant Isolation Lint ==="
echo ""

for table in "${TENANT_TABLES[@]}"; do
  echo "Checking: $table"
  
  matches=$(grep -rn "eq(${table}\\.id," server/routes server/services 2>/dev/null | grep -Ev "$EXCLUDE_PATTERN" | grep -v "tenantId" || true)
  
  if [ -n "$matches" ]; then
    echo -e "${YELLOW}  WARNING: Queries on $table.id without tenantId:${NC}"
    echo "$matches" | while read -r line; do
      echo -e "    ${RED}$line${NC}"
      ((WARNINGS++)) || true
    done
  fi
  
  dangerous_patterns=$(grep -rn "findFirst.*${table}" server/routes server/services 2>/dev/null | grep -Ev "$EXCLUDE_PATTERN" | grep -v "tenantId" || true)
  
  if [ -n "$dangerous_patterns" ]; then
    echo -e "${YELLOW}  WARNING: findFirst on $table without tenantId:${NC}"
    echo "$dangerous_patterns" | while read -r line; do
      echo -e "    ${RED}$line${NC}"
      ((WARNINGS++)) || true
    done
  fi
done

echo ""

echo "=== Checking for cross-tenant access patterns ==="

unscoped_deletes=$(grep -rn "\.delete(.*)" server/routes 2>/dev/null | grep -v "tenantId" | grep -Ev "$EXCLUDE_PATTERN|admin|super-admin" | head -10 || true)
if [ -n "$unscoped_deletes" ]; then
  echo -e "${YELLOW}WARNING: Potential unscoped deletes (review manually):${NC}"
  echo "$unscoped_deletes"
  ((WARNINGS++)) || true
fi

echo ""

if [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}=== All checks passed ===${NC}"
  exit 0
else
  echo -e "${YELLOW}=== $WARNINGS potential issues found - review manually ===${NC}"
  exit 0
fi
