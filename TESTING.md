# E2E Testing Guide

## Prerequisites

- Node.js >= 22
- pnpm >= 10
- PostgreSQL running
- Redis running

### Hosts File (Windows)

Storefront tests use subdomain-based store resolution. Add this to your hosts file:

```
127.0.0.1  techgear.localhost
```

Location: `C:\Windows\System32\drivers\etc\hosts`

## Running Tests

### All E2E tests
```bash
pnpm test:e2e
```

### Storefront only
```bash
pnpm test:e2e:storefront
```

### Dashboard only
```bash
pnpm test:e2e:dashboard
```

### With UI mode (debugging)
```bash
pnpm --filter storefront e2e:ui
pnpm --filter dashboard e2e:ui
```

### View HTML report
```bash
pnpm --filter storefront e2e:report
pnpm --filter dashboard e2e:report
```

## Test Data

Tests rely on the seed script (`pnpm db:seed`). The following accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@saasplatform.com | Admin1234 |
| Merchant Owner | owner@techgear.com | Merchant1234 |
| Merchant Staff | staff@techgear.com | Merchant1234 |
| Customer | john@example.com | Customer1234 |
| Customer 2 | fatima@example.com | Customer1234 |

## Architecture

- `packages/e2e-utils/` - Shared auth helpers and API client
- `apps/storefront/e2e/` - Storefront E2E tests
- `apps/dashboard/e2e/` - Dashboard E2E tests
- Both apps run `pnpm db:seed` via `globalSetup` before tests

## Writing Tests

Use the auth fixtures for pre-authenticated pages:

```typescript
import { test, expect } from '../fixtures/auth.fixture.js';

test('merchant can see dashboard', async ({ merchantPage }) => {
  await merchantPage.goto('/dashboard');
  await expect(merchantPage.locator('text=Dashboard')).toBeVisible();
});
```

For UI-based auth flow tests, use the standard `test` from `@playwright/test`.
