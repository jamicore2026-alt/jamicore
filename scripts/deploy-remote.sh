#!/usr/bin/env bash
#
# Remote deployment script — runs ON the VM via SSH
# Strong bash: set -euo pipefail, proper error handling, retries
#
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-~/spaceship}"
REGISTRY="${REGISTRY:-ghcr.io}"
OWNER="${OWNER}"
GITHUB_SHA="${GITHUB_SHA}"
API_DOMAIN="${API_DOMAIN:-}"
DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-}"
STOREFRONT_DOMAIN="${STOREFRONT_DOMAIN:-}"
STOREFRONT_FOOD_DOMAIN="${STOREFRONT_FOOD_DOMAIN:-}"
VM_IP="${VM_IP:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
log_warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
log_error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }

# Retry helper for flaky commands (docker pull, etc.)
retry() {
  local max_attempts="${1:-3}"
  local delay="${2:-5}"
  shift 2
  local attempt=1
  while true; do
    if "$@"; then
      return 0
    fi
    if [[ $attempt -ge $max_attempts ]]; then
      log_error "Command failed after $max_attempts attempts: $*"
      return 1
    fi
    log_warn "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done
}

# ── Pre-flight checks ───────────────────────────────────────────────
log_info "Starting Spaceship deployment..."
log_info "SHA: $GITHUB_SHA | DIR: $DEPLOY_DIR"

if [[ -z "$GITHUB_SHA" ]]; then
  log_error "GITHUB_SHA is not set"
  exit 1
fi

if [[ -z "$OWNER" ]]; then
  log_error "OWNER is not set"
  exit 1
fi

# ── First-time VM setup ─────────────────────────────────────────────
# Auto-install Docker if missing (Ubuntu/Debian only)
if ! command -v docker &> /dev/null; then
  log_warn "Docker not found. Installing Docker..."
  set +e
  curl -fsSL https://get.docker.com | sh
  set -e
  usermod -aG docker "$USER" || true
  # Re-evaluate PATH for docker
  export PATH="/usr/bin:/usr/local/bin:$PATH"
  if ! command -v docker &> /dev/null; then
    log_error "Docker installation failed. Please install manually."
    exit 1
  fi
  log_info "Docker installed successfully."
fi

# Ensure docker compose plugin is available
if ! docker compose version &> /dev/null; then
  log_warn "Docker Compose plugin not found. Installing..."
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin || true
  if ! docker compose version &> /dev/null; then
    log_warn "Docker Compose plugin install failed — falling back to standalone"
    apt-get install -y -qq docker-compose || true
  fi
fi

# Ensure git is installed
if ! command -v git &> /dev/null; then
  log_warn "Git not found. Installing..."
  apt-get update -qq && apt-get install -y -qq git
fi

# Ensure deploy directory exists with the repo
if [[ ! -d "$DEPLOY_DIR/.git" ]]; then
  log_info "Deploy directory not initialized. Cloning repo..."
  # If directory exists but is not a git repo, clone into temp and move
  if [[ -d "$DEPLOY_DIR" ]] && [[ "$(ls -A "$DEPLOY_DIR" 2>/dev/null)" ]]; then
    log_warn "Directory $DEPLOY_DIR exists and is not empty. Backing up and re-cloning..."
    mv "$DEPLOY_DIR" "${DEPLOY_DIR}.bak.$(date +%s)"
  fi
  mkdir -p "$DEPLOY_DIR"
  git clone "https://github.com/${OWNER}/jamicore.git" "$DEPLOY_DIR" || {
    log_error "Git clone failed. Ensure the repo exists and is public, or provide a deploy key."
    exit 1
  }
fi
cd "$DEPLOY_DIR" || { log_error "Cannot cd to $DEPLOY_DIR"; exit 1; }

# Clean up any manually-created network from previous attempts so compose can manage it
docker network rm spaceship_net 2>/dev/null || true

# ── Generate .env.production if missing ─────────────────────────────
if [[ ! -f .env.production ]]; then
  log_info "Generating new .env.production with secure secrets..."

  DB_PASSWORD="$(openssl rand -hex 32)"
  REDIS_PASSWORD="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -base64 48)"
  COOKIE_SECRET="$(openssl rand -base64 32)"
  PAYMENT_CONFIG_ENCRYPTION_KEY="$(openssl rand -hex 32)"
  HEALTH_CHECK_KEY="$(openssl rand -hex 16)"
  SUPER_ADMIN_PASSWORD="$(openssl rand -base64 32)"

  cat > .env.production <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_USER=spaceship
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=spaceship
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
PAYMENT_CONFIG_ENCRYPTION_KEY=${PAYMENT_CONFIG_ENCRYPTION_KEY}
HEALTH_CHECK_KEY=${HEALTH_CHECK_KEY}
RESEND_API_KEY=
FROM_EMAIL=noreply@spaceship.dev
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MIXPANEL_TOKEN=
LOG_LEVEL=info
CORS_ORIGINS=
TRUST_PROXY_HOPS=1
# Public URLs go through Caddy reverse proxy on port 80
# Internal Docker ports (3000/3001/3002) are localhost-only
STOREFRONT_URL=http://${VM_IP}
API_BASE_URL=http://${VM_IP}
API_DOMAIN=${API_DOMAIN:-${VM_IP}}
DASHBOARD_DOMAIN=${DASHBOARD_DOMAIN:-${VM_IP}}
STOREFRONT_DOMAIN=${STOREFRONT_DOMAIN:-${VM_IP}}
DASHBOARD_ORIGIN=http://${VM_IP}
STOREFRONT_ORIGIN=http://${VM_IP}
STOREFRONT_FOOD_ORIGIN=http://${VM_IP}
STOREFRONT_FOOD_DOMAIN=${STOREFRONT_FOOD_DOMAIN:-${VM_IP}}
PUBLIC_STORE_FALLBACK_DOMAIN=techgear
SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}
EOF
  chmod 600 .env.production
  log_info ".env.production created with auto-generated secrets."
else
  log_info ".env.production already exists — preserving existing secrets."
  # Ensure any newly-added env vars are present (idempotent append)
  if ! grep -q "^PUBLIC_STORE_FALLBACK_DOMAIN=" .env.production; then
    log_info "Adding missing PUBLIC_STORE_FALLBACK_DOMAIN to .env.production..."
    echo "PUBLIC_STORE_FALLBACK_DOMAIN=techgear" >> .env.production
  fi
fi

# Source the env file
set -a
source .env.production
set +a

# ── Pull latest code ────────────────────────────────────────────────
log_info "Pulling latest code from origin/main..."
git fetch origin main || { log_error "Git fetch failed"; exit 1; }
git reset --hard origin/main || { log_error "Git reset failed"; exit 1; }

# ── Resolve Docker image tags ──────────────────────────────────────
export BACKEND_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/backend:${GITHUB_SHA}"
export DASHBOARD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/dashboard:${GITHUB_SHA}"
export STOREFRONT_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront:${GITHUB_SHA}"
export STOREFRONT_FOOD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront-food:${GITHUB_SHA}"

log_info "Images:"
log_info "  Backend:       $BACKEND_IMAGE"
log_info "  Dashboard:     $DASHBOARD_IMAGE"
log_info "  Storefront:    $STOREFRONT_IMAGE"
log_info "  StorefrontFood: $STOREFRONT_FOOD_IMAGE"

# ── Authenticate to GHCR ────────────────────────────────────────────
log_info "Authenticating to GHCR..."
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$OWNER" --password-stdin
else
  log_warn "GITHUB_TOKEN not set — assuming already logged in to GHCR"
fi

# ── Pull app images with retry ──────────────────────────────────────
log_info "Pulling Docker images..."
retry 3 5 docker pull "$BACKEND_IMAGE"
retry 3 5 docker pull "$DASHBOARD_IMAGE"
retry 3 5 docker pull "$STOREFRONT_IMAGE"
retry 3 5 docker pull "$STOREFRONT_FOOD_IMAGE"

# ── Pre-deploy database backup ──────────────────────────────────────
log_info "Creating pre-deploy database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec spaceship_postgres pg_dump -U "${DB_USER:-spaceship}" -d "${DB_NAME:-spaceship}" > "${DEPLOY_DIR}/${BACKUP_FILE}" 2>/dev/null || {
  log_warn "DB backup skipped (postgres container may not be running yet)"
}
if [[ -f "${DEPLOY_DIR}/${BACKUP_FILE}" ]]; then
  log_info "Backup saved: ${BACKUP_FILE}"
fi

# ── Deploy with rolling update ──────────────────────────────────────
log_info "Starting rolling deployment..."

# Start/ensure infra first (postgres, redis only — caddy depends on apps)
log_info "Ensuring infrastructure services..."
docker compose -f docker-compose.prod.yml up -d postgres redis

# Wait for postgres to be healthy
log_info "Waiting for postgres to be healthy..."
for i in {1..30}; do
  if docker compose -f docker-compose.prod.yml ps postgres | grep -q "healthy"; then
    log_info "Postgres is healthy"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    log_error "Postgres did not become healthy in time"
    exit 1
  fi
done

# Wait for redis
log_info "Waiting for redis to be healthy..."
for i in {1..30}; do
  if docker compose -f docker-compose.prod.yml ps redis | grep -q "healthy"; then
    log_info "Redis is healthy"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    log_error "Redis did not become healthy in time"
    exit 1
  fi
done

# Deploy backend first (others depend on it)
log_info "Deploying backend..."
docker compose -f docker-compose.prod.yml up -d backend

log_info "Waiting for backend to be healthy..."
for i in {1..30}; do
  if docker compose -f docker-compose.prod.yml ps backend | grep -q "healthy"; then
    log_info "Backend is healthy"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    log_error "Backend did not become healthy in time"
    exit 1
  fi
done

# Deploy dashboard, storefront, and storefront-food
log_info "Deploying dashboard, storefront, and storefront-food..."
docker compose -f docker-compose.prod.yml up -d dashboard storefront storefront-food

# ── Run database migrations ─────────────────────────────────────────
log_info "Running database migrations..."

# If a stale __drizzle_migrations table exists but no actual tables were created
# (e.g., from a previous failed deploy or reused volume), reset it so migrations run fresh
log_info "Checking for stale migration state..."
RESET_SQL="DO \$\$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stores') THEN DELETE FROM drizzle.__drizzle_migrations; RAISE NOTICE 'Reset stale __drizzle_migrations'; END IF; END \$\$;"
docker exec spaceship_postgres psql -U "${DB_USER:-spaceship}" -d "${DB_NAME:-spaceship}" -c "$RESET_SQL" 2>/dev/null || true

if docker compose -f docker-compose.prod.yml exec -T backend node apps/backend/dist/migrate.js 2>/dev/null; then
  log_info "Migrations completed successfully"
else
  log_warn "Migration step may have failed — check logs above"
fi

# ── Seed super admin if needed ──────────────────────────────────────
log_info "Seeding super admin (if not exists)..."
if docker compose -f docker-compose.prod.yml exec -T -e SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD}" backend node apps/backend/dist/seed-superadmin.js 2>/dev/null; then
  log_info "Super admin seed completed"
else
  log_warn "Super admin seed skipped (may already exist)"
fi

# ── Wait for all services healthy ───────────────────────────────────
log_info "Waiting for all services to be healthy..."
HEALTHY=false
for i in {1..45}; do
  BACKEND_OK=$(docker compose -f docker-compose.prod.yml ps backend | grep -c "healthy" || true)
  DASHBOARD_OK=$(docker compose -f docker-compose.prod.yml ps dashboard | grep -c "healthy" || true)
  STOREFRONT_OK=$(docker compose -f docker-compose.prod.yml ps storefront | grep -c "healthy" || true)
  STOREFRONT_FOOD_OK=$(docker compose -f docker-compose.prod.yml ps storefront-food | grep -c "healthy" || true)
  if [[ "$BACKEND_OK" -ge 1 && "$DASHBOARD_OK" -ge 1 && "$STOREFRONT_OK" -ge 1 && "$STOREFRONT_FOOD_OK" -ge 1 ]]; then
    HEALTHY=true
    break
  fi
  sleep 2
done

if [[ "$HEALTHY" != true ]]; then
  log_error "Services did not become healthy after deployment"
  docker compose -f docker-compose.prod.yml ps
  exit 1
fi

# Start caddy last (depends on all app services)
# Force recreate so new Caddyfile changes are always picked up
log_info "Starting caddy reverse proxy..."
docker compose -f docker-compose.prod.yml up -d --force-recreate caddy

# ── Health check via HTTP ───────────────────────────────────────────
log_info "Running HTTP health checks..."
sleep 3

check_endpoint() {
  local url="$1"
  local name="$2"
  local max_attempts=10
  local attempt=1
  while [[ $attempt -le $max_attempts ]]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      log_info "$name OK — $url"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done
  log_warn "$name health check failed — $url"
  return 1
}

check_endpoint "http://localhost:3000/health" "Backend"
check_endpoint "http://localhost:3001/health" "Dashboard"
check_endpoint "http://localhost:3002/health" "Storefront"
check_endpoint "http://localhost:3003/health" "StorefrontFood"

# ── Cleanup ─────────────────────────────────────────────────────────
log_info "Pruning old Docker images..."
docker image prune -f --filter "dangling=true" || true

docker image prune -f --filter "until=168h" || true

# Keep only last 3 backups
if ls backup_*.sql 1> /dev/null 2>&1; then
  ls -t backup_*.sql | tail -n +4 | xargs -r rm -f
  log_info "Old backups cleaned (kept last 3)"
fi

# ── Deployment summary ──────────────────────────────────────────────
log_info "========================================"
log_info "Spaceship deployment COMPLETE!"
log_info "========================================"
log_info "Backend:         http://${VM_IP}:3000"
log_info "Dashboard:       http://${VM_IP}:3001"
log_info "Storefront:      http://${VM_IP}:3002"
log_info "StorefrontFood:  http://${VM_IP}:3003"
log_info "Caddy:           http://${VM_IP}:80  | https://${VM_IP}:443"
if [[ -n "$API_DOMAIN" && "$API_DOMAIN" != "$VM_IP" ]]; then
  log_info "API Domain: https://${API_DOMAIN}"
fi
if [[ -n "$DASHBOARD_DOMAIN" && "$DASHBOARD_DOMAIN" != "$VM_IP" ]]; then
  log_info "Dashboard Domain: https://${DASHBOARD_DOMAIN}"
fi
if [[ -n "$STOREFRONT_DOMAIN" && "$STOREFRONT_DOMAIN" != "$VM_IP" ]]; then
  log_info "Storefront Domain: https://${STOREFRONT_DOMAIN}"
fi
if [[ -n "$STOREFRONT_FOOD_DOMAIN" && "$STOREFRONT_FOOD_DOMAIN" != "$VM_IP" ]]; then
  log_info "Storefront Food Domain: https://${STOREFRONT_FOOD_DOMAIN}"
fi
log_info "========================================"
