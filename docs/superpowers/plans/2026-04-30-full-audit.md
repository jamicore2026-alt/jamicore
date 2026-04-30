# Full Project Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a checklist-driven full audit of the multi-tenant SaaS e-commerce platform, producing a comprehensive findings report and prioritized fix plan.

**Architecture:** Three-pass audit: (1) Infrastructure & shared packages, (2) Backend modules by risk, (3) Frontend apps. Each pass evaluates all 5 pillars: Security, Performance, Code Quality, Bugs, Missing Features.

**Tech Stack:** Fastify 5 + Drizzle ORM + PostgreSQL + Redis + SvelteKit 2 + Tailwind v4 + BullMQ

---

## File Structure

**Output files (all created by this plan):**
- `docs/audit/2026-04-30-full-audit.md` — Master audit report with all findings
- `docs/audit/2026-04-30-fix-plan.md` — Prioritized fix plan with workstreams
- `docs/audit/checklists/security.md` — Reusable security checklist
- `docs/audit/checklists/performance.md` — Reusable performance checklist
- `docs/audit/checklists/code-quality.md` — Reusable code quality checklist
- `docs/audit/checklists/bugs.md` — Reusable bug checklist
- `docs/audit/checklists/missing-features.md` — Reusable missing features checklist

---

## Phase 1: Checklist Templates

### Task 1: Create Security Checklist

**Files:**
- Create: `docs/audit/checklists/security.md`

- [ ] **Step 1: Write security checklist template**

```markdown
# Security Audit Checklist

## Authentication
- [ ] JWT signature verification uses strong secret (not default/dev)
- [ ] Token expiry is enforced (access token: 15m, refresh token: 7d)
- [ ] Refresh token rotation on use
- [ ] Invalidated tokens are rejected (blacklist check)
- [ ] Password reset tokens are single-use and time-bound
- [ ] Scope enforcement on every route (merchant/customer/superAdmin)
- [ ] Invite tokens are single-use and time-bound

## Authorization
- [ ] Every route has a preHandler or schema declaring required scope
- [ ] Merchant routes verify store ownership/membership
- [ ] Customer routes verify ownership of own data
- [ ] SuperAdmin routes are isolated and protected
- [ ] No privilege escalation via parameter tampering

## Injection
- [ ] All SQL queries use Drizzle ORM (no raw string interpolation)
- [ ] No `db.execute(sql\`...\`)` with untrusted input
- [ ] Zod validation runs before DB operations
- [ ] No command injection in file operations

## Secrets & Configuration
- [ ] No `.env` files in git history
- [ ] No hardcoded API keys, passwords, or secrets
- [ ] No sensitive data in logs or error responses
- [ ] Database connection string uses environment variables

## CSRF / XSS
- [ ] Dashboard POST/PUT/DELETE routes have CSRF protection
- [ ] No `\@html` directive with untrusted data in Svelte
- [ ] User-generated content is HTML-escaped in display

## Rate Limiting
- [ ] Auth endpoints have strict rate limits (login, register, forgot-password)
- [ ] Payment endpoints have rate limits
- [ ] Admin mutation endpoints have rate limits
- [ ] Public read endpoints have generous but present limits

## Data Exposure
- [ ] API responses don't include internal IDs, timestamps, or metadata beyond what's needed
- [ ] No endpoint returns full user records with passwords/hashes
- [ ] Error responses don't leak stack traces or DB details in production
- [ ] File upload responses don't expose server paths

## CORS
- [ ] CORS origin is restricted to known domains in production
- [ ] No `*` wildcard origin in production config
- [ ] Credentials are properly handled

## File Upload
- [ ] File extensions validated against allowlist
- [ ] MIME type checked independently of extension
- [ ] File size limits enforced
- [ ] Upload path sanitized (no `../` traversal)
- [ ] Uploaded files served from separate domain or with correct headers

## Session & Cookies
- [ ] Cookies use `HttpOnly`, `Secure`, `SameSite=Strict/Lax`
- [ ] Session IDs are cryptographically random
- [ ] Session expiry is enforced server-side
```

- [ ] **Step 2: Commit checklist template**

```bash
git add docs/audit/checklists/security.md
git commit -m "docs(audit): add security checklist template"
```

---

### Task 2: Create Performance Checklist

**Files:**
- Create: `docs/audit/checklists/performance.md`

- [ ] **Step 1: Write performance checklist template**

```markdown
# Performance Audit Checklist

## Database
- [ ] No N+1 queries in list endpoints
- [ ] Pagination on all list endpoints (limit/offset or cursor)
- [ ] Frequently queried columns have indexes
- [ ] Foreign keys have indexes
- [ ] Full-text search uses appropriate indexes
- [ ] No `SELECT *` when only specific columns needed
- [ ] Expensive queries use query timeout
- [ ] Connection pooling configured (min/max pool size)

## Caching
- [ ] Hot data cached in Redis (product lists, categories, settings)
- [ ] Cache keys are namespaced by tenant
- [ ] Cache invalidation on mutation (write-through or explicit)
- [ ] No cache stampede on popular keys
- [ ] TTL values are reasonable (not too short, not too long)

## Background Jobs
- [ ] BullMQ queues have concurrency limits
- [ ] Jobs have retry logic with backoff
- [ ] Failed jobs go to dead letter queue
- [ ] Long-running jobs don't block queue
- [ ] Job processors are idempotent

## Frontend
- [ ] Images use appropriate sizes and lazy loading
- [ ] JavaScript bundles are code-split
- [ ] API calls use pagination, not unbounded lists
- [ ] No memory leaks in Svelte stores
- [ ] Event listeners properly cleaned up

## API Design
- [ ] Response payloads are minimal
- [ ] No deeply nested includes unless needed
- [ ] Compression enabled (gzip/brotli)
- [ ] ETags or Last-Modified for cacheable responses
```

- [ ] **Step 2: Commit checklist template**

```bash
git add docs/audit/checklists/performance.md
git commit -m "docs(audit): add performance checklist template"
```

---

### Task 3: Create Code Quality Checklist

**Files:**
- Create: `docs/audit/checklists/code-quality.md`

- [ ] **Step 1: Write code quality checklist template**

```markdown
# Code Quality Audit Checklist

## Type Safety
- [ ] No `any` types without comment justification
- [ ] No unsafe `as` casts without guard
- [ ] Strict TypeScript enabled (`strict: true`)
- [ ] Return types declared on public functions
- [ ] Shared types in `shared-types` package, not duplicated

## Error Handling
- [ ] Consistent error class hierarchy used
- [ ] All async operations have try/catch or `.catch()`
- [ ] Errors logged with sufficient context (requestId, userId)
- [ ] No swallowed errors (empty catch blocks)
- [ ] Business errors return proper HTTP status codes

## Code Duplication
- [ ] No copy-pasted validation logic across routes
- [ ] Shared utilities used instead of inline implementations
- [ ] Repository patterns are consistent across modules
- [ ] Response formatting is centralized

## Dead Code
- [ ] No unused imports
- [ ] No commented-out code blocks
- [ ] No unreachable branches
- [ ] No exported functions that are never called

## Naming & Structure
- [ ] File names match exported entities
- [ ] Variable names describe purpose, not type
- [ ] Route files follow naming convention (`*.route.{scope}.ts`)
- [ ] Service/repo files under 400 lines
- [ ] Route files under 300 lines
- [ ] Schema files under 200 lines

## Dependencies
- [ ] No unused dependencies in package.json
- [ ] No deprecated package warnings
- [ ] No security vulnerabilities in `pnpm audit`
```

- [ ] **Step 2: Commit checklist template**

```bash
git add docs/audit/checklists/code-quality.md
git commit -m "docs(audit): add code quality checklist template"
```

---

### Task 4: Create Bugs Checklist

**Files:**
- Create: `docs/audit/checklists/bugs.md`

- [ ] **Step 1: Write bugs checklist template**

```markdown
# Bugs Audit Checklist

## Logic Errors
- [ ] Comparison operators correct (`===` not `==`, `!==` not `!=`)
- [ ] Off-by-one errors in pagination (limit + 1 for hasNextPage)
- [ ] Correct handling of 0, empty string, false as valid values
- [ ] Date comparisons use UTC consistently
- [ ] Currency calculations use integer cents, not floats

## Race Conditions
- [ ] Inventory decrements are atomic
- [ ] Coupon usage limits checked atomically
- [ ] Order status transitions are atomic
- [ ] Concurrent checkout for same item handled
- [ ] No check-then-act without transaction/locking

## Schema Mismatches
- [ ] Zod schemas match Drizzle table definitions
- [ ] API response types match frontend expectations
- [ ] Database defaults match application defaults
- [ ] Nullable columns handled correctly in Zod (`.nullable()`)

## Edge Cases
- [ ] Empty arrays handled gracefully in list endpoints
- [ ] Deleted records referenced by FK handled (soft delete or cascade)
- [ ] Very long inputs don't crash (max length validation)
- [ ] Special characters in names, descriptions handled
- [ ] Zero-quantity products don't break cart/checkout

## Validation Gaps
- [ ] All route handlers have Zod validation for body/query/params
- [ ] File upload routes validate file type and size
- [ ] Date ranges validated (start <= end)
- [ ] Numeric ranges validated (price >= 0, quantity > 0)
- [ ] Enum values validated against allowlist
- [ ] UUID format validated for all ID parameters
```

- [ ] **Step 2: Commit checklist template**

```bash
git add docs/audit/checklists/bugs.md
git commit -m "docs(audit): add bugs checklist template"
```

---

### Task 5: Create Missing Features Checklist

**Files:**
- Create: `docs/audit/checklists/missing-features.md`

- [ ] **Step 1: Write missing features checklist template**

```markdown
# Missing Features Audit Checklist

## Incomplete Flows
- [ ] No TODO comments in production code
- [ ] No stub/placeholder route handlers
- [ ] No empty pages with "Coming Soon"
- [ ] All documented features have corresponding code

## Missing Validations
- [ ] Business rules enforced in code (e.g., max 1 active coupon per order)
- [ ] Unique constraints have application-level checks
- [ ] Required relations verified before mutation
- [ ] State machine transitions validated (e.g., pending → confirmed, not cancelled → pending)

## Missing Indexes
- [ ] All foreign keys have indexes
- [ ] Searchable text columns have indexes
- [ ] Frequently sorted columns have indexes
- [ ] Composite indexes for multi-column queries

## Missing Tests
- [ ] Every module has at least basic unit tests
- [ ] Auth flows have e2e tests
- [ ] Payment flows have e2e tests
- [ ] Critical business logic has integration tests

## Missing Documentation
- [ ] Complex SQL or Drizzle queries have comments
- [ ] Business rules documented in code or adjacent markdown
- [ ] Environment variables documented
- [ ] API breaking changes documented

## Missing Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Key metrics logged (order count, revenue, errors)
- [ ] Health check endpoint exists
- [ ] Queue depth monitored
```

- [ ] **Step 2: Commit checklist template**

```bash
git add docs/audit/checklists/missing-features.md
git commit -m "docs(audit): add missing features checklist template"
```

---

## Phase 2: Infrastructure Audit

### Task 6: Audit Environment & Secrets

**Files:**
- Read: `.env`, `apps/backend/.env`, `apps/dashboard/.env`, `apps/storefront/.env`
- Read: `.env.example`, `.gitignore`
- Read: `apps/backend/src/plugins/index.ts`
- Read: `apps/backend/src/config/env.ts` (if exists)

- [ ] **Step 1: Check for committed env files**

Run:
```bash
git log --all --full-history -- .env
find . -name ".env" -not -path "*/node_modules/*" -not -path "*/.git/*"
```

Evidence: List any `.env` files tracked in git or containing secrets.

- [ ] **Step 2: Check for hardcoded secrets**

Search patterns:
```bash
grep -rn "sk-[a-zA-Z0-9]" apps/ --include="*.ts" --include="*.js"
grep -rn "password.*=.*\"" apps/backend/src/ --include="*.ts"
grep -rn "secret.*=.*\"" apps/backend/src/ --include="*.ts"
grep -rn "api_key.*=.*\"" apps/ --include="*.ts"
grep -rn "AKIA" apps/ --include="*.ts"
```

Evidence: Any matches that are not environment variable reads.

- [ ] **Step 3: Verify .gitignore excludes env files**

Read `.gitignore` and confirm `.env` and `*.env` are listed.

- [ ] **Step 4: Document findings in report**

Append to `docs/audit/2026-04-30-full-audit.md` under `## Infrastructure Findings`.

---

### Task 7: Audit Docker & CI/CD

**Files:**
- Read: `docker-compose.yml`
- Read: `Dockerfile` (backend, dashboard, storefront)
- Read: `.github/workflows/ci.yml`
- Read: `.github/workflows/e2e.yml`
- Read: `.github/workflows/deploy.yml`

- [ ] **Step 1: Check Docker security**

Verify:
- Images use specific versions (not `latest`)
- No root user running containers
- Secrets not passed as build args
- Health checks defined

- [ ] **Step 2: Check CI/CD pipeline**

Verify:
- Tests run before deploy
- Security audit runs (`pnpm audit`)
- Lint and typecheck run
- Build artifacts tested
- No secrets in CI logs

- [ ] **Step 3: Document findings**

Append to audit report under `## Infrastructure Findings`.

---

## Phase 3: Backend Module Audit (High Risk)

### Task 8: Audit Auth Module

**Files:**
- Read all: `apps/backend/src/modules/auth/**/*.ts`
- Read: `apps/backend/src/scopes/merchant.ts`, `customer.ts`, `superAdmin.ts`, `public.ts`
- Read: `apps/backend/src/db/schema.ts` (auth-related tables)
- Read: `apps/backend/src/errors/codes.ts`

Check all 5 pillars. Focus:
- Security: JWT handling, password hashing, scope enforcement
- Performance: DB queries indexed, no N+1
- Code Quality: Error handling consistency
- Bugs: Race conditions on registration, token expiry edge cases
- Missing: Rate limiting, refresh token rotation

- [ ] **Step 1: Run auth checklist against all auth files**
- [ ] **Step 2: Document findings in audit report under `### Module: auth`**

---

### Task 9: Audit Payment Module

**Files:**
- Read all: `apps/backend/src/modules/payment/**/*.ts`
- Read: `apps/backend/src/modules/order/**/*.ts` (order-payment relationship)

Focus:
- Security: Webhook signature verification, idempotency keys
- Performance: No synchronous payment gateway calls blocking response
- Code Quality: Proper error handling for failed payments
- Bugs: Double-charge prevention, race conditions on payment status
- Missing: Idempotency implementation, refund logic completeness

- [ ] **Step 1: Run payment checklist**
- [ ] **Step 2: Document findings under `### Module: payment`**

---

### Task 10: Audit Order Module

**Files:**
- Read all: `apps/backend/src/modules/order/**/*.ts`
- Read: `apps/backend/src/modules/checkout/**/*.ts`

Focus:
- Security: Order access restricted to owner/merchant
- Performance: Order list pagination, index usage
- Code Quality: State machine logic clarity
- Bugs: Inventory rollback on cancellation, race conditions
- Missing: Order lifecycle hooks, partial refund support

- [ ] **Step 1: Run order checklist**
- [ ] **Step 2: Document findings under `### Module: order`**

---

### Task 11: Audit Product Module

**Files:**
- Read all: `apps/backend/src/modules/product/**/*.ts`
- Read: `apps/backend/src/modules/category/**/*.ts`

Focus:
- Security: No unauthorized product mutation
- Performance: Product search indexing, image optimization
- Code Quality: Variant handling complexity
- Bugs: SKU uniqueness, inventory sync
- Missing: Bulk operations validation, variant combination limits

- [ ] **Step 1: Run product checklist**
- [ ] **Step 2: Document findings under `### Module: product`**

---

### Task 12: Audit Coupon Module

**Files:**
- Read all: `apps/backend/src/modules/coupon/**/*.ts`

Focus:
- Security: Coupon code generation not predictable
- Performance: Usage count queries efficient
- Code Quality: Date range validation
- Bugs: Race condition on usage limit, timezone issues
- Missing: Coupon stacking rules, usage analytics

- [ ] **Step 1: Run coupon checklist**
- [ ] **Step 2: Document findings under `### Module: coupon`**

---

### Task 13: Audit Cart Module

**Files:**
- Read all: `apps/backend/src/modules/cart/**/*.ts`
- Read: `apps/backend/src/modules/abandoned-cart/**/*.ts`

Focus:
- Security: Cart access restricted to owner
- Performance: Cart merge efficiency
- Code Quality: Cart item calculation accuracy
- Bugs: Price calculation rounding, abandoned cart race conditions
- Missing: Cart persistence strategy, guest cart limits

- [ ] **Step 1: Run cart checklist**
- [ ] **Step 2: Document findings under `### Module: cart`**

---

### Task 14: Audit Shipping & Tax Modules

**Files:**
- Read all: `apps/backend/src/modules/shipping/**/*.ts`
- Read all: `apps/backend/src/modules/tax/**/*.ts`

Focus:
- Security: No injection in shipping calculation
- Performance: Rate calculation caching
- Code Quality: Address validation consistency
- Bugs: Tax calculation rounding, shipping zone edge cases
- Missing: International shipping validation

- [ ] **Step 1: Run shipping checklist**
- [ ] **Step 2: Run tax checklist**
- [ ] **Step 3: Document findings**

---

### Task 15: Audit Customer & Staff Modules

**Files:**
- Read all: `apps/backend/src/modules/customer/**/*.ts`
- Read all: `apps/backend/src/modules/staff/**/*.ts`
- Read all: `apps/backend/src/modules/superAdmin/**/*.ts`

Focus:
- Security: Password reset flow secure, invite flow secure
- Performance: Customer list queries
- Code Quality: Role permission logic
- Bugs: Duplicate email handling, invite token reuse
- Missing: RBAC granularity, activity logging

- [ ] **Step 1: Run customer checklist**
- [ ] **Step 2: Run staff checklist**
- [ ] **Step 3: Run superAdmin checklist**
- [ ] **Step 4: Document findings**

---

### Task 16: Audit Store & Plan-Limits Modules

**Files:**
- Read all: `apps/backend/src/modules/store/**/*.ts`
- Read all: `apps/backend/src/modules/plan-limits/**/*.ts`

Focus:
- Security: Store isolation strict
- Performance: Plan limit checks fast (cached)
- Code Quality: Limit enforcement consistency
- Bugs: Plan limit race conditions
- Missing: Plan upgrade/downgrade logic, usage metering

- [ ] **Step 1: Run store and plan-limits checklists**
- [ ] **Step 2: Document findings**

---

### Task 17: Audit Remaining Backend Modules

**Files:**
- Read all: `apps/backend/src/modules/analytics/**/*.ts`
- Read all: `apps/backend/src/modules/bundle/**/*.ts`
- Read all: `apps/backend/src/modules/consent/**/*.ts`
- Read all: `apps/backend/src/modules/currency/**/*.ts`
- Read all: `apps/backend/src/modules/exchange/**/*.ts`
- Read all: `apps/backend/src/modules/modifier/**/*.ts`
- Read all: `apps/backend/src/modules/newsletter/**/*.ts`
- Read all: `apps/backend/src/modules/notifications/**/*.ts`
- Read all: `apps/backend/src/modules/pricing/**/*.ts`
- Read all: `apps/backend/src/modules/return/**/*.ts`
- Read all: `apps/backend/src/modules/review/**/*.ts`
- Read all: `apps/backend/src/modules/SEO/**/*.ts`
- Read all: `apps/backend/src/modules/ticket/**/*.ts`
- Read all: `apps/backend/src/modules/upload/**/*.ts`
- Read all: `apps/backend/src/modules/webhook/**/*.ts`
- Read all: `apps/backend/src/modules/wishlist/**/*.ts`

For each module, run all 5 checklists and document findings. Use parallel subagents for efficiency.

- [ ] **Step 1: Audit bundle, modifier, pricing**
- [ ] **Step 2: Audit newsletter, notifications, webhook**
- [ ] **Step 3: Audit review, SEO, wishlist**
- [ ] **Step 4: Audit analytics, consent, currency, exchange, return, ticket, upload**
- [ ] **Step 5: Document all findings**

---

### Task 18: Audit Backend Services Layer

**Files:**
- Read all: `apps/backend/src/services/**/*.ts`

Focus:
- Security: No secrets in service config
- Performance: Caching service efficiency, queue concurrency
- Code Quality: Service initialization patterns
- Bugs: Retry logic correctness, error propagation
- Missing: Circuit breaker for external calls, health checks

- [ ] **Step 1: Run checklists on all services**
- [ ] **Step 2: Document findings under `## Backend Services`**

---

### Task 19: Audit Database Schema

**Files:**
- Read: `apps/backend/src/db/schema.ts`
- Read: `apps/backend/src/db/seed.ts`
- Check: `apps/backend/drizzle/` for migrations

Focus:
- Security: No sensitive columns unencrypted
- Performance: Index usage on FKs and search columns
- Code Quality: Consistent naming, proper defaults
- Bugs: Missing `notNull` on required fields, cascade rules
- Missing: Soft delete columns, audit trail columns

- [ ] **Step 1: Verify all FKs have indexes**
```bash
# Check schema for missing indexes
grep -n "references(" apps/backend/src/db/schema.ts | head -40
```

- [ ] **Step 2: Check for missing `notNull` on critical fields**
- [ ] **Step 3: Verify soft delete pattern is consistent**
- [ ] **Step 4: Document findings under `## Database Schema`**

---

## Phase 4: Shared Packages Audit

### Task 20: Audit shared-types & shared-utils

**Files:**
- Read all: `packages/shared-types/**/*.ts`
- Read all: `packages/shared-utils/**/*.ts`

Focus:
- Security: No sensitive types exported
- Performance: Types compile efficiently
- Code Quality: No duplication between packages
- Bugs: Type definitions match backend schemas
- Missing: Missing types for new features

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings under `## Shared Packages`**

---

### Task 21: Audit UI Package

**Files:**
- Read all: `packages/ui/**/*.ts`, `packages/ui/**/*.svelte`

Focus:
- Security: No XSS in components
- Performance: Bundle size, tree-shaking
- Code Quality: Component API consistency
- Bugs: Accessibility issues
- Missing: Missing component variants

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings**

---

## Phase 5: Dashboard Audit

### Task 22: Audit Dashboard Auth & API Client

**Files:**
- Read: `apps/dashboard/src/lib/api/client.ts`
- Read: `apps/dashboard/src/routes/(auth)/**/*.svelte`
- Read: `apps/dashboard/src/routes/(auth)/**/*.ts`

Focus:
- Security: Token storage (not localStorage), CSRF handling
- Performance: Request deduplication, caching
- Code Quality: Error handling in API client
- Bugs: Token expiry handling, redirect loops
- Missing: Request interceptors, retry logic

- [ ] **Step 1: Verify token storage method**
- [ ] **Step 2: Check CSRF token handling**
- [ ] **Step 3: Document findings under `## Dashboard`**

---

### Task 23: Audit Dashboard Merchant Routes

**Files:**
- Read all: `apps/dashboard/src/routes/(merchant)/**/*.svelte`
- Read all: `apps/dashboard/src/routes/(merchant)/**/*.ts`

For each route group (dashboard, analytics, categories, coupons, customers, inventory, modifiers, orders, products, reviews, settings):

Focus:
- Security: Scope check before API calls, no data leakage between merchants
- Performance: Pagination, image optimization
- Code Quality: Form validation consistency
- Bugs: Race conditions on form submission, state sync
- Missing: Loading states, error boundaries

- [ ] **Step 1: Audit dashboard + analytics pages**
- [ ] **Step 2: Audit product, category, modifier pages**
- [ ] **Step 3: Audit order, coupon, customer pages**
- [ ] **Step 4: Audit settings pages (billing, branding, shipping, staff, etc.)**
- [ ] **Step 5: Document findings**

---

### Task 24: Audit Dashboard SuperAdmin Routes

**Files:**
- Read all: `apps/dashboard/src/routes/(superadmin)/**/*.svelte`
- Read all: `apps/dashboard/src/routes/(superadmin)/**/*.ts`

Focus:
- Security: SuperAdmin scope strict enforcement, no merchant data access
- Performance: Admin list pagination
- Code Quality: Consistent admin UI patterns
- Bugs: Store approval flow edge cases
- Missing: Audit logs, admin activity tracking

- [ ] **Step 1: Run checklists on all superadmin routes**
- [ ] **Step 2: Document findings**

---

## Phase 6: Storefront Audit

### Task 25: Audit Storefront Auth & Account

**Files:**
- Read all: `apps/storefront/src/routes/(auth)/**/*.svelte`
- Read all: `apps/storefront/src/routes/(customer)/**/*.svelte`
- Read: `apps/storefront/src/lib/api/client.ts`

Focus:
- Security: Same as dashboard auth + customer data isolation
- Performance: Guest cart persistence
- Code Quality: Form validation
- Bugs: Address form edge cases, order history filtering
- Missing: Social login, password strength indicator

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings under `## Storefront`**

---

### Task 26: Audit Storefront Browse & Cart

**Files:**
- Read: `apps/storefront/src/routes/+page.svelte` (home)
- Read: `apps/storefront/src/routes/categories/**/*.svelte`
- Read: `apps/storefront/src/routes/products/**/*.svelte`
- Read: `apps/storefront/src/routes/cart/**/*.svelte`

Focus:
- Security: No injection in search/query params
- Performance: Product image lazy loading, pagination
- Code Quality: Product variant selection logic
- Bugs: Cart merge on login, out-of-stock handling
- Missing: Filter state persistence, compare limit enforcement

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings**

---

### Task 27: Audit Storefront Checkout

**Files:**
- Read all: `apps/storefront/src/routes/checkout/**/*.svelte`
- Read: `apps/storefront/src/routes/order-confirmed/**/*.svelte`
- Read: `apps/storefront/src/routes/track-order/**/*.svelte`

Focus:
- Security: Payment data never touches storefront (token only)
- Performance: Checkout step state management
- Code Quality: Shipping/tax calculation display
- Bugs: Checkout abandonment recovery, double-submit
- Missing: Guest checkout email confirmation, order tracking details

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings**

---

## Phase 7: Cross-Cutting Review

### Task 28: Audit Error Handling Patterns

**Files:**
- Read: `apps/backend/src/errors/codes.ts`
- Read: `apps/backend/src/errors/handler.ts` (if exists)
- Search for all `try/catch` patterns: `grep -rn "try {" apps/ --include="*.ts" | wc -l`
- Search for empty catches: `grep -rn "catch.*{" apps/ --include="*.ts" -A 2 | grep -E "^\s*\}|^\s*//"`

- [ ] **Step 1: Verify consistent error code usage**
- [ ] **Step 2: Check for swallowed errors**
- [ ] **Step 3: Document findings under `## Cross-Cutting: Error Handling`**

---

### Task 29: Audit API Response Patterns

**Files:**
- Read multiple route files to check response format consistency
- Verify all list endpoints return `{ data, meta }` with pagination info
- Verify all detail endpoints return `{ data }`
- Verify error responses return `{ error: { code, message, details } }`

- [ ] **Step 1: Sample response formats from 10+ routes**
- [ ] **Step 2: Document inconsistencies under `## Cross-Cutting: API Responses`**

---

### Task 30: Audit Notification System

**Files:**
- Read: `apps/backend/src/modules/notifications/**/*.ts`
- Read: `apps/dashboard/src/lib/components/notifications/NotificationBell.svelte`
- Read: `apps/backend/src/plugins/index.ts` (SSE setup)

Focus:
- Security: No notification flooding, rate limiting
- Performance: SSE connection management
- Code Quality: Notification read status logic
- Bugs: Duplicate notifications, unread count sync
- Missing: Notification preferences, push notification support

- [ ] **Step 1: Run checklists**
- [ ] **Step 2: Document findings**

---

## Phase 8: Report Compilation

### Task 31: Compile Executive Summary

**Files:**
- Create: `docs/audit/2026-04-30-full-audit.md`

- [ ] **Step 1: Count findings by severity and pillar**
- [ ] **Step 2: Write executive summary with top 5 concerns**
- [ ] **Step 3: Add per-section summaries for all audited areas**

---

### Task 32: Create Fix Plan

**Files:**
- Create: `docs/audit/2026-04-30-fix-plan.md`

- [ ] **Step 1: Group P0 findings by theme (e.g., "Auth Security", "Race Conditions")**
- [ ] **Step 2: Order by severity (P0 first), then by effort (quick wins first)**
- [ ] **Step 3: Create workstreams with parallelizable tasks**
- [ ] **Step 4: Estimate effort per workstream**
- [ ] **Step 5: Write test strategy for each workstream**

---

### Task 33: Final Review & Commit

- [ ] **Step 1: Self-review the audit report for completeness**
  - Every module from brainstorming context is covered
  - Every finding has file path and severity
  - No placeholders or TODOs in report

- [ ] **Step 2: Self-review the fix plan for actionability**
  - Every P0 has a proposed fix
  - Workstreams are independent where possible
  - Effort estimates are realistic

- [ ] **Step 3: Commit all audit artifacts**

```bash
git add docs/audit/
git commit -m "docs(audit): complete full project audit with findings and fix plan

- Security: X findings
- Performance: Y findings
- Code Quality: Z findings
- Bugs: W findings
- Missing Features: V findings

Total: T findings (P0: A, P1: B, P2: C)"
```

---

## Spec Coverage Check

| Spec Requirement | Plan Task |
|------------------|-----------|
| Infrastructure audit (env, Docker, CI) | Task 6, 7 |
| Backend auth module | Task 8 |
| Backend payment module | Task 9 |
| Backend order module | Task 10 |
| Backend product module | Task 11 |
| Backend coupon module | Task 12 |
| Backend cart module | Task 13 |
| Backend shipping & tax | Task 14 |
| Backend customer & staff | Task 15 |
| Backend store & plan-limits | Task 16 |
| All remaining backend modules | Task 17 |
| Backend services layer | Task 18 |
| Database schema review | Task 19 |
| Shared packages audit | Task 20, 21 |
| Dashboard auth & API client | Task 22 |
| Dashboard merchant routes | Task 23 |
| Dashboard superadmin routes | Task 24 |
| Storefront auth & account | Task 25 |
| Storefront browse & cart | Task 26 |
| Storefront checkout | Task 27 |
| Error handling patterns | Task 28 |
| API response patterns | Task 29 |
| Notification system | Task 30 |
| Executive summary | Task 31 |
| Fix plan | Task 32 |
| Final review & commit | Task 33 |

---

## Parallelization Opportunities

The following task groups can run in parallel via subagents:

**Group A (Backend Core):** Tasks 8, 9, 10, 11
**Group B (Backend Commerce):** Tasks 12, 13, 14
**Group C (Backend Admin):** Tasks 15, 16
**Group D (Backend Remaining):** Task 17
**Group E (Backend Infra):** Tasks 18, 19
**Group F (Shared + Frontend Core):** Tasks 20, 21, 22, 25
**Group G (Dashboard + Storefront Routes):** Tasks 23, 24, 26, 27
**Group H (Cross-cutting):** Tasks 28, 29, 30

Sequential dependencies:
- Group A/B/C/D/E → Tasks 28, 29, 30 (cross-cutting needs all findings)
- All groups → Tasks 31, 32, 33 (compilation needs all findings)
