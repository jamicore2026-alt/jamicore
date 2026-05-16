# N+1 Query Prevention - Complete Guide

The N+1 query problem is the #1 performance killer in ORM applications. This section covers how to completely eliminate it in your SaaS e-commerce platform.

## Understanding the Problem

**N+1 Example (BAD):**
```typescript
// ❌ BAD: 1 + N queries
const orders = await db.select().from(orders);  // 1 query

for (const order of orders) {
  // This runs N times (once per order)
  order.items = await db.select().from(orderItems)
    .where(eq(orderItems.orderId, order.id));
}
// Result: 101 queries for 100 orders!
```

## Solution 1: Drizzle Relational Queries (Recommended)

Use the `with` clause for automatic batch loading:

```typescript
// ✅ GOOD: Single query with JOINs + JSON aggregation
const ordersWithItems = await db.query.orders.findMany({
  where: eq(orders.storeId, storeId),
  with: {
    items: true,  // Automatically loaded in same query
    customer: true,
    coupon: true
  },
  orderBy: desc(orders.createdAt),
  limit: 50
});
```

**Generated SQL:**
```sql
SELECT orders.*,
  COALESCE(json_agg(order_items.*) FILTER (WHERE order_items.id IS NOT NULL), '[]') as items,
  customers.*,
  coupons.*
FROM orders
LEFT JOIN order_items ON orders.id = order_items.order_id
LEFT JOIN customers ON orders.customer_id = customers.id
LEFT JOIN coupons ON orders.coupon_id = coupons.id
WHERE orders.store_id = $1
GROUP BY orders.id
ORDER BY orders.created_at DESC
LIMIT 50;
```

## Solution 2: Batch Loading with inArray()

When you need more control, use `inArray()`:

```typescript
// ✅ GOOD: 2 queries total (1 for orders, 1 for items)

// Step 1: Get orders
const orderList = await db.select().from(orders)
  .where(eq(orders.storeId, storeId))
  .limit(50);

// Step 2: Get all items in ONE query
const orderIds = orderList.map(o => o.id);
const allItems = await db.select().from(orderItems)
  .where(inArray(orderItems.orderId, orderIds));

// Step 3: Map items to orders
const itemsByOrderId = new Map();
for (const item of allItems) {
  if (!itemsByOrderId.has(item.orderId)) {
    itemsByOrderId.set(item.orderId, []);
  }
  itemsByOrderId.get(item.orderId).push(item);
}

// Step 4: Attach to orders
const ordersWithItems = orderList.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.id) || []
}));
```

## Solution 3: Service Layer Pattern

Create reusable service methods that prevent N+1:

```typescript
// services/order.service.ts
export const orderService = {
  
  // ✅ Automatically loads relations without N+1
  async findWithRelations(storeId: string, options?: FindOptions) {
    return db.query.orders.findMany({
      where: eq(orders.storeId, storeId),
      with: {
        items: {
          with: {
            product: true  // Nested relation
          }
        },
        customer: true,
        coupon: true
      },
      ...options
    });
  },
  
  // ✅ Batch load by IDs
  async findByIdsWithItems(orderIds: string[]) {
    if (orderIds.length === 0) return [];
    
    return db.query.orders.findMany({
      where: inArray(orders.id, orderIds),
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                titleEn: true,
                images: true
              }
            }
          }
        }
      }
    });
  },
  
  // ✅ For dashboard: Only load counts, not full data
  async findWithCounts(storeId: string) {
    const result = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      itemCount: sql<number>`COUNT(${orderItems.id})`,
      createdAt: orders.createdAt
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(eq(orders.storeId, storeId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
    
    return result;
  }
};
```

## Solution 4: E-commerce Specific Patterns

**Product with Categories (Many-to-One):**
```typescript
// ✅ Use relational queries
const productsWithCategories = await db.query.products.findMany({
  where: eq(products.storeId, storeId),
  with: {
    category: true,        // Many-to-one (singular)
    subcategory: true,     // Many-to-one (singular)
    variants: {            // One-to-many (collection)
      with: {
        options: true
      },
      limit: 10  // Always limit collections!
    }
  }
});
```

**Customer with Orders (One-to-Many):**
```typescript
// ✅ For customer list: Don't load all orders
const customers = await db.query.customers.findMany({
  where: eq(customers.storeId, storeId),
  with: {
    orders: {
      limit: 5,           // Limit to recent orders
      orderBy: desc(orders.createdAt),
      columns: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true
      }
    }
  }
});

// ✅ For single customer: Load all orders
const customerWithAllOrders = await db.query.customers.findFirst({
  where: eq(customers.id, customerId),
  with: {
    orders: {
      orderBy: desc(orders.createdAt)
      // No limit - load all for detail view
    },
    addresses: true
  }
});
```

## Solution 5: DataLoader Pattern (Advanced)

For complex GraphQL-like scenarios, implement DataLoader:

```typescript
// utils/dataLoader.ts
import DataLoader from 'dataloader';

export function createProductLoader() {
  return new DataLoader(async (productIds: string[]) => {
    // Single query for all requested products
    const products = await db.query.products.findMany({
      where: inArray(products.id, productIds),
      with: {
        category: true
      }
    });
    
    // Return in same order as input keys
    const productMap = new Map(products.map(p => [p.id, p]));
    return productIds.map(id => productMap.get(id) || null);
  });
}

// Usage in routes
fastify.get('/orders/:id', async (request, reply) => {
  const productLoader = createProductLoader();
  
  const order = await orderService.findById(request.params.id);
  
  // These will be batched automatically
  const itemsWithProducts = await Promise.all(
    order.items.map(async item => ({
      ...item,
      product: await productLoader.load(item.productId)
    }))
  );
  
  return { ...order, items: itemsWithProducts };
});
```

## Solution 6: Prepared Statements

For frequently run queries, use prepared statements:

```typescript
// ✅ Prepare once, execute multiple times
const preparedGetProducts = db.query.products.findMany({
  where: (products, { eq, and }) => and(
    eq(products.storeId, sql.placeholder('storeId')),
    eq(products.isPublished, true)
  ),
  with: {
    category: true
  },
  orderBy: desc(products.sortOrder)
}).prepare('get_products');

// Execute multiple times efficiently
const products1 = await preparedGetProducts.execute({ storeId: 'store-1' });
const products2 = await preparedGetProducts.execute({ storeId: 'store-2' });
```

## Common Pitfalls to Avoid

```typescript
// ❌ BAD: N+1 in map
const products = await db.select().from(products);
const withCategories = await Promise.all(
  products.map(async p => ({
    ...p,
    category: await db.query.categories.findFirst({
      where: eq(categories.id, p.categoryId)  // N queries!
    })
  }))
);

// ❌ BAD: Loop with await
for (const orderId of orderIds) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)  // N queries!
  });
}

// ❌ BAD: Loading full collections without limits
await db.query.customers.findMany({
  with: {
    orders: true  // Could load thousands!
  }
});

// ✅ GOOD: Always limit collections
await db.query.customers.findMany({
  with: {
    orders: {
      limit: 10,
      orderBy: desc(orders.createdAt)
    }
  }
});
```

## Query Count Cheat Sheet

| Scenario | Bad (N+1) | Good | Queries |
|----------|-----------|------|---------|
| 100 orders with items | Loop with await | `with: { items: true }` | 1 |
| 100 products with categories | Loop query | `with: { category: true }` | 1 |
| Update 100 products | Individual updates | `db.update().where(inArray())` | 1 |
| Delete 100 items | Individual deletes | `db.delete().where(inArray())` | 1 |
| Dashboard counts | Load all + count in JS | SQL `COUNT()` with `GROUP BY` | 1 |

## Performance Monitoring

Add query counting to catch N+1 issues:

```typescript
// db/index.ts
let queryCount = 0;

export const db = drizzle(client, {
  schema,
  logger: {
    logQuery: (query, params) => {
      queryCount++;
      if (queryCount > 10) {
        fastify.log.warn(`Query count: ${queryCount} - Possible N+1 issue`);
      }
    }
  }
});

// Reset counter per request
export function resetQueryCount() {
  queryCount = 0;
}
```

---

**Key Takeaways:**
1. **Always use relational queries** (`with` clause) for parent-child relationships
2. **Use `inArray()`** for batch loading when you need custom logic
3. **Always limit collections** (`limit: 10`) to prevent loading too much data
4. **Use prepared statements** for frequently-run queries
5. **Monitor query counts** per request to catch N+1 issues early

**Sources:**
- Drizzle ORM Relational Queries (orm.drizzle.team)
- N+1 Query Problem - Webcoderspeed
- PostgreSQL Performance - SupaExplorer