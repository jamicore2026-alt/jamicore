# jamicore vs RealWorld + 2025-2026 SaaS Best Practices — Full Audit

**Date:** 2026-05-22
**Methodology:** Codebase exploration + web research on RealWorld spec & 2025-2026 SaaS best practices

---

## Executive Summary

jamicore is an **impressively complete** multi-tenant headless e-commerce SaaS. With 52 DB tables, ~39 modules, 4 auth scopes, 828 passing tests, and full CI/CD, it exceeds the RealWorld spec in scope by 10×. However, compared to 2025-2026 production SaaS best practices, there are **6 gaps** that are critical for production maturity.

| Category | Score | Grade |
|---|---|---|
| Auth & Security | 7.5/10 | B+ |
| Multi-Tenancy & Isolation | 9/10 | A |
| Observability | 4/10 | D |
| Reliability & Resilience | 5/10 | C |
| API Maturity | 8/10 | B+ |
| DevOps & Deployment | 6/10 | C+ |
| Testing | 7/10 | B |
| Commerce Features | 9.5/10 | A+ |
| **Overall** | **7.0/10** | **B** |

---

## Part 1: jamicore vs RealWorld Spec

### What RealWorld Has (Medium.com clone)

| Feature | RealWorld | jamicore |
|---|---|---|
| JWT Auth | Yes | Yes (+ 4 scopes, rotation, revocation) |
| User CRUD | Yes | Yes (customer + merchant + staff + admin) |
| Articles CRUD | Yes | CMS module equivalent |
| Comments | Yes | Reviews module equivalent |
| Favorites | Yes | Wishlist module equivalent |
| Follow Users | Yes | Not implemented |
| Tags | Yes | Categories + SEO tags |
| Pagination | Yes | Yes (all list endpoints) |
| OpenAPI Spec | Yes (3.1) | Yes (Swagger UI) |
| E2E Tests | Yes (Playwright) | Yes (Playwright) |
| RBAC | No (single user role) | Yes (4 scopes + staff roles) |
| Multi-tenancy | No | Yes (full tenant isolation) |
| Billing | No | Yes (Stripe + plan system) |
| API Keys | No | Yes (SHA-256 hashed) |

**Verdict:** jamicore is a superset of RealWorld in every dimension except "follow users" (not relevant for e-commerce).

### RealWorld Quality Standards jamicore Meets

- [x] JWT auth with proper expiration
- [x] Request validation (Zod strictObject)
- [x] Error handling with proper HTTP codes
- [x] Pagination on list endpoints
- [x] E2E tests with Playwright
- [x] OpenAPI/Swagger documentation
- [x] No `any` types (TypeScript strict)
- [x] Proper status codes (401 vs 403 vs 404)

### RealWorld Quality Standards jamicore Exceeds

- [x] Multi-tenancy with tenant isolation on every query
- [x] Server-side pricing (never trust client)
- [x] Atomic inventory with race condition guards
- [x] CSR + CSRF protection
- [x] Encrypted payment provider configs
- [x] Webhook signature verification
- [x] Idempotency keys on payment operations
- [x] Structured logging with PII redaction

---

## Part 2: Gaps vs 2025-2026 Production SaaS Best Practices

### P0 — Critical (Must Fix Before Enterprise Launch)

#### 1. No MFA/2FA (PCI DSS v4.0 Compliance Gap)

**Status:** MISSING
**Standard:** PCI DSS v4.0 mandates MFA for all admin access to cardholder data environments as of **March 31, 2025**.
**Current:** No TOTP, no FIDO2/WebAuthn, no passkey support. Both merchant dashboard admins and superAdmins have zero MFA.
**Impact:** Compliance failure. Audit finding. Liability in breach scenarios.
**Fix:** Add TOTP-based MFA for merchant staff + superAdmin logins. Store TOTP secrets encrypted. Enforce on login.

Sources:
- [PCI DSS v4.0 MFA Requirements](https://mojoauth.com/blog/2025-threats-and-strategies-for-securing-user-authentication-in-ecommerce/)

---

#### 2. Rate Limiting is Per-IP, NOT Per-Tenant + In-Memory

**Status:** PARTIAL (in-memory, per-IP only)
**Standard:** Production SaaS must have per-tenant rate limits with Redis-backed storage. Tenant A's traffic must never impact Tenant B.
**Current:** `@fastify/rate-limit` uses in-memory storage (not Redis). Key is `${ip}:${tier}` — no tenant dimension. Multiple backend instances don't share rate limit state. If Tenant A gets DDoS'd, all tenants on the same IP (e.g., behind Caddy) share the rate limit bucket.
**Impact:** Noisy-neighbor problem. Multi-instance deployments have incorrect rate limiting.
**Fix:** Migrate to `@fastify/rate-limit` with Redis store. Add `storeId` to the rate limit key when available. Add rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).

Sources:
- [SaaS API Rate Limiting + OpenTelemetry per-tenant Monitoring](https://oneuptime.com/blog/post/2026-02-06-saas-api-rate-limiting-quota-opentelemetry/view)

---

#### 3. No Distributed Tracing (OpenTelemetry)

**Status:** MISSING
**Standard:** Production services in 2025-2026 ship with OTLP export for distributed tracing. Correlation IDs must span from edge → origin → third party.
**Current:** Sentry for errors only. No tracing. `requestId` is generated (UUID v4) and logged, but never propagated to downstream services or external APIs.
**Impact:** Cannot debug latency issues across services. Cannot trace a checkout request through cart → payment → email → webhook pipeline. Blind to third-party API latency (Stripe, Resend).
**Fix:** Add `@opentelemetry/sdk-node` with auto-instrumentation for Fastify, ioredis, pg. Export to OTLP collector. Inject trace context into BullMQ job headers. Propagate `traceparent` header to Stripe/Resend API calls.

Sources:
- [CNCF Cost-Effective Observability with OpenTelemetry (2025)](https://www.cncf.io/blog/2025/12/16/how-to-build-a-cost-effective-observability-platform-with-opentelemetry/)
- [Multi-Tenancy in OpenTelemetry](https://oneuptime.com/blog/post/2026-01-24-multi-tenancy-opentelemetry/view)

---

#### 4. No Circuit Breaker for External Dependencies

**Status:** MISSING
**Standard:** Any service that calls external APIs (Stripe, Resend, S3) must have circuit breakers. Open circuit → fail fast with 503 + Retry-After.
**Current:** If Stripe API hangs for 30 seconds, every checkout request hangs for 30 seconds. No timeout configured on external HTTP calls. No circuit breaking.
**Impact:** Cascading failure. One degraded external dependency takes down the entire checkout flow.
**Fix:** Add `opossum` (Node.js circuit breaker) wrapping Stripe, Resend, and S3 calls. Configure: failure threshold 50%, reset timeout 30s, fallback to graceful degradation.

Sources:
- [STOA SaaS Production Checklist — 20 Gates Before Go-Live](https://docs.gostoa.dev/blog/saas-playbook-5-production-checklist)

---

### P1 — High Priority (SaaS Maturity)

#### 5. No Feature Flags

**Status:** MISSING
**Standard:** Feature flags with OpenFeature SDK + per-tenant targeting + OTel span attribution.
**Current:** No GrowthBook, LaunchDarkly, or even env-var-based feature flags. Every deploy is all-or-nothing.
**Impact:** Cannot do canary releases. Cannot do percentage rollouts. Cannot enable features per-tenant. Buggy release → full rollback with downtime.
**Fix:** Integrate GrowthBook (open-source) or OpenFeature SDK. Flag categories: plan-based (feature gating by plan tier), percentage rollout, per-tenant override. Add `feature_flag.{key}` as span attribute in traces.

Sources:
- [Feature Flag Impact on Performance with OpenTelemetry](https://oneuptime.com/blog/post/2026-02-06-feature-flag-performance-opentelemetry/view)

---

#### 6. No Load/Performance Testing

**Status:** MISSING
**Standard:** k6 or artillery scripts in CI. Capacity tested at 2× expected peak load. Performance regression on each PR.
**Current:** No load testing framework anywhere in the repo. No documented capacity limits. No performance regression budget.
**Impact:** Unknown breaking point. First Black Friday sale = discovery of bottlenecks in production.
**Fix:** Add k6 load test scripts. Run in CI (non-blocking initially). Define SLOs: checkout p99 < 500ms, product list p95 < 200ms. Test at 2× capacity.

Sources:
- [SaaS Reliability Engineering for Retail Peak Usage Windows](https://sysgenpro.com/cloud/saas-reliability-engineering-for-retail-platforms-managing-peak-usage-windows)

---

#### 7. No OAuth/Social Login or Passwordless Auth

**Status:** MISSING
**Standard:** OAuth2 (Google, Apple, GitHub) + magic link + passkey/WebAuthn options.
**Current:** Email + password only. No social login, no magic links, no passkeys.
**Impact:** Higher cart abandonment at registration. Lower conversion for mobile shoppers.
**Fix:** Add Google OAuth first (highest adoption). Add magic link login as passwordless option. Add WebAuthn/passkey for modern browsers.

---

#### 8. No SLOs or Alerting

**Status:** MISSING (monitoring exists but incomplete)
**Standard:** Error rate alerting (>1% for 2 minutes = page). p99 latency SLOs per endpoint. Per-tenant dashboards.
**Current:** Prometheus + Grafana exist in separate `docker-compose.monitoring.yml`. Only scrapes `/health/metrics` (uptime + memory + DB pool). No application-level metrics (request rate, error rate, latency histograms). No alerting rules. No on-call runbook. Not part of production deploy.
**Impact:** No awareness of production issues until users report them.
**Fix:** Add `prom-client` for custom application metrics (request duration histograms, error counters, active cart count, checkout funnel). Define SLOs for checkout, order creation, product search. Add Grafana alerting rules. Merge monitoring into production docker-compose. Write on-call runbook covering: gateway restart, rollback, tenant incident investigation, DB unreachability.

---

### P2 — Enhancement (Competitive Advantage)

#### 9. Idempotency Only on Payments

**Status:** PARTIAL
**Standard:** All mutating endpoints accept `Idempotency-Key` header. Stripe docs recommend this for all financial operations.
**Current:** Only `payment.service.ts` uses idempotency. Order creation, cart mutations, coupon application, and returns don't have idempotency protection.
**Impact:** Network retries can create duplicate orders, double coupon usage, or duplicate return requests.
**Fix:** Add `Idempotency-Key` header support to all POST/PATCH endpoints. Store key → response mapping in Redis with TTL.

---

#### 10. No Dedicated Cross-Tenant Isolation Tests

**Status:** MISSING
**Standard:** Explicit tests verifying Tenant A cannot read/write/access Tenant B's data.
**Current:** Tenant isolation is in every query (via `storeId` from JWT), but there are no explicit tests that try to break it. Relies entirely on code review to catch missing `storeId` filter.
**Impact:** A single missing `storeId` WHERE clause = cross-tenant data leak. Current approach is correct but fragile.
**Fix:** Add `crossTenant.test.ts` that creates two stores, authenticates as each, and verifies 401/404 on cross-tenant access for all resources (products, orders, customers, coupons, etc.).

---

#### 11. No Data Residency Controls

**Status:** MISSING
**Standard:** Infrastructure-level enforcement of data location. Critical for GDPR + Middle East data sovereignty laws.
**Current:** No mechanism to pin a tenant's data to a specific region. S3 bucket is single-region.
**Impact:** Cannot serve EU + MENA customers with different data residency requirements.
**Fix:** Add `region` field to store. Route tenant data to region-specific DB + S3 based on store.region.

---

#### 12. @fastify/rate-limit In-Memory Storage

**Status:** BUG (for multi-instance deploys)
**Standard:** Production rate limiters must use shared storage (Redis) for multi-instance correctness.
**Current:** `@fastify/rate-limit` defaults to in-memory Map. If you scale to 3 backend instances, each has its own counter. A user making 5 login attempts across 3 instances gets 15 attempts instead of 5.
**Impact:** Rate limiting is effectively disabled in horizontally-scaled deployments.
**Fix:** Add `redis` store to `@fastify/rate-limit` config. Already have Redis available.

---

#### 13. No API Versioning Strategy

**Status:** MISSING
**Standard:** `/api/v1/` is current. Deprecation headers (`Sunset`, `Deprecation`) on old versions. Documented migration timeline.
**Current:** No `/api/v2/` exists, but also no documented versioning policy. When breaking changes are needed, there's no pattern for coexisting old + new APIs during migration.
**Impact:** Breaking API change → forced migration for all tenants simultaneously.
**Fix:** Document API versioning policy. Add `Api-Version` response header. Plan deprecation timeline: v1 deprecated → v1 + v2 coexist for 6 months → v1 removed.

---

#### 14. No Database Backup Automation

**Status:** PARTIAL
**Standard:** Automated pg_dump with scheduling, integrity verification, off-site storage, and tested restore procedure.
**Current:** `backupService` exists but references manual backup. Deploy script does a backup before deploy. No automated scheduled backups, no integrity verification, no off-site replication, no documented restore test.
**Impact:** Manual backup = human error risk. No backup during quiet periods (no deploy = no backup).
**Fix:** Add `pg_dump` cron job (BullMQ recurring job). Verify backup integrity after dump. Replicate to S3 (different bucket/region). Document and test restore procedure quarterly.

---

#### 15. Frontend RUM (Real User Monitoring)

**Status:** MISSING
**Standard:** Frontend error tracking + Web Vitals (LCP, CLS, INP) + performance monitoring.
**Current:** No frontend error tracking. No performance monitoring for SvelteKit apps.
**Impact:** Blind to frontend crashes, slow page loads, or JS errors in production.
**Fix:** Add Sentry browser SDK to dashboard + storefront. Track Web Vitals. Set up alerting on frontend error rate.

---

## Part 3: What jamicore Gets RIGHT (Recognitions)

### Enterprise-Grade Security (Already Implemented)

| Pattern | Status |
|---|---|
| Tenant isolation on every DB query | Perfect |
| Server-side pricing (zero trust client) | Perfect |
| Atomic inventory with race condition guards | Perfect |
| Payment config AES-256-GCM encryption | Perfect |
| Webhook signature verification (timingSafeEqual) | Perfect |
| JWT rotation + revocation + Redis-backed refresh | Perfect |
| CSRF double-submit cookie | Perfect |
| PII redaction in logs | Perfect |
| Error handler: production hides 500 messages | Perfect |
| API key hashing (raw key returned only once) | Perfect |
| httpOnly + secure + sameSite strict cookies | Perfect |
| Store status + plan expiry checks on every request | Perfect |

### Architecture Quality

- 4 auth scopes with clean encapsulation
- Scope-per-prefix routing (`/api/v1/public`, `/api/v1/merchant`, etc.)
- Service layer decoupled from HTTP (repo → service → route pattern)
- BullMQ for all async work (email, images, webhooks, notifications, analytics, abandoned cart)
- Structured logging with Pino + request ID correlation
- DB migrations run automatically on startup (Drizzle)
- Proper SIGTERM graceful shutdown (close queues → close Fastify → close DB)

### DevOps

- Real CI: lint + typecheck + security checks + test + build + docker validate
- DB in CI uses real postgres:17 + redis:7 (no mocking)
- 828 tests passing, 37 test files
- Docker multi-stage builds
- GHCR container registry
- Caddy with HSTS, CSP, X-Frame-Options, X-Content-Type-Options, rate limiting
- Health check with DB pool saturation detection

---

## Part 4: Prioritized Improvement Roadmap

### Phase 1: Production Hardening (2-3 weeks)

| # | Task | Effort |
|---|---|---|
| 1 | MFA/TOTP for merchant staff + superAdmin | Medium |
| 2 | Redis-backed rate limiting with per-tenant keys | Small |
| 3 | Circuit breaker for Stripe/Resend/S3 HTTP calls | Small |
| 4 | OpenTelemetry auto-instrumentation (Fastify, Redis, PG) | Medium |

### Phase 2: SaaS Maturity (2-3 weeks)

| # | Task | Effort |
|---|---|---|
| 5 | Feature flags (GrowthBook self-hosted or OpenFeature + Redis) | Medium |
| 6 | Define SLOs + add prom-client metrics + Grafana alerting | Medium |
| 7 | k6 load test scripts + CI integration | Small |
| 8 | Google OAuth social login | Medium |
| 9 | Idempotency-Key on all mutating endpoints | Medium |

### Phase 3: Enterprise Readiness (3-4 weeks)

| # | Task | Effort |
|---|---|---|
| 10 | Cross-tenant isolation test suite | Medium |
| 11 | Automated DB backup + off-site replication + restore testing | Medium |
| 12 | API versioning policy + headers | Small |
| 13 | Data residency (region field + region-aware routing) | Large |
| 14 | Frontend RUM (Sentry browser SDK + Web Vitals) | Small |
| 15 | On-call runbook + incident response plan | Medium |

---

## Part 5: Comparison Matrix (jamicore vs RealWorld vs Shopify)

| Capability | jamicore | RealWorld | Shopify Plus |
|---|---|---|---|
| Multi-tenancy | Full | None | Full |
| RBAC | 4 scopes + staff roles | 1 role | Full RBAC |
| API Keys | SHA-256 + scopes | None | Yes |
| MFA/2FA | ❌ | ❌ | Full |
| OAuth Login | ❌ | ❌ | Yes |
| Distributed Tracing | ❌ | ❌ | Partial |
| Feature Flags | ❌ | ❌ | Limited |
| Circuit Breakers | ❌ | ❌ | Built-in |
| Per-Tenant Rate Limit | ❌ | N/A | Vendor-managed |
| Server-Side Pricing | ✅ | N/A | ✅ |
| Atomic Inventory | ✅ | N/A | ✅ |
| GDPR/DSAR | ✅ | ❌ | ✅ |
| Prometheus + Grafana | ✅ (optional) | ❌ | (Internal only) |
| E2E Tests | ✅ | ✅ | (Internal) |
| Load Testing | ❌ | ❌ | (Internal) |
| Canary Deploy | ❌ | ❌ | Internal |
| Webhook System | ✅ | ❌ | ✅ |
| 30+ Commerce Modules | ✅ | ❌ | ✅ |

---

## Conclusion

**jamicore is a B-grade production SaaS that needs 6 critical fixes to reach A-grade.**

The core is solid: security, tenant isolation, pricing integrity, and commerce features are all well-implemented. The gaps are in operational maturity — observability, resilience engineering, authentication modernization, and deployment sophistication.

The good news: the architecture is clean enough that all 15 fixes are additive, not restructuring. Each can be implemented independently without touching core business logic.

**Recommended first action:** Implement Phase 1 (MFA + Redis rate limiting + circuit breaker + OTel) before accepting merchant payments in production.

---

*Auditor: Claude*
*Date: 2026-05-22*
*Sources: RealWorld spec (realworld-apps/realworld), STOA SaaS Playbook, CNCF OTel blog, PCI DSS v4.0, OneUptime multi-tenant guides*
