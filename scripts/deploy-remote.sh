#!/usr/bin/env bash
# Clean deploy script — runs on the VM via SSH
# Zero-downtime deploy with ordered startup and safe secret management
set -euo pipefail

trap 'echo "DEPLOY FAILED at line $LINENO"; exit 1' ERR

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info() { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
log_warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

DEPLOY_DIR="${DEPLOY_DIR:-~/spaceship}"
REGISTRY="${REGISTRY:-ghcr.io}"
OWNER="${OWNER:-}"
GITHUB_SHA="${GITHUB_SHA:-}"
VM_IP="${VM_IP:-}"

[[ -z "$GITHUB_SHA" ]] && { log_error "GITHUB_SHA missing"; exit 1; }
[[ -z "$OWNER" ]] && { log_error "OWNER missing"; exit 1; }

cd "$DEPLOY_DIR" || { log_error "Cannot cd to $DEPLOY_DIR"; exit 1; }

# ═══════════════════════════════════════════════════════
# SECTION A — VM setup check
# ═══════════════════════════════════════════════════════

if ! command -v docker &> /dev/null; then
  log_error "Docker not installed. Run setup via GitHub Actions first."
  exit 1
fi
if ! docker compose version &> /dev/null; then
  log_error "Docker Compose not installed. Run setup via GitHub Actions first."
  exit 1
fi

# ═══════════════════════════════════════════════════════
# SECTION A2 — Pre-deploy disk cleanup
# ═══════════════════════════════════════════════════════

log_info "Cleaning up Docker build cache and unused resources..."
docker builder prune -af > /dev/null 2>&1 || true
docker container prune -f > /dev/null 2>&1 || true
docker image prune -af > /dev/null 2>&1 || true

# ═══════════════════════════════════════════════════════
# SECTION B — Secrets management (no duplicate keys ever)
# ═══════════════════════════════════════════════════════

if [[ ! -f .env.production ]]; then
  log_info "First deploy — generating fresh secrets..."
  DB_PASSWORD=$(openssl rand -hex 32)
  REDIS_PASSWORD=$(openssl rand -hex 32)
  JWT_SECRET=$(openssl rand -base64 48)
  COOKIE_SECRET=$(openssl rand -base64 32)
  PAYMENT_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
else
  log_info "Existing deploy — extracting secrets safely from .env.production..."

  DB_PASSWORD=$(grep '^DB_PASSWORD=' .env.production | cut -d= -f2-)
  REDIS_PASSWORD=$(grep '^REDIS_PASSWORD=' .env.production | cut -d= -f2-)
  JWT_SECRET=$(grep '^JWT_SECRET=' .env.production | cut -d= -f2-)
  COOKIE_SECRET=$(grep '^COOKIE_SECRET=' .env.production | cut -d= -f2-)
  PAYMENT_CONFIG_ENCRYPTION_KEY=$(grep '^PAYMENT_CONFIG_ENCRYPTION_KEY=' .env.production | cut -d= -f2-)

  # Recover standalone passwords from URLs if missing
  if [[ -z "$DB_PASSWORD" ]]; then
    DB_PASSWORD=$(grep '^DATABASE_URL=' .env.production | sed 's|.*spaceship:\([^@]*\)@.*|\1|')
  fi
  if [[ -z "$REDIS_PASSWORD" ]]; then
    REDIS_PASSWORD=$(grep '^REDIS_URL=' .env.production | sed 's|redis://:\([^@]*\)@.*|\1|')
  fi

  # Generate any still-missing secrets
  [[ -z "$JWT_SECRET" ]] && JWT_SECRET=$(openssl rand -base64 48)
  [[ -z "$COOKIE_SECRET" ]] && COOKIE_SECRET=$(openssl rand -base64 32)
  [[ -z "$PAYMENT_CONFIG_ENCRYPTION_KEY" ]] && PAYMENT_CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)
fi

# Guard — passwords must not be empty
[[ -z "$DB_PASSWORD" ]] && { log_error "DB_PASSWORD empty"; exit 1; }
[[ -z "$REDIS_PASSWORD" ]] && { log_error "REDIS_PASSWORD empty"; exit 1; }

# Ensure URLs always match the standalone passwords
DATABASE_URL="postgresql://spaceship:${DB_PASSWORD}@postgres:5432/spaceship"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

# Image tags
BACKEND_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/backend:${GITHUB_SHA}"
DASHBOARD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/dashboard:${GITHUB_SHA}"
LANDING_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/landing:${GITHUB_SHA}"
STOREFRONT_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront:${GITHUB_SHA}"
STOREFRONT_FOOD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront-food:${GITHUB_SHA}"

# ALWAYS rewrite .env.production from scratch (no appends ever)
cat > .env.production <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_PASSWORD=${DB_PASSWORD}
DB_USER=spaceship
DB_NAME=spaceship
REDIS_PASSWORD=${REDIS_PASSWORD}
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
PAYMENT_CONFIG_ENCRYPTION_KEY=${PAYMENT_CONFIG_ENCRYPTION_KEY}
API_BASE_URL=http://backend:3000
LOG_LEVEL=info
FROM_EMAIL=noreply@spaceship.dev
BACKEND_IMAGE=${BACKEND_IMAGE}
DASHBOARD_IMAGE=${DASHBOARD_IMAGE}
LANDING_IMAGE=${LANDING_IMAGE}
STOREFRONT_IMAGE=${STOREFRONT_IMAGE}
STOREFRONT_FOOD_IMAGE=${STOREFRONT_FOOD_IMAGE}
EOF

log_info ".env.production rewritten (secrets preserved, passwords consistent, image tags updated)."

# ═══════════════════════════════════════════════════════
# SECTION C — Caddyfile mode selection
# ═══════════════════════════════════════════════════════

if [[ -n "$STOREFRONT_DOMAIN" ]]; then
  log_info "Domains configured — switching to domain-aware Caddyfile..."
  cp Caddyfile.domain Caddyfile
else
  log_info "No domains configured — using IP-based Caddyfile"
fi

# Always set LETS_ENCRYPT_EMAIL in Caddyfile if provided
if [[ -n "$LETS_ENCRYPT_EMAIL" ]]; then
  sed -i "s|{\$LETS_ENCRYPT_EMAIL}|$LETS_ENCRYPT_EMAIL|g" Caddyfile
fi

# Validate and reload Caddy config if already running
if docker ps --format '{{.Names}}' | grep -q '^spaceship_caddy$'; then
  log_info "Validating Caddyfile..."
  docker exec spaceship_caddy caddy validate --config /etc/caddy/Caddyfile || {
    log_error "Caddyfile validation failed"; exit 1;
  }
  log_info "Reloading Caddy configuration..."
  docker exec spaceship_caddy caddy reload --config /etc/caddy/Caddyfile || true
fi

# ═══════════════════════════════════════════════════════
# SECTION D — Pre-deploy DB backup
# ═══════════════════════════════════════════════════════

if docker ps --format '{{.Names}}' | grep -q '^spaceship_postgres$'; then
  BACKUP="backup_$(date +%Y%m%d_%H%M%S).sql"
  docker exec spaceship_postgres pg_dump -U spaceship spaceship \
    > "$BACKUP" 2>/dev/null && echo "Backup: $BACKUP" || echo "Backup skipped"
fi

# ═══════════════════════════════════════════════════════
# SECTION E — Zero downtime deploy sequence
# ═══════════════════════════════════════════════════════

# Step 1: Login to GHCR
log_info "Logging in to GHCR..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$OWNER" --password-stdin

# Step 2: Pull all new images first (no downtime yet)
log_info "Pulling new images..."
docker compose --env-file .env.production -f docker-compose.prod.yml pull

# Step 3: Start/update postgres and redis first (they are stateful)
log_info "Starting postgres and redis..."
docker compose --env-file .env.production -f docker-compose.prod.yml \
  up -d postgres redis

# Wait for postgres healthy
echo "Waiting for postgres..."
for i in $(seq 1 30); do
  if docker exec spaceship_postgres pg_isready -U spaceship \
     > /dev/null 2>&1; then
    echo "Postgres ready"
    break
  fi
  sleep 2
done

# Sync postgres password if old data exists with a different password
# (first deploy on a VM that already had postgres from a previous deployment)
if docker ps --format '{{.Names}}' | grep -q '^spaceship_postgres$'; then
  echo "Syncing postgres password with .env.production..."
  docker exec spaceship_postgres psql -U spaceship -d spaceship \
    -c "ALTER USER spaceship WITH PASSWORD '${DB_PASSWORD}';" \
    > /dev/null 2>&1 || true
fi

# Step 4: Run migrations (separate container, runs and exits)
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm migrate

MIGRATE_EXIT=$?
if [[ $MIGRATE_EXIT -ne 0 ]]; then
  log_error "Migrations failed (exit $MIGRATE_EXIT). Aborting deploy."
  exit 1
fi
log_info "Migrations complete."

# Step 5: Update backend (zero downtime via start-first)
log_info "Updating backend..."
docker compose --env-file .env.production -f docker-compose.prod.yml \
  up -d --no-deps backend

# Wait for backend health
echo "Waiting for backend..."
BACKEND_READY=false
for i in $(seq 1 90); do
  if wget -qO- http://localhost:3000/health > /dev/null 2>&1 || \
     curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    echo "Backend healthy after ${i} checks"
    BACKEND_READY=true
    break
  fi
  sleep 2
done

if [[ "$BACKEND_READY" != "true" ]]; then
  log_error "Backend failed to become healthy. Check: docker logs spaceship_backend"
  exit 1
fi

# Step 6: Update frontends (they depend on backend being healthy)
log_info "Updating frontends..."
docker compose --env-file .env.production -f docker-compose.prod.yml \
  up -d --no-deps landing dashboard storefront storefront-food caddy

# Force Caddy to restart so it picks up new upstream config from scratch
# (caddy reload alone doesn't work when admin API was disabled at startup)
log_info "Restarting Caddy to apply new upstream config..."
docker compose --env-file .env.production -f docker-compose.prod.yml \
  restart caddy

# Step 7: Verify all containers running
echo "=== Container Status ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep spaceship_

# Step 8: Cleanup old images
log_info "Cleaning up old images..."
docker image prune -f --filter "dangling=true" > /dev/null

# Step 9: Print success
log_info "========================================"
log_info "Deployment complete!"
log_info "Backend:    http://${VM_IP}:3000"
log_info "Dashboard:  http://${VM_IP}:3001"
log_info "Storefront: http://${VM_IP}:3002"
log_info "Food:       http://${VM_IP}:3003"
log_info "Landing:    http://${VM_IP}:3004"
log_info "========================================"
