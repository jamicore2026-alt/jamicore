# Full Platform Audit + Fix Plan — 2026-06-02

## Context

User reported 2 visible bugs:

1. **Settings page empty/error:** Super admin settings page at `apps/dashboard/src/routes/(superadmin)/admin/settings/+page.svelte` shows "Failed to load admin profile" instead of the profile form.
2. **User menu overlap:** User dropdown (Profile / Sign out) overlaps with the "+ Add Category" floating action button (or sidebar item) on the merchant dashboard.

User requested a **full platform audit** covering Security & Auth, Performance & DB, Code Quality & TypeScript, and UI/UX.

Most recent audit (`docs/audit/audit_2026_05_21.md`) reported "risk LOW" and fixed 2 P0-level issues. This audit is a fresh sweep since 2026-05-21.

---

## Goals

1. Fan out 5 parallel Explore agents across the codebase.
2. Each agent produces severity-tagged findings with file:line evidence.
3. Adversarially verify each finding (independent refutation pass).
4. Produce audit report: `docs/audit/audit_2026_06_02.md`.
5. Produce prioritized fix plan: 2 known bugs first, then P0 from audit, then P1.
6. Update `PROGRESS.md` with the audit results.

## Non-Goals

- Refactoring beyond what is required to fix a found bug.
- Adding new features.
- Performance optimization unrelated to a found bug.

---

## Audit Dimensions (5 parallel agents)

| # | Dimension | Scope | Output file |
|---|-----------|-------|-------------|
| 1 | **Security & Auth** | All 4 scopes: JWT verify, CSRF, cookies, MFA flow, rate limits, secrets in env, SQL injection, XSS, tenant isolation, storeId flow | `docs/audit/findings/2026-06-02-security.json` |
| 2 | **Performance & DB** | All modules: N+1 queries, missing indexes, transaction boundaries, race conditions (inventory/order), Redis cache usage, BullMQ queues | `docs/audit/findings/2026-06-02-perf.json` |
| 3 | **Code Quality & TS** | All files: `any` types, `console.log`, inline preHandler, Zod strictObject usage, error code consistency, file length, naming | `docs/audit/findings/2026-06-02-quality.json` |
| 4 | **UI/UX** | All 3 frontend apps: z-index/overlap, responsive layout, missing loading/empty/error states, theme consistency, a11y (aria-label, focus rings) | `docs/audit/findings/2026-06-02-uiux.json` |
| 5 | **Cross-scope consistency** | Super admin vs merchant vs customer topbars, error responses, JWT payload shape, storeId propagation, route naming | `docs/audit/findings/2026-06-02-consistency.json` |

Each agent uses the `Explore` subagent type (read-only, fast) and must return:

- `findings[]`: `{ id, title, severity, file, line, evidence, fix_sketch, dimension }`
- `summary`: `{ total, P0_count, P1_count, P2_count, P3_count }`

Severity scale:

- **P0** — security vulnerability, data loss, tenant isolation breach, or build-blocking bug.
- **P1** — correctness bug, broken UX, race condition that can fire in production.
- **P2** — code smell, missing edge case, inconsistency.
- **P3** — cosmetic / style.

---

## Adversarial Verify

For each finding, a 2nd Explore agent re-reads the cited file:line and votes:

- `confirmed = true` if the bug is real and reproducible from the code alone.
- `confirmed = false` if the finding is a false positive, misunderstanding, or the cited line doesn't actually contain the claimed issue.

Findings with `confirmed = false` are dropped from the final report. A short note is kept for traceability.

---

## Output Document Structure

`docs/audit/audit_2026_06_02.md`:

```markdown
# Full Platform Audit — 2026-06-02

## Summary
| Dimension | P0 | P1 | P2 | P3 | Confirmed |
| ... |

## User-Reported Bugs (will be fixed in Phase 1)
- [BUG-001] Settings page: "Failed to load admin profile" — see fix plan §1
- [BUG-002] User menu overlap with "+ Add Category" — see fix plan §2

## P0 — Must fix
- [findings with file:line evidence + fix sketch]

## P1 — Should fix this sprint
- [findings]

## P2 — Nice to have
- [findings]

## P3 — Style/cosmetic
- [findings]

## Rejected (false positives)
- [list with reason]
```

---

## Fix Plan (Prioritized)

### Phase 1 — Immediate (User-Reported Bugs)

#### BUG-001: Settings page "Failed to load admin profile"

**Root cause (preliminary):** `/api/v1/admin/auth/me` at `apps/backend/src/modules/auth/auth.route.superAdmin.ts:207` returns `{ id, email, name, isActive }` only. The page at `apps/dashboard/src/routes/(superadmin)/admin/settings/+page.svelte:130` reads `admin.lastLoginAt`. Since `lastLoginAt` is not in the response, the page may render an error path.

**Fix:** either

- (A) Backend: add `lastLoginAt` to the `/me` response shape.
- (B) Frontend: render only the fields that are present, and show "Last Login: —" if absent.

**Decision:** A — add `lastLoginAt` to the `/me` response. The data is already loaded by `authService.getSuperAdminProfile`; we just need to project it into the response. This matches the merchant `/me` endpoint behavior.

**Verify:** `pnpm typecheck` passes; reload `/admin/settings` shows profile.

#### BUG-002: User menu overlap with "+ Add Category"

**Root cause (preliminary):** `apps/dashboard/src/lib/components/layout/DashboardTopbar.svelte:313` user dropdown uses default shadcn-svelte DropdownMenu z-index. The "+ Add Category" button (a FAB or page-level action) likely has a higher z-index, or the dropdown content doesn't float above it because of stacking-context issues.

**Fix:** in the dashboard topbar dropdown content, add explicit `z-50` (or `z-[100]`) class. Verify no other element creates a stacking context that traps the dropdown.

**Verify:** open user dropdown on merchant dashboard; "+ Add Category" is behind it; no visible overlap.

### Phase 2 — P0 from audit (next, in same PR or follow-up)

Each P0 gets a single commit with file:line + fix sketch from the audit report.

### Phase 3 — P1 from audit

Same pattern, single commit per P1.

### Phase 4 — P2/P3 cleanup

Backlog for future sprints.

---

## Verification (per CLAUDE.md)

After each fix:

```powershell
pnpm typecheck   # 0 errors
```

After UI fixes, manual browser check OR Playwright snapshot to confirm visual fix.

After each fix, update `PROGRESS.md`.

---

## Commit Strategy

- 1 commit: `docs: full platform audit 2026-06-02 (with prioritized fix plan)`
- 1 commit: `fix(frontend): admin settings page shows profile (BUG-001)`
- 1 commit: `fix(frontend): user dropdown z-index no longer overlaps + Add Category (BUG-002)`
- N commits: one per P0 fix from audit
- N commits: one per P1 fix (may batch if small)

No force-push to main. Never amend published commits.

---

## Out of Scope

- New audit dimensions beyond the 5 above.
- Refactoring for style only.
- Performance optimization not tied to a finding.
- New tests beyond verifying the 2 user-reported bugs are fixed.

---

## Risks

- Parallel agent findings may contradict each other (e.g., one agent flags a `console.log` for removal, another flags it as intentional debug). The adversarial verify step is the single source of truth.
- Long-running audit (5 agents in parallel) consumes tokens. The user has confirmed this is acceptable.
- Some findings may require backend changes that need DB migration or restart — these are noted but not executed as part of this audit task.

---

## Reference

- `docs/audit/audit_2026_05_21.md` — previous audit, "LOW risk"
- `docs/audit/audit_realworld_comparison_2026_05_22.md` — real-world comparison
- `docs/audit/competitive_intelligence_2026_05_24.md` — competitive intel
- `CLAUDE.md` §Pre-Completion Checklist
- `feedback_learnings.md` — 20 rules (error handler, Zod, hooks, cookies, pricing, decimal, race conditions, Windows)
