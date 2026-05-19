# SaaS E-commerce Platform

Multi-tenant headless e-commerce platform built with **Fastify v5**, **Drizzle ORM**, **PostgreSQL**, and **Redis**. Supports multiple independent stores on a single deployment with full tenant isolation.

## Architecture

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

### Four Authentication Scopes

| Scope | Prefix | Auth | Purpose |
|---|---|---|---|
| **Public** | `/api/v1/public` | None (Host header) | Storefront browsing, cart, search |
| **Merchant** | `/api/v1/merchant` | JWT (storeId + userId) | Store management, products, orders |
| **Customer** | `/api/v1/merchant` | JWT (customerId + storeId) | Checkout, orders, wishlist, reviews |
| **SuperAdmin** | `/api/v1/admin` | JWT (superAdminId) | Platform admin, merchant approval, plans |

Each scope is a Fastify encapsulated context with its own `onRequest` auth hook. Hooks skip only login/register/logout routes — all other routes (including `/me`) are protected.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22+ |
| Framework | Fastify | v5.8+ |
| ORM | Drizzle ORM | v0.45+ |
| Database | PostgreSQL | 17 |
| Cache/Queue | Redis (ioredis + BullMQ) | v7 |
| Validation | Zod | v4.1+ |
| Auth | @fastify/jwt + httpOnly cookies | v10 |
| Language | TypeScript (ESM) | v5.8+ |
| Build | Turborepo + pnpm | monorepo |
| File Upload | @fastify/multipart + @aws-sdk/client-s3 | v10 |
| Email | Resend + BullMQ | v6 |

## Quick Start

### Prerequisites

- Node.js 24+
- pnpm 9+
- Docker & Docker Compose
- Git

### 1. Clone & Install

```bash
git clone https://github.com/arokyaillam/Ecom_New.git
cd Ecom_New
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL 17 (port 5432) and Redis 7 (port 6379).

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` — set `JWT_SECRET` (generate with `openssl rand -base64 48`).

For production CORS, set `CORS_ORIGINS` (comma-separated origins, supports wildcards like `*.myplatform.com`).

### 4. Run Database Migrations

```bash
cd apps/backend
pnpm db:migrate
```

### 5. Seed the Database

```bash
pnpm db:seed
```

This creates test data including:

| Account | Email | Password |
|---|---|---|
| Super Admin | admin@saasplatform.com | Admin1234 |
| Store Owner | owner@techgear.com | Merchant1234 |
| Store Staff | staff@techgear.com | Merchant1234 |
| Customer | john@example.com | Customer1234 |
| Customer | fatima@example.com | Customer1234 |

### 6. Start Development Server

```bash
pnpm dev
```

Server runs at `http://localhost:3000`

### 7. Verify

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","uptime":...}

curl http://localhost:3000/health/ready
# {"status":"ready"}
```

## API Endpoints

### Public (no auth, store resolved from Host header)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/public/store` | Store info |
| GET | `/api/v1/public/products` | Published products (paginated) |
| GET | `/api/v1/public/products/search` | Search products (q, category, price range, sort) |
| GET | `/api/v1/public/products/:id` | Single product |
| GET | `/api/v1/public/reviews/product/:id` | Product reviews |
| GET/POST/PATCH/DELETE | `/api/v1/public/cart[/*]` | Guest cart (cookie-based) |
| POST | `/api/v1/public/shipping/calculate` | Calculate shipping |
| POST | `/api/v1/public/tax/calculate` | Calculate tax |
| POST | `/api/v1/public/analytics` | Track analytics event |

### Merchant (JWT auth)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/merchant/auth/login` | Login |
| POST | `/api/v1/merchant/auth/register` | Register store |
| POST | `/api/v1/merchant/auth/logout` | Logout |
| POST | `/api/v1/merchant/auth/forgot-password` | Request password reset |
| POST | `/api/v1/merchant/auth/reset-password` | Reset password |
| GET | `/api/v1/merchant/auth/me` | Current user |
| GET/PATCH | `/api/v1/merchant/store` | Store settings |
| CRUD | `/api/v1/merchant/products[/*]` | Products + variants + options |
| GET | `/api/v1/merchant/products/search` | Search products (includes unpublished) |
| CRUD | `/api/v1/merchant/categories[/*]` | Categories + subcategories |
| CRUD | `/api/v1/merchant/modifiers[/*]` | Modifier groups + options |
| GET/PATCH/DELETE | `/api/v1/merchant/orders[/*]` | Order management |
| GET | `/api/v1/merchant/customers` | Customer list |
| GET/PATCH/DELETE | `/api/v1/merchant/reviews[/*]` | Review moderation |
| CRUD | `/api/v1/merchant/coupons[/*]` | Coupon management |
| GET | `/api/v1/merchant/analytics/dashboard` | Dashboard stats |
| GET | `/api/v1/merchant/analytics/revenue` | Revenue data |
| POST | `/api/v1/merchant/upload` | Upload image |
| DELETE | `/api/v1/merchant/upload` | Delete image |
| CRUD | `/api/v1/merchant/staff[/*]` | Staff management + invitations |
| CRUD | `/api/v1/merchant/shipping[/*]` | Shipping zones + rates |
| CRUD | `/api/v1/merchant/tax[/*]` | Tax rates |

### Customer (JWT auth)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/customer/auth/login` | Login (requires email verification) |
| POST | `/api/v1/customer/auth/register` | Register |
| POST | `/api/v1/customer/auth/logout` | Logout |
| POST | `/api/v1/customer/auth/verify-email` | Verify email |
| POST | `/api/v1/customer/auth/resend-verification` | Resend verification |
| POST | `/api/v1/customer/auth/forgot-password` | Request password reset |
| POST | `/api/v1/customer/auth/reset-password` | Reset password |
| GET | `/api/v1/customer/auth/me` | Profile |
| GET/PATCH | `/api/v1/customer/profile` | Profile management |
| GET | `/api/v1/customer/orders` | Order history |
| GET | `/api/v1/customer/orders/:id` | Order detail |
| POST | `/api/v1/customer/checkout` | Place order (server-side pricing) |
| GET/POST/DELETE | `/api/v1/customer/wishlist[/*]` | Wishlist |
| CRUD | `/api/v1/customer/reviews[/*]` | Reviews |
| CRUD | `/api/v1/customer/addresses[/*]` | Address book |

### SuperAdmin (JWT auth)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/admin/auth/login` | Login |
| POST | `/api/v1/admin/auth/logout` | Logout |
| GET | `/api/v1/admin/auth/me` | Current admin |
| GET | `/api/v1/admin/merchants` | List stores |
| GET | `/api/v1/admin/merchants/:id` | Store detail |
| PATCH | `/api/v1/admin/merchants/:id/approve` | Approve store |
| PATCH | `/api/v1/admin/merchants/:id/suspend` | Suspend store |
| PATCH | `/api/v1/admin/merchants/:id/reactivate` | Reactivate store |
| CRUD | `/api/v1/admin/plans[/*]` | Plan management |
| GET/PATCH | `/api/v1/admin/stores[/*]` | Store management |

## Security

- **JWT in httpOnly cookies** — tokens never exposed to JavaScript
- **Server-side price verification** — checkout computes all prices from DB; clients cannot submit arbitrary prices
- **Email verification gate** — customers must verify email before login
- **Tenant isolation** — storeId from JWT only, never from request body
- **Scope encapsulation** — auth hooks scoped to their routes only
- **Zod `strictObject()`** — rejects unknown keys on all route bodies
- **Helmet + CORS** — security headers + configurable production origins (`CORS_ORIGINS` env var)
- **Rate limiting** — per-IP throttling via @fastify/rate-limit
- **Error codes** — standardized `ErrorCodes` for programmatic handling
- **Password leak prevention** — `columns: {...}` pattern excludes passwords from relations
- **Cross-tenant protection** — storeId filter on all data mutations
- **Race-condition-safe inventory** — `WHERE currentQuantity >= quantity` prevents overselling
- **Coupon re-validation** — usage limits checked inside transaction to prevent race conditions

## Database Schema

30 tables covering the full e-commerce domain:

`superAdmins` · `merchantPlans` · `stores` · `users` · `categories` · `subcategories` · `products` · `productVariants` · `productVariantOptions` · `productVariantCombinations` · `modifierGroups` · `modifierOptions` · `customers` · `customerAddresses` · `orders` · `orderItems` · `reviews` · `wishlists` · `carts` · `cartItems` · `coupons` · `emailTemplates` · `activityLogs` · `storeAnalytics` · `verificationTokens` · `staffInvitations` · `rolePermissions` · `shippingZones` · `shippingRates` · `taxRates`

Run Drizzle Studio to explore:

```bash
cd apps/backend && pnpm db:studio
```

## Scripts

```bash
# Development
pnpm dev                  # Start dev server with hot reload

# Database
pnpm db:generate          # Generate migration from schema changes
pnpm db:migrate           # Run pending migrations
pnpm db:seed              # Seed database with test data
pnpm db:studio            # Open Drizzle Studio

# Code Quality
pnpm typecheck            # TypeScript type checking (no emit)

# Seed SuperAdmin only (without full seed data)
cd apps/backend && npx tsx src/seed-superadmin.ts
```

## Multi-Tenant Setup

Stores are resolved via the `Host` header:

```
# Request to techgear.localhost:3000
GET /api/v1/public/products/search?q=headphones
Host: techgear.localhost:3000
→ Resolves to TechGear Pro store

# Request to fashionhouse.localhost:3000
GET /api/v1/public/products
Host: fashionhouse.localhost:3000
→ Resolves to Fashion House store
```

For local development, add entries to `/etc/hosts`:

```
127.0.0.1 techgear.localhost
127.0.0.1 fashionhouse.localhost
```

## Production Deployment

- **CORS**: Set `CORS_ORIGINS` env var with comma-separated allowed origins. Supports wildcard subdomains (e.g., `*.myplatform.com,https://admin.myplatform.com`).
- **File Upload**: Set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` for S3 uploads. Without these, files are stored locally in `uploads/`.
- **Email**: Set `RESEND_API_KEY` and `FROM_EMAIL` for email delivery (verification, password reset, staff invitations).
- **Payment**: Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for Stripe integration (pending implementation).

## License

Private — All rights reserved.