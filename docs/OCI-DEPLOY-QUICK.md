# OCI VM + Docker Compose Deploy — Quick Guide

## Step 1: OCI VM Create Pannu

1. OCI Console → **Compute** → **Instances** → **Create Instance**
2. Name: `saas-ecom-prod`
3. Shape: `VM.Standard.A1.Flex` (Always Free: 4 OCPU, 24GB RAM)
4. OS: `Canonical Ubuntu 22.04`
5. Boot Volume: 100 GB
6. **Add SSH Keys** → Generate SSH Key Pair → Download `.key` file
7. **Security Rules** (Ingress): TCP 22, 80, 443, 3000, 3001, 3002
8. Click **Create**

---

## Step 2: SSH Panni VM Setup Pannu

```bash
# SSH panni VM-la
ssh -i your-key.pem ubuntu@YOUR_VM_IP

# Auto-setup script run pannu
curl -fsSL https://raw.githubusercontent.com/jamicore2026-alt/jamicore/main/scripts/setup-oci-vm.sh | bash

# Logout & login (Docker group apply aagum)
exit
ssh -i your-key.pem ubuntu@YOUR_VM_IP
```

**Or manual-a:**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

---

## Step 3: GitHub-la `OCIDEPLOY` Secret Create Pannu

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `OCIDEPLOY`
4. Value: (key=value format)

```
REGION=ap-mumbai-1
HOST=132.145.123.45
USER=ubuntu
SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
YOUR_KEY_CONTENT_HERE
-----END OPENSSH PRIVATE KEY-----
REGISTRY_USER=your-namespace/your-email@example.com
REGISTRY_TOKEN=your-oci-auth-token
```

**Values edukka:**
- `REGION`: OCI Console URL-la (`ap-mumbai-1`, `us-ashburn-1`, etc.)
- `HOST`: OCI Instance Public IP
- `USER`: `ubuntu` (Ubuntu OS), `opc` (Oracle Linux)
- `SSH_KEY`: Download panna `.key` file content
- `REGISTRY_USER`: OCI Console → Tenancy → Object Storage Namespace + `/` + OCI username
- `REGISTRY_TOKEN`: OCI Console → Profile → User Settings → Auth Tokens → Generate

---

## Step 4: Repo Clone + .env.production Create Pannu (VM-la)

```bash
# VM-la
ssh -i your-key.pem ubuntu@YOUR_VM_IP

# Clone repo
git clone https://github.com/jamicore2026-alt/jamicore.git
cd jamicore

# .env.production file create pannu
cp .env.production.example .env.production
nano .env.production
```

**Fill all values:**
```
DB_PASSWORD=strong_password
REDIS_PASSWORD=strong_password
JWT_SECRET=openssl rand -base64 48
COOKIE_SECRET=openssl rand -base64 32
PAYMENT_CONFIG_ENCRYPTION_KEY=openssl rand -hex 32
STRIPE_SECRET_KEY=sk_live_...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
# ... etc
```

---

## Step 5: OCI Container Registry (OCIR) Login

```bash
# VM-la OCIR login pannu (one-time setup)
docker login ap-mumbai-1.ocir.io -u your-namespace/your-email@example.com -p your-oci-auth-token
```

---

## Step 6: First Manual Deploy

```bash
# VM-la
cd jamicore

# Build images locally (first time only)
docker build -f apps/backend/Dockerfile -t saas-ecom-backend:prod .
docker build -f apps/dashboard/Dockerfile -t saas-ecom-dashboard:prod .
docker build -f apps/storefront/Dockerfile -t saas-ecom-storefront:prod .

# Start
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Step 7: Auto-Deploy Test Pannu

GitHub-la push pannu (`main` branch):

```bash
# Local-la
gh run list --workflow=deploy.yml --limit 1
```

Or browser: https://github.com/jamicore2026-alt/jamicore/actions/workflows/deploy.yml

**Deploy flow:**
1. GitHub Actions builds 3 images
2. Pushes to OCIR
3. SSH VM → pulls code + images
4. `docker compose up -d`
5. Health check

---

## Step 8: Domain + SSL (Optional)

**DNS:**
- A record: `yourdomain.com` → VM Public IP
- A record: `api.yourdomain.com` → VM Public IP
- A record: `dashboard.yourdomain.com` → VM Public IP

**Caddyfile update:**
```
yourdomain.com {
    reverse_proxy storefront:3002
}
```

**Restart:**
```bash
docker compose -f docker-compose.prod.yml restart caddy
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `docker: permission denied` | `sudo usermod -aG docker $USER; newgrp docker` |
| `docker login failed` | OCIR username format: `namespace/email` |
| `backend health check failed` | `docker compose logs backend` check pannu |
| `OCI_DEPLOY secret not found` | GitHub Settings → Secrets → `OCIDEPLOY` add panniya? |
| `SSH connection failed` | Security group-la TCP 22 open-a? SSH key correct-a? |

---

## Useful Commands

```bash
# VM-la
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart single service
docker compose -f docker-compose.prod.yml restart backend

# Update images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Prune old images
docker system prune -af

# Database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U saas_ecom saas_ecom > backup.sql

# GitHub Actions run manually trigger pannu
gh workflow run deploy.yml
```
