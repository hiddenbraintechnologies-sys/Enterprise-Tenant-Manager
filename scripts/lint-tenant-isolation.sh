#!/bin/bash
#
# Tenant Isolation Lint Script
#
# Flags potentially unsafe database queries that access tenant-owned tables
# without explicit tenantId scoping.
#
# Usage: ./scripts/lint-tenant-isolation.sh
# Exit codes: 0 = pass, 1 = violations found
#
# Allowlist: Add patterns to scripts/tenant-isolation-allowlist.txt (one per line)
# Format: file:line or file:pattern (e.g., server/routes/admin.ts:123)

set -e

SCRIPT_DIR="$(dirname "$0")"
ALLOWLIST_FILE="${SCRIPT_DIR}/tenant-isolation-allowlist.txt"

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

VIOLATIONS=0
WARNINGS=0
EXCLUDE_PATTERN=$(IFS='|'; echo "${EXCLUDE_DIRS[*]}")

load_allowlist() {
  if [ -f "$ALLOWLIST_FILE" ]; then
    cat "$ALLOWLIST_FILE" | grep -v '^#' | grep -v '^$' || true
  fi
}

ALLOWLIST=$(load_allowlist)

is_allowlisted() {
  local match="$1"
  local file=$(echo "$match" | cut -d: -f1)
  local line=$(echo "$match" | cut -d: -f2)
  
  if [ -n "$ALLOWLIST" ]; then
    if echo "$ALLOWLIST" | grep -qF "$file:$line"; then
      return 0
    fi
    if echo "$ALLOWLIST" | grep -qF "$file:"; then
      return 0
    fi
  fi
  return 1
}

echo "=== Tenant Isolation Lint ==="
echo ""

if [ -f "$ALLOWLIST_FILE" ]; then
  echo "Allowlist: $ALLOWLIST_FILE"
else
  echo "Allowlist: (none)"
fi
echo ""

for table in "${TENANT_TABLES[@]}"; do
  matches=$(grep -rn "eq(${table}\\.id," server/routes server/services 2>/dev/null | grep -Ev "$EXCLUDE_PATTERN" | grep -v "tenantId" || true)
  
  if [ -n "$matches" ]; then
    while IFS= read -r line; do
      if is_allowlisted "$line"; then
        echo -e "${YELLOW}[ALLOWED]${NC} $line"
        ((WARNINGS++)) || true
      else
        echo -e "${RED}[VIOLATION]${NC} $table.id without tenantId: $line"
        ((VIOLATIONS++)) || true
      fi
    done <<< "$matches"
  fi
  
  dangerous_patterns=$(grep -rn "findFirst.*${table}" server/routes server/services 2>/dev/null | grep -Ev "$EXCLUDE_PATTERN" | grep -v "tenantId" || true)
  
  if [ -n "$dangerous_patterns" ]; then
    while IFS= read -r line; do
      if is_allowlisted "$line"; then
        echo -e "${YELLOW}[ALLOWED]${NC} $line"
        ((WARNINGS++)) || true
      else
        echo -e "${RED}[VIOLATION]${NC} findFirst on $table without tenantId: $line"
        ((VIOLATIONS++)) || true
      fi
    done <<< "$dangerous_patterns"
  fi
done

echo ""
echo "=== Checking for unscoped mutations ==="

unscoped_deletes=$(grep -rn "\.delete(.*)" server/routes 2>/dev/null | grep -v "tenantId" | grep -Ev "$EXCLUDE_PATTERN|admin|super-admin" | head -20 || true)
if [ -n "$unscoped_deletes" ]; then
  while IFS= read -r line; do
    if is_allowlisted "$line"; then
      echo -e "${YELLOW}[ALLOWED]${NC} $line"
      ((WARNINGS++)) || true
    else
      echo -e "${RED}[VIOLATION]${NC} Potential unscoped delete: $line"
      ((VIOLATIONS++)) || true
    fi
  done <<< "$unscoped_deletes"
fi

echo ""
echo "=== Summary ==="
echo "Violations: $VIOLATIONS"
echo "Allowed (in allowlist): $WARNINGS"

if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}=== FAILED: $VIOLATIONS violation(s) found ===${NC}"
  echo ""
  echo "To fix:"
  echo "  1. Add tenantId scoping to flagged queries"
  echo "  2. Or add to allowlist: scripts/tenant-isolation-allowlist.txt"
  exit 1
else
  echo -e "${GREEN}=== PASSED ===${NC}"
  exit 0
fi
