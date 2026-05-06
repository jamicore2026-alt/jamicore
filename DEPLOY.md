# OCI Deployment Guide — Complete Checklist

## Prerequisites
- [ ] OCI Compute Instance running Ubuntu 22.04+
- [ ] SSH key pair (downloaded from OCI console)
- [ ] Security rules: TCP 22, 80, 443, 3000, 3001, 3002 open
- [ ] GitHub repo with this code pushed

## Step 1: Push Latest Fixes to GitHub

Run these commands in PowerShell as your normal Windows user:

```powershell
cd D:\project_saas_ecom

# If git permissions are broken, fix them first:
icacls .git /remove:d "S-1-5-21-776790338-1272445045-3638324021-3885755552" /T 2>$null

# Stage and push fixes
git add apps/backend/src/migrate.ts .github/workflows/deploy.yml
git commit -m "fix(deploy): add production migration script and fix deploy timeout" --no-verify
git push origin main
```

## Step 2: Set GitHub Secrets

Go to: `https://github.com/jamicore2026-alt/jamicore/settings/environments`

Create environment: **OCIDEPLOY**

Add these **Environment secrets** (not repository secrets):

| Secret | How to get it |
|--------|---------------|
| `OCI_HOST` | Your OCI VM public IP (e.g., `132.145.123.45`) |
| `OCI_USER` | Usually `ubuntu` |
| `OCI_SSH_PRIVATE_KEY` | Run: `base64 -w0 < your-key.pem` |

> ?? Do NOT include newlines in the base64 output. Use `-w0` flag.

## Step 3: Trigger Deploy

Push to `main` branch automatically triggers deploy.

Monitor at: `https://github.com/jamicore2026-alt/jamicore/actions`

Click **Deploy to OCI** ? watch the logs.

## Step 4: Verify Deploy

SSH into your VM and check:

```bash
ssh -i your-key.pem ubuntu@YOUR_VM_IP
docker ps
docker-compose -f docker-compose.prod.yml logs --tail=50 backend
```

Expected output:
- `saas_ecom_postgres` ? Up (healthy)
- `saas_ecom_redis` ? Up (healthy)
- `saas_ecom_backend` ? Up (healthy)
- `saas_ecom_dashboard` ? Up (healthy)
- `saas_ecom_storefront` ? Up (healthy)
- `saas_ecom_caddy` ? Up (healthy)

Test endpoints:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Step 5: Access Your Apps

| App | URL (with domain) | URL (with IP) |
|-----|-------------------|---------------|
| Storefront | `https://yourdomain.com` | `http://YOUR_IP` |
| Dashboard | `https://dashboard.yourdomain.com` | `http://YOUR_IP:3001` |
| API | `https://api.yourdomain.com` | `http://YOUR_IP:3000` |

> For IP-based access without domains, edit `docker-compose.prod.yml` to expose backend on `0.0.0.0:3000` instead of `127.0.0.1:3000`.

## Troubleshooting

### "API_BASE_URL: Invalid URL"
- Fixed in latest commit. Make sure you pushed.

### "Cannot find module '/app/dist/migrate.js'"
- Fixed in latest commit (`apps/backend/src/migrate.ts` added).

### "Run Command Timeout" at docker prune
- Fixed in latest commit (replaced `docker system prune -af` with `docker image prune -f`).

### "container saas_ecom_backend is unhealthy"
- Check logs: `docker-compose -f docker-compose.prod.yml logs backend`
- Usually caused by missing/invalid env vars.

### "Couldn't create signal pipe" when pushing
- Use HTTPS instead of SSH: `git remote set-url origin https://github.com/jamicore2026-alt/jamicore.git`
- Then authenticate with `gh auth login` or use a PAT token.
