# Full Platform Audit + Fix Known Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 2 user-reported bugs (admin settings page + dropdown overlap) and run a fresh full-platform audit producing a severity-tagged report with prioritized fix plan.

**Architecture:** Phase 1 fixes the 2 known bugs with minimal targeted changes. Phase 2 runs 5 parallel Explore agents (security/perf/quality/uiux/consistency) producing structured findings. Phase 3 adversarially verifies each finding. Phase 4 synthesizes a single audit report. Follow-up fixes for P0/P1 audit findings are a SEPARATE plan (created after the user reviews the report).

**Tech Stack:** Fastify v5, Drizzle ORM, PostgreSQL 17, Redis (ioredis), SvelteKit 2, shadcn-svelte, Zod, TypeScript strict mode, pnpm, Vitest.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/backend/src/modules/auth/auth.route.superAdmin.ts` | Modify | Add `lastLoginAt` to `/me` response (BUG-001) |
| `apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte` | Modify | Add z-index to user dropdown (BUG-002) |
| `docs/audit/findings/2026-06-02-security.json` | Create | Security/Auth findings from Explore agent |
| `docs/audit/findings/2026-06-02-perf.json` | Create | Performance/DB findings from Explore agent |
| `docs/audit/findings/2026-06-02-quality.json` | Create | Code quality/TS findings from Explore agent |
| `docs/audit/findings/2026-06-02-uiux.json` | Create | UI/UX findings from Explore agent |
| `docs/audit/findings/2026-06-02-consistency.json` | Create | Cross-scope consistency findings from Explore agent |
| `docs/audit/findings/2026-06-02-verified.json` | Create | Findings after adversarial verify |
| `docs/audit/audit_2026_06_02.md` | Create | Final audit report with severity table + fix plan |
| `docs/PROGRESS.md` | Modify | Note BUG-001 and BUG-002 fixes + audit completion |

---

## Phase 1: Fix 2 User-Reported Bugs

### Task 1: BUG-001 — Fix "Failed to load admin profile"

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.route.superAdmin.ts:207-235` (the `/me` handler)

The backend `/api/v1/admin/auth/me` endpoint returns `{ id, email, name, isActive }` but the frontend (`apps/dashboard/src/routes/(superadmin)/admin/settings/+page.svelte:130`) reads `admin.lastLoginAt`. The field is undefined → page renders the "Failed to load admin profile" fallback. Add `lastLoginAt` to the response.

- [ ] **Step 1: Read the current `/me` handler to confirm shape**

Run: Read `apps/backend/src/modules/auth/auth.route.superAdmin.ts` lines 207–235.

Expected: The handler returns `{ admin: { id, email, name, isActive } }`.

- [ ] **Step 2: Add `lastLoginAt` to the response**

In `apps/backend/src/modules/auth/auth.route.superAdmin.ts`, change the success response (around line 219–226) from:

```typescript
return {
  admin: {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isActive: admin.isActive,
  },
};
```

to:

```typescript
return {
  admin: {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
  },
};
```

- [ ] **Step 3: Confirm `lastLoginAt` is on the admin object**

Open `apps/backend/src/modules/auth/auth.service.ts` and find `getSuperAdminProfile`. Confirm the returned object includes `lastLoginAt`. If it does not, add it to the SELECT in the corresponding repo function (`apps/backend/src/modules/auth/auth.repo.ts` or equivalent Drizzle query).

Expected: `admin.lastLoginAt` is a `Date | null`.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/backend/src/modules/auth/auth.route.superAdmin.ts
git commit -m "fix(backend): include lastLoginAt in super admin /me response (BUG-001)"
```

---

### Task 2: BUG-002 — Fix user dropdown overlap with "+ Add Category"

**Files:**
- Modify: `apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte:313-340` (the user `DropdownMenu` block)

The user dropdown content uses default shadcn-svelte styling. The "+ Add Category" floating action button (or sidebar item) renders above the dropdown because both compete in the same stacking context. Force a higher z-index on the dropdown content.

- [ ] **Step 1: Read the current dropdown block**

Run: Read `apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte` lines 313–340.

Expected: A `<DropdownMenuContent align="end" class="w-56">` block.

- [ ] **Step 2: Add explicit z-index class to the dropdown content**

Change line 322 from:

```svelte
<DropdownMenuContent align="end" class="w-56 max-w-[calc(100vw-2rem)] bg-[rgba(10,16,28,0.95)] backdrop-blur-xl border-[rgba(30,58,95,0.4)]">
```

to:

```svelte
<DropdownMenuContent align="end" class="w-56 max-w-[calc(100vw-2rem)] bg-[rgba(10,16,28,0.95)] backdrop-blur-xl border-[rgba(30,58,95,0.4)] z-[60]">
```

If the `+ Add Category` button is on a higher z-layer than `z-[60]`, bump this to `z-[100]`.

- [ ] **Step 3: Audit for parent stacking-context traps**

Run: `grep -n "transform\|isolate\|z-" apps/dashboard/src/lib/components/layout/DashboardSidebar.svelte`

Expected: The sidebar should NOT have `transform` or `isolate` (these create new stacking contexts that trap child z-index).

If it does, the dropdown MUST be portaled out of the sidebar's stacking context. shadcn-svelte's `DropdownMenuContent` already uses a portal by default — confirm by reading `apps/dashboard/src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte`. If it doesn't portal, set `sideOffset` or wrap in a portal manually.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: 0 errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte
git commit -m "fix(frontend): user dropdown z-index no longer overlaps page actions (BUG-002)"
```

---

### Task 3: Update PROGRESS.md with Phase 1 fixes

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Read the latest PROGRESS.md section**

Run: Read `docs/PROGRESS.md` (last 50 lines).

- [ ] **Step 2: Append a Phase 1 entry**

Add a new top-level section at the end of the file:

```markdown
## 2026-06-02 — Full Platform Audit (in progress)

### Phase 1 — User-Reported Bug Fixes
- **BUG-001** [fixed] Admin settings page showed "Failed to load admin profile" because `/api/v1/admin/auth/me` did not return `lastLoginAt`. Added the field to the response.
- **BUG-002** [fixed] User dropdown in merchant dashboard topbar overlapped with `+ Add Category` button. Added `z-[60]` to dropdown content to lift it above page actions.

### Phase 2 — Audit
[pending — see docs/audit/audit_2026_06_02.md when complete]
```

- [ ] **Step 3: Commit**

```powershell
git add docs/PROGRESS.md
git commit -m "docs: PROGRESS note BUG-001 and BUG-002 fixes"
```

---

## Phase 2: Run Parallel Audit (5 Dimensions)

The audit dispatches 5 parallel Explore agents. Each agent is read-only and produces a JSON file of findings.

### Task 4: Run Security & Auth dimension

**Files:**
- Create: `docs/audit/findings/2026-06-02-security.json`

- [ ] **Step 1: Dispatch Explore agent via Agent tool**

```typescript
Agent({
  description: "Security/Auth audit",
  prompt: `Audit the jamicore codebase at D:\\project_saas_ecom for security and authentication bugs.

Focus on the 4 auth scopes (public, merchant, customer, superAdmin):
1. JWT verification — is type='access' checked in scope hooks? apps/backend/src/scopes/*.ts
2. CSRF — is CSRF validated on mutating routes? apps/backend/src/plugins/*.ts
3. Cookies — httpOnly, secure in prod, sameSite strict? apps/backend/src/lib/auth-cookies.ts
4. MFA — flow correctness, code expiry, replay protection. apps/backend/src/modules/auth/auth.route.superAdmin.ts
5. Rate limits — login, register, checkout, password reset
6. Secrets in env — no hardcoded keys, no JWT secrets in code
7. SQL injection — all queries parameterized (Drizzle is safe by default, but check raw SQL)
8. XSS — no innerHTML with user data, no dangerouslySetInnerHTML equivalent
9. Tenant isolation — every query filtered by storeId from JWT, not from body
10. storeId from request.user ONLY — search for body.storeId, query.storeId

Compare with docs/audit/audit_2026_05_21.md to avoid reporting already-fixed issues.

Read CLAUDE.md §Critical Rules and feedback_learnings.md before starting.

Output JSON to stdout matching this schema exactly:
{
  "dimension": "security",
  "summary": { "total": N, "P0": N, "P1": N, "P2": N, "P3": N },
  "findings": [
    { "id": "SEC-001", "title": "...", "severity": "P0|P1|P2|P3", "file": "path:line", "evidence": "code snippet or grep result", "fix_sketch": "concrete change", "dimension": "security" }
  ]
}

Write the JSON to docs/audit/findings/2026-06-02-security.json and return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 2: Verify JSON file is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-security.json', 'utf8'))" && echo OK`

Expected: `OK`

- [ ] **Step 3: Read summary and confirm completeness**

Run: `node -e "const d=require('./docs/audit/findings/2026-06-02-security.json'); console.log(JSON.stringify(d.summary))"`

Expected: A `{ total, P0, P1, P2, P3 }` object with `total > 0` (the agent should have found at least a few items — even if minor).

If `total === 0`, the agent may have been too narrow. Re-run with broader scope.

---

### Task 5: Run Performance & DB dimension

**Files:**
- Create: `docs/audit/findings/2026-06-02-perf.json`

- [ ] **Step 1: Dispatch Explore agent**

```typescript
Agent({
  description: "Performance/DB audit",
  prompt: `Audit the jamicore codebase at D:\\project_saas_ecom for performance and database bugs.

Focus on:
1. N+1 queries — find loops that call DB inside a forEach/map. Grep for `.findMany` followed by inner `.findFirst` calls.
2. Missing indexes — review apps/backend/src/db/schema.ts and check if commonly-queried columns (storeId, customerId, orderId, status, createdAt) have indexes.
3. Transaction boundaries — order/cart/checkout mutations MUST be inside db.transaction(...). Grep for `db.transaction` to find usage; flag mutations that aren't.
4. Race conditions — inventory decrement, coupon usage increment, order number generation. Verify atomic SQL patterns (UPDATE ... WHERE quantity >= ?).
5. Redis cache usage — caching layer exists in apps/backend/src/lib/. Verify hot reads (products, store config) are cached and cache invalidation runs on writes.
6. BullMQ queues — email, webhook, abandoned-cart. Check for unbounded retries, missing DLQ.
7. Slow query patterns — SELECT * when only a few columns are needed, missing LIMIT, missing pagination on list endpoints.

Compare with docs/audit/audit_2026_05_21.md to avoid already-fixed issues.

Output JSON to docs/audit/findings/2026-06-02-perf.json with this schema:
{
  "dimension": "perf",
  "summary": { "total": N, "P0": N, "P1": N, "P2": N, "P3": N },
  "findings": [
    { "id": "PERF-001", "title": "...", "severity": "P0|P1|P2|P3", "file": "path:line", "evidence": "code or grep", "fix_sketch": "...", "dimension": "perf" }
  ]
}

Return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 2: Verify JSON file is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-perf.json', 'utf8'))" && echo OK`

Expected: `OK`

---

### Task 6: Run Code Quality & TypeScript dimension

**Files:**
- Create: `docs/audit/findings/2026-06-02-quality.json`

- [ ] **Step 1: Dispatch Explore agent**

```typescript
Agent({
  description: "Code quality/TS audit",
  prompt: `Audit the jamicore codebase at D:\\project_saas_ecom for TypeScript and code-quality issues.

CLAUDE.md §Critical Rules and §Pre-Completion Checklist are the source of truth. Flag ANY violation:

1. \`any\` type — grep -rE ":\s*any\b" apps/backend/src apps/dashboard/src apps/landing/src apps/storefront-food/src
2. console.log — grep -rE "console\.log" apps/backend/src
3. Inline preHandler — any route file with preHandler inside the route definition is a violation. Hooks belong in apps/backend/src/scopes/
4. Zod strictObject — every body validation MUST use z.strictObject(). Grep for z.object (not strict) on request body parsers.
5. Error codes — all error responses must use ErrorCodes from apps/backend/src/errors/codes.ts. Grep for plain `{ error: '...' }` without code.
6. require() — ESM only. Grep -rE "require\\(" apps/backend/src
7. File length — any .ts file > 500 lines is a flag.
8. Naming consistency — services end in .service.ts, repos in .repo.ts, routes in .route*.ts. Flag deviations.
9. JWT in response body — NEVER return JWT in JSON body. Should be in httpOnly cookie only.
10. Tenant isolation in non-route files — repos and services must not accept storeId as a parameter; they should derive from caller context (or take it explicitly but the route must source from JWT).

Output JSON to docs/audit/findings/2026-06-02-quality.json with this schema:
{
  "dimension": "quality",
  "summary": { "total": N, "P0": N, "P1": N, "P2": N, "P3": N },
  "findings": [
    { "id": "QUAL-001", "title": "...", "severity": "P0|P1|P2|P3", "file": "path:line", "evidence": "grep result or code", "fix_sketch": "...", "dimension": "quality" }
  ]
}

Return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 2: Verify JSON file is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-quality.json', 'utf8'))" && echo OK`

Expected: `OK`

---

### Task 7: Run UI/UX dimension

**Files:**
- Create: `docs/audit/findings/2026-06-02-uiux.json`

- [ ] **Step 1: Dispatch Explore agent**

```typescript
Agent({
  description: "UI/UX audit",
  prompt: `Audit the jamicore frontend codebases at D:\\project_saas_ecom (apps/dashboard, apps/storefront-food, apps/landing) for UI/UX bugs.

Focus on:
1. Z-index conflicts — dropdowns, modals, tooltips, FABs, sticky headers. Look for overlap bugs (e.g., BUG-002 known issue).
2. Responsive layout — mobile breakpoints (sm/md/lg), sidebar collapse, table overflow. Check each topbar/sidebar in apps/dashboard/src/lib/components/layout/.
3. Missing loading states — async data fetches with no skeleton/spinner. Grep for {#await} or loading={...} patterns.
4. Missing empty states — list pages with no "no results" UI.
5. Missing error states — pages that don't catch fetch errors.
6. Accessibility — aria-label on icon-only buttons, focus rings on interactive elements, role attributes, form labels.
7. Theme consistency — dark/light theme switching, color tokens used everywhere (no hardcoded hex except in design-system primitives).
8. Form validation feedback — inline error messages, not just toast on submit.
9. Long content overflow — text truncation, table column widths, modal scroll.

Compare with docs/audit/audit_2026_05_21.md to avoid already-fixed issues.

Output JSON to docs/audit/findings/2026-06-02-uiux.json with this schema:
{
  "dimension": "uiux",
  "summary": { "total": N, "P0": N, "P1": N, "P2": N, "P3": N },
  "findings": [
    { "id": "UI-001", "title": "...", "severity": "P0|P1|P2|P3", "file": "path:line", "evidence": "code or grep", "fix_sketch": "...", "dimension": "uiux" }
  ]
}

Return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 2: Verify JSON file is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-uiux.json', 'utf8'))" && echo OK`

Expected: `OK`

---

### Task 8: Run Cross-Scope Consistency dimension

**Files:**
- Create: `docs/audit/findings/2026-06-02-consistency.json`

- [ ] **Step 1: Dispatch Explore agent**

```typescript
Agent({
  description: "Cross-scope consistency audit",
  prompt: `Audit the jamicore codebase at D:\\project_saas_ecom for cross-scope consistency issues.

The platform has 4 auth scopes: public, merchant, customer, superAdmin. Each has:
- A scope hook file: apps/backend/src/scopes/{public,merchant,customer,superAdmin}.ts
- Route files: apps/backend/src/modules/*/*.route.*.ts
- Service files: apps/backend/src/modules/*/*.service.ts
- Frontend layouts: apps/dashboard/src/routes/{(merchant),(superadmin),(customer)}/
- Frontend topbars: apps/dashboard/src/lib/components/layout/{Dashboard,Admin}Topbar.svelte

Compare across all 4 for inconsistencies:

1. JWT payload shape — does every /me endpoint return the same fields? (id, email, name, isActive/lastLoginAt/role/...). Compare apps/backend/src/modules/auth/auth.route.{merchant,customer,superAdmin}.ts.
2. Topbar pattern — is the user dropdown (Profile, Sign out) consistent across DashboardTopbar, AdminTopbar, and any customer/storefront topbar?
3. Error response shape — every error must be { error, code, message }. Compare routes.
4. Pagination — list endpoints should accept { page, limit } and return { data, total, page, limit }. Compare modules.
5. Store status check — every merchant-scoped route must check store status. Compare hooks.
6. Plan expiry check — every merchant/customer route must check plan expiry. Compare hooks.
7. Cookies set in /me vs login — should be identical.
8. Logout endpoint symmetry — every scope has /logout that clears cookies + revokes refresh.
9. storeId propagation — request.storeId from JWT, never from body. Compare routes that accept a storeId param.
10. Naming — endpoints follow REST: GET/POST/PUT/PATCH/DELETE. No verbs in URL.

Output JSON to docs/audit/findings/2026-06-02-consistency.json with this schema:
{
  "dimension": "consistency",
  "summary": { "total": N, "P0": N, "P1": N, "P2": N, "P3": N },
  "findings": [
    { "id": "CONS-001", "title": "...", "severity": "P0|P1|P2|P3", "file": "path:line", "evidence": "comparison", "fix_sketch": "...", "dimension": "consistency" }
  ]
}

Return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 2: Verify JSON file is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-consistency.json', 'utf8'))" && echo OK`

Expected: `OK`

---

## Phase 3: Adversarial Verify

### Task 9: Verify all findings

**Files:**
- Create: `docs/audit/findings/2026-06-02-verified.json`

For each finding in the 5 JSON files, dispatch a 2nd Explore agent to refute it. Drop false positives.

- [ ] **Step 1: Concatenate all 5 findings files into one working file**

Run:

```powershell
$findings = @()
foreach ($dim in @('security', 'perf', 'quality', 'uiux', 'consistency')) {
    $findings += (Get-Content "docs/audit/findings/2026-06-02-$dim.json" | ConvertFrom-Json).findings
}
$findings | ConvertTo-Json -Depth 10 | Set-Content "docs/audit/findings/2026-06-02-raw.json"
```

- [ ] **Step 2: Dispatch verification agent (use Pipeline pattern for efficiency)**

```typescript
Agent({
  description: "Adversarial verify findings",
  prompt: `Read docs/audit/findings/2026-06-02-raw.json. It contains findings from a code audit.

For EACH finding, read the cited file:line and decide:
- confirmed: true if the bug is real and the cited line actually contains the claimed issue
- confirmed: false if the finding is a false positive, misunderstanding, or the line doesn't actually contain the issue
- note: brief justification (1-2 sentences)

Default to refuted (confirmed: false) if uncertain. False positives are common in audits.

Output JSON to docs/audit/findings/2026-06-02-verified.json with this schema:
{
  "summary": { "total": N, "confirmed": N, "refuted": N },
  "verified_findings": [
    { "id": "...", "original": {...}, "confirmed": true|false, "note": "..." }
  ],
  "rejected_findings": [
    { "id": "...", "title": "...", "reason": "..." }
  ]
}

Return a one-line summary.`,
  subagent_type: "Explore",
})
```

- [ ] **Step 3: Verify verified JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/audit/findings/2026-06-02-verified.json', 'utf8'))" && echo OK`

Expected: `OK`

- [ ] **Step 4: Confirm verification ratio is sane**

Run: `node -e "const d=require('./docs/audit/findings/2026-06-02-verified.json'); console.log(JSON.stringify(d.summary))"`

Expected: At least 30% of findings are confirmed. If 0% confirmed, the original agents were over-eager. If 100% confirmed, the verifier was too lenient. Both are red flags.

---

## Phase 4: Synthesize Audit Report

### Task 10: Write the audit report

**Files:**
- Create: `docs/audit/audit_2026_06_02.md`

- [ ] **Step 1: Read all 5 dimension JSONs and the verified JSON**

Read:
- `docs/audit/findings/2026-06-02-security.json`
- `docs/audit/findings/2026-06-02-perf.json`
- `docs/audit/findings/2026-06-02-quality.json`
- `docs/audit/findings/2026-06-02-uiux.json`
- `docs/audit/findings/2026-06-02-consistency.json`
- `docs/audit/findings/2026-06-02-verified.json`

- [ ] **Step 2: Write the report file**

Create `docs/audit/audit_2026_06_02.md` with this template (replace placeholders with actual numbers and findings):

```markdown
# Full Platform Audit — 2026-06-02

## Summary

| Dimension | P0 | P1 | P2 | P3 | Confirmed | Rejected |
|-----------|----|----|----|----|-----------|----------|
| Security & Auth | N | N | N | N | N | N |
| Performance & DB | N | N | N | N | N | N |
| Code Quality & TS | N | N | N | N | N | N |
| UI/UX | N | N | N | N | N | N |
| Cross-Scope Consistency | N | N | N | N | N | N |
| **TOTAL** | **N** | **N** | **N** | **N** | **N** | **N** |

**Overall risk level:** [LOW | MEDIUM | HIGH] — explain in 1-2 sentences.

## User-Reported Bugs (Fixed in Phase 1)

### [BUG-001] Settings page: "Failed to load admin profile"
- **Root cause:** `/api/v1/admin/auth/me` did not return `lastLoginAt`; frontend read it.
- **Fix:** Added `lastLoginAt` to the `/me` response shape in `apps/backend/src/modules/auth/auth.route.superAdmin.ts`.
- **Status:** Fixed in commit "[commit hash]".

### [BUG-002] User dropdown overlap with "+ Add Category"
- **Root cause:** Default z-index on dropdown content was below page-level action button.
- **Fix:** Added `z-[60]` to dropdown content in `apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte`.
- **Status:** Fixed in commit "[commit hash]".

## P0 — Must Fix

[For each confirmed P0 finding, include:]
- **[id] [title]**
- File: `path:line`
- Evidence: code snippet
- Fix sketch: concrete change
- Estimated effort: S/M/L

## P1 — Should Fix This Sprint

[Same format as P0]

## P2 — Nice to Have

[Brief list]

## P3 — Style/Cosmetic

[Brief list]

## Rejected (False Positives)

[Each rejected finding with a 1-line reason]

## Recommended Next Steps

1. [First P0 to fix]
2. [Second P0]
3. [First P1]
4. ...

A follow-up implementation plan will be created from this report.
```

- [ ] **Step 3: Commit the report**

```powershell
git add docs/audit/audit_2026_06_02.md
git add docs/audit/findings/
git commit -m "docs: full platform audit 2026-06-02 with severity-tagged findings"
```

---

## Phase 5: Update PROGRESS.md

### Task 11: Final PROGRESS update

**Files:**
- Modify: `docs/PROGRESS.md`

- [ ] **Step 1: Read the current PROGRESS.md**

Run: Read `docs/PROGRESS.md`.

- [ ] **Step 2: Append audit completion entry**

Add to the 2026-06-02 section:

```markdown
### Phase 2 — Audit Complete
- Ran 5 parallel Explore agents: security, perf, quality, ui/ux, consistency
- Adversarial verify pass completed
- Total findings: N (N P0, N P1, N P2, N P3) — N confirmed, N rejected
- Report: docs/audit/audit_2026_06_02.md

### Follow-up
- Create separate implementation plan from P0/P1 findings
- Run pnpm typecheck after each follow-up fix
```

- [ ] **Step 3: Commit**

```powershell
git add docs/PROGRESS.md
git commit -m "docs: PROGRESS audit phase 2 complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|--------------|------|
| Goals 1 (parallel Explore agents) | Tasks 4–8 |
| Goal 2 (severity-tagged findings) | Tasks 4–8 (schema enforced) |
| Goal 3 (adversarial verify) | Task 9 |
| Goal 4 (audit report) | Task 10 |
| Goal 5 (PROGRESS update) | Task 11 |
| Goal 6 (fix 2 known bugs) | Tasks 1–3 |
| Non-Goals (no refactor) | Plan stays focused on bug fixes + audit |
| Audit Dimensions (5) | Tasks 4–8, one per dimension |
| Severity scale | Defined in spec, used in JSON schema |
| Output doc structure | Task 10 template |
| Fix plan prioritization | Phase 1 (known bugs) → Phase 2 (audit) → Phase 3 (P0 follow-up — separate plan) |
| Verification (typecheck) | Steps in Tasks 1, 2, 3, 11 |
| Commit strategy | 1 docs commit + 1 per fix |

**Placeholder scan:** No TBD/TODO. Each Explore agent has a complete prompt with schema. The actual fix sketches in the report are filled in from the audit output.

**Type consistency:** `lastLoginAt` used in Tasks 1 and 3. `z-[60]` used in Task 2. JSON file paths used consistently across Tasks 4–10.

**Coverage gap:** The P0/P1 follow-up fixes from the audit are intentionally a SEPARATE plan (per spec: "A follow-up implementation plan will be created from the audit output"). This keeps this plan bounded and lets the user review findings before committing to fix work.

---

## Out of Scope (will be a separate plan after user review)

- Fixes for P0/P1 findings from the audit (Task 10 output)
- Performance optimization beyond bug-causing issues
- Refactoring for style only
- New tests beyond verifying the 2 user-reported bugs are fixed

---

## Reference

- Spec: `docs/superpowers/specs/2026-06-02-full-platform-audit-design.md`
- Previous audit: `docs/audit/audit_2026_05_21.md`
- Project rules: `CLAUDE.md` §Critical Rules and §Pre-Completion Checklist
- Lessons: `feedback_learnings.md` (20 rules)
