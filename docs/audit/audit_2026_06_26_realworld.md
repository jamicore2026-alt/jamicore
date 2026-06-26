# Real-World Production Audit — 2026-06-26 (Adversarial)

> **Why this exists:** The earlier `audit_2026_06_26_production_readiness.md` only
> re-verified the *known* 2026-06-02 findings against `main` and concluded "ship-ready."
> That conclusion was **wrong** — it did not exercise real-world end-to-end flows.
> This audit ran 6 adversarial agents (domain feature, multi-tenant security,
> checkout/payment, infra/deploy, frontend, SEO/a11y) against current `main` and found
> **15 P0s** and **~45 P1s** in real production paths. The user's instinct ("there are
> many issues") was correct.
>
> **Headline:** `main` is **NOT production-ready**. The custom-domain feature is
> end-to-end non-functional and has cross-tenant security holes; the checkout/refund
> flow has money/integrity bugs; the deploy script wipes most production env vars;
> auth cookies are shipped without `Secure` in prod. Each is fixable, but this is a
> multi-PR remediation, not a single hotfix.

---

## TL;DR — P0 count by area

| Area | P0 | P1 | Lead issue |
|---|---:|---:|---|
| **Custom-domain feature** | 7 | 5 | `findByDomain` ignores `customDomain` → every custom domain 400s |
| **Checkout / payment / order** | 5 | 5 | COD + food orders never decrement stock; refunds are a no-op |
| **Infra / deploy** | 2 | 8 | `deploy-remote.sh` wipes all env vars except 5 |
| **Frontend** | 1 | 16 | Auth cookies shipped without `Secure` in prod |
| **Multi-tenant security** | 0 | 4 | Cross-tenant file delete; webhook SSRF; XFF rate-limit bypass |
| **SEO / a11y / consistency** | 0 | 7 | `storefront-food` has zero SEO; no i18n; `lang="en"` hardcoded |
| **Total** | **15** | **~45** | |

All findings below carry `file:line` evidence from the adversarial agents; the domain
headlines (P0-D1, D2, D8) were re-verified by hand on 2026-06-26.

---

## 1. CUSTOM-DOMAIN FEATURE — broken end-to-end + cross-tenant holes

This is the user's specific concern. The feature is **not deployable**.

### P0-D1. Custom domains never resolve to a store — core feature dead
- **File:** `apps/backend/src/modules/store/store.repo.ts:18-23` (verified)
- `findByDomain` queries **only** `eq(stores.domain, domain)` (the *subdomain* column).
  It never checks `stores.customDomain`. Every host-header resolver calls this one
  helper (`scopes/public.ts:35`, `modules/auth/auth.helpers.ts`).
- **Impact:** A customer visiting `shop.theirbrand.com` gets "Store not found" (400).
  No merchant's storefront is ever served on a custom domain.
- **Fix:** `findByDomain` → `or(eq(stores.domain, d), eq(stores.customDomain, d))`.

### P0-D2. Cross-tenant routing via leading-label collision
- **File:** `apps/backend/src/scopes/public.ts:71-80` (verified)
- After exact-host match fails, the resolver extracts `parts[0]` and looks it up as a
  subdomain. A merchant who registers custom domain `techgear.evil.com` (where `techgear`
  is victim store A's subdomain) causes all traffic to `techgear.evil.com` to be served
  as **store A**.
- **Impact:** Cross-tenant impersonation/data leak, reachable by any merchant.
- **Fix:** Only do the subdomain fallback for known platform suffixes (`.jamicore.com`,
  dev suffixes). For arbitrary multi-label hosts, never fall back to `parts[0]`.

### P0-D3. No HTTPS/TLS provisioning for custom domains
- **Files:** `Caddyfile:5` (`auto_https off`), `Caddyfile.domain` (no `on_demand_tls`),
  `apps/backend/src/services/caddy.service.ts:56-68`
- No on-demand TLS / Let's Encrypt for tenant domains. `getCertificateStatus` polls
  `/pki/certs`, a non-existent endpoint under `auto_https off`.
- **Impact:** Custom domains get HTTP-only or no route. Payments/checkout impossible.
- **Fix:** Enable Caddy on-demand TLS with an `ask` endpoint that checks
  `domain_verifications.status='live'`; gate route insertion on `live`.

### P0-D4. Domain-verification polling is dead — only one attempt ever runs
- **File:** `apps/backend/src/jobs/domainVerificationProcessor.ts:11-60`
- When DNS isn't verified yet and it isn't the last attempt, the `else if` falls through
  and the function **returns cleanly**. BullMQ only retries on `throw`, so the job is
  marked complete after one run. The "polls every 5 min for 24h" claim is false. Re-adding
  the same `jobId` is silently dropped for 7 days (`removeOnComplete`).
- **Impact:** Automatic DNS polling never happens; merchant must manually click verify.
- **Fix:** `throw new Error('DNS not yet verified')` in the not-yet-verified branch.

### P0-D5. Caddy route added BEFORE verification — domain squatting/hijack
- **File:** `apps/backend/src/modules/domain/domain.service.ts:107-112`
- `addCustomDomain` calls `caddyService.addCustomDomainRoute(domain)` before any DNS/TXT
  proof. A merchant can register `google.com`, `stripe.com`, or a competitor's domain and
  a reverse-proxy route is inserted for it.
- **Impact:** Pre-emptive domain squatting in the proxy config; traffic interception if
  the victim ever points DNS at this server.
- **Fix:** Only add the Caddy route after `status === 'live'`. Delete on reject/remove.

### P0-D6. Custom-domain Caddy route points to the API, not the storefront
- **File:** `apps/backend/src/services/caddy.service.ts:21`
- Every custom-domain route dials `backend:3000`. Storefronts are `storefront:3002` /
  `storefront-food:3003`. So even with D1/D3 fixed, `shop.theirbrand.com/` hits the API
  and returns JSON 404s, not the storefront UI.
- **Fix:** Route `/` to the storefront upstream (by store theme) and `/api/*` to backend.

### P0-D7. Caddy Admin API unauthenticated and exposed on 0.0.0.0:2019
- **File:** `Caddyfile:6` (`admin 0.0.0.0:2019`), `caddy.service.ts` (no auth)
- Anyone who can reach port 2019 can read/rewrite the entire Caddy config.
- **Impact:** Infrastructure-level takeover.
- **Fix:** `admin 127.0.0.1:2019` (or internal docker net only); add admin auth/mTLS.

### P1-D8. `X-Store-Domain` header is attacker-controllable
- **File:** `apps/backend/src/scopes/public.ts:51-60` (verified)
- Checked **before** the Host header, no auth/origin check. Caddy doesn't strip it.
  Any client can send `X-Store-Domain: <victim>` and be treated as any store across the
  public surface (cart, checkout, customer auth).
- **Fix:** Only honor from trusted internal proxies, or strip at edge.

### P1-D9. Cache invalidation missing for all domain changes
- **Files:** `domain.service.ts` (updateSubdomain/add/verify/remove), `domain.repo.ts:113-131`
- `store:domain:<host>` is cached 300s / negative-cached 60s. No domain mutation
  invalidates these keys. After a merchant changes subdomain, the old one keeps resolving
  for 5 min; a new merchant claiming it is blocked.
- **Fix:** Invalidate `store:domain:<old>` + `<new>` + negative key on every mutation.

### P1-D10. Race condition on domain claim (no transaction)
- **File:** `domain.service.ts:90-105` (addCustomDomain), `:64-67` (updateSubdomain)
- check-then-insert with no transaction. Two stores claiming the same domain both pass
  the check; the second hits the unique index → unhandled 23505 → generic 500.
- **Fix:** Wrap in tx; catch 23505 → `DOMAIN_ALREADY_TAKEN`.

### P1-D11. Caddy route mutations not idempotent + race
- **File:** `caddy.service.ts:13-54`
- GET-entire-routes → prepend → PATCH-all back. Concurrent adds: last PATCH wins, losing
  the other route. Re-adding duplicates; concurrent remove+add resurrects removed routes.
- **Fix:** Per-route PUT/DELETE by deterministic route id.

### P1-D12. SSL status never goes active → domains never reach `live`
- **File:** `domain.service.ts:180-185`, `domainVerificationProcessor.ts:44`
- `live` requires `getCertificateStatus === 'active'`, which never happens (D3). The
  worker loops `ssl_provisioning` → throws → exhausts attempts → `failed`. `stores.customDomain`
  is never set by the worker.
- **Fix:** Tie `live` to DNS-verified + Caddy route present + real TLS check.

---

## 2. CHECKOUT / PAYMENT / ORDER — money & integrity bugs

### P0-M1. COD orders never decrement inventory (systematic oversell)
- **File:** `apps/backend/src/modules/payment/payment.intent.service.ts:63-93`
- The COD branch inserts a `completed` payment and `order.paymentStatus='paid'` but never
  calls `decrementInventory`. Only webhook handlers decrement stock.
- **Impact:** Every COD order sells stock that is never reserved → oversell.

### P0-M2. Webhook inventory decrement silently no-ops on insufficient stock
- **Files:** `payment.webhook.service.ts:152-170` (Razorpay), `244-263` (Stripe)
- `decrementInventory` is conditional (`WHERE currentQuantity >= qty`) and returns `[]`
  when stock is short; the webhook never checks the return length. Two orders on stock=1:
  both pay, first decrements to 0, second's decrement returns 0 rows → silently ignored →
  order marked paid, customer charged, no stock reserved.
- **Fix:** Check `rows.length === 0` → throw `INSUFFICIENT_INVENTORY` (return 500 so the
  provider retries while you refund/hold).

### P0-M3. Webhook idempotency is racy (double-fulfill / double-decrement)
- **Files:** `payment.webhook.service.ts:132-134` (Razorpay), `228-230` (Stripe)
- Only guard is `if (payment.status === 'completed') return`, read **outside** the
  transaction. Two concurrent retried webhooks both read `processing`, both enter the tx,
  both flip to `completed`, both decrement stock. No `SELECT FOR UPDATE`, no conditional
  `UPDATE ... WHERE status<>'completed'`, no persisted event-id dedup.
- **Fix:** Atomic state transition: `UPDATE payments SET status='completed' WHERE id=? AND
  status<>'completed' RETURNING ...`; 0 rows = already processed. Persist provider event ids.

### P0-M4. Refund flow is completely disconnected from returns
- **Files:** `apps/backend/src/modules/return/return.service.ts:98-128`,
  `apps/backend/src/modules/payment/payment.refund.service.ts`
- `returnService.updateStatus('refunded')` only sets `refundedAt` + status label. It never
  calls `refundService.refundPayment`, never restores inventory, never updates
  `paymentStatus`. `refundService.refundPayment` is referenced by no route.
- **Impact:** Merchant marks a return "refunded", customer sees "refunded", but **no money
  is returned and stock is never restored**. The return-to-refund pipeline is a no-op.
- **Fix:** Wire `updateStatus('refunded')` → `refundPayment` + `restoreInventory` in a tx
  with idempotency.

### P0-M5. Public food-storefront order route: no inventory check + float math
- **File:** `apps/backend/src/modules/order/order.route.public.ts:50-94`
- Guest order creation uses `Number(product.salePrice)` (IEEE-754 float on money, violates
  the project's decimal rule), never checks `currentQuantity`, never decrements inventory.
  Combined with COD default (M1), food orders are infinite oversell. Price-mismatch
  tolerance `> 0.01` lets a client shave $0.01/line.
- **Fix:** Route through `pricingService.computeOrderPricing` (decimal, stock-checked,
  store-scoped) instead of inline `Number()` math.

### P1-M1. Cancelling a pending (unpaid) order restores inventory never decremented
- **File:** `apps/backend/src/modules/order/order.service.ts:271-291`
- `updateStatus('cancelled')` unconditionally `restoreInventory` for every item. But stock
  is only decremented at webhook time. A pending order's cancel *adds* stock that was never
  removed → `currentQuantity` inflates → future oversell.
- **Fix:** Only restore if stock was actually reserved (track a flag, or gate on
  `paymentStatus === 'paid'`).

### P1-M2. Customer can pay for another customer's order
- **File:** `apps/backend/src/modules/payment/payment.route.customer.ts:19-27`
- `POST /customer/payments/intent` creates an intent without checking
  `order.customerId === request.customerId`. A logged-in customer who knows another's
  `orderId` can pay for it. (Sibling `GET /orders/:id` does check — inconsistent.)
- **Fix:** Add `order.customerId !== request.customerId → 403`.

### P1-M3. Cross-tenant cart deletion via `cartId` at checkout
- **Files:** `apps/backend/src/modules/checkout/checkout.route.customer.ts:73` →
  `apps/backend/src/modules/order/order.repo.ts:301-321`
- Checkout accepts an arbitrary `cartId`; `deleteCartItems`/`resetCartTotals` filter only
  by `cartId`, no `storeId`. A customer passing another store's/customer's cart UUID
  causes the order tx to delete that cart's items and zero its totals.
- **Fix:** Verify `cart.storeId === request.storeId` (and ownership) before clearing.

### P1-M4. Refund not idempotent + no cumulative tracking
- **File:** `apps/backend/src/modules/payment/payment.refund.service.ts:13-135`
- `generateIdempotencyKey()` returns a fresh UUID per call → duplicate refunds create a
  second provider refund. Amount check is vs `payment.amount`, not `amount - alreadyRefunded`
  → multiple partial refunds can exceed the captured amount. Provider API called before DB
  write → if DB fails, refund issued but not recorded.
- **Fix:** Persist refunds in a `refunds` table with unique provider-refund-id; deterministic
  idempotency key; compute `remaining = amount - SUM(refunds)`.

### P1-M5. Coupon per-customer usage limit is a read-then-write race
- **File:** `apps/backend/src/modules/order/order.repo.ts:340-357`
- Global coupon limit is atomic (conditional UPDATE), but the per-customer limit does
  `SELECT count(*)` then conditional insert. Two concurrent checkouts from the same
  customer both pass.
- **Fix:** Conditional insert + re-count, or `SELECT FOR UPDATE` on the coupon row.

---

## 3. MULTI-TENANT SECURITY

### P1-S1. Cross-tenant file deletion via merchant upload DELETE
- **Files:** `apps/backend/src/modules/upload/upload.route.merchant.ts:99-115`,
  `apps/backend/src/modules/upload/upload.service.ts:133-176`
- `DELETE /merchant/upload?url=/uploads/products/{storeB-uuid}/{file}.jpg` — the route
  checks only the `/uploads/` prefix; `deleteImage()` never compares the storeId segment
  in the URL to `request.storeId`. Any merchant can delete any other tenant's images.
- **Fix:** Require the path segment after the folder to equal `request.storeId`.

### P1-S2. SSRF via merchant webhook URL
- **Files:** `apps/backend/src/modules/webhook/webhook.schema.ts:9`,
  `apps/backend/src/modules/webhook/webhook.service.ts:83`
- Webhook URL accepts any `z.string().url()`. A merchant registers
  `http://169.254.169.254/latest/meta-data/...` (cloud metadata) or `http://localhost:5432`.
  On the next event the server POSTs the order payload there and stores the response body
  (readable via deliveries endpoint) → credential theft / internal port scanning.
- **Fix:** https-only in prod; resolve host; reject private/loopback/link-local/metadata IPs.

### P1-S3. Rate-limit bypass via `X-Forwarded-For` spoofing
- **Files:** `apps/backend/src/plugins/rateLimit.ts:63-65`, `apps/backend/src/index.ts:76`
- In prod, `request.ip` comes from `X-Forwarded-For`; the rate-limit key is
  `${request.ip}:${tier}`. An attacker sending a fresh `X-Forwarded-For` per request gets a
  fresh bucket each time → defeats the 5/min auth brute-force limit.
- **Fix:** Use the trusted-hop value, not the rightmost XFF; add per-tenant auth buckets.

### P1-S4. Health-check IP allowlist bypass via `X-Forwarded-For`
- **File:** `apps/backend/src/index.ts:204-210, 278-284`
- `/health/detailed` + `/health/metrics` gate on `isPrivateIp(request.ip)`. With
  `trustProxy` on, an external attacker sends `X-Forwarded-For: 10.0.0.1` and passes.
- **Fix:** Don't rely on `request.ip` for security when `trustProxy` is on; require
  `HEALTH_CHECK_KEY` unconditionally in prod.

### P2-S5. No RLS — tenant isolation is entirely application-enforced
- No `ENABLE ROW LEVEL SECURITY` in any of the 26 migration files. A single missed
  `where: eq(storeId)` = full cross-tenant leak. Today's filtering is consistent, but
  there is no backstop for regressions.
- **Fix:** Enable RLS + `USING (store_id = current_setting('app.current_store_id', true))`
  policies on tenant tables.

### Other P2 security: `X-Store-Domain` controllable (overlaps D8); IP/localhost
`techgear` fallback exposes a default tenant (P2-S, `public.ts:83-93`); refresh-token no
reuse detection (P2); API-key grants OWNER-equivalent with no MFA (`scopes/merchant.ts:87-92`);
MFA disable requires no password re-verify (`auth.route.mfa.ts:149-163`); rate limiting
silently off if `NODE_ENV` mis-set to dev/test.

---

## 4. INFRA / DEPLOY

### P0-I1. `deploy-remote.sh` wipes all env vars except 5 on every deploy
- **File:** `scripts/deploy-remote.sh` (the `cat > .env.production <<EOF` block)
- Rewrites `.env.production` from scratch, preserving only `DB_PASSWORD`,
  `REDIS_PASSWORD`, `JWT_SECRET`, `COOKIE_SECRET`, `PAYMENT_CONFIG_ENCRYPTION_KEY`. Drops:
  `SENTRY_DSN` (no error tracking), `HEALTH_CHECK_KEY` (Prometheus 403s), `RESEND_API_KEY`/
  `FROM_EMAIL` (transactional email broken), `S3_*` (uploads/backups broken),
  `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` (payments broken), `CORS_ORIGINS`,
  `STOREFRONT_URL` (reset links point at localhost), `TRUST_PROXY_HOPS`.
- **Impact:** A single deploy produces a system that boots but can't send email, accept
  payments, track errors, report metrics, or serve cross-origin browser traffic.
- **Fix:** Source the existing `.env.production` before rewriting; emit the full key set;
  add a diff guard that fails if any example key is missing.

### P0-I2. `CORS_ORIGINS` unset in prod → dashboard/storefront API blocked
- **Files:** `apps/backend/src/plugins/cors.ts`, `scripts/deploy-remote.sh`
- Unset → `allowedPatterns` is `[]` → any browser `Origin` to `api.domain.com` is rejected.
- **Fix:** Write `CORS_ORIGINS=https://$API_DOMAIN,...` in the deploy script; add a prod
  `superRefine` in `env.ts` requiring it.

### P1-I3..I8 (summary)
- No log driver/rotation on any prod container → disk fill (P1).
- No container resource limits → OOM/noisy-neighbor (P1).
- Backups ad-hoc, on-disk, same-host, unrotated → no real DR (P1).
- Redis no AOF → BullMQ job state can be lost on restart (P1).
- No on-demand TLS for tenant domains (overlaps D3) (P1).
- Graceful shutdown: no hard timeout, workers close before HTTP drain, no
  `stop_grace_period` → in-flight jobs orphaned on every deploy (P1).
- `API_BASE_URL=http://backend:3000` (internal Docker name) → external webhooks/Swagger
  point at a non-resolving host (P1).
- Migrate container has no timeout → a stuck migration blocks all future deploys (P1).

### P2-I
- Committed SvelteKit build artifacts in git (14 tracked `apps/*/build/**` files) — bloats
  repo, deploy-image mismatch risk.
- `COOKIE_SECRET` has an insecure `.default('dev-cookie-secret-change-me-...')` (rejected
  in prod by superRefine, but the default is a footgun).
- DB pool size 20 undersized vs 7 workers × concurrency 5 + HTTP.
- Caddy admin `0.0.0.0:2019` in the IP-fallback Caddyfile (overlaps D7).
- No global `email` directive for Let's Encrypt account in `Caddyfile.domain`.
- Grafana default `admin/admin` if `GRAFANA_PASSWORD` unset.

---

## 5. FRONTEND

### P0-F1. Auth cookies shipped without `Secure` in production
- **File:** `packages/shared-utils/src/cookies.ts:79` — `options.secure = false;`
- `forwardCookies` unconditionally rewrites `secure: false` on the `access_token`/
  `refresh_token` cookies it re-emits to the browser. The backend sets
  `secure: env.isProduction`, but the BFF overwrites it. In prod the tokens transmit over
  any HTTP connection. Browsers send non-Secure cookies on same-site HTTP → token leak.
- **Fix:** `options.secure = options.secure ?? (process.env.NODE_ENV === 'production');`
- Same bug class: `/api/[...path]` proxy strips `; Secure` (`apps/storefront` + `apps/dashboard`
  `routes/api/[...path]/+server.ts:33-34`); storefront `hooks.server.ts` cookie defaults
  don't enforce Secure.

### P1-F (top items)
- `mfaToken` (a 5-min bearer) leaked into `$page.data` from `load` on both verify-mfa pages
  — readable by any client script/XSS, unnecessary (the action re-reads it from the
  httpOnly cookie). Remove from the return object.
- Wishlist toggle on 3 product cards is permanently broken — reads
  `getCookie('access_token')` which is always undefined (httpOnly) → always redirects to
  `/login`. Use `data.isLoggedIn`.
- `storefront-food` has **no BFF proxy route** → checkout + client `apiFetch` 404 in prod
  if the infra proxy is misconfigured. Port `routes/api/[...path]/+server.ts`.
- No `+error.svelte` in `storefront` or `storefront-food` → unbranded 500s on any uncaught
  error.
- No empty-cart guard in checkout → user can advance through shipping/payment/confirm for
  an empty cart.
- Service worker caches every same-origin 200 GET incl. `/api/...` and **prices** with no
  TTL → stale pricing between deploys (`apps/storefront/src/service-worker.ts:39-43`).
- `window.alert()` in customer checkout flows (`storefront-food/.../checkout` ×4,
  `storefront/.../checkout/confirm` ×1) — blocks UI, inaccessible, loses orders.
- 16MB unreferenced images shipped to prod (`apps/frontend/static/logo_backup.png` 5MB +
  `pdf_page_*.png` ~11MB); 2.25MB `logo.png` + 5MB storefront logo served on every page
  → destroys LCP.
- Server sourcemaps shipped in prod Docker images (394 `.map` files) — leak + bloat.
- Dev dependencies shipped to prod in all 4 frontend Docker images (no `--prod`/`prune`).
- `storefront-food` has zero SEO meta, no sitemap, no robots; `frontend` has no OG/Twitter/
  canonical; duplicate `<title>` in `app.html`.
- No i18n system; `lang="en"` hardcoded in all 4 `app.html` → blocks non-English (Arabic)
  tenant stores, WCAG 3.1.1 violation.
- Customer detail page shows stale data after save (`$derived` needed).

---

## What is genuinely solid (verified by the agents)

- Zod `strictObject()` on every route body; no mass-assignment of `storeId`/`role`.
- `storeId` from JWT in merchant + customer scopes; consistent storeId filtering across
  sampled repos (the gaps are specific: upload delete, checkout cart clear).
- JWT in httpOnly+signed+sameSite=strict cookies; refresh rotation Redis-revocable; JWT
  secret min 32; MFA 8-digit + HMAC + `crypto.randomInt` + `timingSafeEqual`.
- Payment config AES-256-GCM at rest; legacy plaintext rejected; key required in prod.
- Webhook signature verified with `timingSafeEqual` before side effects.
- Server-side pricing in the *customer* checkout flow via `pricingService` (the bug is the
  *public/food* + COD paths bypass it).
- Order number generation: `Date.now(36)` + random + unique constraint + 23505 retry.
- Coupon *global* usage limit is atomic; return quantity vs purchased is enforced.
- File upload magic-byte verification, size cap, folder allowlist, UUID filenames (the gap
  is the delete storeId check).
- CSRF double-submit on all mutating routes; `csrf.checkOrigin` enabled in all apps.
- CI runs lint+typecheck+security checks+tests+build+5-image docker build on PRs; CodeQL
  weekly; deploy requires `Spaceship` environment.
- Health `/health` auth-free + cheap; `/health/ready` checks DB+Redis+pool; Sentry PII
  scrubbing reasonable; pino redacts secrets.
- No Stripe secret keys in frontend; BFF pattern fundamentally sound; no secrets in git.

---

## Recommended remediation plan

This is a multi-PR effort. Suggested order (P0s first, highest blast radius first):

### Phase A — Money & tenant integrity (P0s, ~1–2 days)
1. M2 + M3 — webhook inventory check + atomic idempotency (prevents oversell + double-fulfill)
2. M1 + M5 — COD + public/food order route through `pricingService` (decimal + stock check + decrement)
3. M4 — wire return→refund + inventory restore (currently fictional refunds)
4. S1 — upload delete storeId check (one-line, high blast radius)
5. S2 — webhook SSRF guard
6. M-adjacent P1s: M1 (cancel stock inflate), M2 (pay-for-other-order), M3 (cart clear storeId)

### Phase B — Custom-domain feature (P0s, ~2–3 days, dedicated effort)
1. D1 — `findByDomain` includes `customDomain` (unblocks the feature)
2. D2 — restrict subdomain fallback to platform suffixes (kills cross-tenant routing)
3. D5 — gate Caddy route on `verified/live`; D6 — route to storefront upstream
4. D3 + D12 — on-demand TLS with `ask` endpoint; tie `live` to real TLS
5. D4 — verification polling actually retries (`throw`)
6. D7 — bind Caddy admin to localhost; D8 — strip/ignore client `X-Store-Domain`
7. D9/D10/D11 — cache invalidation, claim race tx, idempotent Caddy mutations

### Phase C — Deploy & infra (P0s, ~1 day)
1. I1 — `deploy-remote.sh` preserves full env key set (+ diff guard)
2. I2 — write `CORS_ORIGINS` + prod `superRefine`
3. I-adjacent P1s: log rotation, resource limits, Redis AOF, shutdown order+timeout,
   `API_BASE_URL=https://$API_DOMAIN`, migrate timeout, off-host backups

### Phase D — Frontend P0/P1 (~1–2 days)
1. F1 + proxy Secure stripping + storefront hook defaults (auth cookie `Secure` in prod)
2. `mfaToken` leak; wishlist auth check; `storefront-food` BFF proxy; `+error.svelte`;
   empty-cart guard; service-worker API caching; `alert()` → inline errors; image bloat;
   sourcemaps + prod-only deps in Docker images.

### Phase E — SEO / a11y / consistency (P1, ~1 day)
1. `storefront-food` SEO + sitemap + robots; `frontend` OG/canonical; `lang` per-store;
   i18n foundation; `storefront-food` parity with `storefront`.

### Phase F — Defense-in-depth (P2, backlog)
RLS; refresh-token reuse detection; API-key scoping; MFA-disable password re-verify;
rate-limit `NODE_ENV` guard; remove `COOKIE_SECRET` default.

---

## Reference
- `docs/audit/audit_2026_06_26_production_readiness.md` — the (over-optimistic) prior report
- `docs/audit/audit_2026_06_02.md` — predecessor 52-finding audit (known findings)
- Domain module: `apps/backend/src/modules/domain/`, `apps/backend/src/services/caddy.service.ts`,
  `apps/backend/src/jobs/domainVerificationProcessor.ts`, `Caddyfile*`
- Verified by hand 2026-06-26: P0-D1 (`store.repo.ts:18-23`), P0-D2 + P1-D8 (`scopes/public.ts:51-80`)
---

## Remediation Status — 2026-06-26 (branch `fix/domain-feature-p0`)

All **15 P0s** implemented and verified (typecheck 0 errors, lint clean, 828/828
backend tests, security invariants pass). One PR.

### Phase B — Custom-domain feature (7 P0s, DONE)
- D1 `store.repo.findByDomain` matches `customDomain` too
- D2/D8 public scope + auth.helpers: `X-Store-Domain` only from private IPs;
  subdomain fallback only for platform hosts (no spoofing)
- D3 on-demand TLS `ask` endpoint + `Caddyfile.domain` global `on_demand_tls`
- D4 verification processor throws on not-verified → BullMQ retries (was silent)
- D5 add-custom-domain no longer registers a Caddy route prematurely
- D6 `caddy.service` idempotent route upsert/delete + `ensureOnDemandTlsPolicy`
- D7 admin API bound to `127.0.0.1:2019`
- D9/D10/D11/D12 cache invalidation, unique-violation → DOMAIN_ALREADY_TAKEN,
  idempotent Caddy mutations, go-live on DNS-verified

### Phase A — Money / integrity (5 P0s + coupled P1-M1, DONE)
- M1 COD intent decrements inventory atomically (0-row → INSUFFICIENT_INVENTORY)
- M2 webhook detects 0-row oversell → logs + completes payment (customer already
  charged; no silent no-op, no infinite retry)
- M3 `transitionPaymentToCompleted` atomic status guard — duplicate/replayed
  webhooks can never double-decrement stock
- M4 return→`refunded` issues provider refund (return-derived idempotency key
  `refund-<returnId>`) + restores inventory; skips provider refund for COD / no
  payment; `transitionStatus` guards concurrent duplicate refunds
- M5 public food order: integer-cent pricing (no float), stock pre-check, COD
  intent created so the food storefront's COD path reserves stock; orphan order
  cancelled on intent failure
- P1-M1 cancel no longer restores inventory for unpaid orders (decrement-at-payment
  model — unpaid orders reserved nothing; paid orders use return/refund)

### Phase C — Deploy & infra (2 P0s, DONE)
- I1 `deploy-remote.sh` preserves operator env keys (SENTRY/RESEND/S3/STRIPE/…)
  across redeploys — only managed keys rewritten
- I2 `CORS_ORIGINS` written by deploy script (passed from CI) + required by
  `env.ts` prod `superRefine`

### Phase D — Frontend (1 P0, DONE)
- F1 auth cookies keep `Secure` in production: `shared-utils/forwardCookies`,
  dashboard + storefront BFF proxy routes strip `Secure` only in dev

### Remaining (not in this PR)
Phase C-adjacent P1s, Phase D P1s, Phase E (SEO/a11y), Phase F (RLS / defense-in-depth)
are tracked in the plan above and remain open.

### Honest caveat
Caddy on-demand TLS config + admin API automation policy are correct per Caddy v2
docs but need runtime verification on the deploy host (cannot test Caddy locally).
