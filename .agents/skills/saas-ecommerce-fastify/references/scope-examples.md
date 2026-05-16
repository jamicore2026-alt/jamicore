# Scope Examples and Patterns

## Understanding Fastify Encapsulation

Fastify's encapsulation system is powerful. When you register a plugin with `fastify.register()`, it creates a new encapsulated context. Hooks defined in that context only apply to routes registered within that same context.

### The Four Scopes

## 1. Public Scope

No authentication required. Used for storefront browsing.

```typescript
// scopes/public.ts
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';

export default async function publicScope(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  // No auth hooks - completely public
  
  // Optional: Add tenant resolution from domain/subdomain
  fastify.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host;
    const store = await fastify.storeService.getStoreByDomain(host);
    
    if (!store) {
      reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
      return;
    }
    
    request.storeId = store.id;
  });
  
  // Register public routes
  fastify.register(import('../routes/public/store'), { prefix: '/store' });
  fastify.register(import('../routes/public/products'), { prefix: '/products' });
  fastify.register(import('../routes/public/reviews'), { prefix: '/reviews' });
  fastify.register(import('../routes/public/coupons'), { prefix: '/coupons' });
  fastify.register(import('../routes/public/cart'), { prefix: '/cart' });
  fastify.register(import('../routes/public/analytics'), { prefix: '/analytics' });
  
}
```

## 2. Merchant Scope

Authentication required. Store owners and staff.

```typescript
// scopes/merchant.ts
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';

export default async function merchantScope(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  
  // JWT verification hook - runs on ALL merchant routes
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      
      // Verify storeId from JWT
      if (!decoded.storeId) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        return;
      }
      
      // CRITICAL: Check store status (NEVER skip this)
      const store = await fastify.storeService.getStore(decoded.storeId);
      if (!store) {
        reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
        return;
      }
      if (store.status !== 'active') {
        reply.status(403).send({ error: 'Forbidden', message: `Store is ${store.status}` });
        return;
      }
      
      // Check plan expiration
      if (store.planExpiresAt && new Date(store.planExpiresAt) < new Date()) {
        reply.status(403).send({ error: 'Forbidden', message: 'Plan expired' });
        return;
      }
      
      // Attach to request
      request.storeId = decoded.storeId;
      request.userId = decoded.userId;
      request.userRole = decoded.role;
      
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }
  });
  
  // Optional: Role-based access control
  fastify.decorate('requireRole', function(roles: string[]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!roles.includes(request.userRole)) {
        reply.status(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
        return;
      }
    };
  });
  
  // Register merchant routes
  fastify.register(import('../routes/merchant/auth'), { prefix: '/auth' });
  fastify.register(import('../routes/merchant/store'), { prefix: '/store' });
  fastify.register(import('../routes/merchant/products'), { prefix: '/products' });
  fastify.register(import('../routes/merchant/categories'), { prefix: '/categories' });
  fastify.register(import('../routes/merchant/modifiers'), { prefix: '/modifiers' });
  fastify.register(import('../routes/merchant/orders'), { prefix: '/orders' });
  fastify.register(import('../routes/merchant/customers'), { prefix: '/customers' });
  fastify.register(import('../routes/merchant/reviews'), { prefix: '/reviews' });
  fastify.register(import('../routes/merchant/coupons'), { prefix: '/coupons' });
  fastify.register(import('../routes/merchant/analytics'), { prefix: '/analytics' });
  fastify.register(import('../routes/merchant/upload'), { prefix: '/upload' });
  
}
```

## 3. Customer Scope

Authentication required. Registered customers.

```typescript
// scopes/customer.ts
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';

export default async function customerScope(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  
  // Customer JWT verification
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      
      // Verify customer token has customerId
      if (!decoded.customerId || !decoded.storeId) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        return;
      }
      
      // Check if customer exists and is verified
      const customer = await fastify.customerService.findById(decoded.customerId);
      if (!customer) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Customer not found' });
        return;
      }
      
      // Optional: Check if email is verified
      if (!customer.isVerified) {
        reply.status(403).send({ error: 'Forbidden', message: 'Email not verified' });
        return;
      }
      
      // Attach to request
      request.customerId = decoded.customerId;
      request.storeId = decoded.storeId;
      
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }
  });
  
  // Register customer routes
  fastify.register(import('../routes/customer/auth'), { prefix: '/auth' });
  fastify.register(import('../routes/customer/profile'), { prefix: '/profile' });
  fastify.register(import('../routes/customer/orders'), { prefix: '/orders' });
  fastify.register(import('../routes/customer/checkout'), { prefix: '/checkout' });
  fastify.register(import('../routes/customer/wishlist'), { prefix: '/wishlist' });
  fastify.register(import('../routes/customer/reviews'), { prefix: '/reviews' });
  
}
```

## 4. SuperAdmin Scope

Authentication required. Platform administrators.

```typescript
// scopes/superAdmin.ts
import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';

export default async function superAdminScope(fastify: FastifyInstance, opts: FastifyPluginOptions) {
  
  // SuperAdmin JWT verification
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      
      // Verify superAdmin token
      if (!decoded.superAdminId) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
        return;
      }
      
      // Check if admin exists and is active
      const admin = await fastify.superAdminService.findById(decoded.superAdminId);
      if (!admin || !admin.isActive) {
        reply.status(401).send({ error: 'Unauthorized', message: 'Admin not found or inactive' });
        return;
      }
      
      // Attach to request
      request.superAdminId = decoded.superAdminId;
      request.adminRole = decoded.role;
      
    } catch (err) {
      fastify.log.warn({ err }, 'Authentication failed');
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }
  });
  
  // Register superAdmin routes
  fastify.register(import('../routes/superAdmin/auth'), { prefix: '/auth' });
  fastify.register(import('../routes/superAdmin/merchants'), { prefix: '/merchants' });
  fastify.register(import('../routes/superAdmin/plans'), { prefix: '/plans' });
  fastify.register(import('../routes/superAdmin/stores'), { prefix: '/stores' });
  
}
```

## Why Encapsulation Matters

### Without Encapsulation (WRONG)

```typescript
// ❌ BAD - Using inline preHandler
fastify.get('/merchant/products', {
  preHandler: [authMiddleware]  // ❌ This is wrong!
}, async (request, reply) => {
  // ...
});
```

### With Encapsulation (CORRECT)

```typescript
// ✅ GOOD - Hooks in scope file
// scopes/merchant.ts
fastify.addHook('onRequest', async (request, reply) => {
  await request.jwtVerify();  // Runs on all merchant routes
});

// routes/merchant/products.ts
fastify.get('/', async (request, reply) => {
  // Auth already done by scope hook
});
```

## Hook Execution Order

When a request comes in:

1. **Global hooks** (from plugins/index.ts)
2. **Scope hooks** (from scopes/*.ts)
3. **Route handler**

## Sharing State Between Hooks and Handlers

Use decorators or request properties:

```typescript
// In scope hook
request.storeId = decoded.storeId;
request.userId = decoded.userId;

// In route handler
const products = await productService.findByStoreId(request.storeId);
```

## Common Patterns

### Rate Limiting by Scope

```typescript
// Different rate limits per scope
// merchant scope
fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

// public scope
fastify.register(import('@fastify/rate-limit'), {
  max: 30,
  timeWindow: '1 minute'
});
```

### Different Validation per Scope

```typescript
// Public product view - minimal validation
fastify.get('/:id', async (request, reply) => {
  // Simple lookup
});

// Merchant product edit - strict validation
fastify.put('/:id', {
  schema: {
    body: updateProductSchema  // Strict Zod validation
  }
}, async (request, reply) => {
  // Validated update
});
```

## Testing Scope Encapsulation

```typescript
// test/merchant-scope.test.ts
import { test } from 'tap';
import buildApp from '../src/app';

test('merchant scope requires authentication', async (t) => {
  const app = buildApp();
  
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/merchant/products'
  });
  
  t.equal(response.statusCode, 401);
  t.same(JSON.parse(response.payload), {
    error: 'Unauthorized',
    message: 'Invalid token'
  });
});

test('public scope does not require authentication', async (t) => {
  const app = buildApp();
  
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/public/products'
  });
  
  t.equal(response.statusCode, 200);
});
```
