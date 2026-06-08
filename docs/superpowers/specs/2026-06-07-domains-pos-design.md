# Domains & POS System — Design Spec

**Date:** 2026-06-07
**Project:** jamicore
**Phase:** Feature development (post-audit)
**Status:** Design approved — pending implementation plan

---

## Overview

This spec covers two new feature areas for the jamicore SaaS e-commerce platform:

1. **Self-Service Domain Configuration** — Merchants manage subdomains and custom domains with automated DNS verification and SSL provisioning (zero superadmin involvement required)
2. **Basic POS (Point of Sale)** — Quick-sale mode for in-store purchases, sharing inventory with the online store, accessible via the existing merchant dashboard

---

## Section 1: Domain Configuration System

### 1.1 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      DOMAIN CONFIG SYSTEM                         │
├─────────────┬──────────────────────┬─────────────────────────────┤
│  MERCHANT   │      BACKEND API     │      INFRASTRUCTURE          │
│  DASHBOARD  │   (Fastify v5)       │    (Caddy + DNS)             │
├─────────────┼──────────────────────┼─────────────────────────────┤
│             │                      │                              │
│  Domains    │  domain.service.ts   │  ┌──────────────────────┐   │
│  Settings   │  ┌────────────────┐  │  │   Caddy Admin API    │   │
│  Page       │  │ CRUD endpoints │  │  │   (localhost:2019)   │   │
│  ┌───────┐  │  │ for domains    │  │  │                      │   │
│  │Subdom │  │  └───────┬────────┘  │  │ POST /config/apps/   │   │
│  │Config │  │          │           │  │   http/servers/...   │   │
│  ├───────┤  │  ┌───────▼────────┐  │  │   /routes            │   │
│  │Custom │  │  │ dns.service.ts │  │  └──────────┬───────────┘   │
│  │Domains│  │  │ DNS lookup     │  │             │                │
│  │Table  │  │  │ (dns/promises) │  │  ┌──────────▼───────────┐   │
│  ├───────┤  │  └───────┬────────┘  │  │   Caddyfile Routes   │   │
│  │SSL    │  │          │           │  │   *.jamicore.com      │   │
│  │Status │  │  ┌───────▼────────┐  │  │   mystore.com         │   │
│  └───────┘  │  │ BullMQ Job     │  │  │   anotherstore.com    │   │
│             │  │ (5min poll)   │  │  └──────────────────────┘   │
│   Real-time│  │ verify + SSL  │  │                              │
│   progress │  └────────────────┘  │  ┌──────────────────────┐   │
│             │                      │  │   Let's Encrypt      │   │
│             │  domain.repo.ts      │  │   Auto SSL Certs     │   │
│             │  ┌────────────────┐  │  └──────────────────────┘   │
│             │  │ stores table   │  │                              │
│             │  │ domain column  │  │                              │
│             │  │ customDomain   │  │                              │
│             │  │ verified flag  │  │                              │
│             │  └────────────────┘  │                              │
└─────────────┴──────────────────────┴─────────────────────────────┘
```

**Data flow summary:**
1. Merchant types domain → Backend validates → Caddy API registers route → DNS verification token generated
2. Merchant adds CNAME/TXT record → BullMQ job polls every 5min → DNS verified → SSL auto-provisioned → Status updated
3. UI shows real-time progress: `pending_dns → dns_verified → ssl_provisioning → live`

### 1.2 Database Changes

**New table: `domain_verifications`**

```sql
CREATE TABLE domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storeId UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verificationType TEXT NOT NULL DEFAULT 'cname',  -- 'cname' or 'txt'
  cnameTarget TEXT,                                -- e.g. "store-abc123.jamicore.com"
  txtName TEXT,                                    -- e.g. "_jamicore-verify.mystore.com"
  txtValue TEXT,                                   -- unique verification token
  status TEXT NOT NULL DEFAULT 'pending_dns',      -- pending_dns, dns_verified, ssl_provisioning, live, failed
  sslStatus TEXT,                                  -- pending, active, error
  verifiedAt TIMESTAMP,
  lastCheckedAt TIMESTAMP,
  errorMessage TEXT,                               -- failure reason if any
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_domain_verifications_store ON domain_verifications(storeId);
CREATE INDEX idx_domain_verifications_status ON domain_verifications(status);
CREATE UNIQUE INDEX idx_domain_verifications_domain ON domain_verifications(domain);
```

**Existing `stores` columns used:**
- `domain` (text, UNIQUE) — subdomain (e.g. "techgear")
- `customDomain` (text, UNIQUE) — external custom domain
- `customDomainVerified` (boolean)
- `customDomainVerifiedAt` (timestamp)

**Plan gating:**
- `merchant_plans.includesCustomDomain` (boolean) — controls access to custom domain feature

### 1.3 File Structure

```
apps/backend/src/
├── modules/
│   └── domain/                          # NEW module
│       ├── domain.service.ts            # Business logic
│       ├── domain.repo.ts               # DB operations
│       ├── domain.route.merchant.ts     # Merchant endpoints
│       ├── domain.route.superAdmin.ts   # SuperAdmin endpoints (migrate from superAdmin/)
│       ├── domain.schema.ts             # Zod schemas
│       └── domain.helpers.ts            # Caddy API + DNS helpers
├── services/
│   ├── dns.service.ts                   # NEW — DNS lookup/resolution
│   └── caddy.service.ts                 # NEW — Caddy Admin API client
```

### 1.4 Backend Endpoints

| Method | Path | Auth | Schema | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/merchant/domains` | merchant | — | List all domains for store (subdomain + custom) |
| `GET` | `/api/v1/merchant/domains/check?domain=xyz` | merchant | `z.object({ domain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/) })` | Subdomain availability check |
| `PATCH` | `/api/v1/merchant/domains/subdomain` | merchant (OWNER only) | `z.strictObject({ domain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/) })` | Update subdomain |
| `POST` | `/api/v1/merchant/domains/custom` | merchant (OWNER, plan-gated) | `z.strictObject({ domain: z.string(), verificationType: z.enum(['cname', 'txt']) })` | Add custom domain |
| `GET` | `/api/v1/merchant/domains/custom/:id/status` | merchant | — | Real-time status for UI polling |
| `POST` | `/api/v1/merchant/domains/custom/:id/verify` | merchant | — | Manual re-trigger verification |
| `DELETE` | `/api/v1/merchant/domains/custom/:id` | merchant (OWNER only) | — | Remove custom domain + Caddy cleanup |

**SuperAdmin endpoints (migrated from `superAdmin.route.domains.ts`):**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/domains` | superAdmin | List all stores with custom domains (filter by verification status) |
| `POST` | `/api/v1/admin/domains/:id/verify` | superAdmin | Manual verify custom domain (override) |
| `POST` | `/api/v1/admin/domains/:id/reject` | superAdmin | Reject custom domain (sends notification) |

### 1.5 Service Architecture

**`domain.service.ts`:**
```
listDomains(storeId)
  → Returns { subdomain: { domain, storeUrl }, customDomains: [{ id, domain, status, sslStatus, ... }] }

updateSubdomain(storeId, subdomain)
  → Check availability across stores.domain + stores.customDomain + domain_verifications.domain
  → UPDATE stores SET domain = $1 WHERE id = $storeId
  → Invalidate cache: store:domain:{oldDomain}

checkSubdomainAvailability(subdomain)
  → SELECT 1 FROM stores WHERE domain = $1 LIMIT 1 (same check against customDomain + verifications)
  → Returns { available: boolean }

addCustomDomain(storeId, domain, verificationType)
  → Validate format (no protocol, no path)
  → Check plan.includesCustomDomain === true
  → Check domain uniqueness across all tables
  → Generate CNAME target: "store-{shortId}.jamicore.com" or TXT token: crypto.randomBytes(16).toString('hex')
  → INSERT domain_verifications
  → Call caddyService.addCustomDomainRoute(domain)
  → Enqueue BullMQ DomainVerificationJob (delay: 5min)
  → Return verification instructions

verifyCustomDomain(verificationId)
  → Fetch verification record
  → DNS resolve CNAME/TXT
  → If match → update status to dns_verified → trigger SSL provisioning
  → If no match → increment attempt counter, re-enqueue if < 288 attempts (24h)

removeCustomDomain(storeId, domainId)
  → DELETE domain_verifications WHERE id = $1 AND storeId = $2
  → Call caddyService.removeCustomDomainRoute(domain)
  → If stores.customDomain === this domain: clear customDomain fields
```

**`dns.service.ts`:**
```typescript
// Uses Node.js built-in dns/promises — no external dependencies
class DnsService {
  async resolveCname(domain: string): Promise<string[]> // dns.resolveCname
  async resolveTxt(domain: string): Promise<string[][]>  // dns.resolveTxt
  async verifyCnameRecord(domain: string, expectedTarget: string): Promise<boolean>
  async verifyTxtRecord(domain: string, expectedValue: string): Promise<boolean>
}
```

**`caddy.service.ts`:**
```typescript
// Communicates with Caddy Admin API (http://caddy:2019)
class CaddyService {
  async addCustomDomainRoute(domain: string): Promise<void>
    // GET /config/apps/http/servers/srv0/routes
    // Prepend new route at index 0 (priority over wildcard)
    // PATCH /config/apps/http/servers/srv0/routes

  async removeCustomDomainRoute(domain: string): Promise<void>
    // GET routes, filter out matching host, PATCH

  async getCertificateStatus(domain: string): Promise<'active' | 'pending' | 'error'>
    // GET /pki/certificates

  async listManagedDomains(): Promise<string[]>
    // GET /config/apps/http/servers/srv0/routes → extract hosts
}
```

### 1.6 DNS Verification Flow

```
MERCHANT                    BACKEND                     DNS              CADDY           BullMQ
   │ POST /domains/custom  │                          │                 │               │
   │──────────────────────>│                          │                 │               │
   │                       │ 1. Validate + check unique│                 │               │
   │                       │ 2. Generate CNAME/TXT     │                 │               │
   │                       │ 3. INSERT verification    │                 │               │
   │                       │ 4. Caddy API add route ─────────────────────>               │
   │                       │ 5. Enqueue job ─────────────────────────────────────────────>
   │  Response:            │                          │                 │               │
   │  { verificationId,    │                          │                 │               │
   │    instructions }     │                          │                 │               │
   │<──────────────────────│                          │                 │               │
   │                       │                          │                 │               │
   │ Merchant adds DNS     │                          │                 │               │
   │ record at provider    │                          │                 │               │
   │                       │     ┌─── BullMQ Job (every 5 min) ─────┐ │               │
   │                       │     │ DNS resolve domain               │ │               │
   │                       │     │   → CNAME: target match?         │>│               │
   │                       │     │   → TXT: value match?            │ │               │
   │                       │     │                                  │ │               │
   │                       │     │ IF MATCH:                        │ │               │
   │                       │     │   status → dns_verified          │ │               │
   │                       │     │   trigger SSL ───────────────────────────────────>
   │                       │     │   SSL provisioned ────────────────────────────────>
   │                       │     │   status → live                                    │
   │                       │     │   stores.customDomainVerified = true               │
   │                       │     │                                  │ │               │
   │                       │     │ IF NO MATCH (attempts < 288):    │ │               │
   │                       │     │   re-enqueue (5 min delay)       │ │               │
   │                       │     │ IF NO MATCH (attempts >= 288):   │ │               │
   │                       │     │   status → failed                │ │               │
   │                       │     │   error = "timed out after 24h"  │ │               │
   │                       │     └──────────────────────────────────┘ │               │
   │                       │                          │                 │               │
   │ GET /domains/custom/  │                          │                 │               │
   │   :id/status          │                          │                 │               │
   │──────────────────────>│                          │                 │               │
   │ { status, sslStatus,  │                          │                 │               │
   │   steps: [{step,done}]│                          │                 │               │
   │ }                     │                          │                 │               │
   │<──────────────────────│                          │                 │               │
```

### 1.7 Subdomain Flow

```
MERCHANT                    BACKEND
   │ PATCH /domains/subdomain │
   │─────────────────────────>│
   │                          │ 1. Validate format [a-z0-9-]{3,63}
   │                          │ 2. Check uniqueness across:
   │                          │    stores.domain + stores.customDomain + domain_verifications.domain
   │                          │ 3. UPDATE stores SET domain = $1
   │                          │ 4. Invalidate Redis cache: store:domain:{oldDomain}
   │  { subdomain: "...",    │
   │    storeUrl: "..." }    │
   │<─────────────────────────│
   │                          │
   │ GET /domains/check?     │
   │   domain=mybrand        │
   │─────────────────────────>│
   │ { available: boolean }  │
   │<─────────────────────────│
```

### 1.8 Caddy Configuration

**docker-compose.yml (development):**
```yaml
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
    - "2019:2019"      # NEW: Admin API (internal only in production)
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

**Caddyfile:**
```
{
  admin 0.0.0.0:2019
}

# Wildcard block handles all *.jamicore.com subdomains automatically
# Custom domains get added via Admin API at index 0 (priority over wildcard)
```

**Production:** Port 2019 exposed only on internal Docker network, never publicly. Backend container communicates via `http://caddy:2019`.

### 1.9 Error Codes (New)

```typescript
// In errors/codes.ts + codeToStatus map + codes.test.ts
DOMAIN_ALREADY_TAKEN         // 409 — Subdomain or custom domain in use
DOMAIN_INVALID_FORMAT        // 400 — Malformed domain string
DOMAIN_TOO_MANY              // 403 — Plan limit for custom domains exceeded
DOMAIN_VERIFICATION_FAILED   // 400 — DNS verification check failed
DOMAIN_SSL_FAILED            // 500 — Caddy SSL provisioning failed
DOMAIN_NOT_FOUND             // 404 — Domain verification record not found
```

---

## Section 2: Frontend — Domains Settings Page

### 2.1 Route

New route: `/dashboard/settings/domains`

Added to settings tab layout sidebar: `General → Branding → Storefront → STAFF → Shipping → Tax → Billing → Payments → Webhooks → Currency → Theme → Domains (NEW)`

### 2.2 File Structure

```
apps/dashboard/src/routes/(merchant)/dashboard/settings/domains/
├── +page.server.ts          # Loader: GET /api/v1/merchant/domains
├── +page.svelte             # Main page layout
├── DomainsSubdomain.svelte  # Subdomain editor with availability check
├── DomainsCustomTable.svelte# Custom domains list with status
├── DomainsAddModal.svelte   # Add custom domain modal
└── DomainsProgress.svelte   # Step progress bar component
```

### 2.3 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  SETTINGS  >  Domains                                            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🏠 PRIMARY SUBDOMAIN                           [ STATUS: ✓ ]│ │
│  │  ─────────────────────────────────────────────────────────── │ │
│  │  Your store URL:                                             │ │
│  │  ┌─────────────────────────────────────────────────┐ [SAVE] │ │
│  │  │ https:// techgear .jamicore.com                   │       │ │
│  │  └─────────────────────────────────────────────────┘       │ │
│  │  ✓ techgear is available                                    │ │
│  │  ⚠ Changing subdomain will break existing links             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  🌐 CUSTOM DOMAINS                            [+ ADD DOMAIN] │ │
│  │  ─────────────────────────────────────────────────────────── │ │
│  │  [LIVE DOMAIN]                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │ mystore.com                                     LIVE  │  │ │
│  │  │ SSL: ✅ Active  DNS: ✅ Verified  Added: Jun 1       │  │ │
│  │  │ [REMOVE]                                             │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  [PENDING DOMAIN]                                            │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │ shoeshop.io                                ⏳ PENDING  │  │ │
│  │  │ ● DNS Verification                               ⏳   │  │ │
│  │  │ ○ SSL Provisioning                               -    │  │ │
│  │  │ ○ Going Live                                     -    │  │ │
│  │  │ Add this CNAME record to your DNS:                    │  │ │
│  │  │ ┌──────────────────────────────────────────────────┐  │ │ │
│  │  │ │ NAME:  shoeshop.io                                │  │ │ │
│  │  │ │ TYPE:  CNAME                                      │  │ │ │
│  │  │ │ VALUE: store-xyz789.jamicore.com                  │  │ │ │
│  │  │ │        [COPY ALL]                                 │  │ │ │
│  │  │ └──────────────────────────────────────────────────┘  │ │ │
│  │  │ [VERIFY NOW]  [CANCEL]                               │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ℹ️ SETUP GUIDE                                     [▸ SHOW] │ │
│  │  ─────────────────────────────────────────────────────────── │ │
│  │  1. Add your domain in the Custom Domains section            │ │
│  │  2. Copy the CNAME/TXT record to your DNS provider           │ │
│  │  3. Wait for verification (auto, takes 5-10 minutes)         │ │
│  │  4. SSL issued automatically, your site goes live!           │ │
│  │  📺 Watch tutorial  |  📖 Full documentation                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Add Domain Modal

```
┌─────────────────────────────────────────────┐
│         ADD CUSTOM DOMAIN             [✕]    │
│                                              │
│  Domain name:                                │
│  ┌─────────────────────────────────────────┐│
│  │ myshop.com                               ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Verification method:                        │
│  ○ CNAME record (Recommended)                │
│  ○ TXT record                                │
│                                              │
│  ℹ️ CNAME is supported by all DNS providers  │
│              [CANCEL]    [ADD DOMAIN]         │
└─────────────────────────────────────────────┘
```

### 2.5 Empty State

```
┌─────────────────────────────────────────────┐
│        🌐 No Custom Domains Yet              │
│  Give your store a professional look with    │
│  your own domain name (e.g., mystore.com)    │
│          [+ ADD YOUR FIRST DOMAIN]           │
│  💡 Requires Pro plan or higher             │
│  📖 Setup takes ~10 minutes                 │
└─────────────────────────────────────────────┘
```

### 2.6 Key Interactions

| Interaction | Behavior |
|---|---|
| Subdomain type in input | Debounce 500ms → `GET /domains/check?domain=xyz` → ✓ available / ✗ taken |
| "Save" subdomain | `PATCH /domains/subdomain` → success toast → invalidate page data |
| "Add Domain" button | Open modal → fill form → `POST /domains/custom` |
| "Copy All" button | Copy DNS records to clipboard as formatted text |
| "Verify Now" button | `POST /domains/custom/:id/verify` — manual re-check |
| Status polling | Every 30 seconds when any domain has status `pending_dns` or `ssl_provisioning` |
| "Remove" button | Confirm dialog → `DELETE /domains/custom/:id` → refresh list |

### 2.7 Plan Gating

When `merchantPlans.includesCustomDomain === false`:
- "Add Domain" button disabled with tooltip: "Upgrade to Pro plan to use custom domains"
- Billing page plan comparison shows custom domain feature highlighted

---

## Section 3: POS System

### 3.1 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    POS SYSTEM                             │
├────────────────────┬─────────────────────────────────────┤
│   DASHBOARD UI     │          BACKEND                     │
│   /dashboard/pos   │                                     │
├────────────────────┼─────────────────────────────────────┤
│                    │                                     │
│  POS Page          │  pos.service.ts                     │
│  ┌──────────────┐  │  ┌───────────────────────────────┐ │
│  │Product Search│  │  │ createPosOrder(storeId,        │ │
│  │(search/barcode)│  │  │   cashierId, items, payment) │ │
│  ├──────────────┤  │  │ - Validate stock               │ │
│  │Cart Panel    │  │  │ - Deduct inventory (atomic)    │ │
│  │(items list)  │  │  │ - Calculate totals (server)    │ │
│  ├──────────────┤  │  │ - Create order (type: 'pos')   │ │
│  │Totals        │  │  │ - Generate receipt             │ │
│  │(subtotal/tax)│  │  └───────────────────────────────┘ │
│  ├──────────────┤  │                                     │
│  │Payment       │  │  pos.repo.ts                       │
│  │(cash/card)   │  │  ┌───────────────────────────────┐ │
│  ├──────────────┤  │  │ findProducts(storeId, search) │ │
│  │Receipt       │  │  │ findProductByBarcode(storeId, │ │
│  │(post-sale)   │  │  │   barcode)                    │ │
│  └──────────────┘  │  │ createPosOrder(data)           │ │
│                    │  └───────────────────────────────┘ │
│  Shared:           │                                     │
│  - Inventory from  │  pos.route.merchant.ts              │
│    online store    │  ┌───────────────────────────────┐ │
│  - Product catalog │  │ GET  /merchant/pos/products   │ │
│  - Tax rates       │  │      ?search=&barcode=        │ │
│  - Real-time stock │  │ POST /merchant/pos/orders      │ │
│                    │  │ GET  /merchant/pos/orders      │ │
│                    │  │ GET  /merchant/pos/orders/:id  │ │
│                    │  └───────────────────────────────┘ │
│                    │                                     │
│                    │  pos.schema.ts                      │
│                    │  (Zod strictObject validators)     │
└────────────────────┴─────────────────────────────────────┘
```

### 3.2 Database Changes

Minimal — leverages existing tables. Only adds column distinctions to `orders`:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS orderType TEXT DEFAULT 'online';
-- values: 'online' | 'pos'

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashierId UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymentMethod TEXT; -- 'cash' | 'card' | 'upi'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amountTendered DECIMAL; -- cash: amount customer gave
ALTER TABLE orders ADD COLUMN IF NOT EXISTS changeGiven DECIMAL;    -- cash: change returned
```

No new tables needed. POS shares inventory, product catalog, tax rates, and order tables with online store.

### 3.3 File Structure

```
apps/backend/src/modules/pos/
├── pos.service.ts         # createPosOrder business logic
├── pos.repo.ts            # Product search + order persistence
├── pos.route.merchant.ts  # Merchant POS endpoints
└── pos.schema.ts          # Zod validation schemas
```

### 3.4 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/merchant/pos/products?search=xxx&barcode=xxx` | merchant (CASHIER/OWNER/MANAGER) | Search products by name or barcode |
| `POST` | `/api/v1/merchant/pos/orders` | merchant (CASHIER/OWNER/MANAGER) | Create POS order |
| `GET` | `/api/v1/merchant/pos/orders?date=today&cashier=id` | merchant | List today's POS orders |
| `GET` | `/api/v1/merchant/pos/orders/:id` | merchant | POS order detail + receipt data |

### 3.5 Zod Schemas

```typescript
// pos.schema.ts
import { z } from 'zod';

const posOrderItemSchema = z.strictObject({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(0), // cents — DISPLAY ONLY, server re-fetches prices
});

export const createPosOrderSchema = z.strictObject({
  items: z.array(posOrderItemSchema).min(1),
  paymentMethod: z.enum(['cash', 'card', 'upi']),
  amountTendered: z.number().int().optional(), // required if cash
  customerPhone: z.string().optional(), // optional walk-in customer lookup
});

export const posProductQuerySchema = z.strictObject({
  search: z.string().optional(),
  barcode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

### 3.6 Service Logic

```typescript
// pos.service.ts
async function createPosOrder(
  storeId: string,
  cashierId: string,
  input: z.infer<typeof createPosOrderSchema>
) {
  return await db.transaction(async (tx) => {
    // 1. Fetch current prices from DB for all items (IGNORE client-sent prices)
    const productIds = input.items.map(i => i.productId);
    const dbProducts = await posRepo.findProductsByIds(tx, storeId, productIds);

    // 2. Validate stock: check every item has sufficient inventory
    for (const item of input.items) {
      const dbProduct = dbProducts.find(p => p.id === item.productId);
      if (!dbProduct) throw new AppError(ErrorCodes.PRODUCT_NOT_FOUND);
      if (dbProduct.currentQuantity < item.quantity) {
        throw new AppError(ErrorCodes.INSUFFICIENT_INVENTORY);
      }
    }

    // 3. Calculate totals server-side using dbProduct.price (cents) + tax
    const subtotal = input.items.reduce((sum, item) => {
      const dbProduct = dbProducts.find(p => p.id === item.productId)!;
      return sum + (dbProduct.price * item.quantity);
    }, 0);
    const tax = await taxService.calculateTax(storeId, subtotal);
    const total = subtotal + tax;

    // 4. Atomic inventory decrement
    for (const item of input.items) {
      await posRepo.decrementInventory(tx, item.productId, item.variantId, item.quantity);
    }

    // 5. Create order record
    const order = await posRepo.createOrder(tx, {
      storeId,
      customerId: null, // POS orders default to walk-in
      customerPhone: input.customerPhone,
      cashierId,
      orderType: 'pos',
      paymentMethod: input.paymentMethod,
      items: input.items.map(item => {
        const dbProduct = dbProducts.find(p => p.id === item.productId)!;
        return { ...item, price: dbProduct.price };
      }),
      subtotal,
      tax,
      total,
      amountTendered: input.amountTendered,
      changeGiven: input.paymentMethod === 'cash'
        ? (input.amountTendered || 0) - total
        : null,
      status: 'completed', // POS orders complete immediately
    });

    // 6. Return order + receipt data
    return { order, receipt: generateReceipt(order) };
  });
}
```

**Critical rules enforced:**
- Prices fetched from DB (never trust client `price` field)
- Inventory decremented atomically inside transaction (`UPDATE ... SET currentQuantity = currentQuantity - $qty WHERE currentQuantity >= $qty`)
- `orderType: 'pos'` distinguishes from online orders
- `orderNumber` uses same collision-free generation (`crypto.randomBytes` + retries)

### 3.7 POS Product Search

```typescript
// pos.repo.ts
async function findProducts(
  storeId: string,
  search?: string,
  barcode?: string,
  limit: number = 20
) {
  // Search by barcode (exact match on variant barcode)
  if (barcode) {
    return await db.query.products.findMany({
      where: and(
        eq(products.storeId, storeId),
        eq(products.barcode, barcode),
        eq(products.deletedAt, null)
      ),
      with: { variants: true },
      limit: 1,
    });
  }

  // Search by name (ILIKE for case-insensitive)
  if (search) {
    return await db.query.products.findMany({
      where: and(
        eq(products.storeId, storeId),
        ilike(products.name, `%${search}%`),
        eq(products.deletedAt, null)
      ),
      with: { variants: true },
      limit,
    });
  }

  // Default: return recent products
  return await db.query.products.findMany({
    where: and(
      eq(products.storeId, storeId),
      eq(products.deletedAt, null)
    ),
    with: { variants: true },
    limit,
    orderBy: desc(products.updatedAt),
  });
}
```

### 3.8 POS Page UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  POS                              Cashier: John    [12:34 PM] │
├────────────────────────────┬─────────────────────────────────┤
│                            │                                 │
│  🔍 Search products...     │  CART (3 items)                 │
│  📷 Scan Barcode           │  ─────────────────────────────  │
│  ───────────────────────── │                                 │
│                            │  Chicken Biryani         $12.00 │
│  RESULTS (4)               │  1 × Regular                    │
│  ┌──────────────────────┐  │  [－] [1] [＋]         [✕]     │
│  │ 🍗 Chicken Biryani   │  │                                 │
│  │ $12.00               │  │  Mutton Curry            $15.00 │
│  │ In Stock: 24         │  │  1 × Large                      │
│  │ [ADD TO CART]        │  │  [－] [1] [＋]         [✕]     │
│  ├──────────────────────┤  │                                 │
│  │ 🥘 Mutton Curry      │  │  Naan                     $3.00 │
│  │ $15.00               │  │  2 × Regular                    │
│  │ In Stock: 8          │  │  [－] [2] [＋]         [✕]     │
│  │ [ADD TO CART]        │  │                                 │
│  ├──────────────────────┤  │  ─────────────────────────────  │
│  │ 🍚 Jeera Rice        │  │  Subtotal:               $30.00 │
│  │ $5.00                │  │  Tax (5%):                $1.50 │
│  │ In Stock: 50         │  │  ─────────────────────────────  │
│  │ [ADD TO CART]        │  │  TOTAL:                  $31.50 │
│  ├──────────────────────┤  │                                 │
│  │ 🫓 Naan              │  │  [CASH]  [CARD]  [UPI]         │
│  │ $3.00                │  │                                 │
│  │ In Stock: 100        │  │  Amount Tendered:               │
│  │ [ADD TO CART]        │  │  ┌───────────┐                  │
│  └──────────────────────┘  │  │ $ 40.00   │                  │
│                            │  └───────────┘                  │
│                            │  Change: $8.50                   │
│                            │                                 │
│                            │  [CLEAR CART]  [CHARGE $31.50]  │
└────────────────────────────┴─────────────────────────────────┘
```

### 3.9 Post-Sale Receipt Modal

```
┌──────────────────────────────┐
│     ✓ ORDER COMPLETE          │
│  Order: #POS-20260607-0042    │
│  Date: Jun 7, 2026 12:34 PM   │
│  Cashier: John                │
│  ───────────────────────────  │
│  Chicken Biryani      $12.00  │
│  Mutton Curry         $15.00  │
│  Naan ×2               $6.00  │
│  ───────────────────────────  │
│  Subtotal             $33.00  │
│  Tax (5%)              $1.65  │
│  TOTAL                $34.65  │
│  ───────────────────────────  │
│  Cash Tendered        $40.00  │
│  Change                $5.35  │
│  [PRINT RECEIPT]  [NEW SALE]  │
└──────────────────────────────┘
```

### 3.10 Role-Based Access

**Cashier redirect:** `apps/dashboard/src/routes/(merchant)/dashboard/+layout.server.ts`:
```typescript
export async function load({ locals, url }) {
  if (locals.user?.role === 'CASHIER' && !url.pathname.startsWith('/dashboard/pos')) {
    throw redirect(307, '/dashboard/pos');
  }
  // ... rest of layout load
}
```

Cashier sees: POS page only. No sidebar. Top bar shows cashier name + current time. No access to products, orders, settings, or any other dashboard pages.

**Permission check:** Both POS page loader and API endpoints check `request.user.role` — CASHIER, MANAGER, and OWNER can all access POS. CASHIER cannot access other merchant endpoints (existing scope already handles this via role permissions).

---

## Section 4: Production Quick Wins

Small, high-impact fixes from the competitive audit to be completed alongside the feature work:

| # | Task | Effort | File(s) | Impact |
|---|---|---|---|---|
| QW-1 | Add explicit HTTP timeouts to external calls | 1 hour | `services/queue.service.ts`, payment service, upload service | Prevents hung requests if Stripe/Resend/S3 is slow |
| QW-2 | Add `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` headers | 2 hours | Rate limit plugin config | Standard API compliance |
| QW-3 | Add `traceparent` header propagation to Stripe/Resend/S3 calls | 1 hour | External HTTP client helpers | Foundation for future OpenTelemetry |
| QW-4 | Add `Api-Version: 1` response header | 30 min | `app.ts` or response hook | Foundation for API versioning |
| QW-5 | Include Caddy connectivity + DNS resolution in health check | 1 hour | `index.ts` `/health/ready` | Ops visibility |

---

## Section 5: Implementation Plan

### Phases

```
PHASE 1: Domain Backend
├── 1.1 DB migration (domain_verifications table)
├── 1.2 dns.service.ts (Node.js dns/promises)
├── 1.3 caddy.service.ts (Caddy Admin API client)
├── 1.4 domain.repo.ts + domain.service.ts
├── 1.5 domain.route.merchant.ts (all endpoints)
├── 1.6 domain.schema.ts (Zod validators)
├── 1.7 BullMQ DomainVerificationJob (repeatable, 5min)
├── 1.8 Error codes + codeToStatus mapping + test mirror
├── 1.9 Migrate superAdmin domain routes → domain.route.superAdmin.ts
│
PHASE 2: Domain Frontend
├── 2.1 /dashboard/settings/domains page + layout
├── 2.2 DomainsSubdomain.svelte (editor + availability check)
├── 2.3 DomainsCustomTable.svelte (list + status indicators)
├── 2.4 DomainsAddModal.svelte (form + verification type selector)
├── 2.5 DomainsProgress.svelte (step progress bar)
├── 2.6 Plan gating (banner if plan lacks custom domain)
├── 2.7 Settings layout tab addition
│
PHASE 3: Infrastructure
├── 3.1 Caddy Admin API enabled in docker-compose + Caddyfile
├── 3.2 Wildcard SSL verification for subdomain routing
├── 3.3 Production config: Admin API internal-only exposure
├── 3.4 End-to-end domain flow test (add → verify → live)
│
PHASE 4: POS Backend
├── 4.1 DB migration (orderType, cashierId, paymentMethod columns)
├── 4.2 pos.repo.ts (product search + barcode lookup + order create)
├── 4.3 pos.service.ts (createPosOrder with atomic inventory)
├── 4.4 pos.route.merchant.ts (4 endpoints)
├── 4.5 pos.schema.ts (Zod strictObject validators)
├── 4.6 Error codes (if new ones needed)
├── 4.7 Tests: unit + integration (Vitest)
│
PHASE 5: POS Frontend
├── 5.1 /dashboard/pos page + layout (two-column: search | cart)
├── 5.2 ProductSearch.svelte (search input + barcode input)
├── 5.3 CartPanel.svelte (items, qty controls, remove)
├── 5.4 PaymentPanel.svelte (cash/card/upi selector + amount tendered)
├── 5.5 ReceiptModal.svelte (post-sale receipt display)
├── 5.6 Cashier redirect logic in layout server load
├── 5.7 POS order badge in existing orders list
│
PHASE 6: Quick Wins + Verification
├── 6.1 HTTP timeouts on external calls
├── 6.2 Rate limit headers
├── 6.3 traceparent propagation
├── 6.4 Api-Version header
├── 6.5 Health check enhancement
├── 6.6 pnpm typecheck (all packages, 0 errors)
├── 6.7 pnpm test (all 828+ tests pass)
├── 6.8 scripts/check-console.js (clean)
├── 6.9 scripts/check-storeid.js (clean)
├── 6.10 scripts/check-prehandler.js (clean)
```

### Effort Estimates

| Phase | Description | Effort |
|---|---|---|
| Phase 1 | Domain backend (services, endpoints, BullMQ job) | 4-5 days |
| Phase 2 | Domain frontend (settings page, components) | 2-3 days |
| Phase 3 | Caddy + DNS infrastructure integration | 2-3 days |
| Phase 4 | POS backend (service, repo, endpoints, tests) | 2-3 days |
| Phase 5 | POS frontend (POS page, cart, payment, receipt) | 2-3 days |
| Phase 6 | Quick wins + full verification | 1 day |
| **Total** | | **13-18 days** |

### What's NOT in Scope

| Item | Reason | Future Phase |
|---|---|---|
| Custom domain email notifications (added, verified, failed) | Enhancement | P1 — after core works |
| Multi-counter POS (shift management, cash drawer) | User chose basic POS | POS Phase 2 |
| POS offline mode (network-down sales, sync when online) | User chose basic POS | POS Phase 3 |
| Thermal printer / barcode scanner hardware integration | Hardware-dependent | Future |
| POS-specific discounts or promotions | Shared coupons already work | Future |
| Customer display pole (customer-facing screen) | Hardware-dependent | Future |

---

## Section 6: Verification Checklist

Before marking ANY phase complete:
- [ ] `pnpm typecheck` — 0 errors across all packages
- [ ] `pnpm test` — All existing 828 tests pass + new module tests
- [ ] `node scripts/check-console.js` — No console.log in new code
- [ ] `node scripts/check-storeid.js` — storeId from JWT, never from body/query
- [ ] `node scripts/check-prehandler.js` — No inline preHandler in routes
- [ ] No `any` types in new code
- [ ] Zod `strictObject()` on all new POST/PATCH bodies
- [ ] `fastify.log.*` for logging, never `console.log`
- [ ] JWT tokens in httpOnly cookies
- [ ] POS: prices fetched from DB server-side (client price ignored)
- [ ] DNS lookups use Node.js `dns.promises` (no external dependencies)
- [ ] Caddy Admin API NOT exposed on public network (2019 internal only)

---

*Design approved: 2026-06-07*
*Next step: writing-plans skill for implementation plan*
