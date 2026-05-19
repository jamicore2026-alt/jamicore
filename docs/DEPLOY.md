# Spaceship Deployment Guide

## Prerequisites

- [ ] VPS running Ubuntu 22.04+ (e.g., OCI, Hetzner, DigitalOcean)
- [ ] SSH access with key-based auth (port 22022 supported)
- [ ] GitHub repo with this code pushed
- [ ] Docker & Docker Compose v2 installed on VM

## Step 1: Set GitHub Secrets & Variables

### Environment Secrets (Settings > Environments > Spaceship)

Go to: `https://github.com/YOUR-USER/YOUR-REPO/settings/environments`

Create environment: **Spaceship**

| Secret | Value |
|--------|-------|
| `VM_IP` | `104.207.64.232` |
| `VM_USER` | `root` |
| `VM_SSH_KEY` | Run: `base64 -w0 ~/.ssh/id_ecdsa` |
| `VM_SSH_PORT` | `22022` |

> **Note:** `VM_SSH_KEY` must be base64-encoded. Use `-w0` flag to avoid newlines.
> If your key is already in PEM format (with `BEGIN` header), paste it raw.

### Repository Variables (Settings > Secrets and variables > Variables)

| Variable | Example | Description |
|----------|---------|-------------|
| `API_DOMAIN` | `api.yourdomain.com` | Backend API subdomain |
| `DASHBOARD_DOMAIN` | `dashboard.yourdomain.com` | Admin panel subdomain |
| `STOREFRONT_DOMAIN` | `yourdomain.com` | Main storefront domain |
| `STOREFRONT_FOOD_DOMAIN` | `food.yourdomain.com` | Food storefront subdomain (optional) |
| `LETS_ENCRYPT_EMAIL` | `admin@yourdomain.com` | SSL certificate notification email |

> **Important:** If you set ANY domain variable, Caddy automatically enables Let's Encrypt SSL.
> If you leave all domains empty, the app runs on HTTP via VM IP only.

## Step 2: Configure DNS

Before the first deploy with domains, point your DNS A records to the VM IP:

| Record | Type | Value |
|--------|------|-------|
| `yourdomain.com` | A | `104.207.64.232` |
| `api.yourdomain.com` | A | `104.207.64.232` |
| `dashboard.yourdomain.com` | A | `104.207.64.232` |
| `food.yourdomain.com` (optional) | A | `104.207.64.232` |

> DNS propagation can take 5–60 minutes. You can verify with: `dig +short yourdomain.com`

## Step 3: Prepare the VM (First Time Only)

SSH into your VM and run:

```bash
ssh -i ~/.ssh/id_ecdsa -p 22022 root@104.207.64.232

# Install Docker & Compose if not present
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
newgrp docker

# Create deploy directory
mkdir -p ~/spaceship
cd ~/spaceship

# Clone repo (or GitHub Actions will manage this)
git clone https://github.com/YOUR-USER/YOUR-REPO.git .
```

## Step 4: Trigger Deploy

Push to `main` branch automatically triggers deploy after CI passes.

Or manually trigger:
- Go to GitHub -> Actions -> "Deploy to Spaceship VM" -> Run workflow

Monitor at: `https://github.com/YOUR-USER/YOUR-REPO/actions`

## Step 5: Verify Deploy

SSH into your VM:

```bash
ssh -i ~/.ssh/id_ecdsa -p 22022 root@104.207.64.232
docker ps
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

Expected output:
- `spaceship_postgres` -> Up (healthy)
- `spaceship_redis` -> Up (healthy)
- `spaceship_backend` -> Up (healthy)
- `spaceship_dashboard` -> Up (healthy)
- `spaceship_storefront` -> Up (healthy)
- `spaceship_storefront_food` -> Up (healthy)
- `spaceship_caddy` -> Up (healthy)

Test endpoints:
```bash
# Direct container health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Via Caddy (if domains configured)
curl -I https://api.yourdomain.com/health
curl -I https://dashboard.yourdomain.com
curl -I https://yourdomain.com
```

## Step 6: Access Your Apps

### Without Domains (IP only)

| App | URL |
|-----|-----|
| Storefront | `http://104.207.64.232` |
| Dashboard | `http://104.207.64.232/dashboard` |
| API | `http://104.207.64.232/api/v1/public/store` |
| Food Storefront | `http://104.207.64.232/store` |

### With Domains (HTTPS)

| App | URL |
|-----|-----|
| Storefront | `https://yourdomain.com` |
| Dashboard | `https://dashboard.yourdomain.com` |
| API | `https://api.yourdomain.com` |
| Food Storefront | `https://food.yourdomain.com` |

## SSL / Let's Encrypt

When domains are configured, Caddy automatically:
1. Detects the domains from environment variables
2. Provisions free SSL certificates via Let's Encrypt
3. Renews certificates automatically (no manual action needed)
4. Redirects all HTTP traffic to HTTPS

To check certificate status:
```bash
docker exec spaceship_caddy caddy list-modules
docker exec spaceship_caddy caddy adapt --config /etc/caddy/Caddyfile
docker exec spaceship_caddy caddy reload --config /etc/caddy/Caddyfile
```

## Architecture

```
Internet
   |
   v
Caddy (80/443) ----+---> Backend (3000)  [API]
   |               +---> Dashboard (3001) [Admin]
   |               +---> Storefront (3002) [Shop]
   |               +---> StorefrontFood (3003) [Food]
   |
   +---> Postgres (internal) + Redis (internal)
```

All app services are bound to `127.0.0.1` only — only Caddy is exposed to the internet on ports 80/443.

## Troubleshooting

### "Missing required secrets"
- Check Settings -> Environments -> Spaceship -> Secrets (not Repository secrets)

### "SSH key is invalid"
- Ensure `VM_SSH_KEY` is base64-encoded: `base64 -w0 ~/.ssh/id_ecdsa`
- If using OpenSSH format (`-----BEGIN OPENSSH PRIVATE KEY-----`), paste raw without base64

### "Couldn't create signal pipe" when pushing
- Use HTTPS: `git remote set-url origin https://github.com/YOUR-USER/YOUR-REPO.git`

### Container unhealthy
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs dashboard
docker compose -f docker-compose.prod.yml logs storefront
docker compose -f docker-compose.prod.yml logs storefront-food
```

### SSL not working
1. Verify DNS A records point to VM IP: `dig +short yourdomain.com`
2. Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`
3. Ensure ports 80/443 are open in VM firewall/security group
4. Verify domains are set in GitHub repository variables (not secrets)

### Domain changes not applied
- Changing domain variables requires a redeploy (push to main or manual trigger)
- Caddyfile is regenerated on every deploy based on current domain variables

### DB issues
Backups are auto-created before each deploy:
```bash
ls ~/spaceship/backup_*.sql
# Restore:
docker exec -i spaceship_postgres psql -U spaceship -d spaceship < backup_YYYYMMDD_HHMMSS.sql
```
