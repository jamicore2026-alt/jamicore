# Deployment Setup Guide

## One-time GitHub setup (do this once, never again)

### 1. Create Environment
GitHub repo → Settings → Environments → New environment
Name: Spaceship

### 2. Add Secrets (Settings → Secrets → Actions)
| Secret | Value |
|--------|-------|
| VM_IP | Your VPS IP address |
| VM_USER | SSH user (usually root) |
| VM_SSH_KEY | Full private SSH key content |
| VM_SSH_PORT | SSH port (optional, default 22) |

### 3. Add Variables (Settings → Variables → Actions)
| Variable | Example | Notes |
|----------|---------|-------|
| API_DOMAIN | api.al-ektefa.com | Optional — uses IP if blank |
| DASHBOARD_DOMAIN | merchant.al-ektefa.com | Optional |
| ADMIN_DOMAIN | admin.al-ektefa.com | Optional — super admin dashboard |
| STOREFRONT_DOMAIN | al-ektefa.com | Optional |
| STOREFRONT_FOOD_DOMAIN | store.al-ektefa.com | Optional |
| LETS_ENCRYPT_EMAIL | you@email.com | Required for HTTPS certs |

### 4. DNS Records (your domain registrar)
Point these A records to your VM IP (`209.74.81.128`):

| Record | Type | Value |
|--------|------|-------|
| `al-ektefa.com` | A | 209.74.81.128 |
| `www.al-ektefa.com` | A | 209.74.81.128 |
| `store.al-ektefa.com` | A | 209.74.81.128 |
| `merchant.al-ektefa.com` | A | 209.74.81.128 |
| `admin.al-ektefa.com` | A | 209.74.81.128 |
| `api.al-ektefa.com` | A | 209.74.81.128 |

## How deploy works
1. Push to main branch
2. GitHub Actions builds Docker images → pushes to GHCR
3. SSHs into VM → runs deploy-remote.sh
4. Zero downtime: new containers start → health check passes → old stops
5. Secrets auto-generated on first deploy, preserved on all future deploys

## Adding a new feature
1. Write code → push to main
2. GitHub Actions handles everything automatically
3. No SSH, no manual steps needed
