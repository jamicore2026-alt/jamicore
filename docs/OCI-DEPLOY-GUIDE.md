# OCI + GitHub Actions Deploy Guide

## Option A: OCI Compute VM + Docker Compose

---

### Step 1: OCI Compute Instance Create Pannu

1. OCI Console: **Compute** → **Instances** → **Create Instance**
2. Name: `saas-ecom-prod`
3. Shape: `VM.Standard.A1.Flex` (Always Free: 4 OCPU, 24GB RAM)
4. OS: `Canonical Ubuntu 22.04`
5. Boot Volume: 100 GB (minimum)
6. VCN + Public Subnet (auto-create)
7. **Add SSH Keys**: `Generate SSH Key Pair` → download `.key` file
8. **Security Rules** (Inbound):
   - TCP 22 (SSH)
   - TCP 80 (HTTP)
   - TCP 443 (HTTPS)
   - TCP 3000 (Backend API)
   - TCP 3001 (Dashboard)
   - TCP 3002 (Storefront)
   - TCP 5432 (Postgres — only if external access)
   - TCP 6379 (Redis — only if external access)
9. Click **Create**

---

### Step 2: SSH Key GitHub Secret-a Save Pannu

1. Download panna `.key` file open pannu (Notepad-la)
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `OCI_SSH_PRIVATE_KEY`
5. Value: Full SSH key content paste pannu (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)
6. **Add secret**

---

### Step 3: VM Public IP & Username

1. OCI Console → **Compute** → **Instances** → `saas-ecom-prod` click
2. **Public IP Address** copy pannu (e.g., `132.145.123.45`)
3. GitHub Secret add pannu:
   - Name: `OCI_HOST`
   - Value: `132.145.123.45` (unoda IP)
4. Username (Ubuntu OS-kku):
   - Name: `OCI_USER`
   - Value: `ubuntu`

---

### Step 4: OCI Container Registry (OCIR) Setup

1. OCI Console → **Developer Services** → **Container Registry**
2. Region note pannu (e.g., `ap-mumbai-1`)
3. **Repository** create pannu:
   - `saas-ecom/backend`
   - `saas-ecom/dashboard`
   - `saas-ecom/storefront`

---

### Step 5: OCI Auth Token Create Pannu

1. OCI Console → **Profile** (top right) → **User Settings**
2. **Auth Tokens** → **Generate Token**
3. Name: `github-actions-deploy`
4. Copy the token (show only once!)
5. GitHub Secret:
   - Name: `OCI_REGISTRY_TOKEN`
   - Value: The auth token

---

### Step 6: OCIR Username

Username format: `<tenancy-namespace>/<oci-username>`

Example:
- Tenancy namespace: `jamicore2026` (OCI Console → Tenancy details)
- OCI username: `aroky@example.com`
- Full username: `jamicore2026/aroky@example.com`

GitHub Secret:
- Name: `OCI_REGISTRY_USER`
- Value: `jamicore2026/aroky@example.com` (unoda actual values)

---

### Step 7: OCI CLI Install (VM-la)

SSH panni VM-la:

```bash
# OCI CLI install
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Verify
oci --version

# Configure (API key based)
oci setup config
```

---

### Step 8: GitHub Secrets Summary

| Secret Name | Value Example | Where to get |
|---|---|---|
| `OCI_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Step 2: Downloaded .key file |
| `OCI_HOST` | `132.145.123.45` | Step 3: OCI Instance Public IP |
| `OCI_USER` | `ubuntu` | Step 3: OS username |
| `OCI_REGISTRY_USER` | `jamicore2026/aroky@example.com` | Step 6: Namespace + Username |
| `OCI_REGISTRY_TOKEN` | `xY9...abc123` | Step 5: Auth Token |

---

### Step 9: Docker + Docker Compose VM-la Install Pannu

```bash
# SSH panni VM-la
ssh -i <your-key> ubuntu@<public-ip>

# Docker install
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose
sudo apt install -y docker-compose-plugin

# Git clone repo (or use scp)
git clone https://github.com/jamicore2026-alt/jamicore.git
```

---

### Step 10: Environment File Create Pannu

VM-la:

```bash
cd jamicore
cp .env.example .env.production
nano .env.production
```

Fill all production values:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` (strong random value)
- `COOKIE_SECRET` (strong random value)
- `STRIPE_SECRET_KEY`
- `S3_*` keys
- etc.

---

### Step 11: GitHub Actions Deploy Workflow

`.github/workflows/deploy.yml` create pannu (naan ezhudhuren):

```yaml
name: Deploy to OCI

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    timeout-minutes: 20
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@b5ca514318bd6ebac0fb2aedd5d36ec1b5c232a2

      - name: Login to OCIR
        uses: docker/login-action@74a5d142397b4f367a81941eba94e6ef881bf094
        with:
          registry: ${{ secrets.OCI_REGION }}.ocir.io
          username: ${{ secrets.OCI_REGISTRY_USER }}
          password: ${{ secrets.OCI_REGISTRY_TOKEN }}

      - name: Build and push backend
        run: |
          docker build -f apps/backend/Dockerfile -t ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/backend:${{ github.sha }} .
          docker push ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/backend:${{ github.sha }}

      - name: Build and push dashboard
        run: |
          docker build -f apps/dashboard/Dockerfile -t ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/dashboard:${{ github.sha }} .
          docker push ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/dashboard:${{ github.sha }}

      - name: Build and push storefront
        run: |
          docker build -f apps/storefront/Dockerfile -t ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/storefront:${{ github.sha }} .
          docker push ${{ secrets.OCI_REGION }}.ocir.io/${{ secrets.OCI_REGISTRY_USER }}/saas-ecom/storefront:${{ github.sha }}

      - name: Deploy to VM
        uses: appleboy/ssh-action@2ead5e36573f08b82fbfce1504f5a8c5d2b0e6b0
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ${{ secrets.OCI_USER }}
          key: ${{ secrets.OCI_SSH_PRIVATE_KEY }}
          script: |
            cd ~/jamicore
            git pull origin main
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --build
            docker system prune -f
```

---

### Step 12: SSL (HTTPS) Setup Pannu — Caddy or Nginx

**Caddy (simplest):**

Add to `docker-compose.prod.yml`:

```yaml
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - dashboard
      - storefront

volumes:
  caddy_data:
  caddy_config:
```

Create `Caddyfile`:

```
api.yourdomain.com {
    reverse_proxy backend:3000
}

dashboard.yourdomain.com {
    reverse_proxy dashboard:3001
}

yourdomain.com {
    reverse_proxy storefront:3002
}
```

Domain DNS A record → OCI VM Public IP point pannanum.

---

### Done!

Every `main` push → auto-deploy to OCI VM.
Manual deploy → GitHub Actions → **Run workflow** button click pannalam.
