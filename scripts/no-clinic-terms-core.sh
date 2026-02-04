#!/usr/bin/env bash
set -euo pipefail

echo "Scanning for clinic-specific terms in core UI..."

# Forbidden terms (case-insensitive)
FORBIDDEN_REGEX='patient|patients|doctor|dr\.'

# Scan all client source (comprehensive scan)
SCAN_DIRS=("client/src")

# Files that legitimately contain clinic-specific terms
# (business type configs, copy constants, clinic-specific pages, conditional rendering)
EXCLUDE_FILES=(
  "copy.ts"
  "welcome-message.tsx"
  "welcome-card.tsx"
  "app-sidebar.tsx"
  "tenant-context.tsx"
  "clinic-dashboard.tsx"
  "customer-detail.tsx"
  "customers.tsx"
  "en.json"
)

EXCLUDE_DIRS=(
  "node_modules"
  "dist"
  "build"
  ".next"
  "coverage"
  ".git"
  "__tests__"
)

EXCLUDE_ARGS=()
for ex in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS+=(--exclude-dir="$ex")
done
for ex in "${EXCLUDE_FILES[@]}"; do
  EXCLUDE_ARGS+=(--exclude="$ex")
done

set +e
matches=$(grep -RIn "${EXCLUDE_ARGS[@]}" -iE "$FORBIDDEN_REGEX" "${SCAN_DIRS[@]}" 2>/dev/null || true)
set -e

if [ -n "$matches" ]; then
  echo "❌ Forbidden clinic terms found in core UI:"
  echo "$matches"
  echo ""
  echo "Allowed locations for clinic terms:"
  echo "  - Files with business-type conditional logic (isClinic ? ... : ...)"
  echo "  - client/src/pages/clinic-dashboard.tsx"
  echo "  - client/src/pages/customer-detail.tsx"
  echo "  - client/src/pages/customers.tsx"
  echo "  - client/src/components/welcome-*.tsx"
  echo "  - client/src/components/app-sidebar.tsx"
  echo "  - client/src/contexts/tenant-context.tsx"
  echo "  - client/src/lib/copy.ts"
  echo "  - client/src/i18n/locales/*.json"
  exit 1
fi

echo "✅ No forbidden clinic terms found in core UI."
