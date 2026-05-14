# AGENTS.md — Agent Roles & Lifecycle

## Agent Roles

This project uses the following specialized agents, defined in `.claude/agents/`:

| Agent | Role | When to Use |
|---|---|---|
| **code-reviewer** | Quality assurance | After writing security-critical code, before merging |
| **code-writer** | Feature implementation | Writing new functions, routes, services |
| **devops-engineer** | Infrastructure | CI/CD, Docker, deployment, monitoring |
| **project-manager** | Planning & coordination | Breaking down epics, tracking deliverables |
| **team-leader** | Orchestration | Coordinating multi-step features, unblocking work |
| **test-runner** | Validation | Running tests, verifying fixes, checking coverage |
| **ui-ux-engineer** | Frontend quality | UI components, accessibility, design systems |

## Agent Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   READ      │ →  │   INIT      │ →  │   SELECT    │ →  │  IMPLEMENT  │
│ CLAUDE.md   │    │  init.ps1   │    │  1 feature  │    │    code     │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   UPDATE    │ ←  │   VERIFY    │ ←  │    TEST     │ ← ─ ─ ─ ─ ┘
│   STATE     │    │  typecheck  │    │  feature    │
│ PROGRESS.md │    │  build      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Agent Dispatch Rules

### When to Spawn Agents

| Scenario | Agent(s) | Parallel? |
|---|---|---|
| New feature > 3 files | code-writer + project-manager | No |
| Security-critical code | code-reviewer | After code written |
| Frontend component | ui-ux-engineer | Yes |
| Deploy/config change | devops-engineer | Yes |
| Test failure | test-runner + code-reviewer | No |
| Complex multi-step | team-leader | No |

### Agent Prompt Template

When dispatching an agent, always include:

1. **What** — The task description
2. **Why** — Business/technical context
3. **Constraints** — Critical rules that MUST be followed
4. **Output** — Expected deliverable

Example:
```
Implement coupon validation at checkout.
Context: Customers can apply coupons; we need server-side validation.
Constraints: Use z.strictObject(), storeId from JWT, check usage limits inside transaction.
Output: Updated checkout route + coupon service method.
```

## Human-in-the-Loop Points

The following actions require explicit user confirmation before proceeding:

1. **Destructive operations** — `git reset --hard`, `git push --force`, dropping tables
2. **Production deployment** — Any change to live environment
3. **Dependency changes** — Adding/removing packages
4. **Database migrations** — Schema changes affecting production
5. **Secret changes** — Modifying `.env` or CI/CD secrets

## Memory System

Agent memory is stored in `.claude/agent-memory/` and persists across sessions.
Per-project memory is in `C:\Users\aroky\.claude\projects\D--project-saas-ecom\memory\`.

Key memory files:
- `user_role.md` — User preferences (Tamil speaker, phase-by-phase, zero errors, pnpm)
- `project_plan.md` — Phase roadmap (Backend DONE, Frontend F1+F2 DONE, next: F3)
- `tech_stack.md` — Architecture, 4 scopes, 31 tables, ~96 endpoints
- `feedback_learnings.md` — 20 rules: error handler, Zod, hooks, cookies, pricing, decimal, race conditions, Windows

## Communication Style

- **Tamil user** — Responds well to Tamil phrases mixed with English technical terms
- **Phase-by-phase** — Prefers completing one phase fully before starting next
- **Zero errors** — TypeScript must pass with 0 errors before any commit
- **Concise** — Short, direct updates. No trailing summaries unless asked.

---

*This file is read by all agents dispatched to this project.*
