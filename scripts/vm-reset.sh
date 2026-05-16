#!/usr/bin/env bash
# VM Reset Script - COMPLETELY wipes all spaceship data for fresh deploy
set -euo pipefail

echo "[Reset] Stopping all spaceship containers..."
docker compose -f ~/spaceship/docker-compose.prod.yml down 2>/dev/null || true

echo "[Reset] Removing containers..."
docker rm -f spaceship_backend spaceship_dashboard spaceship_storefront spaceship_storefront_food spaceship_postgres spaceship_redis spaceship_caddy 2>/dev/null || true

echo "[Reset] Removing images..."
docker rmi -f $(docker images --filter=reference='ghcr.io/*saas-ecom*' -q 2>/dev/null) 2>/dev/null || true

echo "[Reset] Removing volumes..."
docker volume rm -f spaceship_postgres_data spaceship_redis_data spaceship_caddy_data spaceship_caddy_config 2>/dev/null || true

echo "[Reset] Removing network..."
docker network rm -f spaceship_net 2>/dev/null || true

echo "[Reset] Pruning unused resources..."
docker system prune -af --volumes 2>/dev/null || true

echo "[Reset] Removing deploy directory..."
rm -rf ~/spaceship 2>/dev/null || true

echo "[Reset] Complete. VM is clean. Ready for fresh deploy."
