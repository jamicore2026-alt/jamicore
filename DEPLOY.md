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
| API_DOMAIN | api.yourdomain.com | Optional — uses IP if blank |
| DASHBOARD_DOMAIN | dashboard.yourdomain.com | Optional |
| STOREFRONT_DOMAIN | yourdomain.com | Optional |
| STOREFRONT_FOOD_DOMAIN | food.yourdomain.com | Optional |
| LETS_ENCRYPT_EMAIL | you@email.com | Optional |

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
