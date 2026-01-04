#!/bin/bash
set -e

echo "[deploy] Syncing database schema..."
npx drizzle-kit push --force 2>&1 || echo "[deploy] Schema sync skipped (may already be synced)"

echo "[deploy] Starting server..."
exec node ./dist/index.cjs
