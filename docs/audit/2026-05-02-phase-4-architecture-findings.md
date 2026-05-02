# Phase 4: Architecture & Developer Experience Audit Findings

**Date:** 2026-05-02
**Scope:** Monorepo structure, CI/CD, API design, observability, dev workflow, frontend architecture, accessibility
**Methodology:** CI/CD file review, Docker config review, root package.json analysis, Fastify bootstrap review, frontend package.json review, accessibility component audit
**Classification:** P1 = Structural risk / dev workflow blocker / observability gap, P2 = DX friction / incomplete automation / future debt

---

## P1 Findings (High)

### A-01: Unpinned GitHub Actions — Supply Chain Risk
- **Files:** `.github/workflows/ci.yml:42`, `.github/workflows/e2e.yml:41`, `.github/workflows/build-images.yml:12`
- **Severity:** P1
- **Description:** All GitHub Actions workflows use floating tags (`actions/checkout@v4`, `actions/setup-node@v4`, `docker/setup-buildx-action@v3`, etc.) rather than immutable commit SHAs. The YAML files contain literal TODO comments: `# TODO: pin to commit SHA for supply-chain security`. A compromised action publisher (or a supply-chain attack on a popular action) could inject malicious code into the build pipeline without changing the tag.
- **Impact:** Supply chain compromise risk. CI builds are a high-value target for injecting backdoors into production images.
- **Recommendation:** Pin every third-party action to a specific commit SHA with a comment noting the human-readable version. Example: `uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`.

### A-02: Request ID Propagation via Unsafe Type Cast
- **File:** `apps/backend/src/index.ts:69`
- **Severity:** P1
- **Description:** The request ID hook sets `(request as unknown as Record<string, string>).requestId = requestId`. This bypasses TypeScript entirely and relies on a double-cast to an arbitrary Record type. Fastify provides a proper decoration mechanism (`fastify.decorateRequest`) that gives type-safe access on the request object.
- **Impact:** Type safety regression. Future refactors may break runtime behavior silently because TypeScript cannot track this property. Other hooks or plugins that read `request.requestId` must also use unsafe casts.
- **Recommendation:** Use `fastify.decorateRequest('requestId', { getter: () => '' })` and declare the property in a module augmentation file so all consumers get type-safe access.

### A-03: No Frontend Environment Schema Validation
- **Files:** `apps/storefront/package.json`, `apps/dashboard/package.json`
- **Severity:** P1
- **Description:** The backend validates every environment variable at startup with Zod (`apps/backend/src/config/env.ts`). The storefront and dashboard apps read `import.meta.env` / `process.env` directly without validation. A missing `PUBLIC_API_BASE_URL` or misconfigured `PUBLIC_STRIPE_KEY` will cause runtime failures in production that could have been caught at build or startup time.
- **Impact:** Silent configuration failures in production, harder debugging, and potential exposure of dev-only values.
- **Recommendation:** Add a `src/lib/config/env.ts` in both frontend apps that validates required public env vars with Zod at module load time. Fail fast on missing or invalid configuration.

### A-04: No Structured Log Redaction
- **File:** `apps/backend/src/index.ts:49-54`
- **Severity:** P1
- **Description:** The Pino logger configuration does not include a `redact` key list. Fastify's default request logger serializes `req.body`, and custom hooks log `request.body` or route parameters. Passwords, JWT tokens, payment provider secrets, or customer PII may be written to stdout/stderr and forwarded to log aggregation systems.
- **Impact:** Sensitive data leakage in logs. Compliance risk (PCI-DSS, GDPR) if payment or personal data appears in plaintext log streams.
- **Recommendation:** Add Pino `redact` configuration for fields like `req.headers.authorization`, `req.body.password`, `req.body.token`, `req.body.cardNumber`, `req.body.cvv`, and any other sensitive keys.

### A-05: Health Check Doesn't Detect Connection Pool Exhaustion
- **File:** `apps/backend/src/index.ts:126-135`
- **Severity:** P1
- **Description:** The `/health/ready` endpoint executes `await db.execute(sql\`SELECT 1\`)` to verify database connectivity. This query can succeed even when the connection pool is fully saturated (it simply waits for an available connection). The `/health/detailed` endpoint does fetch pool metrics, but `/health/ready` is what Kubernetes/Docker orchestrators typically use for readiness probes.
- **Impact:** Under load, the app may report "ready" while new requests are timing out waiting for pool connections, causing cascading failures in the load balancer.
- **Recommendation:** Add a pool metric check to `/health/ready`: if `poolMetrics.waiting > threshold` or `poolMetrics.active / poolSize > 0.9`, return `503`.

---

## P2 Findings (Medium/Low)

### A-06: Dev Docker Compose Excludes Backend Container
- **File:** `docker-compose.yml`
- **Severity:** P2
- **Description:** The development `docker-compose.yml` only defines `postgres` and `redis` services. The backend application must be started manually with `pnpm --filter backend dev`. This creates environment drift between dev and production (`docker-compose.prod.yml` includes backend, dashboard, and storefront).
- **Impact:** Developers may use different Node versions, miss health check behavior, or have local-only env var configurations that don't match the Dockerfile. Onboarding friction for new developers.
- **Recommendation:** Add a `backend` service to `docker-compose.yml` with a bind-mounted volume for live reload, consistent env file loading, and health checks matching the production setup.

### A-07: Shared Types Package Uses Blanket Exports
- **File:** `packages/shared-types/src/index.ts`
- **Severity:** P2
- **Description:** The shared types package re-exports everything from subdirectories via `export * from './schemas/index.js'` and `export * from './types/index.js'`. There are no subpath exports (`exports` field in `package.json`). Every consumer imports the entire barrel, preventing tree-shaking and increasing frontend bundle sizes.
- **Impact:** Larger frontend bundles, slower build times, and tight coupling between backend schema definitions and frontend builds.
- **Recommendation:** Add subpath exports in `packages/shared-types/package.json`:
  ```json
  "exports": {
    ".": "./dist/index.js",
    "./schemas": "./dist/schemas/index.js",
    "./types": "./dist/types/index.js"
  }
  ```

### A-08: No API Versioning Strategy
- **File:** `apps/backend/src/plugins/swagger.ts:59`
- **Severity:** P2
- **Description:** The Swagger spec declares `version: '1.0.0'`, but all route URLs lack a version prefix (e.g., `/v1/...`). There is no `Accept: application/vnd.api+json;version=1` header strategy either. As the platform evolves, breaking changes to route contracts (DTO shapes, query params) cannot be introduced gracefully.
- **Impact:** Breaking changes require global frontend/backend coordination. Mobile app users on older versions may experience runtime errors.
- **Recommendation:** Introduce URL-based versioning (`/v1/...`) for all route scopes, or document a commitment to backward-compatible expansion-only changes with Sunset headers.

### A-09: CI Security Checks Are Naive
- **File:** `package.json:26-29`
- **Severity:** P2
- **Description:** The root `package.json` defines `check:console` as `grep -r 'console.log' apps/backend/src/`. This misses `console.error`, `console.warn`, `console.info`, `console.debug`, and `console.table`. Similarly, `check:storeid` looks for `body.storeId` with a simple grep that could miss encoded or obfuscated variants.
- **Impact:** Console logging leaks into production undetected. The check scripts provide false confidence.
- **Recommendation:** Replace grep-based checks with ESLint rules (`no-console` with exceptions for `logger.*`), or use a proper static analysis tool like `eslint-plugin-security`.

### A-10: No Automated Accessibility Testing in CI
- **Files:** `.github/workflows/e2e.yml`, `apps/storefront/src/lib/components/product/ImageGallery.svelte`, `apps/storefront/src/lib/components/checkout/AddressForm.svelte`
- **Severity:** P2
- **Description:** While individual components use `aria-label`, `alt` text, and `label for="id"` correctly, there is no automated accessibility regression testing in the CI pipeline. Playwright E2E tests do not include `@axe-core/playwright` or similar accessibility assertions. Color contrast, focus management, and keyboard navigation are not validated automatically.
- **Impact:** Accessibility regressions are only caught by manual testing, violating WCAG 2.1 AA commitments for public-facing storefronts in many jurisdictions.
- **Recommendation:** Add `@axe-core/playwright` to E2E tests. Run `axe` on critical pages (homepage, product detail, checkout, cart) in the CI workflow.

### A-11: Swagger Servers List Hardcoded to localhost
- **File:** `apps/backend/src/plugins/swagger.ts:61-63`
- **Severity:** P2
- **Description:** The Swagger/OpenAPI `servers` array only contains `http://localhost:3000`. API consumers (frontend developers, third-party integrators, mobile teams) cannot see staging or production base URLs in the generated documentation.
- **Impact:** Confusion for API consumers. Copy-pasted curl commands default to localhost and fail in staging/production.
- **Recommendation:** Make the `servers` array dynamic based on `NODE_ENV` and env vars. Add entries for staging (`https://api-staging.example.com`) and production (`https://api.example.com`) when configured.

---

## Regression Check (Previous Audits)

| Previous Finding | Status | Notes |
|------------------|--------|-------|
| Docker multi-stage build with non-root user | **Fixed** | `apps/backend/Dockerfile` uses `node:22-alpine` and `USER nodejs` |
| Swagger docs secured with Basic Auth | **Fixed** | `swagger.ts` blocks production and requires auth in dev |
| OpenAPI spec generated from Zod schemas | **Fixed** | `fastify-type-provider-zod` transform in use |
| Turbo monorepo orchestration | **Fixed** | `turbo.json` and `pnpm-workspace.yaml` configured |

---

## Summary

| Severity | Count |
|----------|-------|
| P1 | 5 |
| P2 | 6 |
| **Total** | **11** |

**Immediate action:** A-01 (supply chain security) and A-04 (log redaction) should be prioritized before any production deployment. A-02 (unsafe cast) and A-03 (frontend env validation) are quick wins that improve type safety and reliability.

---

## Cross-Reference to Other Phases

| Phase 4 ID | Related Phase Finding | Relationship |
|------------|----------------------|--------------|
| A-04 | S-09 (console.error leaks PII) | A-04 is the root cause fix; S-09 is a specific instance in dashboard hooks |
| A-05 | P-13 (no pool size config) | A-05 highlights that even with proper pool config, health checks must monitor it |
| A-10 | Q-11 (missing E2E coverage) | A-10 adds a11y dimension to the E2E gap |
| A-07 | Q-06 (missing explicit return types) | Both concern API contract clarity between backend and consumers |
