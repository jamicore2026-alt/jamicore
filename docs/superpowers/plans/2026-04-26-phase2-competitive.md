# Phase 2: Competitive Required — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 5 competitive features: Live Exchange Rates, Advanced Payments (Apple/Google Pay), Cookie Consent & CCPA, Image Optimization Pipeline, and Product Bundles.

**Architecture:** Each feature is a self-contained vertical slice. Exchange Rates and Advanced Payments touch payment/config layers. Cookie Consent touches DB + frontend. Image Optimization touches upload pipeline. Product Bundles touches catalog + pricing.

**Tech Stack:** Fastify 5, Drizzle ORM, PostgreSQL, BullMQ, Sharp, AWS S3, Stripe, Zod, Vitest, SvelteKit 5, Tailwind 4.

---

## Feature 6: Live Exchange Rates

### Task 6.1: Exchange Rate Cron + Service

**Files:**
- Create: `apps/backend/src/modules/exchange/exchange.service.ts`
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/config/env.ts`
- Modify: `apps/backend/.env.example`

**Implementation:**

1. Add `EXCHANGE_RATE_API_KEY` to env config (optional).
2. Write exchange service that fetches from `https://api.exchangerate-api.com/v4/latest/{baseCurrency}`.
3. Upserts rates into `exchange_rates` table.
4. Add cron job in `index.ts` that runs daily.
5. Update `pricing.service.ts` to use live rates instead of hardcoded.

**Steps:**
- Write service with `fetch()` + caching.
- Run typecheck.
- Commit.

---

## Feature 7: Advanced Payments

### Task 7.1: Apple Pay / Google Pay via Stripe

**Files:**
- Modify: `apps/backend/src/modules/payment/payment.service.ts`
- Modify: `apps/storefront/src/routes/checkout/payment/+page.svelte`

**Implementation:**

1. Update Stripe PaymentIntent creation to include `payment_method_types: ['card', 'apple_pay', 'google_pay']`.
2. Update storefront payment page to detect Apple Pay / Google Pay availability and show buttons.
3. Use Stripe Payment Request Button or Elements.

**Steps:**
- Modify backend payment intent creation.
- Modify frontend checkout page.
- Run typecheck.
- Commit.

---

## Feature 8: Cookie Consent & CCPA

### Task 8.1: Cookie Consent Backend

**Files:**
- Create: `apps/backend/src/modules/consent/consent.schema.ts`
- Create: `apps/backend/src/modules/consent/consent.service.ts`
- Create: `apps/backend/src/modules/consent/consent.route.public.ts`
- Modify: `apps/backend/src/db/schema.ts`
- Modify: `apps/backend/src/scopes/public.ts`

**Implementation:**

1. Add `cookie_consents` table to schema:
   - id, storeId, customerId?, ipAddress, userAgent, essential (boolean), analytics (boolean), marketing (boolean), timestamp.
2. Add routes: `POST /cookie-consent` (public), `GET /cookie-consent` (customer).
3. Store consent in DB + Redis cache.

**Steps:**
- Schema migration.
- Service + routes.
- Commit.

### Task 8.2: Cookie Consent Frontend

**Files:**
- Create: `apps/storefront/src/lib/components/CookieBanner.svelte`
- Modify: `apps/storefront/src/routes/+layout.svelte`

**Implementation:**

1. Create banner component with accept/reject/manage options.
2. Persist choice to localStorage + API.
3. Conditionally load analytics based on consent.
4. Add to layout so it appears on all pages.

**Steps:**
- Component + layout.
- Commit.

---

## Feature 9: Image Optimization Pipeline

### Task 9.1: Sharp-based Image Worker

**Files:**
- Create: `apps/backend/src/services/imageProcessor.service.ts`
- Modify: `apps/backend/src/services/queue.service.ts`
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/modules/upload/upload.service.ts`

**Implementation:**

1. Write image processor using `sharp`:
   - Convert to WebP and AVIF.
   - Generate responsive sizes (320, 640, 1024, 1920).
   - Upload converted images to S3.
   - Update product image URLs to use optimized versions.
2. Hook into upload service: after upload, queue image job.
3. Register worker in index.ts.

**Steps:**
- Install `sharp`.
- Write processor.
- Hook into upload.
- Commit.

### Task 9.2: Storefront Responsive Images

**Files:**
- Modify: `apps/storefront/src/lib/components/ProductCard.svelte`
- Modify: `apps/storefront/src/routes/products/[id]/+page.svelte`

**Implementation:**

1. Use `<picture>` element with `srcset` for responsive images.
2. Serve WebP with JPEG fallback.
3. Use optimized image URLs from backend.

**Steps:**
- Update components.
- Commit.

---

## Feature 10: Product Bundles

### Task 10.1: Bundle Schema + Repo + Service

**Files:**
- Modify: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/modules/bundle/bundle.schema.ts`
- Create: `apps/backend/src/modules/bundle/bundle.repo.ts`
- Create: `apps/backend/src/modules/bundle/bundle.service.ts`
- Create: `apps/backend/src/modules/bundle/bundle.route.merchant.ts`

**Implementation:**

1. Add `product_bundles` table:
   - id, storeId, name, description, price, isActive, createdAt, updatedAt.
2. Add `product_bundle_items` table:
   - id, bundleId, productId, quantity, sortOrder.
3. Merchant routes: CRUD bundles.
4. Service: create bundle, validate items, compute bundle price, deduct inventory across components.

**Steps:**
- Schema migration.
- Repo + service + routes.
- Commit.

### Task 10.2: Bundle Storefront + Pricing

**Files:**
- Modify: `apps/backend/src/modules/pricing/pricing.service.ts`
- Create: `apps/storefront/src/lib/components/BundleCard.svelte`
- Modify: `apps/storefront/src/routes/products/[id]/+page.svelte`

**Implementation:**

1. Update pricing service to detect bundles and compute component prices.
2. Add bundle display on storefront product page.
3. Add bundle to cart with all components.

**Steps:**
- Pricing update.
- Frontend components.
- Commit.

---

## Final Verification

- Run full test suite.
- Typecheck all packages.
- Lint.
- Commit release tag.
