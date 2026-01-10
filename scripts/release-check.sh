#!/bin/bash
set -e

echo "=== MyBizStream Release Check ==="
echo ""

echo "1. Running TypeScript type check (release config)..."
npx tsc -p tsconfig.release.json --noEmit
echo "   ✓ Type check passed"
echo ""

echo "2. Running full test suite..."
npx jest --forceExit
echo "   ✓ All tests passed"
echo ""

echo "=== Release Check Complete ==="
echo "All checks passed. Ready for release."
