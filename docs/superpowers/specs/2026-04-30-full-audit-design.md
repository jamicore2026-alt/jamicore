# Full Project Audit Design

## Date
2026-04-30

## Context
Multi-tenant SaaS e-commerce platform with 3 apps and 4 shared packages. Latest commit: `5abd306` (Phase 5 complete).

## Scope
All code in the repository:
- `apps/backend` — Fastify + Drizzle ORM, 33 modules, ~95 tables
- `apps/dashboard` — SvelteKit 2 merchant + superadmin admin UIs
- `apps/storefront` — SvelteKit 2 customer-facing PWA
- Shared packages: `shared-types`, `shared-utils`, `ui`, `e2e-utils`
- Infrastructure: Docker, GitHub Actions CI/CD, environment configs

## Methodology: Checklist-Driven Systematic Audit

### Pillar 1 — Security
- Auth: JWT validation, scope enforcement, token expiry, refresh token rotation
- Injection: SQL injection (Drizzle parameterized queries), NoSQL injection, command injection
- Secrets: No committed `.env` files, no hardcoded keys, no leaked tokens in logs
- CSRF: Double-submit cookies on state-changing dashboard/storefront routes
- XSS: Output encoding in Svelte templates, no `@html` with untrusted data
- Rate limiting: Per-route rate limits, especially auth and payment endpoints
- Data exposure: No excessive data in responses, field-level access control
- CORS: Proper origin restrictions, no wildcard in production
- File upload: Extension validation, size limits, MIME type checking, storage path sanitization
- Session: Secure cookie flags (`HttpOnly`, `Secure`, `SameSite`)

### Pillar 2 — Performance
- Database: N+1 queries, missing indexes, unbounded `SELECT *`, no pagination
- Caching: Redis usage for hot data, cache invalidation correctness
- Computations: Heavy loops in request handlers, synchronous file operations
- BullMQ: Job retry logic, dead letter handling, queue monitoring
- Frontend: Bundle size, lazy loading, image optimization

### Pillar 3 — Code Quality
- Type safety: No `any`, no `as` casts without guards, strict TypeScript config
- Error handling: Consistent error codes, no swallowed errors, proper logging with context
- Duplication: Repeated logic across modules, copy-paste code
- Dead code: Unused imports, unreachable branches, commented-out code
- Naming: Consistent conventions, meaningful identifiers
- File size: Service/repo files >400 lines, route files >300 lines, schema files >200 lines

### Pillar 4 — Bugs
- Logic errors: Incorrect comparisons, off-by-one, null/undefined handling
- Race conditions: Concurrent updates to inventory, orders, coupons
- Schema mismatches: Zod schemas out of sync with Drizzle schema
- Unhandled edge cases: Empty arrays, missing relations, deleted records
- Validation gaps: Missing body/query/param validation on routes

### Pillar 5 — Missing Features
- Incomplete flows: Placeholder routes, TODO comments, stub implementations
- Missing validations: Required fields not checked, business rules not enforced
- Missing indexes: Foreign keys without indexes, frequently queried columns
- Missing tests: Untouched modules, low coverage areas
- Missing documentation: Complex business logic without comments

## Checklist Execution Order

1. **Infrastructure first** — env files, Docker, CI/CD (security baseline)
2. **Backend modules by risk** — auth → payment → order → product → rest
3. **Shared packages** — type definitions, utility functions
4. **Dashboard** — auth flows, merchant routes, superadmin routes
5. **Storefront** — customer auth, browse, cart, checkout, account
6. **Cross-cutting review** — error handling patterns, API client, notification system

## Output Format

### Deliverable 1: Audit Report
File: `docs/audit/YYYY-MM-DD-full-audit.md`

Structure:
```
# Full Audit Report

## Executive Summary
- Total findings: X (P0: Y, P1: Z, P2: W)
- Risk score: [Critical/High/Medium/Low]
- Top concerns: 3-5 bullet points

## Backend Findings
### Module: <name>
| # | Pillar | Severity | Description | File | Evidence |
|---|--------|----------|-------------|------|----------|

## Dashboard Findings
...

## Storefront Findings
...

## Infrastructure Findings
...

## Cross-Cutting Concerns
...
```

### Deliverable 2: Fix Plan
File: `docs/audit/YYYY-MM-DD-fix-plan.md`

Structure:
```
# Fix Plan

## Prioritization
1. P0 Critical — Security risks, data loss, production crashes
2. P1 High — Bugs affecting user experience, performance degradation
3. P2 Medium — Code quality, missing tests, minor optimizations

## Workstreams
### Workstream 1: <theme> (e.g., Security Hardening)
- [ ] Fix 1: file, description, test strategy, effort
- [ ] Fix 2: ...

### Workstream 2: <theme>
...

## Effort Estimate
- Total fixes: X
- Estimated hours: Y
- Parallelizable workstreams: Z
```

### Deliverable 3: Checklist Templates
File: `docs/audit/checklists/<pillar>.md`
Reusable templates for future audits.

## Success Criteria
- Every module reviewed against all 5 pillars
- Every finding has file path and line number
- Every P0 has a proposed fix in the plan
- No false positives (each finding verified by reading code)
- Report is actionable (developer can pick up and fix)

## Constraints
- Read-only audit — no code changes during audit phase
- pnpm workspace commands only (no npm/yarn)
- Windows environment compatibility
