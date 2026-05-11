# Spaceship Deployment Guide

## Prerequisites

- [ ] VPS running Ubuntu 22.04+ (e.g., OCI, Hetzner, DigitalOcean)
- [ ] SSH access with key-based auth (port 22022 supported)
- [ ] GitHub repo with this code pushed
- [ ] Docker & Docker Compose v2 installed on VM

## Step 1: Set GitHub Secrets

Go to: `https://github.com/YOUR-USER/YOUR-REPO/settings/environments`

Create environment: **Spaceship**

Add these **Environment secrets** (not repository secrets):

| Secret | Value |
|--------|-------|
| `VM_IP` | `104.207.64.232` |
| `VM_USER` | `root` |
| `VM_SSH_KEY` | Run: `base64 -w0 ~/.ssh/id_ecdsa` |
| `VM_SSH_PORT` | `22022` |

> **Note:** `VM_SSH_KEY` must be base64-encoded. Use `-w0` flag to avoid newlines.
> If your key is already in PEM format (with `BEGIN` header), paste it raw.

## Step 2: Prepare the VM (First Time Only)

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

## Step 3: Trigger Deploy

Push to `main` branch automatically triggers deploy after CI passes.

Or manually trigger:
- Go to GitHub → Actions → "Deploy to Spaceship VM" → Run workflow

Monitor at: `https://github.com/YOUR-USER/YOUR-REPO/actions`

## Step 4: Verify Deploy

SSH into your VM:

```bash
ssh -i ~/.ssh/id_ecdsa -p 22022 root@104.207.64.232
docker ps
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```

Expected output:
- `spaceship_postgres` → Up (healthy)
- `spaceship_redis` → Up (healthy)
- `spaceship_backend` → Up (healthy)
- `spaceship_dashboard` → Up (healthy)
- `spaceship_storefront` → Up (healthy)
- `spaceship_caddy` → Up (healthy)

Test endpoints:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Step 5: Access Your Apps

| App | URL (with IP) |
|-----|---------------|
| Storefront | `http://104.207.64.232` |
| Dashboard | `http://104.207.64.232:3001` |
| API | `http://104.207.64.232:3000` |

Once you have domains with DNS A records pointing to `104.207.64.232`, set these **Repository variables**:

| Variable | Example |
|----------|---------|
| `API_DOMAIN` | `api.yourdomain.com` |
| `DASHBOARD_DOMAIN` | `dashboard.yourdomain.com` |
| `STOREFRONT_DOMAIN` | `yourdomain.com` |

Then update `.env.production` on the VM:
```bash
cd ~/spaceship
sed -i 's/API_DOMAIN=.*/API_DOMAIN=api.yourdomain.com/' .env.production
sed -i 's/DASHBOARD_DOMAIN=.*/DASHBOARD_DOMAIN=dashboard.yourdomain.com/' .env.production
sed -i 's/STOREFRONT_DOMAIN=.*/STOREFRONT_DOMAIN=yourdomain.com/' .env.production
docker compose -f docker-compose.prod.yml restart caddy
```

## Architecture

```
Internet
   │
   ▼
Caddy (80/443) ──► Backend (3000)  [API]
   │                Dashboard (3001) [Admin]
   │                Storefront (3002) [Shop]
   │
   └──► Postgres (internal) + Redis (internal)
```

## Troubleshooting

### "Missing required secrets"
- Check Settings → Environments → Spaceship → Secrets (not Repository secrets)

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
```

### DB issues
Backups are auto-created before each deploy:
```bash
ls ~/spaceship/backup_*.sql
# Restore:
docker exec -i spaceship_postgres psql -U spaceship -d spaceship < backup_YYYYMMDD_HHMMSS.sql
```
