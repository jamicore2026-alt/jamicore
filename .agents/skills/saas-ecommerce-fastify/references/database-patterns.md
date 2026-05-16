# Database Patterns

## 1. Drizzle ORM Only - No Raw SQL

```typescript
// CORRECT - Use Drizzle ORM
const result = await db.select().from(products).where(eq(products.id, id));

// INCORRECT - Never use raw SQL
const result = await db.execute(`SELECT * FROM products WHERE id = '${id}'`);  // ❌ SQL injection risk
```

## 2. Batch Queries with inArray()

```typescript
import { inArray } from 'drizzle-orm';

// CORRECT - Batch fetch
const productList = await db.query.products.findMany({
  where: inArray(products.id, productIds)
});

// INCORRECT - N+1 query
const productList = [];
for (const id of productIds) {  // ❌ N+1 query
  const product = await db.query.products.findFirst({
    where: eq(products.id, id)
  });
  productList.push(product);
}
```

## 3. StoreId from JWT, Never from Body

```typescript
// CORRECT - Get storeId from JWT (set in scope hook)
fastify.post('/', async (request, reply) => {
  const product = await productService.create({
    ...request.body,
    storeId: request.storeId  // From JWT, not body
  });
});

// INCORRECT
fastify.post('/', async (request, reply) => {
  const product = await productService.create({
    ...request.body,
    storeId: request.body.storeId  // ❌ Client could pass any storeId
  });
});
```