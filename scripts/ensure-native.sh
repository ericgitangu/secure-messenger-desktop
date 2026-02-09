#!/usr/bin/env sh

# ============================================================================
# ensure-native.sh — Rebuild better-sqlite3 for the correct target
#
# Usage: ./scripts/ensure-native.sh [electron|node]
#
# Tracks the last build target in node_modules/.native-target.
# Only rebuilds when switching between Electron and Node.js, so repeated
# `pnpm dev` or `pnpm test` calls are instant after the first rebuild.
# ============================================================================

set -e

TARGET="${1:-node}"
MARKER="node_modules/.native-target"

if [ "$TARGET" != "electron" ] && [ "$TARGET" != "node" ]; then
  echo "[native] Invalid target: $TARGET (expected 'electron' or 'node')"
  exit 1
fi

# Skip if already built for this target
if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$TARGET" ]; then
  exit 0
fi

echo "[native] Rebuilding better-sqlite3 for $TARGET..."

if [ "$TARGET" = "electron" ]; then
  npx electron-rebuild -f -o better-sqlite3 2>&1 | tail -3
else
  (cd node_modules/better-sqlite3 && npx node-gyp rebuild 2>&1 | tail -3)
fi

echo "$TARGET" > "$MARKER"
echo "[native] better-sqlite3 ready for $TARGET"
