#!/bin/bash
set -e

echo "=============================================="
echo "  MyBizStream Pre-Publish Gate Check"
echo "=============================================="
echo ""

FAILED=0

# Step 1: Environment Check
echo "[1/5] Checking environment..."
echo "  Current NODE_ENV: ${NODE_ENV:-not set}"

if [ "$NODE_ENV" = "production" ]; then
  echo "  ✓ NODE_ENV is set to production"
else
  echo "  ⚠ WARNING: NODE_ENV is not 'production' (current: ${NODE_ENV:-not set})"
  echo "    In production deployment, NODE_ENV should be 'production'"
fi
echo ""

# Step 2: Required Environment Variables
echo "[2/5] Validating required environment variables..."

check_env_var() {
  local var_name=$1
  if [ -n "${!var_name}" ]; then
    echo "  ✓ $var_name is set"
    return 0
  else
    echo "  ✗ $var_name is NOT set (required in production)"
    return 1
  fi
}

ENV_CHECK_FAILED=0

check_env_var "DATABASE_URL" || ENV_CHECK_FAILED=1

# For production, these are required
if [ "$NODE_ENV" = "production" ]; then
  check_env_var "JWT_ACCESS_SECRET" || ENV_CHECK_FAILED=1
  check_env_var "JWT_REFRESH_SECRET" || ENV_CHECK_FAILED=1
  check_env_var "SESSION_SECRET" || ENV_CHECK_FAILED=1
else
  echo "  ℹ JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:+set}${JWT_ACCESS_SECRET:-not set (ok for dev)}"
  echo "  ℹ JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:+set}${JWT_REFRESH_SECRET:-not set (ok for dev)}"
  echo "  ℹ SESSION_SECRET: ${SESSION_SECRET:+set}${SESSION_SECRET:-not set (ok for dev)}"
fi

if [ $ENV_CHECK_FAILED -eq 1 ]; then
  FAILED=1
  echo "  ✗ Environment variable check FAILED"
else
  echo "  ✓ All required environment variables present"
fi
echo ""

# Step 3: TypeScript Compilation
echo "[3/5] Running TypeScript compilation check..."
if npx tsc -p tsconfig.release.json --noEmit 2>&1; then
  echo "  ✓ TypeScript compilation passed"
else
  echo "  ✗ TypeScript compilation FAILED"
  FAILED=1
fi
echo ""

# Step 4: Jest Tests
echo "[4/5] Running tests..."
if npm test 2>&1; then
  echo "  ✓ All tests passed"
else
  echo "  ✗ Tests FAILED"
  FAILED=1
fi
echo ""

# Step 5: Migration Dry Run
echo "[5/5] Running migration dry-run..."
if npx tsx server/scripts/migrate-production.ts --dry-run 2>&1; then
  echo "  ✓ Migration dry-run completed"
else
  echo "  ✗ Migration dry-run FAILED"
  FAILED=1
fi
echo ""

# Final Summary
echo "=============================================="
if [ $FAILED -eq 0 ]; then
  echo "  ✓ ALL CHECKS PASSED - Ready to publish!"
  echo "=============================================="
  exit 0
else
  echo "  ✗ CHECKS FAILED - Do NOT publish!"
  echo "    Fix the issues above before publishing."
  echo "=============================================="
  exit 1
fi
