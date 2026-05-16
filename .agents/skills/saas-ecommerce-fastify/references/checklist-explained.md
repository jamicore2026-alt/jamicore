# Pre-Completion Checklist Explained

This document explains each checklist item with examples of correct and incorrect implementations.

---

## 1. No console.log anywhere

### ❌ INCORRECT
```typescript
// routes/merchant/products.ts
console.log('Fetching products');  // ❌ Never use console.log
console.log('Store ID:', request.storeId);  // ❌
```

### ✅ CORRECT
```typescript
// routes/merchant/products.ts
fastify.log.debug('Fetching products');
fastify.log.info({ storeId: request.storeId }, 'Fetching products for store');
```

### Why?
- `console.log` bypasses Fastify's logging system
- Cannot be configured (level, format, destination)
- No request context (requestId, etc.)

---

## 2. No `any` type (except documented exceptions)

### ❌ INCORRECT
```typescript
// ❌ Never use any
async function processData(data: any): Promise<any> {
  return data.items;
}

// ❌ Implicit any
function handleError(err) {  // Parameter implicitly has 'any' type
  console.log(err);
}
```

### ✅ CORRECT
```typescript
// ✅ Use proper types
interface ProductData {
  items: Product[];
  total: number;
}

async function processData(data: ProductData): Promise<Product[]> {
  return data.items;
}

// ✅ Unknown for truly unknown data
function handleError(err: unknown) {
  if (err instanceof Error) {
    fastify.log.error(err.message);
  }
}

// ✅ Exception: Fastify's opts parameter in plugins
export default fp(async function merchantScope(
  fastify: FastifyInstance, 
  opts: any  // ✅ This is acceptable for Fastify plugins
) {
  // ...
}, { fastify: '5.x' });
```

### Why?
- `any` defeats TypeScript's type safety
- Makes refactoring dangerous
- Hides bugs at compile time

### Acceptable Exceptions:
- Fastify plugin `opts` parameter
- Third-party library types that are incomplete
- Migration code with explicit TODO comments

---

## 3. No inline preHandler in route files

### ❌ INCORRECT
```typescript
// routes/merchant/products.ts - WRONG
fastify.get('/', {
  preHandler: [async (request, reply) => {  // ❌ Inline preHandler!
    await request.jwtVerify();
  }]
}, async (request, reply) => {
  // ...
});
```

### ✅ CORRECT
```typescript
// scopes/merchant.ts - Auth hook defined here
fastify.addHook('onRequest', async (request, reply) => {
  try {
    const decoded = await request.jwtVerify();
    request.storeId = decoded.storeId;
    request.userId = decoded.userId;
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
});

// routes/merchant/products.ts - Clean route
fastify.get('/', async (request, reply) => {
  // Auth already done by scope hook
  const products = await productService.findByStoreId(request.storeId);
  return { products };
});
```

### Why?
- Inline preHandler duplicates code
- Encapsulation ensures hooks run on ALL routes in scope
- Easier to maintain and test

---

## 4. Zod strictObject() on every route body

### ❌ INCORRECT
```typescript
// ❌ Missing strict - allows extra properties
const schema = z.object({
  name: z.string(),
  price: z.number()
});

// ❌ Additional properties allowed
// Client can send: { name: "Test", price: 100, extra: "malicious" }

// ❌ Also wrong - additionalProperties is NOT a Zod option
const schema = z.object({
  name: z.string(),
  additionalProperties: false  // This does nothing in Zod!
});
```

### ✅ CORRECT
```typescript
// ✅ Zod 4 - use z.strictObject() (rejects unknown keys automatically)
const schema = z.strictObject({
  name: z.string(),
  price: z.number()
});

// ✅ If using Fastify's native JSON Schema validation (not Zod):
fastify.post('/', {
  schema: {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' }
      },
      required: ['name', 'price'],
      additionalProperties: false  // ✅ Valid in JSON Schema (not Zod)
    }
  }
}, async (request, reply) => {
  // ...
});
```

> **Note:** `additionalProperties: false` is a JSON Schema concept. In Zod, use `z.strictObject()` instead. Do NOT mix the two.

### Why?
- Prevents mass assignment vulnerabilities
- Clients can't send unexpected data
- Fail fast on API contract violations

---

## 5. ownerEmail/ownerName not in public responses

### ❌ INCORRECT
```typescript
// routes/public/store.ts - WRONG
fastify.get('/:domain', async (request, reply) => {
  const store = await storeService.findByDomain(request.params.domain);
  
  return { store };  // ❌ Includes ownerEmail, ownerName, ownerPhone!
});
```

### ✅ CORRECT
```typescript
// routes/public/store.ts - CORRECT
fastify.get('/:domain', async (request, reply) => {
  const store = await storeService.findByDomain(request.params.domain);
  
  // ✅ Filter sensitive fields
  const { 
    ownerEmail, 
    ownerName, 
    ownerPhone, 
    ...publicStore 
  } = store;
  
  return { store: publicStore };
});

// ✅ Or use a mapper function
function toPublicStore(store: Store) {
  return {
    id: store.id,
    name: store.name,
    domain: store.domain,
    status: store.status,
    currency: store.currency,
    language: store.language,
    // ... only public fields
    primaryColor: store.primaryColor,
    secondaryColor: store.secondaryColor,
    // NEVER include: ownerEmail, ownerName, ownerPhone
  };
}
```

### Why?
- Owner contact info is private
- GDPR/privacy compliance
- Security - prevents social engineering

---

## 6. JWT in httpOnly cookie

### ❌ INCORRECT
```typescript
// services/auth.service.ts - WRONG
async function login(email: string, password: string) {
  const user = await validateCredentials(email, password);
  const token = generateToken(user);
  
  return { token };  // ❌ Returning token in body!
}

// Client then stores in localStorage - vulnerable to XSS
```

### ✅ CORRECT
```typescript
// routes/merchant/auth.ts - CORRECT
fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body;
  const user = await authService.validateCredentials(email, password);
  
  // ✅ Generate token
  const token = await reply.jwtSign({
    userId: user.id,
    storeId: user.storeId,
    role: user.role
  });
  
  // ✅ Set as httpOnly cookie
  reply.setCookie('token', token, {
    httpOnly: true,           // ✅ Cannot be accessed by JavaScript
    secure: true,             // ✅ HTTPS only in production
    sameSite: 'strict',       // ✅ CSRF protection
    maxAge: 7 * 24 * 60 * 60, // 7 days (in seconds)
    path: '/'
  });
  
  // ✅ Return success - NO token in body
  return { 
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
});
```

### Why?
- `httpOnly` prevents XSS attacks from stealing tokens
- `sameSite: 'strict'` prevents CSRF attacks
- Tokens not exposed in response body or localStorage

---

## 7. storeId from request.user (JWT), never from body

### ❌ INCORRECT
```typescript
// routes/merchant/products.ts - WRONG
fastify.post('/', async (request, reply) => {
  const { storeId, ...productData } = request.body;  // ❌ From body!
  
  const product = await productService.create({
    ...productData,
    storeId  // ❌ Client could send any storeId!
  });
  
  return { product };
});
```

### ✅ CORRECT
```typescript
// scopes/merchant.ts - Set storeId from JWT
fastify.addHook('onRequest', async (request, reply) => {
  const decoded = await request.jwtVerify();
  request.storeId = decoded.storeId;  // ✅ From JWT
  request.userId = decoded.userId;
});

// routes/merchant/products.ts - Use from request
fastify.post('/', async (request, reply) => {
  // ✅ storeId from request (set by hook from JWT)
  const product = await productService.create({
    ...request.body,
    storeId: request.storeId  // ✅ Cannot be spoofed
  });
  
  return { product };
});
```

### Why?
- Prevents horizontal privilege escalation
- Client cannot access other stores' data
- JWT is signed and cannot be forged

---

## 8. No require() - ESM imports only

### ❌ INCORRECT
```typescript
// ❌ CommonJS require
const bcrypt = require('bcrypt');
const { db } = require('../db');

// ❌ Dynamic require inside function
async function loadService() {
  const service = require('./service');  // ❌
  return service;
}
```

### ✅ CORRECT
```typescript
// ✅ ESM imports at top of file
import bcrypt from 'bcrypt';
import { db } from '../db';
import { productService } from '../services/product.service';

// ✅ Dynamic import for code splitting (if needed)
async function loadHeavyModule() {
  const { heavyFunction } = await import('../heavy-module.js');
  return heavyFunction;
}
```

### Why?
- ESM is the modern standard
- Better tree-shaking
- Top-level imports are easier to analyze

---

## 9. fastify.log.* for all logging

### ❌ INCORRECT
```typescript
// ❌ Using console
console.log('Starting server');
console.error('Database error:', err);

// ❌ Using custom logger
import { logger } from '../lib/logger';
logger.info('Request received');
```

### ✅ CORRECT
```typescript
// ✅ Use Fastify's logger
fastify.log.info('Starting server');
fastify.log.error({ err }, 'Database error');
fastify.log.debug({ requestId: request.id }, 'Request received');

// ✅ In services, accept logger as parameter or use child logger
export async function processOrder(data: OrderData, log: FastifyLoggerInstance) {
  log.debug({ orderId: data.id }, 'Processing order');
  // ...
}

// ✅ Child loggers for context
const orderLog = fastify.log.child({ module: 'order-service' });
orderLog.info('Order service initialized');
```

### Why?
- Centralized logging configuration
- Request context (requestId)
- Configurable log levels
- Structured logging (JSON)

---

## 10. Redis for caching + queues (not in-memory)

### ❌ INCORRECT
```typescript
// ❌ In-memory cache
const cache = new Map();  // ❌ Lost on restart, not shared across instances

async function getProduct(id: string) {
  if (cache.has(id)) {
    return cache.get(id);  // ❌ In-memory only
  }
  const product = await db.query.products.findFirst({...});
  cache.set(id, product);
  return product;
}

// ❌ In-memory queue
const jobQueue: Job[] = [];  // ❌ Lost on crash, not scalable
```

### ✅ CORRECT
```typescript
// ✅ Redis for caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getProduct(id: string) {
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const product = await db.query.products.findFirst({...});
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));  // 5 min TTL
  return product;
}

// ✅ BullMQ for queues
import { Queue } from 'bullmq';

const emailQueue = new Queue('emails', {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
});

async function sendEmail(data: EmailData) {
  await emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
}
```

### Why?
- Persistence across restarts
- Shared across multiple server instances
- Scalable architecture
- BullMQ provides job retries, delays, priorities

---

## 11. Seed file has NODE_ENV !== 'production' guard

### ❌ INCORRECT
```typescript
// seed.ts - WRONG (dangerous!)
import { db } from './db';
import { stores, users } from './schema';

async function seed() {
  await db.insert(stores).values([...]);
  await db.insert(users).values([...]);
}

seed();  // ❌ Runs in ANY environment!
```

### ✅ CORRECT
```typescript
// seed.ts - SAFE
// NOTE: console.log/console.error is acceptable in standalone CLI scripts
// like seed files, since they run outside the Fastify server context.
import { db } from './db';
import { stores, users } from './schema';

async function seed() {
  // ✅ Guard against production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seeding not allowed in production!');
    process.exit(1);
  }
  
  console.log('🌱 Seeding database...');
  
  await db.insert(stores).values([
    {
      name: 'Test Store',
      domain: 'test.localhost',
      ownerEmail: 'test@example.com'
    }
  ]);
  
  await db.insert(users).values([
    {
      email: 'admin@test.com',
      role: 'OWNER'
    }
  ]);
  
  console.log('✅ Seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
```

### Why?
- Prevents accidental data loss in production
- Protects production data integrity
- Clear separation of concerns

---

## Quick Verification Script

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "check:security": "pnpm run check:console && pnpm run check:types && pnpm run check:storeid",
    "check:console": "grep -r 'console.log' src/ && echo '❌ Found console.log' || echo '✅ No console.log'",
    "check:types": "tsc --noEmit",
    "check:storeid": "grep -r 'body.storeId' src/ && echo '❌ Found body.storeId' || echo '✅ No body.storeId'",
    "check:prehandler": "grep -r 'preHandler' src/routes/ && echo '❌ Found inline preHandler' || echo '✅ No inline preHandler'"
  }
}
```

Run before committing:
```bash
pnpm run check:security
```
