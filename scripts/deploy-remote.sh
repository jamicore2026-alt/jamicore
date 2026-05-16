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

# Generate .env.production on first deploy
if [[ ! -f .env.production ]]; then
  log_info "First deploy detected. Creating .env.production..."
  DB_PASSWORD="$(openssl rand -hex 32)"
  REDIS_PASSWORD="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -base64 48)"
  COOKIE_SECRET="$(openssl rand -base64 32)"
  PAYMENT_CONFIG_ENCRYPTION_KEY="$(openssl rand -hex 32)"

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
API_BASE_URL=http://${VM_IP}
LOG_LEVEL=info
FROM_EMAIL=noreply@spaceship.dev
EOF
  log_info ".env.production created with secure secrets."
else
  log_info ".env.production exists. Keeping existing secrets."
fi

# Export image tags
export BACKEND_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/backend:${GITHUB_SHA}"
export DASHBOARD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/dashboard:${GITHUB_SHA}"
export STOREFRONT_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront:${GITHUB_SHA}"
export STOREFRONT_FOOD_IMAGE="${REGISTRY}/${OWNER}/saas-ecom/storefront-food:${GITHUB_SHA}"

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
# Backend auto-runs DB migrations on startup (via runMigrations in index.ts)
log_info "Pulling new images..."
docker compose -f docker-compose.prod.yml pull

log_info "Starting services (migrations run automatically)..."
docker compose -f docker-compose.prod.yml up -d

# Health check - give extra time for first-deploy migrations
log_info "Waiting for backend health check..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_info "Backend is healthy"
    break
  fi
  sleep 2
done

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
