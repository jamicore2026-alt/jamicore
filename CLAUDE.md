# CLAUDE.md — SaaS E-commerce Platform Harness

> The MODEL decides what code to write. The HARNESS governs when, where, and how it writes it.

## Agent Identity

You are Claude Code, the official CLI agent for Anthropic. You are operating on the **jamicore** SaaS e-commerce platform — a multi-tenant headless e-commerce system built with Fastify v5, Drizzle ORM, PostgreSQL, Redis, and SvelteKit.

## Five Harness Subsystems

```
┌─────────────────────────────────────────────────────────────┐
│                    HARNESS SUBSYSTEMS                        │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│ Instructions│    State    │ Verification│      Scope      │
│  (CLAUDE.md)│(feature_list│  (Tests +   │  (4 auth scopes │
│             │  + PROGRESS)│   Lint)     │   + modules)   │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│              Session Lifecycle (init → work → verify → commit)│
└─────────────────────────────────────────────────────────────┘
```

## 1. Instructions (This File)

### Project Context

| Attribute | Value |
|---|---|
| **Project Name** | jamicore |
| **Type** | Multi-tenant headless e-commerce SaaS |
| **Backend** | Fastify v5 + Drizzle ORM + PostgreSQL 17 |
| **Frontend** | SvelteKit (Dashboard + Storefront) |
| **Package Manager** | pnpm ONLY (never npm) |
| **Auth** | 4 scopes (public, merchant, customer, superAdmin) |
| **Platform** | Windows 11 (PowerShell primary, Bash available) |

### Critical Rules (Non-Negotiable)

1. **pnpm ONLY** — Never use `npm install`, `npm run`, or any npm command
2. **Zero TypeScript errors** — All code must pass `pnpm typecheck`
3. **Phase-by-phase execution** — Complete one phase fully before starting the next
4. **No inline preHandler** — Hooks only in scope files, never inline in routes
5. **Zod strictObject()** — All route body validation uses `z.strictObject()`
6. **storeId from JWT ONLY** — Never from request body/query params
7. **Server-side pricing** — All prices computed from DB at checkout; never trust client
8. **httpOnly cookies** — JWT tokens NEVER in response body
9. **No console.log** — Use `fastify.log.debug/info/warn/error` only
10. **No `any` type** — TypeScript strict mode everywhere
11. **ESM imports only** — No `require()` anywhere
12. **Tenant isolation** — Every query filtered by storeId from JWT

### Architecture Quick Reference

```
┌─────────────────────────────────────────────────┐
│                   Fastify v5                     │
├─────────┬──────────┬──────────┬────────────────┤
│  Public │ Merchant  │ Customer  │   SuperAdmin   │
│  Scope  │  Scope   │  Scope    │    Scope       │
│ (browse)│ (manage)  │ (shop)    │  (platform)    │
├─────────┴──────────┴──────────┴────────────────┤
│              Shared Service Layer                │
│  auth · store · product · order · cache · queue │
│  pricing · coupon · shipping · tax · upload     │
├─────────────────────────────────────────────────┤
│         PostgreSQL    │    Redis (ioredis)       │
│       (Drizzle ORM)   │   (cache + BullMQ)      │
└─────────────────────────────────────────────────┘
```

### File Locations

| File | Purpose |
|---|---|
| `apps/backend/src/index.ts` | Main entry (max 60 lines) |
| `apps/backend/src/scopes/*.ts` | Auth hooks (encapsulated per scope) |
| `apps/backend/src/routes/*/` | Route files (HTTP only, no business logic) |
| `apps/backend/src/services/*.service.ts` | Business logic |
| `apps/backend/src/db/schema.ts` | Database schema |
| `apps/backend/src/config/env.ts` | Environment validation (Zod) |
| `apps/backend/src/errors/codes.ts` | Standardized error codes |

## 2. State (feature_list.json + PROGRESS.md)

Before starting work, read `feature_list.json` to understand what features exist and what's in progress.
After each session, update `PROGRESS.md` with what was done.

## 3. Verification (Tests + Lint + TypeCheck)

Before marking any task complete:

```powershell
# 1. TypeScript check
pnpm typecheck

# 2. Lint check (if configured)
pnpm lint

# 3. Build check
pnpm build

# 4. Verify no new console.log
Select-String -Path "apps/backend/src" -Pattern "console\.log" -Recurse
```

## 4. Scope (4 Auth Scopes)

| Scope | Prefix | Auth Source | Hook File |
|---|---|---|---|
| **public** | `/api/v1/public` | Host header (no JWT) | `scopes/public.ts` |
| **merchant** | `/api/v1/merchant` | JWT (storeId + userId) | `scopes/merchant.ts` |
| **customer** | `/api/v1/customer` | JWT (customerId + storeId) | `scopes/customer.ts` |
| **superAdmin** | `/api/v1/admin` | JWT (superAdminId) | `scopes/superAdmin.ts` |

## 5. Session Lifecycle

### Phase 1: Initialize

```powershell
# Run the init script
.\init.ps1
```

This verifies:
- Node.js 22+ installed
- pnpm 9+ installed
- Docker running (PostgreSQL + Redis)
- Environment file exists
- Database migrations up to date
- No uncommitted changes that would conflict

### Phase 2: Select Work

1. Read `feature_list.json`
2. Select exactly ONE unfinished feature
3. Read `PROGRESS.md` for context from previous sessions

### Phase 3: Implement

1. Write code following all Critical Rules
2. Run `pnpm typecheck` after every significant change
3. Test the feature (curl, browser, or automated tests)

### Phase 4: Verify

```powershell
pnpm typecheck
```

- Must pass with ZERO errors
- No new console.log introduced
- No `any` types introduced

### Phase 5: Update State

1. Update `PROGRESS.md` with what was done
2. Update `feature_list.json` if feature status changed
3. Ensure clean restart path exists

### Phase 6: Commit (User-Requested Only)

Only commit when user explicitly asks. Follow git safety:
- Never amend published commits
- Never force-push to main
- Write descriptive commit messages

## Pre-Completion Checklist

Before marking ANY task complete, verify ALL of these:

- [ ] **No console.log anywhere** — Use `fastify.log.*` only
- [ ] **No `any` type** — TypeScript strict mode
- [ ] **No inline preHandler** — Hooks in scopes only
- [ ] **Zod strictObject() on every route body** — Rejects unknown keys
- [ ] **ownerEmail/ownerName not in public responses** — Filter sensitive fields
- [ ] **JWT in httpOnly cookie** — NEVER return in response body
- [ ] **storeId from request.user (JWT)** — NEVER from body/query
- [ ] **No require()** — ESM imports only
- [ ] **fastify.log.* for logging** — Never console
- [ ] **Redis for caching + queues** — Never in-memory
- [ ] **pnpm ONLY** — Never npm commands

## Error Handling Pattern

```typescript
import { ErrorCodes } from '../../errors/codes';

// CORRECT
reply.status(403).send({
  error: 'Forbidden',
  code: ErrorCodes.STORE_SUSPENDED,
  message: 'Store is suspended'
});
```

## Security Headers (Verify with curl)

```bash
curl -I http://localhost:3000/api/v1/public/store
```

Expected: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, etc.

## Contact / Reference

- **README.md**: Full project documentation
- **STATUS.md**: Current project status and blockers
- **TESTING.md**: Testing patterns and commands
- **DEPLOY.md**: Deployment guide
- **docs/**: Additional documentation (audit reports, UX plans)
- **.claude/skills/saas-ecommerce-fastify/SKILL.md**: Detailed skill reference

---

*Last updated: 2026-05-13*
*Harness version: 1.0*
