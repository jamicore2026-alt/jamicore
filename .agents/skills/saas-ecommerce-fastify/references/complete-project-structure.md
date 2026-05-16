# 📁 Complete Project Structure

```
D:/project_saas_ecom/
├── .claude/
│   └── skills/
│       └── saas-ecommerce-fastify/    ← Skill files
├── apps/
│   ├── backend/                        ← Fastify API
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          ← Drizzle schema
│   │   │   │   └── index.ts           ← DB connection
│   │   │   ├── plugins/
│   │   │   │   ├── cors.ts
│   │   │   │   ├── jwt.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── swagger.ts
│   │   │   │   ├── redis.ts
│   │   │   │   ├── compress.ts
│   │   │   │   └── index.ts           ← Plugin registration
│   │   │   ├── scopes/
│   │   │   │   ├── public.ts          ← Public scope
│   │   │   │   ├── merchant.ts        ← Merchant scope + hooks
│   │   │   │   ├── customer.ts        ← Customer scope + hooks
│   │   │   │   └── superAdmin.ts      ← SuperAdmin scope + hooks
│   │   │   ├── routes/
│   │   │   │   ├── public/
│   │   │   │   │   ├── store.ts
│   │   │   │   │   ├── products.ts
│   │   │   │   │   ├── reviews.ts
│   │   │   │   │   ├── cart.ts
│   │   │   │   │   └── analytics.ts
│   │   │   │   ├── merchant/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── store.ts
│   │   │   │   │   ├── products.ts
│   │   │   │   │   ├── categories.ts
│   │   │   │   │   ├── modifiers.ts
│   │   │   │   │   ├── orders.ts
│   │   │   │   │   ├── customers.ts
│   │   │   │   │   ├── reviews.ts
│   │   │   │   │   ├── coupons.ts
│   │   │   │   │   ├── analytics.ts
│   │   │   │   │   └── upload.ts
│   │   │   │   ├── customer/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── profile.ts
│   │   │   │   │   ├── orders.ts
│   │   │   │   │   ├── checkout.ts
│   │   │   │   │   ├── wishlist.ts
│   │   │   │   │   └── reviews.ts
│   │   │   │   └── superAdmin/
│   │   │   │       ├── auth.ts
│   │   │   │       ├── merchants.ts
│   │   │   │       ├── plans.ts
│   │   │   │       └── stores.ts
│   │   │   ├── services/
│   │   │   │   ├── cache.service.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── upload.service.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── customer.service.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts           ← Shared types
│   │   │   └── index.ts               ← Entry (max 60 lines)
│   │   ├── drizzle/
│   │   │   └── migrations/            ← Auto-generated
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── .env                       ← Environment variables
│   │   ├── .env.example
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin/                         ← SvelteKit Admin (future)
│   └── storefront/                    ← Next.js Storefront (future)
│
├── packages/
│   ├── shared-types/                  ← Shared TypeScript types
│   └── shared-utils/                  ← Shared utilities
│
├── .github/
│   └── workflows/
│       └── ci.yml                     ← CI/CD pipeline
│
├── .npmrc                             ← Force pnpm
├── pnpm-workspace.yaml                ← Workspace config
├── package.json                       ← Root package.json
├── turbo.json                         ← Turborepo config
└── README.md
```

## Root package.json

```json
{
  "name": "saas-ecommerce",
  "private": true,
  "version": "1.0.0",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:generate": "pnpm --filter backend db:generate",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:studio": "pnpm --filter backend db:studio",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

## pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"]
    }
  }
}
```

## Final Verification Checklist

Before marking project complete, verify:

### Package Management
- [ ] Only pnpm used (no npm commands anywhere)
- [ ] pnpm-workspace.yaml configured
- [ ] turbo.json configured
- [ ] packageManager field set in package.json

### Security (20-point checklist above)
- [ ] All 20 security items verified
- [ ] Security headers present
- [ ] pnpm audit passes

### Architecture
- [ ] 4 scopes implemented (public, merchant, customer, superAdmin)
- [ ] No inline preHandler (hooks in scopes only)
- [ ] Routes + Services pattern used
- [ ] Encapsulation working correctly

### Database
- [ ] Drizzle ORM used (no raw SQL)
- [ ] Relations defined
- [ ] Migrations generated
- [ ] RLS enabled (optional but recommended)

### Performance
- [ ] N+1 queries eliminated (use `with` clause)
- [ ] Redis for caching
- [ ] BullMQ for queues
- [ ] Rate limiting enabled

### TypeScript
- [ ] Strict mode enabled
- [ ] No `any` types
- [ ] All imports typed

**Project is production-ready when ALL items are checked!**