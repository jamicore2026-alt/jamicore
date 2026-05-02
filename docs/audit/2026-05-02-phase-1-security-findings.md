# Phase 1: Security Audit Findings

**Date:** 2026-05-02
**Scope:** Backend (Fastify), Storefront (SvelteKit), Dashboard (SvelteKit), Super-Admin (SvelteKit)
**Methodology:** Static analysis (grep patterns) + Deep file review of critical paths (auth, payments, webhooks, uploads, scopes, CSRF, CORS, CSP)
**Classification:** P0 = Exploitable flaw / data loss / payment fraud, P1 = Missing validation / defense gap / partial breakage, P2 = Code smell / config weakness

---

## P0 Findings (Critical)

### S-01: Path Traversal in Upload `deleteImage`
- **File:** `apps/backend/src/modules/upload/upload.service.ts:132-148`
- **Severity:** P0
- **Description:** `deleteImage(url)` extracts a filename from the URL using `new URL(url, 'http://localhost').pathname`, then strips `/uploads/` prefix with `replace('/uploads/', '')`. An attacker can pass a URL like `/uploads/../../etc/passwd` which passes the route-level `startsWith('/uploads/')` check, and then `join(LOCAL_UPLOADS_DIR, '../../etc/passwd')` resolves outside the uploads directory. In S3 mode, the attacker-controlled path is used as the S3 Object Key.
- **Impact:** Arbitrary file deletion on the server filesystem (local mode) or arbitrary S3 object deletion (S3 mode).
- **Recommendation:** After extracting the path, validate that it contains no `..` segments, resolve it to an absolute path, and verify it still starts with `LOCAL_UPLOADS_DIR`. For S3, validate the key against an allowlist regex or ensure it starts with an allowed prefix.

---

## P1 Findings (High)

### S-02: CSRF Token Uses Predictable `crypto.randomUUID()`
- **File:** `apps/backend/src/lib/csrf.ts:10-11`
- **Severity:** P1
- **Description:** `generateCsrfToken()` uses `crypto.randomUUID()`. On Node.js versions prior to 19, `randomUUID()` may use a non-cryptographically-secure PRNG. Even on newer versions, UUID v4 has only 122 bits of entropy and a known structure (fixed version/variant bits). CSRF tokens should use `crypto.randomBytes(32).toString('base64')` for full CSPRNG entropy.
- **Impact:** CSRF tokens are more predictable than necessary, weakening CSRF protection.
- **Recommendation:** Replace with `crypto.randomBytes(32).toString('base64')` or `crypto.randomBytes(16).toString('hex')`.

### S-03: `/auth/refresh` Exempt from CSRF Validation
- **File:** `apps/backend/src/lib/csrf.ts:27-41`
- **Severity:** P1
- **Description:** The refresh token endpoint is in the CSRF exempt list (`/auth/refresh`). Refresh token rotation is a mutating operation that issues new access + refresh credentials. While the refresh token is httpOnly, a CSRF attack on refresh can extend an attacker's session window or rotate tokens out from under the legitimate user.
- **Impact:** Attacker can force token rotation via CSRF, potentially causing session synchronization issues or extending attack windows.
- **Recommendation:** Remove `/auth/refresh` from the CSRF exempt list. All mutating requests that issue credentials should require CSRF validation.

### S-04: SuperAdmin Scope Lacks RBAC — Any Admin Can Access All Routes
- **File:** `apps/backend/src/scopes/superAdmin.ts`
- **Severity:** P1
- **Description:** The superAdmin scope sets `request.adminRole = decoded.role` but there is no `requirePermission` equivalent or role checks on any super-admin route. Every authenticated super-admin (including a hypothetical `support` or `billing` role) has full access to merchant deletion, plan management, revenue data, audit logs, and staff management.
- **Impact:** If a lower-privilege admin account is compromised, the blast radius is the entire platform.
- **Recommendation:** Implement a `requireAdminRole(...roles[])` preHandler hook and apply it to sensitive routes (e.g., merchant deletion, plan changes, revenue, staff deletion).

### S-05: CORS `credentials: true` with Wildcard Subdomain Patterns
- **File:** `apps/backend/src/plugins/cors.ts:42-53`
- **Severity:** P1
- **Description:** The CORS plugin allows wildcard subdomain patterns (`*.myplatform.com`) with `credentials: true`. If an attacker registers a subdomain (e.g., `evil.myplatform.com`) or compromises DNS/Subdomain takeover, they can make authenticated cross-origin requests from that origin.
- **Impact:** Authenticated requests can be made from attacker-controlled subdomains, enabling CSRF-like attacks across origins.
- **Recommendation:** Remove wildcard subdomain support for credentialed requests, or maintain an explicit allowlist of verified subdomains/domains in the database. Consider scoping CORS origins per-store.

### S-06: CSP `imgSrc` Allows Any `https:` Origin
- **File:** `apps/backend/src/plugins/helmet.ts:12`
- **Severity:** P1
- **Description:** The Content Security Policy allows images from ANY `https:` origin (`imgSrc: ["'self'", 'data:', 'https:']`). This significantly weakens XSS protection because an attacker can exfiltrate data via image tags pointing to arbitrary HTTPS endpoints.
- **Impact:** Data exfiltration via `<img>` tags in XSS payloads.
- **Recommendation:** Restrict `imgSrc` to the S3 bucket domain, storefront domain, and any known CDN domains. Use `https:` only as a temporary dev fallback.

### S-07: Webhook Signature Parameters Ignored in Payment Service Layer
- **File:** `apps/backend/src/modules/payment/payment.service.ts:523-632`
- **Severity:** P1
- **Description:** `handleRazorpayWebhook` and `handleStripeWebhook` receive `signature` and `rawBody` but prefix them with `_` (indicating unused). The route handlers (`payment.route.public.ts`) DO verify signatures before calling these functions, but the service layer itself does not verify. This is a defense-in-depth failure — if a future refactor calls the service directly (e.g., from a queue worker or new route), signatures will be silently skipped.
- **Impact:** Future code changes could introduce unverified webhook processing, leading to payment fraud.
- **Recommendation:** Move signature verification INTO the service layer functions, or add an assertion that fails if called without verified signatures.

### S-08: `findByDomain` Cache Missing — Tenant Resolution Vulnerable to DoS
- **File:** `apps/backend/src/scopes/public.ts:22-62`, `apps/backend/src/modules/auth/auth.route.customer.ts:13-45`
- **Severity:** P1
- **Description:** Tenant resolution calls `storeService.findByDomain()` on EVERY public request and on EVERY unauthenticated auth request (login/register). There is no caching of domain-to-storeId mapping. An attacker can flood the API with requests bearing random Host headers, causing repeated DB lookups and potential connection pool exhaustion.
- **Impact:** Denial of Service via connection pool exhaustion or degraded response times.
- **Recommendation:** Cache `findByDomain` results in Redis with a TTL (e.g., 5 minutes). Add a negative cache for non-existent domains.

### S-09: `console.error` in Dashboard `handleError` May Leak Sensitive Data
- **File:** `apps/dashboard/src/hooks.server.ts:97-101`
- **Severity:** P1
- **Description:** The dashboard's `handleError` logs the full error object to `console.error`. If an error contains stack traces with file paths, or if a downstream API error includes sensitive fields (tokens, PII), this will be written to server logs.
- **Impact:** Sensitive data leakage in server logs.
- **Recommendation:** Sanitize errors before logging. Do not log the full error object in production. Use a structured logger with PII redaction.

---

## P2 Findings (Medium/Low)

### S-10: JWT Cookie Not Signed by Fastify Cookie Plugin
- **File:** `apps/backend/src/plugins/jwt.ts:20-21`
- **Severity:** P2
- **Description:** The JWT cookie configuration sets `signed: false`. While the JWT token itself is cryptographically signed, the cookie envelope is not tamper-proofed by Fastify's cookie signing. This means cookies can be swapped between users on the same browser profile without detection at the cookie layer.
- **Impact:** Low — JWT signature verification will catch tampered payloads, but cookie swapping between same-device users is not prevented.
- **Recommendation:** Enable `signed: true` and configure a cookie secret.

### S-11: Encryption Library Retains Legacy Plaintext Fallback
- **File:** `apps/backend/src/lib/encryption.ts:42-44`
- **Severity:** P2
- **Description:** `decryptConfig` returns non-string inputs (legacy plaintext JSON objects) as-is without encryption. If any legacy plaintext payment provider configs still exist in the database, they remain unencrypted at rest.
- **Impact:** Payment keys may be stored in plaintext for legacy rows.
- **Recommendation:** Add a one-time migration to encrypt all legacy configs, then remove the plaintext fallback path.

### S-12: Public Scope Dev Fallback Could Leak in Misconfigured Production
- **File:** `apps/backend/src/scopes/public.ts:56-61`
- **Severity:** P2
- **Description:** If `NODE_ENV` is misconfigured or missing in a production deployment, the public scope falls back to the `techgear` store for all unmatched domains. This could expose the techgear store's data as a default.
- **Impact:** Data leakage if environment is misconfigured.
- **Recommendation:** Remove the dev fallback entirely or gate it behind an explicit `ALLOW_DEV_FALLBACK` env var.

### S-13: Missing `Strict-Transport-Security` Header in Frontend Apps
- **File:** `apps/storefront/src/hooks.server.ts:86-91`, `apps/dashboard/src/hooks.server.ts:88-93`
- **Severity:** P2
- **Description:** Both frontend apps set `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`, but omit `Strict-Transport-Security` (HSTS).
- **Impact:** Users may access the site over HTTP in production, enabling downgrade attacks.
- **Recommendation:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` in production.

### S-14: Helmet CSP Missing `connectSrc`, `fontSrc`, `frameSrc`, `mediaSrc`
- **File:** `apps/backend/src/plugins/helmet.ts:7-15`
- **Severity:** P2
- **Description:** The CSP directive list is minimal. Missing `connectSrc` (allows fetch/XHR to any origin), `fontSrc`, `frameSrc`, and `mediaSrc`.
- **Impact:** Weakened XSS/data-exfiltration protection.
- **Recommendation:** Expand CSP directives to cover all resource types used by the frontend.

### S-15: Rate Limiting Completely Disabled in Test Environments
- **File:** `apps/backend/src/plugins/rateLimit.ts:51-53`
- **Severity:** P2
- **Description:** Rate limiting is skipped unless `NODE_ENV === 'production'` or `FORCE_RATE_LIMIT` is set. Test and staging environments may miss rate limit regressions.
- **Impact:** Rate limit bugs may not be caught in CI.
- **Recommendation:** Enable rate limiting in staging by default, or add E2E tests that specifically verify rate limiting behavior.

### S-16: `resendVerification` Does Not Check Merchant Verification Status
- **File:** `apps/backend/src/modules/auth/auth.service.ts:369-386`
- **Severity:** P2
- **Description:** `resendVerification` checks if a customer is already verified, but does not perform the same check for merchants (`userType === 'merchant'`).
- **Impact:** Unnecessary verification emails for already-verified merchants.
- **Recommendation:** Add a merchant verification check before generating a new token.

### S-17: Webhook Delivery Lacks Deduplication / Idempotency
- **File:** `apps/backend/src/modules/webhook/webhook.service.ts:43-54`
- **Severity:** P2
- **Description:** Webhook dispatch is fire-and-forget with no deduplication key. If the receiver is slow and the connection times out (after 30s), the receiver may still process the request. We don't retry, but other events could trigger duplicate deliveries.
- **Impact:** Receivers may receive duplicate webhook events.
- **Recommendation:** Add an `eventId` (unique per event occurrence) to webhook payloads so receivers can deduplicate.

### S-18: `superAdminRepo.deleteStaff` Has No StoreId Filter
- **File:** `apps/backend/src/modules/superAdmin/superAdmin.repo.ts:508-510`
- **Severity:** P2
- **Description:** The `deleteStaff` repo function deletes a user by `userId` alone, without filtering by `storeId`. The service layer (`superAdminService.removeStaff`) does check for OWNER role, but a direct repo call or future refactor could bypass cross-store isolation.
- **Impact:** Potential cross-store user deletion if called directly.
- **Recommendation:** Add `eq(users.storeId, storeId)` to the delete condition, or remove `deleteStaff` from the public repo interface and enforce service-layer usage only.

---

## Regression Check (Previous Audits)

| Previous Finding | Status | Notes |
|------------------|--------|-------|
| JWT verify before store status check | **Fixed** | `scopes/customer.ts`, `scopes/merchant.ts` now check store status AFTER jwtVerify |
| Plaintext payment keys in DB | **Fixed** | `encryptConfig` / `decryptConfig` in use; legacy fallback remains (S-11) |
| Order number collision | **Fixed** | `generateOrderNumber()` uses `Date.now()` prefix + `crypto.randomBytes(4)`; retry logic exists |
| Atomic inventory decrement | **Fixed** | `order.service.ts:144-171` uses transaction with `sql`${products.currentQuantity} >= ${quantity}`` |
| Race condition in coupon usage | **Fixed** | `order.service.ts:181-195` increments inside transaction with limit check |
| Refresh token rotation | **Fixed** | Redis-backed rotation implemented in all scopes |

---

## Summary

| Severity | Count |
|----------|-------|
| P0 | 1 |
| P1 | 8 |
| P2 | 9 |
| **Total** | **18** |

**Immediate action required:** S-01 (Path Traversal) must be fixed before any production deployment with file upload/delete enabled.
