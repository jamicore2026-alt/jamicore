# Deployment Guide

> Deploy the **jamicore** multi-tenant headless e-commerce platform to any Docker-enabled VM.

---

## Overview

| Component | Technology | Port |
|-----------|------------|------|
| Backend API | Fastify v5 + Drizzle ORM | 3000 |
| Admin Dashboard | SvelteKit SSR | 3001 |
| Storefront | SvelteKit SSR | 3002 |
| Food Storefront | SvelteKit SSR | 3003 |
| Database | PostgreSQL 17 | internal |
| Cache / Queue | Redis 7 | internal |
| Reverse Proxy | Caddy 2 (auto SSL) | 80 / 443 |

---

## Prerequisites

### 1. VM Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

### 2. Software

```bash
# Docker Engine 24+
docker --version   # >= 24.0.0

# Docker Compose 2+
docker compose version   # >= 2.20.0

# Git
git --version
```

### 3. DNS Records

Point your domains to the VM's public IP:

| Domain | Points to | Used by |
|--------|-----------|---------|
| `api.yourdomain.com` | VM IP | Backend API |
| `dashboard.yourdomain.com` | VM IP | Admin Dashboard |
| `yourdomain.com` | VM IP | Storefront |
| `food.yourdomain.com` | VM IP | Food Storefront |

---

## Repository Secrets & Variables

Configure these in **GitHub Settings > Secrets and variables > Actions**.

### Secrets (encrypted)

| Secret | Description |
|--------|-------------|
| `VM_IP` | Public IP of your deployment VM |
| `VM_USER` | SSH username (e.g. `ubuntu`) |
| `VM_SSH_KEY` | Private SSH key (OpenSSH or base64-encoded) |
| `VM_SSH_PORT` | SSH port (optional, default `22`) |
| `GITHUB_TOKEN` | Auto-injected by GitHub Actions |

### Variables (plaintext)

| Variable | Description | Example |
|----------|-------------|---------|
| `API_DOMAIN` | API subdomain | `api.jamicore.dev` |
| `DASHBOARD_DOMAIN` | Dashboard subdomain | `admin.jamicore.dev` |
| `STOREFRONT_DOMAIN` | Storefront domain | `jamicore.dev` |
| `STOREFRONT_FOOD_DOMAIN` | Food storefront domain | `food.jamicore.dev` |
| `LETS_ENCRYPT_EMAIL` | SSL certificate email | `admin@jamicore.dev` |

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`

Triggers:
- **Push** to `main` branch → automatic deploy
- **Manual** → GitHub UI "Run workflow" button

### Pipeline Stages

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Checkout   │────▶│ Build & Push│────▶│ Deploy to VM│
│   Code      │     │ Docker Images     │  via SSH    │
└─────────────┘     └─────────────┘     └─────────────┘
                        │                      │
                        ▼                      ▼
                   GHCR Registry         Docker Compose
                   (GitHub Packages)      on VM
```

### Built Images

| Image | Tag Pattern |
|-------|-------------|
| Backend | `ghcr.io/{owner}/saas-ecom/backend:{sha}` |
| Dashboard | `ghcr.io/{owner}/saas-ecom/dashboard:{sha}` |
| Storefront | `ghcr.io/{owner}/saas-ecom/storefront:{sha}` |
| Storefront Food | `ghcr.io/{owner}/saas-ecom/storefront-food:{sha}` |

---

## Manual Deploy (No CI)

If you prefer manual deployment without GitHub Actions:

### 1. Build Images Locally

```bash
# Build all images
IMAGE_TAG=$(git rev-parse HEAD)
OWNER=your-github-username
REGISTRY=ghcr.io

# Backend
docker build -t ${REGISTRY}/${OWNER}/saas-ecom/backend:${IMAGE_TAG} -f apps/backend/Dockerfile .

# Dashboard
docker build -t ${REGISTRY}/${OWNER}/saas-ecom/dashboard:${IMAGE_TAG} -f apps/dashboard/Dockerfile .

# Storefront
docker build -t ${REGISTRY}/${OWNER}/saas-ecom/storefront:${IMAGE_TAG} -f apps/storefront/Dockerfile .

# Food Storefront
docker build -t ${REGISTRY}/${OWNER}/saas-ecom/storefront-food:${IMAGE_TAG} -f apps/storefront-food/Dockerfile .
```

### 2. Transfer & Run on VM

```bash
# Save images
docker save ${REGISTRY}/${OWNER}/saas-ecom/backend:${IMAGE_TAG} | gzip > backend.tar.gz
# ... repeat for other images

# Transfer to VM
scp backend.tar.gz dashboard.tar.gz storefront.tar.gz storefront-food.tar.gz user@vm-ip:~/spaceship/

# On VM: load and run
ssh user@vm-ip "cd ~/spaceship && docker load < backend.tar.gz && ..."
```

---

## First-Time VM Setup

### 1. Provision VM

Use any cloud provider (AWS, GCP, Azure, DigitalOcean, Hetzner, etc.).

### 2. Install Docker

```bash
# One-liner install
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version   # >= 24.0.0
docker compose version   # >= 2.20.0
```

### 3. Prepare Deploy Directory

```bash
mkdir -p ~/spaceship
cd ~/spaceship
```

### 4. First Deploy

The `deploy-remote.sh` script auto-generates `.env.production` on first run:

```bash
# Run from GitHub Actions, or manually:
export GITHUB_SHA=$(git rev-parse HEAD)
export OWNER=your-github-username
export REGISTRY=ghcr.io
export VM_IP=your.vm.ip.address
export GITHUB_TOKEN=ghp_xxxxxxxx
export API_DOMAIN=api.yourdomain.com
export DASHBOARD_DOMAIN=admin.yourdomain.com
export STOREFRONT_DOMAIN=yourdomain.com
export STOREFRONT_FOOD_DOMAIN=food.yourdomain.com
export LETS_ENCRYPT_EMAIL=admin@yourdomain.com

bash scripts/deploy-remote.sh
```

### Generated `.env.production`

On first deploy, these secure values are auto-generated:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://spaceship:<random>@postgres:5432/spaceship
REDIS_URL=redis://:<random>@redis:6379
JWT_SECRET=<random-base64>
COOKIE_SECRET=<random-base64>
PAYMENT_CONFIG_ENCRYPTION_KEY=<random-hex>
API_BASE_URL=http://<VM_IP>
LOG_LEVEL=info
FROM_EMAIL=noreply@spaceship.dev
```

> **IMPORTANT**: Back up `.env.production` immediately. It is never regenerated on subsequent deploys.

---

## Architecture

### Production Stack (`docker-compose.prod.yml`)

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
│                    80 / 443 (HTTPS)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │     Caddy       │  ← Reverse Proxy + Auto SSL
              │   (Port 80/443) │
              └────┬───┬───┬───┬┘
                   │   │   │   │
        ┌──────────┘   │   │   └──────────┐
        ▼              ▼   ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────────┐   ┌─────────────┐
   │ Backend │   │Dashboard│   │  Storefront │   │Food Storefr.│
   │ :3000   │   │ :3001   │   │   :3002     │   │   :3003     │
   └────┬────┘   └─────────┘   └─────────────┘   └─────────────┘
        │
        │ depends_on
   ┌────┴────┐      ┌─────────┐
   │ Migrate │──────│ Postgres│   ← PostgreSQL 17
   │ (one-off      │  :5432    │      (internal)
   │  run)         └─────────┘
   └─────────┘      ┌─────────┐
                    │  Redis  │   ← Redis 7
                    │ :6379   │      (internal)
                    └─────────┘
```

### Network Isolation

- **PostgreSQL**: Not exposed to host. Backend accesses via Docker network `spaceship_net`.
- **Redis**: Not exposed to host. Backend accesses via Docker network `spaceship_net`.
- **Backend**: Bound to `127.0.0.1:3000` — only Caddy can route to it.
- **Frontend apps**: Bound to `127.0.0.1:3001-3003` — only Caddy can route to them.

---

## Rolling Updates

The deployment is **zero-downtime** via Docker Compose rolling restarts:

1. New images pulled from GHCR
2. Database migrated before backend starts (`migrate` service)
3. Backend health check passes before frontend apps start
4. Caddy continues serving traffic throughout

### Health Checks

| Service | Endpoint | Timeout |
|---------|----------|---------|
| Postgres | `pg_isready` | 5s |
| Redis | `redis-cli ping` | 5s |
| Backend | `GET /health` | 5s (60s startup) |
| Dashboard | `GET /` | 5s (15s startup) |
| Storefront | `GET /` | 5s (15s startup) |
| Caddy | `wget :80` | 5s |

---

## SSL / HTTPS

Caddy automatically provisions and renews Let's Encrypt certificates:

```caddy
{
    email {$LETS_ENCRYPT_EMAIL}
}

{$API_DOMAIN} {
    reverse_proxy backend:3000
    # ... security headers
}
```

No manual certificate management required.

---

## Monitoring & Logs

### View Logs

```bash
# All services
cd ~/spaceship && docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 backend
```

### Check Service Health

```bash
# List running containers
docker ps

# Check backend health
curl http://localhost:3000/health

# Check Caddy is serving HTTPS
curl -I https://api.yourdomain.com/health
```

### Restart a Service

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## Database Operations

### Backup

Auto-backed up on every deploy. Manual backup:

```bash
docker exec spaceship_postgres pg_dump -U spaceship spaceship > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
# Drop and recreate
docker exec -i spaceship_postgres psql -U spaceship -c "DROP DATABASE spaceship; CREATE DATABASE spaceship;"

# Restore
docker exec -i spaceship_postgres psql -U spaceship -d spaceship < backup_file.sql
```

### Manual Migration

```bash
# Run migrations manually (usually auto-run on deploy)
docker compose -f docker-compose.prod.yml run --rm migrate
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Check resource usage
docker stats
```

### Migration failed

```bash
# Check migration logs
docker compose -f docker-compose.prod.yml logs migrate

# Re-run migrations
docker compose -f docker-compose.prod.yml run --rm migrate
```

### SSL certificate issues

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Verify DNS points to VM
dig +short api.yourdomain.com
```

### Out of disk space

```bash
# Clean up old images
docker image prune -af

# Clean up unused volumes (DANGER — back up DB first!)
docker volume prune
```

---

## Security Checklist

- [ ] `.env.production` is backed up securely
- [ ] `.env.production` is NOT committed to git
- [ ] VM firewall allows only 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] Database ports not exposed publicly
- [ ] Redis password is strong and unique
- [ ] JWT_SECRET is at least 32 bytes
- [ ] SSH key is encrypted in GitHub secrets
- [ ] Regular backups are stored off-site

---

## Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD |
| `scripts/deploy-remote.sh` | VM-side deploy script |
| `docker-compose.prod.yml` | Production Docker stack |
| `Caddyfile` | Reverse proxy + SSL config |
| `apps/*/Dockerfile` | Per-app container build |

---

*Last updated: 2026-05-19*
