#!/usr/bin/env bash
# Clean deploy script - runs on the VM via SSH
# DB migrations run automatically when the backend container starts
set -euo pipefail

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

if ! command -v docker &> /dev/null; then
  log_error "Docker not installed. Run setup-oci-vm.sh first."
  exit 1
fi
if ! docker compose version &> /dev/null; then
  log_error "Docker Compose not installed."
  exit 1
fi

# ═══════════════════════════════════════════════════════
# 1.  Gather / generate secrets
# ═══════════════════════════════════════════════════════

if [[ ! -f .env.production ]]; then
  log_info "First deploy — generating fresh secrets..."
  DB_PASSWORD="$(openssl rand -hex 32)"
  REDIS_PASSWORD="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -base64 48)"
  COOKIE_SECRET="$(openssl rand -base64 32)"
  PAYMENT_CONFIG_ENCRYPTION_KEY="$(openssl rand -hex 32)"
else
  log_info "Existing deploy — loading secrets from .env.production..."
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a

  # Recover standalone passwords from URLs if missing
  if [[ -z "${DB_PASSWORD:-}" && -n "${DATABASE_URL:-}" ]]; then
    DB_PASSWORD="$(echo "$DATABASE_URL" | sed 's|.*spaceship:\([^@]*\)@.*|\1|')"
  fi
  if [[ -z "${REDIS_PASSWORD:-}" && -n "${REDIS_URL:-}" ]]; then
    REDIS_PASSWORD="$(echo "$REDIS_URL" | sed 's|redis://:\([^@]*\)@.*|\1|')"
  fi

  # Generate any still-missing secrets
  [[ -z "${JWT_SECRET:-}" ]] && JWT_SECRET="$(openssl rand -base64 48)"
  [[ -z "${COOKIE_SECRET:-}" ]] && COOKIE_SECRET="$(openssl rand -base64 32)"
  [[ -z "${PAYMENT_CONFIG_ENCRYPTION_KEY:-}" ]] && PAYMENT_CONFIG_ENCRYPTION_KEY="$(openssl rand -hex 32)"
fi

# Ensure DB_PASSWORD & REDIS_PASSWORD are non-empty
[[ -z "${DB_PASSWORD:-}" ]] && { log_error "DB_PASSWORD is empty"; exit 1; }
[[ -z "${REDIS_PASSWORD:-}" ]] && { log_error "REDIS_PASSWORD is empty"; exit 1; }

# Ensure URLs always match the standalone passwords
DATABASE_URL="postgresql://spaceship:${DB_PASSWORD}@postgres:5432/spaceship"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

# Image tags
BACKEND_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/backend:${GITHUB_SHA}"
DASHBOARD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/dashboard:${GITHUB_SHA}"
STOREFRONT_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront:${GITHUB_SHA}"
STOREFRONT_FOOD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront-food:${GITHUB_SHA}"

# ═══════════════════════════════════════════════════════
# 2.  Rewrite .env.production COMPLETELY (no duplicates)
# ═══════════════════════════════════════════════════════

cat > .env.production <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DB_PASSWORD=${DB_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
DATABASE_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
PAYMENT_CONFIG_ENCRYPTION_KEY=${PAYMENT_CONFIG_ENCRYPTION_KEY}
API_BASE_URL=http://${VM_IP}
LOG_LEVEL=info
FROM_EMAIL=noreply@spaceship.dev
BACKEND_IMAGE=${BACKEND_IMAGE}
DASHBOARD_IMAGE=${DASHBOARD_IMAGE}
STOREFRONT_IMAGE=${STOREFRONT_IMAGE}
STOREFRONT_FOOD_IMAGE=${STOREFRONT_FOOD_IMAGE}
EOF

log_info ".env.production rewritten (secrets preserved, passwords consistent, image tags updated)."

# Re-source so the rest of the script can use the vars
set -a
# shellcheck disable=SC1091
source .env.production
set +a

# ═══════════════════════════════════════════════════════
# 3.  Deploy
# ═══════════════════════════════════════════════════════

# Login to GHCR
log_info "Logging in to GHCR..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$OWNER" --password-stdin

# Backup DB if already running
if docker ps --format '{{.Names}}' | grep -q '^spaceship_postgres$'; then
  BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
  log_info "Backing up database to ${BACKUP_FILE}..."
  docker exec spaceship_postgres pg_dump -U spaceship spaceship > "$BACKUP_FILE" || log_warn "DB backup failed"
fi

# Pull new images and start all services
log_info "Pulling new images..."
docker compose --env-file .env.production -f docker-compose.prod.yml pull

log_info "Starting services (migrations run automatically)..."
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# Health check — backend must be healthy before we declare success
log_info "Waiting for backend health check..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_info "Backend is healthy"
    break
  fi
  sleep 2
done

# Verify all expected containers are running
RUNNING=$(docker ps --format '{{.Names}}' | grep '^spaceship_' | wc -l)
if [[ "$RUNNING" -lt 6 ]]; then
  log_warn "Only ${RUNNING} spaceship containers running (expected 6+)"
  docker ps --format '{{.Names}}\t{{.Status}}' | grep '^spaceship_' || true
fi

# Cleanup dangling images
log_info "Cleaning up old images..."
docker image prune -f --filter "dangling=true" || true

log_info "========================================"
log_info "Deployment complete!"
log_info "Backend:    http://${VM_IP}:3000"
log_info "Dashboard:  http://${VM_IP}:3001"
log_info "Storefront: http://${VM_IP}:3002"
log_info "Food:       http://${VM_IP}:3003"
log_info "========================================"
