#!/bin/bash
# ============================================
# Manual Deploy Script for VM
# Run this directly on your Compute Instance
# ============================================
set -euo pipefail

REPO_URL="https://github.com/jamicore2026-alt/jamicore.git"
PROJECT_DIR="$HOME/jamicore"
VM_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# Domain variables (set these before running if you have domains)
API_DOMAIN="${API_DOMAIN:-}"
DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-}"
STOREFRONT_DOMAIN="${STOREFRONT_DOMAIN:-}"
STOREFRONT_FOOD_DOMAIN="${STOREFRONT_FOOD_DOMAIN:-}"
LETS_ENCRYPT_EMAIL="${LETS_ENCRYPT_EMAIL:-admin@spaceship.dev}"

echo "[Manual Deploy] VM IP detected: $VM_IP"

# Install dependencies if missing
if ! command -v docker &> /dev/null; then
    echo "[Manual Deploy] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
fi

if ! docker compose version &> /dev/null; then
    echo "[Manual Deploy] Installing Docker Compose..."
    sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin
fi

# Clone or pull repo
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "[Manual Deploy] Pulling latest code..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "[Manual Deploy] Cloning repo..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Generate .env.production with secrets
ENV_FILE="$PROJECT_DIR/.env.production"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

export DB_PASSWORD=${DB_PASSWORD:=$(openssl rand -hex 32)}
export REDIS_PASSWORD=${REDIS_PASSWORD:=$(openssl rand -hex 32)}
export JWT_SECRET=${JWT_SECRET:=$(openssl rand -base64 48)}
export COOKIE_SECRET=${COOKIE_SECRET:=$(openssl rand -base64 32)}
export PAYMENT_CONFIG_ENCRYPTION_KEY=${PAYMENT_CONFIG_ENCRYPTION_KEY:=$(openssl rand -hex 32)}
export HEALTH_CHECK_KEY=${HEALTH_CHECK_KEY:=$(openssl rand -hex 16)}
export SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD:=$(openssl rand -base64 32)}

{
    echo "NODE_ENV=production"
    echo "PORT=3000"
    echo "HOST=0.0.0.0"
    echo "DB_USER=spaceship"
    echo "DB_PASSWORD=${DB_PASSWORD}"
    echo "DB_NAME=spaceship"
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
    echo "JWT_SECRET=${JWT_SECRET}"
    echo "COOKIE_SECRET=${COOKIE_SECRET}"
    echo "PAYMENT_CONFIG_ENCRYPTION_KEY=${PAYMENT_CONFIG_ENCRYPTION_KEY}"
    echo "HEALTH_CHECK_KEY=${HEALTH_CHECK_KEY}"
    echo "RESEND_API_KEY="
    echo "FROM_EMAIL=noreply@spaceship.dev"
    echo "S3_BUCKET="
    echo "S3_REGION="
    echo "S3_ACCESS_KEY_ID="
    echo "S3_SECRET_ACCESS_KEY="
    echo "STRIPE_SECRET_KEY="
    echo "STRIPE_WEBHOOK_SECRET="
    echo "MIXPANEL_TOKEN="
    echo "LOG_LEVEL=info"
    echo "CORS_ORIGINS="
    echo "TRUST_PROXY_HOPS=1"
    echo "STOREFRONT_URL=http://${VM_IP}"
    echo "API_BASE_URL=http://${VM_IP}"
    echo "API_DOMAIN=${API_DOMAIN:-${VM_IP}}"
    echo "DASHBOARD_DOMAIN=${DASHBOARD_DOMAIN:-${VM_IP}}"
    echo "STOREFRONT_DOMAIN=${STOREFRONT_DOMAIN:-${VM_IP}}"
    echo "STOREFRONT_FOOD_DOMAIN=${STOREFRONT_FOOD_DOMAIN:-${VM_IP}}"
    echo "DASHBOARD_ORIGIN=http://${VM_IP}"
    echo "STOREFRONT_ORIGIN=http://${VM_IP}"
    echo "STOREFRONT_FOOD_ORIGIN=http://${VM_IP}"
    echo "PUBLIC_STORE_FALLBACK_DOMAIN=techgear"
    echo "SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}"
    echo "LETS_ENCRYPT_EMAIL=${LETS_ENCRYPT_EMAIL}"
} > "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Build Docker images locally
echo "[Manual Deploy] Building Docker images..."
docker build -f apps/backend/Dockerfile -t saas-ecom-backend:prod .
docker build -f apps/dashboard/Dockerfile -t saas-ecom-dashboard:prod .
docker build -f apps/storefront/Dockerfile -t saas-ecom-storefront:prod .
docker build -f apps/storefront-food/Dockerfile -t saas-ecom-storefront-food:prod .

# Deploy
echo "[Manual Deploy] Starting services..."
export BACKEND_IMAGE=saas-ecom-backend:prod
export DASHBOARD_IMAGE=saas-ecom-dashboard:prod
export STOREFRONT_IMAGE=saas-ecom-storefront:prod
export STOREFRONT_FOOD_IMAGE=saas-ecom-storefront-food:prod

docker compose -f docker-compose.prod.yml down || true
docker compose -f docker-compose.prod.yml up -d

# Run migrations
echo "[Manual Deploy] Running database migrations..."
sleep 10
docker compose -f docker-compose.prod.yml exec -T backend node apps/backend/dist/migrate.js || echo "Migration skipped"

# Seed super admin
echo "[Manual Deploy] Seeding super admin..."
docker compose -f docker-compose.prod.yml exec -T -e SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD}" backend node apps/backend/dist/seed-superadmin.js || echo "Super admin seed skipped"

# Health check
echo "[Manual Deploy] Health check..."
sleep 5
curl -sf http://localhost:3000/health && echo " Backend OK" || echo " Backend FAILED"
curl -sf http://localhost:3001/health && echo " Dashboard OK" || echo " Dashboard FAILED"
curl -sf http://localhost:3002/health && echo " Storefront OK" || echo " Storefront FAILED"
curl -sf http://localhost:3003/health && echo " StorefrontFood OK" || echo " StorefrontFood FAILED"

echo "[Manual Deploy] Done!"
echo "Storefront:      http://${VM_IP}:3002"
echo "StorefrontFood:  http://${VM_IP}:3003"
echo "Dashboard:       http://${VM_IP}:3001"
echo "API:             http://${VM_IP}:3000"

if [ -n "$STOREFRONT_DOMAIN" ] && [ "$STOREFRONT_DOMAIN" != "$VM_IP" ]; then
  echo ""
  echo "Domain URLs (ensure DNS A records point to ${VM_IP}):"
  [ -n "$API_DOMAIN" ] && echo "  API:      https://${API_DOMAIN}"
  [ -n "$DASHBOARD_DOMAIN" ] && echo "  Dashboard: https://${DASHBOARD_DOMAIN}"
  echo "  Store:    https://${STOREFRONT_DOMAIN}"
  [ -n "$STOREFRONT_FOOD_DOMAIN" ] && echo "  Food:     https://${STOREFRONT_FOOD_DOMAIN}"
fi
