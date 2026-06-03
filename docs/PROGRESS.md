# PROGRESS.md - CI/CD Clean Slate + Auto-Migrations

## 2026-05-22: Frontend MFA Verification Pages

### Problem
Backend API returned `mfaRequired: true` + `mfaToken` on login, but dashboard/storefront frontend login handlers ignored it and redirected straight to dashboard/account without asking for OTP.

### Fix
| Scope | Files | Change |
|---|---|---|
| Shared types | `packages/shared-types/src/schemas/auth.ts` | Added `verifyMfaSchema` (6-digit code) |
| Dashboard merchant | `login/+page.server.ts` | Detect `mfaRequired`, store `mfaToken` in httpOnly cookie (5min), redirect to `/verify-mfa` |
| Dashboard admin | `admin-login/+page.server.ts` | Same MFA flow |
| Dashboard verify | `verify-mfa/+page.server.ts`, `+page.svelte` | New page — POSTs to `/api/v1/merchant/auth/verify-mfa`, forwards cookies, redirects to `/dashboard` |
| Storefront customer | `login/+page.server.ts` | Detect `mfaRequired`, redirect to `/verify-mfa` |
| Storefront verify | `verify-mfa/+page.server.ts`, `+page.svelte` | New page — POSTs to `/api/v1/customer/auth/verify-mfa`, forwards cookies, redirects to `/account` |

### Verification
- `pnpm typecheck` (all 9 packages) | 0 errors |
- Backend API merchant login with MFA | `mfaRequired: true` returned |
- Backend API customer login with MFA | `mfaRequired: true` returned |

---

## 2026-05-22: CI/CD Improvements — Console Check + Landing Docker Validation

### Changes
- **New script:** `scripts/check-console.js` — detects `console.log/warn/error/info/debug` in backend runtime source (excludes seed/migration scripts)
- **CI security checks:** Added `check-console.js` to `.github/workflows/ci.yml`
- **CI docker-validate:** Added `landing` Dockerfile build validation (was missing; deploy builds 5 images but CI only validated 4)
- **Root package.json:** Added `check:console` script

### Verification
| Check | Result |
|---|---|
| `pnpm typecheck` (all packages) | 0 errors |
| `node scripts/check-console.js` | Pass (excludes seed/migrate scripts) |
| `node scripts/check-storeid.js` | Pass |
| `node scripts/check-prehandler.js` | Pass |

---

## 2026-05-22: Email-Based MFA Implementation

### Feature: Email MFA for Merchant, Customer, and SuperAdmin

**Branch:** `feature/email-mfa`
**Status:** Complete, error-free, 828 tests passing

### Changes
- **Schema:** Added `mfa_enabled boolean DEFAULT false NOT NULL` to `users`, `customers`, `super_admins` tables
- **Migration:** `drizzle/0021_yielding_drax.sql` generated and applied
- **Error codes:** Added `MFA_REQUIRED`, `MFA_CODE_INVALID`, `MFA_CODE_EXPIRED` to `codes.ts` + `index.ts` mapping + `codes.test.ts`
- **Auth types:** Added `MfaJwtPayload` and `MfaScope` to `auth.types.ts`
- **JWT types:** Extended `@fastify/jwt` payload to include `type: 'mfa_pending'` and `scope` in `fastify.d.ts`
- **Auth repo:** Added `updateUserMfaStatus`, `updateCustomerMfaStatus`, `updateSuperAdminMfaStatus`
- **Auth service:** Added `generateMfaCode` (Redis, 5min TTL), `verifyMfaCode`, `enable/disableMfa` for all 3 scopes
- **Auth schemas:** Added `verifyMfaSchema` and `enableMfaSchema`

### New Endpoints (all 3 scopes: merchant, customer, admin)
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/login` | POST | No | Modified: if MFA enabled, returns `mfaToken` instead of cookies |
| `/verify-mfa` | POST | No | Submit `mfaToken` + 6-digit code → issues access + refresh cookies |
| `/mfa/resend` | POST | No | Resend MFA code using existing `mfaToken` |
| `/mfa/enable` | POST | Yes | Enable email MFA (requires current password) |
| `/mfa/disable` | POST | Yes | Disable email MFA |

### Bug Fixes During Testing
| Fix | File |
|---|---|
| CSRF 403 on `/verify-mfa` and `/mfa/resend` | `src/lib/csrf.ts` — added both paths to `exemptSuffixes` |
| Scope hook 401 on `/verify-mfa` and `/mfa/resend` | `src/scopes/merchant.ts`, `customer.ts`, `superAdmin.ts` — added to `isPublicAuth` |

### Verification
| Check | Result |
|---|---|
| `pnpm typecheck` (all 8 packages) | 0 errors |
| `vitest run` (backend) | 37/37 files, 828/828 tests pass |
| `pnpm lint` (backend) | 0 errors |
| No `console.log` in new code | Clean |
| No `any` types introduced | Clean |
| Zod `strictObject()` on all new route bodies | Yes |
| JWT tokens in httpOnly cookies | Yes (real tokens); `mfaToken` is temporary 5-min JWT returned in body |
| Redis for MFA code storage | Yes (5-min TTL, single-use) |
| Rate limiting on MFA endpoints | Yes (3-5 req/min per endpoint) |
| E2E Test: merchant login → enable MFA → login MFA → verify MFA → access /me → disable MFA → login normal | Pass |
| E2E Test: customer login → enable MFA → login MFA → verify MFA | Pass |
| E2E Test: superAdmin login → enable MFA → login MFA → verify MFA | Pass |

---

## 2026-05-22: RealWorld App Comparison + Production SaaS Audit

### Audit completed comparing jamicore vs RealWorld spec + 2025-2026 best practices

**Overall Grade: B (7.0/10)**

**6 Critical Gaps found (P0):**
1. No MFA/2FA — PCI DSS v4.0 compliance gap
2. Rate limiting is per-IP + in-memory, NOT per-tenant + Redis-backed
3. No OpenTelemetry distributed tracing (Sentry for errors only)
4. No circuit breaker for external API calls (Stripe, Resend, S3)
5. No feature flags — every deploy is all-or-nothing
6. No load/performance testing — unknown capacity limits

**What jamicore exceeds vs RealWorld:** Multi-tenancy, RBAC, billing, API keys, server-side pricing, atomic inventory, GDPR/DSAR, webhook system, 30+ commerce modules

**Full audit report:** `docs/audit/audit_realworld_comparison_2026_05_22.md`

**Recommended first action:** Phase 1 hardening (MFA + Redis rate limiting + circuit breaker + OTel) before production merchant payments.

---

## 2026-05-21: Caddyfile Security Hardening

### Changes
- **File:** `Caddyfile.domain`, `Caddyfile`, `Caddyfile.example`
- **HSTS:** Added `Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` to all domain blocks
- **CSP:** Added `Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"` to all domain blocks
- **Rate limiting:** Added `rate_limit` directive to `ADMIN_DOMAIN` block (10 req/min per IP) via `github.com/mholt/caddy-ratelimit` module
- **Custom Caddy image:** Created `caddy/Dockerfile` to build Caddy with rate limit module; updated `docker-compose.prod.yml` to use it
- **Deploy workflow:** Updated `.github/workflows/deploy.yml` to copy `caddy/` directory to VM

### Admin/Merchant Domain Routing
- **Confirmed intentional:** `ADMIN_DOMAIN` and `DASHBOARD_DOMAIN` both proxy to `dashboard:3001`. Same SvelteKit app serves both admin (`/admin-login`) and merchant (`/login`) routes via domain-aware redirect in `+page.server.ts`.

---

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

## 2026-06-02: Full Platform Audit (in progress)

### Phase 1 — User-Reported Bug Fixes
- **BUG-001** [fixed] Admin settings page showed "Failed to load admin profile" because `/api/v1/admin/auth/me` did not return `lastLoginAt`. Added the field to the response.
- **BUG-002** [fixed] User dropdown in merchant dashboard topbar overlapped with `+ Add Category` button. Added `z-[60]` to dropdown content to lift it above page actions (base shadcn-svelte `DropdownMenuContent` ships with `z-50`).

### Phase 2 — Audit
- **Status:** Complete (report written 2026-06-03).
- **Scope:** 5-dimension parallel sweep (Security & Auth, Performance & DB, Code Quality & TS, UI/UX, Cross-scope consistency).
- **Result:** 0 P0, 13 P1, 31 P2, 8 P3, 4 positive findings. **No security vulnerabilities, no tenant-isolation breaches, no data-loss risks.**
- **Consolidated report:** `docs/audit/audit_2026_06_02.md` (371 lines).
- **Raw findings:** `docs/audit/findings/2026-06-02-{security,perf,quality,uiux,consistency}.json`.
- **Verify pass:** Skipped by user decision (2026-06-03) — all 52 findings accepted at agent-self-attestation level. Reviewers must validate `file:line` evidence before merging P1 fixes.

### Phase 3 — P1 Fix Progress
| PR | Findings | Status | Commit |
|---|---|---|---|
| PR #1 — Security + UI z-index + error codes | SEC-001, UI-003, QUAL-001, QUAL-002, CONS-006 | ✅ Done | 3 commits on `fix/audit-2026-06-02-p1-batch1` |
| PR #2 — Performance N+1 batch | PERF-001, PERF-002, PERF-003, PERF-004 | ✅ Done | 4 commits on same branch |
| PR #3 — Public scope plan-expiry | CONS-007 | ✅ Done | 1 commit on same branch |
| PR #4 — Cross-scope `/me` shape | CONS-001 | ✅ Done | 1 commit on same branch |

**P1 totals:** 13/13 fixed (100%). UI-001 and UI-002 are auto-resolved by the PR #1 primitive z-index fix (UI-003); all consumers of the dropdown primitive now use z-[60] by default.

### PR #4 Detail — CONS-001 (canonical /me response shape)
- **Problem:** The 3 `/me` endpoints returned three different top-level keys (`user`+`store` for merchant, `customer` for customer, `admin` for super admin) with different field sets. The customer endpoint didn't return `storeId` even though customer tokens always carry it, and the asymmetry around `name` and `lastLoginAt` was specifically called out in BUG-001's follow-up.
- **Fix:**
  - `apps/backend/src/modules/auth/auth.service.ts`
    - New shared helper `buildMeResponse(input)` that produces the canonical shape.
  - `apps/backend/src/modules/auth/auth.route.{merchant,customer,superAdmin}.ts`
    - All 3 `/me` handlers delegate to `buildMeResponse`. Legacy top-level keys (`customer`, `admin`) are removed.
  - `apps/backend/src/modules/auth/auth.repo.ts`
    - `findCustomerById` Pick extended to include `lastLoginAt` so customer `/me` can return it.
  - Tests
    - All 3 `/me` tests updated to assert the new shape; super admin test now also sets `request.adminRole` (the route reads it from the scope hook).
  - `apps/dashboard/src/routes/(superadmin)/admin/settings/+page.server.ts`
    - Loader reads `data.user` instead of `data.admin` (the new key).
  - Merchant layout + pending page need no changes — the new shape keeps `meData.store.status` at the same path as before.
- **Canonical shape:**
  ```ts
  {
    scope: 'merchant' | 'customer' | 'superAdmin',
    user: {
      id: string,
      email: string,
      name: string | null,         // superAdmin: .name; customer: firstName+' '+lastName; merchant: null (no name column)
      role?: string,                // always present (superAdmin/OWNER/STAFF/customer)
      isActive?: boolean,           // superAdmin only
      lastLoginAt?: string | null,  // superAdmin + customer (column wired in CONS-009 follow-up)
    },
    store?: { id, name, status }    // merchant + customer only; superAdmin is platform-level
  }
  ```
- **Deferred (separate findings):** CONS-009 (write `lastLoginAt` on customer login + add `name`/`lastLoginAt` to `users` table) is a DB migration + write-path change, not a shape change, and is a separate PR.
- **Verification:** `pnpm typecheck` 0 errors (8/8 packages), `pnpm test` 828/828 passing.
- **FE migration:** Only 3 call sites identified; 1 changed (super admin settings), 2 already compatible (merchant layout + pending page).

### PR #3 Detail — CONS-007 (public scope plan-expiry check)

- **Problem:** `scopes/public.ts` only resolved `storeId` from cache/DB but never checked `status` or `planExpiresAt`. Expired or suspended merchants continued serving storefronts indefinitely; merchant scope already rejected these with `PLAN_EXPIRED`/`STORE_SUSPENDED`. The 5-minute `store:domain:*` cache was also never invalidated when super admin updated a store.
- **Fix:**
  - `apps/backend/src/scopes/public.ts`
    - Extended `store:domain:{domain}` cache value from `{ id }` to `{ id, status, planExpiresAt }` (ISO string). No new DB hit per request.
    - Added plan-expiry check to the existing `storeId` validation hook: 403 + `STORE_SUSPENDED` if not active, 403 + `PLAN_EXPIRED` if past expiry, `x-plan-expires-soon` / `x-plan-expires-in-days` headers when within 7 days (mirrors merchant scope).
    - Cache lookup mirrors the same `x-store-domain` → `host` → `subdomain` chain used by the resolution hook so the check hits the same cache key.
    - Global endpoints (`/currency/*`, `/robots.txt`) remain exempt.
  - `apps/backend/src/modules/store/store.route.superAdmin.ts`
    - Fetch existing store before PATCH; invalidate `store:domain:{domain}` after update so admin changes take effect immediately instead of after the 5-minute TTL.
- **Risk surfaced:** Any merchant whose plan already expired in production will have their public storefront start returning 403 immediately. Recommendation: coordinate with merchants or add a feature flag (e.g. `PUBLIC_SCOPE_ENFORCE_PLAN=true`) before merging to production. Code defaults to ON.
- **Verification:** `pnpm typecheck` 0 errors (8/8 packages), `pnpm test` (backend) 828/828 passing.
- **Caveat:** The IP-host fallback path (dev only — `localhost` / `backend`) bypasses the check because the fallback uses a different cache key than the request's `Host` header. Production traffic always comes through a real domain, so this gap is non-impactful. Documented in the scope file.

