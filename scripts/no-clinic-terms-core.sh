#!/usr/bin/env bash
set -euo pipefail

echo "Scanning for clinic-specific terms in core UI..."

# Forbidden terms (case-insensitive)
FORBIDDEN_REGEX='patient|patients|doctor|dr\.'

# Scan core settings and user management areas (where clinic terms should never appear)
SCAN_DIRS=("client/src/pages/settings" "client/src/pages/admin")

# Files that legitimately contain clinic-specific terms (business type configs, copy constants)
EXCLUDE_FILES=(
  "copy.ts"
  "welcome-message.tsx"
  "welcome-card.tsx"
  "app-sidebar.tsx"
  "tenant-context.tsx"
)

EXCLUDE_DIRS=(
  "node_modules"
  "dist"
  "build"
  ".next"
  "coverage"
  ".git"
  "client/src/pages/clinic"
  "client/src/modules/clinic"
  "server/modules/clinic"
)

EXCLUDE_ARGS=()
for ex in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS+=(--exclude-dir="$ex")
done
for ex in "${EXCLUDE_FILES[@]}"; do
  EXCLUDE_ARGS+=(--exclude="$ex")
done

set +e
matches=$(grep -RIn "${EXCLUDE_ARGS[@]}" -E "$FORBIDDEN_REGEX" "${SCAN_DIRS[@]}" 2>/dev/null || true)
set -e

if [ -n "$matches" ]; then
  echo "❌ Forbidden clinic terms found in core UI:"
  echo "$matches"
  exit 1
fi

echo "✅ No forbidden clinic terms found in core settings/admin UI."
