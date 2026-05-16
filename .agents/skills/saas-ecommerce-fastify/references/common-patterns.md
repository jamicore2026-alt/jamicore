# Common Patterns

## 1. Creating a New Merchant Route

```typescript
// 1. Create scope file in scopes/merchant.ts (already exists)
// 2. Create route file in routes/merchant/newFeature.ts
// 3. Register in scope file:
fastify.register(import('../routes/merchant/newFeature'), { prefix: '/new-feature' });

// 4. Create service in services/newFeature.service.ts
// 5. Export from services/index.ts if needed
```

## 2. Adding a New Database Table

```typescript
// 1. Add table to db/schema.ts
export const newTable = pgTable("new_table", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  // ... fields
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Run migration
// npx drizzle-kit generate
// npx drizzle-kit migrate

// 3. Create service
// 4. Create routes
```

## 3. Error Response Format

Always use this format (include `code` from `errors/codes.ts`):

```typescript
import { ErrorCodes } from '../../errors/codes';

// Simple error
reply.status(400).send({ 
  error: 'Bad Request',
  code: ErrorCodes.VALIDATION_ERROR,
  message: 'Invalid input' 
});

// Not found
reply.status(404).send({ 
  error: 'Not Found',
  code: ErrorCodes.PRODUCT_NOT_FOUND,
  message: 'Product not found' 
});

// Unauthorized
reply.status(401).send({ 
  error: 'Unauthorized',
  code: ErrorCodes.INVALID_CREDENTIALS,
  message: 'Authentication required' 
});

// Forbidden
reply.status(403).send({ 
  error: 'Forbidden',
  code: ErrorCodes.STORE_SUSPENDED,
  message: 'Store is suspended' 
});
```