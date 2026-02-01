#!/bin/bash
# Branding Check Script
# Scans codebase for user-facing "Replit" branding
# Returns exit code 1 if found (fails CI)

set -e

echo "Scanning for user-facing Replit branding..."

# Paths to scan (user-facing code only)
SCAN_PATHS=(
  "client/src/pages"
  "client/src/components"
  "client/src/lib"
  "client/src/hooks"
  "client/src/i18n"
)

# Allowlist patterns (internal/infrastructure files)
ALLOWLIST=(
  "replit_integrations"
  "domain-resolution"
  "domain-service"
  ".test.ts"
  ".test.tsx"
  "check-branding.sh"
)

FOUND=0

for path in "${SCAN_PATHS[@]}"; do
  if [ -d "$path" ]; then
    # Search for Replit references, case insensitive
    while IFS= read -r file; do
      # Check if file is in allowlist
      ALLOWED=false
      for pattern in "${ALLOWLIST[@]}"; do
        if [[ "$file" == *"$pattern"* ]]; then
          ALLOWED=true
          break
        fi
      done
      
      if [ "$ALLOWED" = false ]; then
        echo "FOUND: $file"
        grep -n -i "replit" "$file" || true
        FOUND=1
      fi
    done < <(grep -ril "replit" "$path" 2>/dev/null || true)
  fi
done

# Also scan for common user-facing patterns
echo ""
echo "Checking for user-facing branding patterns..."

PATTERNS=(
  "Replit account"
  "replit.com"
  "Hosted on Replit"
  "Continue with Replit"
)

for pattern in "${PATTERNS[@]}"; do
  for path in "${SCAN_PATHS[@]}"; do
    if [ -d "$path" ]; then
      MATCHES=$(grep -ril "$pattern" "$path" 2>/dev/null || true)
      if [ -n "$MATCHES" ]; then
        echo "FOUND pattern '$pattern' in:"
        echo "$MATCHES"
        FOUND=1
      fi
    fi
  done
done

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "ERROR: User-facing Replit branding found. Please update to neutral language."
  exit 1
else
  echo ""
  echo "SUCCESS: No user-facing Replit branding detected."
  exit 0
fi
