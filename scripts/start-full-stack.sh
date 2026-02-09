#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# start-full-stack.sh — Launch native Electron + Docker observability stack
#
# Starts Prometheus (:9090) and Grafana (:3001) in Docker, then starts the
# Electron app with its embedded Express server (:3000) + WebSocket (:9876).
#
# Usage:
#   pnpm start:full
#   ./scripts/start-full-stack.sh
#
# The Express server (part of Electron main process in dev mode, or standalone
# via tsx in server:dev mode) exposes /metrics that Prometheus scrapes.
# ============================================================================

COMPOSE_FILE="docker-compose.native.yml"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[full-stack]${NC} $1"; }
warn() { echo -e "${YELLOW}[full-stack]${NC} $1"; }
ok() { echo -e "${GREEN}[full-stack]${NC} $1"; }
err() { echo -e "${RED}[full-stack]${NC} $1"; }

# Cleanup on exit
cleanup() {
  log "Shutting down Docker services..."
  docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- Step 1: Check prerequisites ---
if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Please install Docker Desktop."
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  err "Docker daemon is not running. Start Docker Desktop first."
  exit 1
fi

# --- Step 2: Check if web build is up to date ---
log "Checking if web build is current..."
if [ ! -d "dist/renderer" ] || [ ! -f "dist/server/index.cjs" ]; then
  warn "Web build not found. Building..."
  pnpm build:web
  ok "Web build complete."
else
  # Check if source is newer than build
  NEWEST_SRC=$(find src/ -name '*.ts' -o -name '*.tsx' | xargs stat -f '%m' 2>/dev/null | sort -rn | head -1)
  BUILD_TIME=$(stat -f '%m' dist/server/index.cjs 2>/dev/null || echo "0")
  if [ "${NEWEST_SRC:-0}" -gt "${BUILD_TIME:-0}" ]; then
    warn "Source files changed since last build. Rebuilding..."
    pnpm build:web
    ok "Rebuild complete."
  else
    ok "Web build is up to date."
  fi
fi

# --- Step 3: Start Docker backend services ---
log "Starting Prometheus + Grafana..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
log "Waiting for services to start..."
for i in {1..30}; do
  if curl -sf http://localhost:9090/-/ready >/dev/null 2>&1; then
    ok "Prometheus is ready at http://localhost:9090"
    break
  fi
  sleep 1
done

for i in {1..30}; do
  if curl -sf http://localhost:3001/api/health >/dev/null 2>&1; then
    ok "Grafana is ready at http://localhost:3001 (admin/admin)"
    break
  fi
  sleep 1
done

# --- Step 4: Start Electron ---
log "Starting Electron app..."
echo ""
ok "=== Full Stack Ready ==="
ok "  Electron:   launching..."
ok "  Express:    http://localhost:3000 (embedded in Electron main process)"
ok "  WebSocket:  ws://localhost:9876"
ok "  Prometheus: http://localhost:9090"
ok "  Grafana:    http://localhost:3001 (admin/admin)"
ok "  Metrics:    http://localhost:3000/metrics"
echo ""

# Run Electron (this blocks until the app exits)
pnpm dev
