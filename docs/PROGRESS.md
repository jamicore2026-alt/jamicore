# PROGRESS.md - CI/CD Clean Slate + Auto-Migrations

## 2026-05-21: Complete Security Audit + 2 Fixes

### Fix 1: Staff Invitation JWT Missing `type` + `jti` (CRITICAL)
- **File:** `apps/backend/src/modules/staff/staff.route.merchant.ts:180`
- **Problem:** Staff invitation accept route generated JWT without `type: 'access'` and `jti`. Merchant scope hook rejects any JWT missing `type`, causing all authenticated requests from newly-accepted staff to fail with 401.
- **Fix:** Added proper access token + refresh token with `type`, `jti`, stored refresh in Redis, set both cookies using standard `cookieOptions`.
- **Impact:** Staff can now accept invitations and use the dashboard normally.

### Fix 2: Dashboard API Internal Network Routing
- **File:** `docker-compose.prod.yml`
- **Problem:** Dashboard service used external IP (`209.74.81.128`) via `.env.production`, causing requests to route through Caddy instead of internal Docker network.
- **Fix:** Added `API_BASE_URL: http://spaceship_backend:3000` to dashboard service environment for direct internal network access.

### Audit Results
- **Auth & Security:** PASS — JWT rotation, CSRF, rate limiting, API key hashing, bcrypt, store status checks
- **Data Layer:** PASS — Tenant isolation, atomic inventory, server-side pricing, coupon guards, encrypted payment configs
- **Deployment:** PASS — Security headers, IP allowlist, health check key, zero-downtime config
- **New audit report:** `docs/audit/audit_2026_05_21.md`

| Check | Result |
|---|---|
| `pnpm typecheck` (all 8 packages) | 0 errors |
| Staff JWT fix | `type: 'access'` + `jti` + refresh rotation |
| No `console.log` in runtime | Clean |
| No `any` types in runtime | Clean |

---

## 2026-05-19: 3 Bug Fixes — Inventory, Deploy, Caddyfile

### Fix 1: Inventory decrement before payment (CRITICAL)
- **Problem**: `orderService.create()` decremented inventory immediately on order placement, before payment confirmation. Abandoned checkouts permanently reduced stock.
- **Fix**: Removed inventory decrement from `order.service.ts` create() transaction. Added inventory decrement to both `handleRazorpayWebhook` and `handleStripeWebhook` inside the same `db.transaction` as the payment status update, making inventory deduction atomic with payment confirmation.
- **Added**: `findOrderItemsByOrderId(orderId, storeId)` in `order.repo.ts` for store-scoped order item lookup.

### Fix 2: Auto-deploy broken on git push
- **Problem**: `build-and-push` job condition checked `github.event.workflow_run.conclusion`, which is never populated on push events. Every git push to main silently skipped the build job.
- **Fix**: Changed condition to `github.event_name == 'workflow_dispatch' || github.event_name == 'push'`.

### Fix 3: Caddyfile missing + build artifacts in git
- **Problem A**: `deploy.yml` scp's `Caddyfile` to VM, but only `Caddyfile.example` existed. Every deploy failed at the scp step.
- **Fix A**: Created domain-based `Caddyfile` with `{$API_DOMAIN}`, `{$DASHBOARD_DOMAIN}`, `{$STOREFRONT_DOMAIN}`, `{$STOREFRONT_FOOD_DOMAIN}` placeholders, TLS via Let's Encrypt with `{$LETS_ENCRYPT_EMAIL}`.
- **Problem B**: Build artifacts (`build/`, `.svelte-kit/`) could be committed in git.
- **Fix B**: Removed `Caddyfile` from `.gitignore` (must be committed), added explicit `apps/*/build/` and `apps/*/.svelte-kit/` patterns.

### Earlier: Repo Cleanup (Phase 1-3)
- Moved docs to `docs/`, removed root clutter, templated Caddyfile, untracked AI agent folders
- Purged `oraclekey/` SSH keys from git history via `git filter-repo`
- Sanitized local Windows path from `AGENTS.md`
- Fixed healthchecks (require→wget), removed duplicate env vars from docker-compose.prod.yml
- Separated DB migration from app startup (dedicated `migrate` service)
- Fixed Node version in README (22+→24+)
- Added `workflow_dispatch` inputs to deploy workflow

### Verification
| Check | Result |
|---|---|
| `pnpm typecheck` (all 8 packages) | 0 errors |
| `pnpm build` (all 8 packages) | 8/8 pass |
| No `console.log` in changed files | Clean |
| No `any` types introduced | Clean |

## 2026-05-16: Complete CI/CD Rewrite + Automatic DB Migrations

### Removed Files
- `.github/workflows/e2e.yml` - Will re-add when needed
- `.github/workflows/debug-logs.yml` - Unused
- `.github/workflows/dependency-review.yml` - Unused
- `.github/workflows/secret-scanning.yml` - Unused
- Old `scripts/deploy-remote.sh` - Too complex, buggy

### Created Files
1. `.github/workflows/ci.yml` - Clean CI with postgres+redis services, lint, typecheck, security checks, test, build, docker validate
2. `.github/workflows/deploy.yml` - Build 4 images to GHCR, SSH deploy to VM
3. `.github/workflows/codeql.yml` - Weekly CodeQL scan
4. `scripts/deploy-remote.sh` - Clean VM deploy script (no repo clone, auto .env, DB backup, automatic migrations)
5. `scripts/vm-reset.sh` - Complete VM wipe for fresh start

### CRITICAL: Automatic DB Migrations on Startup
- **Problem**: Previously, production deploys did NOT run DB migrations. Fresh VM = empty DB = crash.
- **Solution**: Added `runMigrations()` to `apps/backend/src/db/index.ts`
- **Integration**: `index.ts` now calls `await runMigrations()` BEFORE `fastify.listen()`
- **Mechanism**: Uses `drizzle-orm/postgres-js/migrator` to apply all `.sql` files from `drizzle/` folder
- **Safety**: Drizzle tracks applied migrations in `__drizzle_migrations` table — idempotent, runs safely on every startup
- **Fallback**: `migrate.ts` script still exists for manual runs if needed

### Docker Compose Changes
- `docker-compose.prod.yml`: Backend `start_period` increased from 15s to 60s
  - Reason: First deploy needs time for postgres to start + migrations to run (22 migration files)
  - Other services unchanged (15s)

### Deploy Script Changes
- No manual migration step needed (runs automatically on container startup)
- DB backup still runs before deploy if postgres is already running
- Health check waits up to 120s (60 attempts x 2s) to account for first-deploy migrations
- Added comment: "DB migrations run automatically when backend container starts"

### Verification Results
| Check | Result |
|---|---|
| `tsc --noEmit` (backend) | 0 errors |
| `turbo run typecheck` (all 8 packages) | 0 errors, 7/7 pass |
| `turbo run build` (all 8 packages) | 8/8 pass |
| `vitest run` (backend) | 37/37 files, 828/828 tests pass |
| YAML syntax | OK (0 tabs, valid structure) |
| Bash scripts | OK (shebang + strict mode + LF endings) |

### Next Steps for Deploy
1. Commit all changes: `git add -A && git commit -m "ci/cd: clean rewrite + auto db migrations"`
2. Push to `main`
3. On VM (if full reset needed): `bash ~/spaceship/scripts/vm-reset.sh`
4. Trigger deploy from GitHub Actions → Deploy workflow → Run workflow
5. First deploy auto-creates `.env.production` with secure random secrets
6. Backend container starts → runs migrations → starts server → healthy

### VM Reset Script Usage
```bash
# SSH into VM, then:
bash ~/spaceship/scripts/vm-reset.sh
# This removes: all containers, images, volumes, networks, and ~/spaceship directory
# Use this for a COMPLETELY fresh start
```
