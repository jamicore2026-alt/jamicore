# Phase 1: Critical for Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 5 critical production blockers: Returns & Refunds, Disaster Recovery, SEO Foundation, Observability, and Abandoned Cart Recovery.

**Architecture:** Each feature is a self-contained vertical slice: DB schema → repo → service → routes → tests. No cross-feature coupling. Features are ordered by dependency (Returns has no deps; DR depends on S3; SEO is frontend+backend; Observability touches index.ts; Abandoned Cart depends on queue + email).

**Tech Stack:** Fastify 5, Drizzle ORM, PostgreSQL 17, BullMQ, Redis, Zod, Vitest, AWS SDK v3 (S3), Pino, Sentry, Resend.

---

## Feature 1: Returns & Refunds

### Task 1.1: DB Schema — Add `returns` and `return_items` tables

**Files:**
- Modify: `apps/backend/src/db/schema.ts`
- Test: `apps/backend/src/modules/return/return.schema.test.ts`

**New tables to append at end of schema.ts:**

```typescript
export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  customerId: uuid("customer_id").references(() => customers.id),
  status: text("status").default("requested").notNull(), // requested -> approved -> received -> inspected -> refunded -> rejected -> cancelled
  reason: text("reason").notNull(),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundMethod: text("refund_method"), // original_payment, store_credit, manual
  refundTransactionId: text("refund_transaction_id"),
  shippedAt: timestamp("shipped_at"),
  receivedAt: timestamp("received_at"),
  inspectedAt: timestamp("inspected_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const returnItems = pgTable("return_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  returnId: uuid("return_id").notNull().references(() => returns.id),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  condition: text("condition"), // new, opened, damaged, defective
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const returnsRelations = relations(returns, ({ one, many }) => ({
  store: one(stores, { fields: [returns.storeId], references: [stores.id] }),
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
  customer: one(customers, { fields: [returns.customerId], references: [customers.id] }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, { fields: [returnItems.returnId], references: [returns.id] }),
  orderItem: one(orderItems, { fields: [returnItems.orderItemId], references: [orderItems.id] }),
}));
```

**Add to ErrorCodes in `apps/backend/src/errors/codes.ts`:**
```typescript
RETURN_NOT_FOUND: 'RETURN_NOT_FOUND',
RETURN_INVALID_STATUS: 'RETURN_INVALID_STATUS',
RETURN_UNAUTHORIZED: 'RETURN_UNAUTHORIZED',
```

- [ ] **Step 1.1.1: Write failing test for schema**

```typescript
import { describe, it, expect } from 'vitest';
import { returns, returnItems } from '../../db/schema.js';

describe('return schema', () => {
  it('returns table has required columns', () => {
    expect(returns.storeId).toBeDefined();
    expect(returns.orderId).toBeDefined();
    expect(returns.status).toBeDefined();
    expect(returns.reason).toBeDefined();
  });

  it('return_items table has required columns', () => {
    expect(returnItems.returnId).toBeDefined();
    expect(returnItems.orderItemId).toBeDefined();
    expect(returnItems.quantity).toBeDefined();
  });
});
```

Run: `pnpm vitest run apps/backend/src/modules/return/return.schema.test.ts`
Expected: FAIL — schema file does not export returns/returnItems yet

- [ ] **Step 1.1.2: Add schema to db/schema.ts**

Append the returns and returnItems tables + relations to the end of `apps/backend/src/db/schema.ts`.

- [ ] **Step 1.1.3: Verify test passes**

Run: `pnpm vitest run apps/backend/src/modules/return/return.schema.test.ts`
Expected: PASS

- [ ] **Step 1.1.4: Generate migration**

Run: `cd apps/backend && pnpm drizzle-kit generate`
Expected: New migration file created in `drizzle/`

- [ ] **Step 1.1.5: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/src/errors/codes.ts apps/backend/src/modules/return/return.schema.test.ts
git commit -m "feat(returns): add returns and return_items schema with relations"
```

---

### Task 1.2: Repo Layer

**Files:**
- Create: `apps/backend/src/modules/return/return.repo.ts`
- Test: `apps/backend/src/modules/return/return.repo.test.ts`

- [ ] **Step 1.2.1: Write return.repo.ts**

```typescript
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { returns, returnItems } from '../../db/schema.js';

export const returnRepo = {
  async create(data: {
    storeId: string;
    orderId: string;
    customerId?: string;
    status: string;
    reason: string;
    notes?: string;
  }) {
    const [row] = await db.insert(returns).values(data).returning();
    return row;
  },

  async createItem(data: {
    returnId: string;
    orderItemId: string;
    quantity: number;
    reason?: string;
    condition?: string;
    refundAmount?: string;
  }) {
    const [row] = await db.insert(returnItems).values(data).returning();
    return row;
  },

  async findById(id: string) {
    const [row] = await db.select().from(returns).where(eq(returns.id, id)).limit(1);
    return row ?? null;
  },

  async findByIdWithItems(id: string) {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id)).limit(1);
    if (!ret) return null;
    const items = await db.select().from(returnItems).where(eq(returnItems.returnId, id));
    return { ...ret, items };
  },

  async findByStore(storeId: string, page = 1, limit = 20) {
    const rows = await db.select().from(returns)
      .where(eq(returns.storeId, storeId))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(returns.createdAt);
    return rows;
  },

  async findByOrder(orderId: string) {
    return db.select().from(returns).where(eq(returns.orderId, orderId));
  },

  async updateStatus(id: string, status: string, extra?: Partial<typeof returns.$inferInsert>) {
    const [row] = await db.update(returns)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return row;
  },
};
```

- [ ] **Step 1.2.2: Write repo test**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { returnRepo } from './return.repo.js';
import { db } from '../../db/index.js';
import { returns, returnItems, stores, orders, customers } from '../../db/schema.js';

describe('return.repo', () => {
  beforeAll(async () => {
    // Clean returns tables
    await db.delete(returnItems);
    await db.delete(returns);
  });

  it('creates a return', async () => {
    // Requires seeded store, order, customer
    const store = await db.select().from(stores).limit(1);
    const order = await db.select().from(orders).limit(1);
    if (!store[0] || !order[0]) {
      console.warn('Skipping return repo test — no seeded store/order');
      return;
    }
    const ret = await returnRepo.create({
      storeId: store[0].id,
      orderId: order[0].id,
      status: 'requested',
      reason: 'Defective product',
    });
    expect(ret).toBeDefined();
    expect(ret.status).toBe('requested');
  });
});
```

Run: `pnpm vitest run apps/backend/src/modules/return/return.repo.test.ts`
Expected: PASS (seeded data required)

- [ ] **Step 1.2.3: Commit**

```bash
git add apps/backend/src/modules/return/return.repo.ts apps/backend/src/modules/return/return.repo.test.ts
git commit -m "feat(returns): add return repository layer"
```

---

### Task 1.3: Service Layer

**Files:**
- Create: `apps/backend/src/modules/return/return.service.ts`
- Modify: `apps/backend/src/modules/payment/payment.service.ts` (add refund methods)

- [ ] **Step 1.3.1: Write return.service.ts**

```typescript
import { returnRepo } from './return.repo.js';
import { orderRepo } from '../order/order.repo.js';
import { ErrorCodes } from '../../errors/codes.js';

export const returnService = {
  async createReturn(data: {
    storeId: string;
    orderId: string;
    customerId?: string;
    reason: string;
    notes?: string;
    items: { orderItemId: string; quantity: number; reason?: string; condition?: string }[];
  }) {
    const order = await orderRepo.findById(data.orderId);
    if (!order || order.storeId !== data.storeId) {
      throw Object.assign(new Error('Order not found'), { code: ErrorCodes.ORDER_NOT_FOUND });
    }
    if (order.status === 'cancelled') {
      throw Object.assign(new Error('Order is cancelled'), { code: ErrorCodes.ORDER_CANCELLED });
    }

    const ret = await returnRepo.create({
      storeId: data.storeId,
      orderId: data.orderId,
      customerId: data.customerId,
      status: 'requested',
      reason: data.reason,
      notes: data.notes,
    });

    for (const item of data.items) {
      await returnRepo.createItem({
        returnId: ret.id,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason,
        condition: item.condition,
      });
    }

    return returnRepo.findByIdWithItems(ret.id);
  },

  async updateStatus(returnId: string, storeId: string, newStatus: string, adminNotes?: string) {
    const ret = await returnRepo.findById(returnId);
    if (!ret || ret.storeId !== storeId) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }

    const validTransitions: Record<string, string[]> = {
      requested: ['approved', 'rejected', 'cancelled'],
      approved: ['received', 'cancelled'],
      received: ['inspected'],
      inspected: ['refunded', 'rejected'],
      rejected: [],
      refunded: [],
      cancelled: [],
    };

    if (!validTransitions[ret.status]?.includes(newStatus)) {
      throw Object.assign(
        new Error(`Invalid status transition from ${ret.status} to ${newStatus}`),
        { code: ErrorCodes.RETURN_INVALID_STATUS },
      );
    }

    const extra: Partial<typeof ret> = {};
    if (adminNotes) extra.adminNotes = adminNotes;
    if (newStatus === 'received') extra.receivedAt = new Date();
    if (newStatus === 'inspected') extra.inspectedAt = new Date();
    if (newStatus === 'refunded') extra.refundedAt = new Date();

    return returnRepo.updateStatus(returnId, newStatus, extra);
  },

  async listReturns(storeId: string, page = 1, limit = 20) {
    return returnRepo.findByStore(storeId, page, limit);
  },

  async getReturn(id: string, storeId: string) {
    const ret = await returnRepo.findByIdWithItems(id);
    if (!ret || ret.storeId !== storeId) {
      throw Object.assign(new Error('Return not found'), { code: ErrorCodes.RETURN_NOT_FOUND });
    }
    return ret;
  },
};
```

- [ ] **Step 1.3.2: Add refund method to payment.service.ts**

After `createPaymentIntent`, add:

```typescript
async refundPayment(storeId: string, orderId: string, amount: number) {
    const orderPayments = await db.select()
      .from(payments)
      .where(and(eq(payments.storeId, storeId), eq(payments.orderId, orderId)))
      .orderBy(payments.createdAt);

    const successfulPayment = orderPayments.find((p) => p.status === 'succeeded' || p.status === 'captured');
    if (!successfulPayment) {
      throw Object.assign(new Error('No successful payment found for refund'), { code: ErrorCodes.PAYMENT_FAILED });
    }

    const provider = successfulPayment.provider;
    if (provider === 'cod') {
      return { success: true, refundId: null, message: 'COD refunds are handled manually' };
    }

    const providerRow = await repo.findProvider(storeId, provider);
    if (!providerRow?.config) {
      throw Object.assign(new Error('Payment provider not configured'), { code: ErrorCodes.PAYMENT_PROVIDER_NOT_ENABLED });
    }

    const config = decryptConfig(providerRow.config);
    if (!config) {
      throw Object.assign(new Error('Failed to decrypt provider config'), { code: ErrorCodes.PAYMENT_FAILED });
    }

    if (provider === 'stripe') {
      const stripe = await import('stripe');
      const client = new stripe.default(config.secret_key as string, { apiVersion: '2024-12-18.acacia' });
      const refund = await client.refunds.create({
        payment_intent: successfulPayment.providerPaymentId ?? undefined,
        amount: toCents(amount),
      });
      return { success: true, refundId: refund.id };
    }

    if (provider === 'razorpay') {
      const Razorpay = (await import('razorpay')).default;
      const instance = new Razorpay({ key_id: config.key_id as string, key_secret: config.key_secret as string });
      const refund = await instance.payments.refund(successfulPayment.providerPaymentId ?? '', {
        amount: toCents(amount),
      });
      return { success: true, refundId: refund.id };
    }

    throw Object.assign(new Error('Refund not supported for this provider'), { code: ErrorCodes.PAYMENT_FAILED });
  },
```

- [ ] **Step 1.3.3: Commit**

```bash
git add apps/backend/src/modules/return/return.service.ts apps/backend/src/modules/payment/payment.service.ts
git commit -m "feat(returns): add return service + payment refund support"
```

---

### Task 1.4: Routes

**Files:**
- Create: `apps/backend/src/modules/return/return.schema.ts`
- Create: `apps/backend/src/modules/return/return.route.merchant.ts`
- Create: `apps/backend/src/modules/return/return.route.customer.ts`
- Modify: `apps/backend/src/scopes/merchant.ts`
- Modify: `apps/backend/src/scopes/customer.ts`

- [ ] **Step 1.4.1: Write return.schema.ts**

```typescript
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

export const createReturnSchema = z.strictObject({
  orderId: z.string().uuid(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  items: z.array(z.strictObject({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
    reason: z.string().max(500).optional(),
    condition: z.enum(['new', 'opened', 'damaged', 'defective']).optional(),
  })).min(1),
});

export const updateReturnStatusSchema = z.strictObject({
  status: z.enum(['requested', 'approved', 'received', 'inspected', 'refunded', 'rejected', 'cancelled']),
  adminNotes: z.string().max(1000).optional(),
});

export const listReturnsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

- [ ] **Step 1.4.2: Write return.route.merchant.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { returnService } from './return.service.js';
import { createReturnSchema, updateReturnStatusSchema, listReturnsQuerySchema, idParamSchema } from './return.schema.js';
import { ErrorCodes } from '../../errors/codes.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', { schema: { querystring: listReturnsQuerySchema } }, async (request, reply) => {
    const storeId = request.storeId as string;
    const { page, limit } = request.query as { page: number; limit: number };
    const returns = await returnService.listReturns(storeId, page, limit);
    return { data: returns };
  });

  fastify.get('/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const storeId = request.storeId as string;
    const { id } = request.params as { id: string };
    const ret = await returnService.getReturn(id, storeId);
    return { data: ret };
  });

  fastify.patch('/:id/status', { schema: { params: idParamSchema, body: updateReturnStatusSchema } }, async (request, reply) => {
    const storeId = request.storeId as string;
    const { id } = request.params as { id: string };
    const { status, adminNotes } = request.body as { status: string; adminNotes?: string };
    const ret = await returnService.updateStatus(id, storeId, status, adminNotes);
    return { data: ret };
  });
}
```

- [ ] **Step 1.4.3: Write return.route.customer.ts**

```typescript
import type { FastifyInstance } from 'fastify';
import { returnService } from './return.service.js';
import { createReturnSchema } from './return.schema.js';

export default async function (fastify: FastifyInstance) {
  fastify.post('/', { schema: { body: createReturnSchema } }, async (request, reply) => {
    const storeId = request.storeId as string;
    const customerId = request.user?.id as string;
    const body = request.body as { orderId: string; reason: string; notes?: string; items: any[] };
    const ret = await returnService.createReturn({
      storeId,
      customerId,
      ...body,
    });
    reply.status(201);
    return { data: ret };
  });
}
```

- [ ] **Step 1.4.4: Register routes in scopes**

In `apps/backend/src/scopes/merchant.ts`, add:
```typescript
import returnMerchantRoutes from '../modules/return/return.route.merchant.js';
// ... inside the scope registration, add:
fastify.register(returnMerchantRoutes, { prefix: '/returns' });
```

In `apps/backend/src/scopes/customer.ts`, add:
```typescript
import returnCustomerRoutes from '../modules/return/return.route.customer.js';
// ... inside the scope registration, add:
fastify.register(returnCustomerRoutes, { prefix: '/returns' });
```

- [ ] **Step 1.4.5: Commit**

```bash
git add apps/backend/src/modules/return/ apps/backend/src/scopes/merchant.ts apps/backend/src/scopes/customer.ts
git commit -m "feat(returns): add merchant + customer routes for returns"
```

---

### Task 1.5: Integration Tests

**Files:**
- Create: `apps/backend/src/modules/return/return.route.merchant.test.ts`

- [ ] **Step 1.5.1: Write merchant route tests**

Follow the pattern of `apps/backend/src/modules/order/order.route.merchant.test.ts`. Test: create return (customer auth), list returns (merchant auth), update status (merchant auth), invalid status transition.

- [ ] **Step 1.5.2: Run tests**

Run: `pnpm vitest run apps/backend/src/modules/return/`
Expected: PASS

- [ ] **Step 1.5.3: Commit**

```bash
git add apps/backend/src/modules/return/return.route.merchant.test.ts
git commit -m "test(returns): add merchant route integration tests"
```

---

## Feature 2: Disaster Recovery

### Task 2.1: Backup Script

**Files:**
- Create: `apps/backend/src/scripts/backup.ts`
- Modify: `apps/backend/src/config/env.ts` (add S3/backup env vars if missing)

- [ ] **Step 2.1.1: Write backup script**

```typescript
// apps/backend/src/scripts/backup.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, unlinkSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const execAsync = promisify(exec);

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbName = env.DATABASE_URL?.split('/').pop()?.split('?')[0] ?? 'postgres';
  const filename = `${dbName}-backup-${timestamp}.sql`;
  const filepath = path.join('/tmp', filename);

  const pgDumpCommand = `pg_dump "${env.DATABASE_URL}" --no-owner --no-privileges > "${filepath}"`;
  await execAsync(pgDumpCommand);

  const s3 = new S3Client({
    region: env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BACKUP_BUCKET ?? '',
    Key: `backups/${filename}`,
    Body: createReadStream(filepath),
    ContentType: 'application/sql',
  }));

  unlinkSync(filepath);
  console.log(`Backup uploaded: ${filename}`);
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2.1.2: Add env vars to .env.example**

```bash
S3_BACKUP_BUCKET=
```

- [ ] **Step 2.1.3: Commit**

```bash
git add apps/backend/src/scripts/backup.ts apps/backend/.env.example
git commit -m "feat(dr): add pg_dump → S3 backup script"
```

---

### Task 2.2: Backup Status API

**Files:**
- Create: `apps/backend/src/modules/backup/backup.service.ts`
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 2.2.1: Write backup service**

```typescript
// apps/backend/src/modules/backup/backup.service.ts
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

const s3 = new S3Client({
  region: env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

export const backupService = {
  async getLatestBackup() {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: env.S3_BACKUP_BUCKET ?? '',
      Prefix: 'backups/',
      MaxKeys: 1,
    }));
    const latest = result.Contents?.[0];
    if (!latest) return null;
    return {
      filename: latest.Key,
      size: latest.Size,
      lastModified: latest.LastModified,
    };
  },
};
```

- [ ] **Step 2.2.2: Add /health/backup endpoint to index.ts**

After `/health/detailed`, add:

```typescript
fastify.get('/health/backup', async (request, reply) => {
  const latest = await backupService.getLatestBackup();
  return {
    status: latest ? 'ok' : 'warning',
    lastBackup: latest?.lastModified ?? null,
    filename: latest?.filename ?? null,
  };
});
```

- [ ] **Step 2.2.3: Commit**

```bash
git add apps/backend/src/modules/backup/backup.service.ts apps/backend/src/index.ts
git commit -m "feat(dr): add /health/backup endpoint + backup status service"
```

---

## Feature 3: SEO Foundation

### Task 3.1: Sitemap & Robots

**Files:**
- Create: `apps/backend/src/modules/seo/seo.route.public.ts`
- Modify: `apps/backend/src/scopes/public.ts`

- [ ] **Step 3.1.1: Write SEO public routes**

```typescript
// apps/backend/src/modules/seo/seo.route.public.ts
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { products, categories, stores } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function (fastify: FastifyInstance) {
  fastify.get('/robots.txt', async (_request, reply) => {
    reply.header('Content-Type', 'text/plain');
    return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard/\nDisallow: /admin/\nSitemap: /sitemap.xml\n`;
  });

  fastify.get('/sitemap.xml', async (request, reply) => {
    const storeId = request.storeId as string;
    const store = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    const domain = store[0]?.domain ?? 'localhost';
    const baseUrl = `https://${domain}`;

    const productRows = await db.select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.storeId, storeId));
    const categoryRows = await db.select({ id: categories.id, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.storeId, storeId));

    const urls = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/products`, priority: '0.8', changefreq: 'daily' },
      ...productRows.map((p) => ({
        loc: `${baseUrl}/products/${p.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
      })),
      ...categoryRows.map((c) => ({
        loc: `${baseUrl}/categories/${c.id}`,
        priority: '0.5',
        changefreq: 'weekly',
        lastmod: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) =>
        `  <url>\n` +
        `    <loc>${u.loc}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
      ).join('\n') +
      `\n</urlset>`;

    reply.header('Content-Type', 'application/xml');
    return xml;
  });
}
```

- [ ] **Step 3.1.2: Register in public scope**

In `apps/backend/src/scopes/public.ts`:
```typescript
import seoPublicRoutes from '../modules/seo/seo.route.public.js';
// ... add:
fastify.register(seoPublicRoutes, { prefix: '' });
```

- [ ] **Step 3.1.3: Commit**

```bash
git add apps/backend/src/modules/seo/seo.route.public.ts apps/backend/src/scopes/public.ts
git commit -m "feat(seo): add /sitemap.xml and /robots.txt public routes"
```

---

### Task 3.2: JSON-LD Structured Data

**Files:**
- Create: `apps/backend/src/modules/seo/seo.service.ts`
- Modify: `apps/storefront/src/routes/products/[id]/+page.svelte` (inject JSON-LD)

- [ ] **Step 3.2.1: Write SEO service**

```typescript
// apps/backend/src/modules/seo/seo.service.ts
import { db } from '../../db/index.js';
import { products, stores, categories } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const seoService = {
  async getProductJsonLd(storeId: string, productId: string) {
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    if (!product || !store) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.titleEn ?? '',
      image: product.images?.[0] ?? '',
      description: product.descriptionEn ?? '',
      sku: product.barcode ?? product.id,
      offers: {
        '@type': 'Offer',
        url: `https://${store.domain}/products/${product.id}`,
        priceCurrency: store.currency ?? 'USD',
        price: product.salePrice ?? '0',
        availability: product.currentQuantity && product.currentQuantity > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    };
  },
};
```

- [ ] **Step 3.2.2: Add JSON-LD endpoint to SEO routes**

In `seo.route.public.ts`, add:
```typescript
fastify.get('/products/:id/jsonld', async (request, reply) => {
  const storeId = request.storeId as string;
  const { id } = request.params as { id: string };
  const jsonLd = await seoService.getProductJsonLd(storeId, id);
  return jsonLd ?? { error: 'Not found' };
});
```

- [ ] **Step 3.2.3: Commit**

```bash
git add apps/backend/src/modules/seo/seo.service.ts apps/backend/src/modules/seo/seo.route.public.ts
git commit -m "feat(seo): add JSON-LD structured data for products"
```

---

## Feature 4: Observability

### Task 4.1: Structured Logging with Pino

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/package.json`

- [ ] **Step 4.1.1: Install pino-pretty**

Run: `cd apps/backend && pnpm add pino pino-pretty`

- [ ] **Step 4.1.2: Configure Fastify with Pino**

In `apps/backend/src/index.ts`, replace the Fastify logger config:

```typescript
import pino from 'pino';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true } },
});

const fastify = Fastify({
  loggerInstance: logger,
  genReqId: () => crypto.randomUUID(),
  trustProxy: env.isProduction ? 1 : false,
});
```

- [ ] **Step 4.1.3: Add request logging hook**

After the existing onRequest hooks, add:

```typescript
fastify.addHook('onResponse', async (request, reply) => {
  fastify.log.info({
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.elapsedTime,
    storeId: (request as any).storeId,
    userId: (request as any).user?.id,
  }, 'request completed');
});
```

- [ ] **Step 4.1.4: Commit**

```bash
git add apps/backend/src/index.ts apps/backend/package.json pnpm-lock.yaml
git commit -m "feat(observability): add pino structured logging with request tracing"
```

---

### Task 4.2: Sentry Integration

**Files:**
- Create: `apps/backend/src/services/sentry.service.ts`
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/src/config/env.ts`

- [ ] **Step 4.2.1: Install Sentry SDK**

Run: `cd apps/backend && pnpm add @sentry/node @sentry/profiling-node`

- [ ] **Step 4.2.2: Write Sentry service**

```typescript
// apps/backend/src/services/sentry.service.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from '../config/env.js';

export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: env.isProduction ? 0.2 : 1.0,
    profilesSampleRate: env.isProduction ? 0.1 : 1.0,
  });
}

export { Sentry };
```

- [ ] **Step 4.2.3: Wire Sentry into index.ts**

At top of `index.ts` (before Fastify init):
```typescript
import { initSentry, Sentry } from './services/sentry.service.js';
initSentry();
```

After error handler registration:
```typescript
fastify.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, { extra: { reqId: request.id, storeId: (request as any).storeId } });
  // ... existing error handler logic
});
```

- [ ] **Step 4.2.4: Add SENTRY_DSN to env**

In `apps/backend/src/config/env.ts`, add:
```typescript
SENTRY_DSN: z.string().optional(),
```
In `.env.example`, add:
```bash
SENTRY_DSN=
```

- [ ] **Step 4.2.5: Commit**

```bash
git add apps/backend/src/services/sentry.service.ts apps/backend/src/index.ts apps/backend/src/config/env.ts apps/backend/.env.example apps/backend/package.json pnpm-lock.yaml
git commit -m "feat(observability): add Sentry error tracking and profiling"
```

---

### Task 4.3: Metrics Endpoint

**Files:**
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 4.3.1: Add /health/metrics endpoint**

```typescript
fastify.get('/health/metrics', async (request, reply) => {
  const clientIp = request.ip;
  if (!isPrivateIp(clientIp)) {
    reply.status(403).send({ error: 'Forbidden', message: 'Access denied from this IP' });
    return;
  }

  const mem = process.memoryUsage();
  const uptime = process.uptime();

  return {
    uptime_seconds: uptime,
    memory: {
      rss_bytes: mem.rss,
      heap_used_bytes: mem.heapUsed,
      heap_total_bytes: mem.heapTotal,
      external_bytes: mem.external,
    },
    timestamp: new Date().toISOString(),
  };
});
```

- [ ] **Step 4.3.2: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat(observability): add /health/metrics endpoint"
```

---

## Feature 5: Abandoned Cart Recovery

### Task 5.1: Queue & Processor

**Files:**
- Modify: `apps/backend/src/services/queue.service.ts`
- Create: `apps/backend/src/services/abandonedCartProcessor.service.ts`

- [ ] **Step 5.1.1: Add abandoned-cart queue**

In `apps/backend/src/services/queue.service.ts`:
```typescript
// After webhookQueue:
const abandonedCartQueue = new Queue('abandoned-cart', { connection });

// In return object:
abandonedCartQueue,

// In closeAll:
await abandonedCartQueue.close();
```

- [ ] **Step 5.1.2: Write abandoned cart processor**

```typescript
// apps/backend/src/services/abandonedCartProcessor.service.ts
import type { Job } from 'bullmq';
import { db } from '../db/index.js';
import { carts, cartItems, customers, products } from '../db/schema.js';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import type { QueueService } from './queue.service.js';

export interface AbandonedCartJobData {
  storeId: string;
  cartId: string;
  customerId?: string;
}

export function createAbandonedCartProcessor(queueService: QueueService) {
  return async function processAbandonedCartJob(job: Job<AbandonedCartJobData>): Promise<void> {
    const { storeId, cartId, customerId } = job.data;

    // Re-check cart is still abandoned (not checked out or cleared)
    const [cart] = await db.select().from(carts)
      .where(and(eq(carts.id, cartId), eq(carts.storeId, storeId)))
      .limit(1);

    if (!cart || cart.itemCount === 0) return;

    // Only send if customer exists with email
    if (!customerId) return;
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.storeId, storeId)))
      .limit(1);

    if (!customer?.email) return;

    const items = await db.select().from(cartItems)
      .where(eq(cartItems.cartId, cartId));

    if (items.length === 0) return;

    // Fetch product titles for email
    const productIds = items.map((i) => i.productId);
    const productRows = await db.select({ id: products.id, titleEn: products.titleEn })
      .from(products)
      .where(eq(products.storeId, storeId));
    const productMap = new Map(productRows.map((p) => [p.id, p.titleEn]));

    const itemList = items.map((i) => `- ${productMap.get(i.productId) ?? 'Product'} x${i.quantity}`).join('\n');

    // Queue email
    await queueService.emailQueue.add('abandoned-cart', {
      to: customer.email,
      subject: 'You left something in your cart!',
      html: `<p>Hi ${customer.firstName ?? ''},</p>
<p>You have items waiting in your cart:</p>
<pre>${itemList}</pre>
<p><a href="https://cart-link">Complete your purchase</a></p>`,
      text: `Hi ${customer.firstName ?? ''},\n\nYou have items waiting in your cart:\n${itemList}\n\nComplete your purchase: https://cart-link`,
    });
  };
}
```

- [ ] **Step 5.1.3: Register worker in index.ts**

In `apps/backend/src/index.ts`, after email worker:
```typescript
import { createAbandonedCartProcessor } from './services/abandonedCartProcessor.service.js';
queueService.createWorker('abandoned-cart', createAbandonedCartProcessor(queueService));
```

- [ ] **Step 5.1.4: Commit**

```bash
git add apps/backend/src/services/queue.service.ts apps/backend/src/services/abandonedCartProcessor.service.ts apps/backend/src/index.ts
git commit -m "feat(abandoned-cart): add abandoned cart queue + processor"
```

---

### Task 5.2: Cart Update Hook & Cron

**Files:**
- Modify: `apps/backend/src/modules/cart/cart.service.ts`
- Create: `apps/backend/src/jobs/abandonedCartCron.ts`
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 5.2.1: Schedule abandoned cart job on cart update**

In `apps/backend/src/modules/cart/cart.service.ts`, after adding/updating items, add:

```typescript
// Inside the cart service addItem / updateItem methods, after DB write:
if (customerId) {
  // Schedule abandoned cart email for 1 hour later
  await queueService.abandonedCartQueue.add(
    'abandoned-cart',
    { storeId, cartId, customerId },
    { delay: 60 * 60 * 1000, jobId: `ac-${cartId}` },
  );
}
```

NOTE: Requires `queueService` to be accessible. If cart service does not have queueService injected, pass it as a parameter or add to service dependencies.

- [ ] **Step 5.2.2: Write cron job**

```typescript
// apps/backend/src/jobs/abandonedCartCron.ts
import { db } from '../db/index.js';
import { carts } from '../db/schema.js';
import { eq, and, lt, isNotNull, gt } from 'drizzle-orm';
import type { QueueService } from '../services/queue.service.js';

export async function runAbandonedCartCron(queueService: QueueService) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const abandonedCarts = await db.select().from(carts)
    .where(and(
      isNotNull(carts.customerId),
      gt(carts.itemCount, 0),
      lt(carts.updatedAt, oneHourAgo),
      gt(carts.updatedAt, twoHoursAgo),
    ));

  for (const cart of abandonedCarts) {
    await queueService.abandonedCartQueue.add(
      'abandoned-cart',
      { storeId: cart.storeId, cartId: cart.id, customerId: cart.customerId! },
      { jobId: `ac-${cart.id}`, attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
    );
  }

  console.log(`Enqueued ${abandonedCarts.length} abandoned cart recovery emails`);
}
```

- [ ] **Step 5.2.3: Register cron in index.ts**

After server start (`fastify.listen`), add:
```typescript
import { runAbandonedCartCron } from './jobs/abandonedCartCron.js';
// Run every 30 minutes
setInterval(() => runAbandonedCartCron(queueService), 30 * 60 * 1000);
// Run once on startup
runAbandonedCartCron(queueService).catch((err) => fastify.log.error(err));
```

- [ ] **Step 5.2.4: Commit**

```bash
git add apps/backend/src/modules/cart/cart.service.ts apps/backend/src/jobs/abandonedCartCron.ts apps/backend/src/index.ts
git commit -m "feat(abandoned-cart): add cart update hook + 30-min cron job"
```

---

## Final Verification

- [ ] **Step F.1: Run full backend test suite**

Run: `cd apps/backend && pnpm test`
Expected: All existing tests pass + new tests pass

- [ ] **Step F.2: Run TypeScript check**

Run: `cd apps/backend && pnpm typecheck`
Expected: 0 errors

- [ ] **Step F.3: Run lint**

Run: `pnpm lint`
Expected: 0 errors

- [ ] **Step F.4: Final commit**

```bash
git commit --allow-empty -m "release: Phase 1 critical launch features complete"
```
