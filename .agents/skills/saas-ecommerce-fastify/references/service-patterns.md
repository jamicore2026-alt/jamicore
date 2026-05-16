# Service Layer Patterns

## Service Pattern Philosophy

Routes handle HTTP (validation, request/response). Services handle business logic (database, calculations, external APIs).

**Note:** All services below use `process.env` for simplicity. In production, use a validated config module:
```typescript
import { env } from '../config/env';
const redis = new Redis(env.REDIS_URL);  // ✅ Validated
```

## Basic Service Structure

```typescript
// services/product.service.ts
import { db } from '../db';
import { products, categories, productVariants } from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

// TypeScript interfaces for service inputs
interface CreateProductInput {
  storeId: string;
  categoryId: string;
  subcategoryId?: string;
  titleEn: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  salePrice: string;
  purchasePrice?: string;
  currentQuantity: number;
  isPublished: boolean;
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

// Service object with methods
export const productService = {
  
  // Find all products for a store
  async findByStoreId(storeId: string, options?: { 
    limit?: number; 
    offset?: number;
    isPublished?: boolean;
  }) {
    const { limit = 50, offset = 0, isPublished } = options || {};
    
    const query = db.query.products.findMany({
      where: (products, { eq, and }) => {
        const conditions = [eq(products.storeId, storeId)];
        if (isPublished !== undefined) {
          conditions.push(eq(products.isPublished, isPublished));
        }
        return and(...conditions);
      },
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true
          }
        }
      },
      orderBy: desc(products.sortOrder),
      limit,
      offset
    });
    
    return query;
  },
  
  // Find single product by ID
  async findById(id: string, storeId: string) {
    return db.query.products.findFirst({
      where: and(
        eq(products.id, id),
        eq(products.storeId, storeId)
      ),
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true
          }
        },
        modifierGroups: {
          with: {
            options: true
          }
        }
      }
    });
  },
  
  // Create new product
  async create(data: CreateProductInput) {
    const [product] = await db.insert(products)
      .values(data)
      .returning();
    
    return product;
  },
  
  // Update product
  async update(data: UpdateProductInput) {
    const { id, ...updateData } = data;
    
    const [product] = await db.update(products)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(
        eq(products.id, id),
        eq(products.storeId, updateData.storeId!)
      ))
      .returning();
    
    return product;
  },
  
  // Soft delete (or hard delete if preferred)
  async delete(id: string, storeId: string) {
    // Option 1: Hard delete
    await db.delete(products)
      .where(and(
        eq(products.id, id),
        eq(products.storeId, storeId)
      ));
    
    // Option 2: Soft delete (recommended for e-commerce)
    // await db.update(products)
    //   .set({ isDeleted: true, deletedAt: new Date() })
    //   .where(...);
  },
  
  // Batch operations - use inArray for N+1 prevention
  async findByIds(ids: string[], storeId: string) {
    return db.query.products.findMany({
      where: and(
        inArray(products.id, ids),
        eq(products.storeId, storeId)
      )
    });
  },
  
  // Count products for pagination
  async countByStoreId(storeId: string, options?: { isPublished?: boolean }) {
    const { isPublished } = options || {};
    
    const result = await db.select({ count: sql<count>`count(*)` })
      .from(products)
      .where(and(
        eq(products.storeId, storeId),
        isPublished !== undefined ? eq(products.isPublished, isPublished) : undefined
      ));
    
    return result[0].count;
  }
};
```

## Service with External Dependencies

```typescript
// services/upload.service.ts
import { fileTypeFromBuffer } from 'file-type';
import { uploadToS3, deleteFromS3 } from '../lib/s3';
import { imageQueue } from '../lib/queue';

interface UploadOptions {
  maxSize?: number;  // bytes
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 10 * 1024 * 1024,  // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
};

export const uploadService = {
  
  async validateFile(buffer: Buffer, options: UploadOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    
    // Check file size
    if (buffer.length > config.maxSize!) {
      throw new Error(`File too large. Max size: ${config.maxSize! / 1024 / 1024}MB`);
    }
    
    // Validate actual file type (never trust Content-Type header)
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType || !config.allowedTypes!.includes(fileType.mime)) {
      throw new Error(`Invalid file type. Allowed: ${config.allowedTypes!.join(', ')}`);
    }
    
    return fileType;
  },
  
  async uploadImage(buffer: Buffer, storeId: string, folder: string = 'products') {
    // Validate first
    const fileType = await this.validateFile(buffer);
    
    // Generate unique filename
    const filename = `${folder}/${storeId}/${Date.now()}-${crypto.randomUUID()}.${fileType.ext}`;
    
    // Upload to S3
    const url = await uploadToS3(buffer, filename, fileType.mime);
    
    // Queue image optimization (thumbnail generation, etc.)
    await imageQueue.add('optimize', {
      url,
      storeId,
      filename
    });
    
    return {
      url,
      filename,
      mimeType: fileType.mime
    };
  },
  
  async deleteImage(url: string) {
    await deleteFromS3(url);
  }
};
```

## Service with Transactions

```typescript
// services/order.service.ts
import { db } from '../db';
import { orders, orderItems, products, carts } from '../db/schema';

export const orderService = {
  
  async createOrder(data: CreateOrderInput) {
    return await db.transaction(async (tx) => {
      // 1. Create order
      const [order] = await tx.insert(orders)
        .values({
          storeId: data.storeId,
          customerId: data.customerId,
          orderNumber: await this.generateOrderNumber(data.storeId),
          email: data.email,
          currency: data.currency,
          subtotal: data.subtotal,
          tax: data.tax,
          shipping: data.shipping,
          discount: data.discount,
          total: data.total,
          // ... other fields
        })
        .returning();
      
      // 2. Create order items
      const orderItemsData = data.items.map(item => ({
        orderId: order.id,
        storeId: data.storeId,
        productId: item.productId,
        productTitle: item.title,
        productImage: item.image,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        modifiers: item.modifiers
      }));
      
      await tx.insert(orderItems).values(orderItemsData);
      
      // 3. Update product quantities
      for (const item of data.items) {
        await tx.update(products)
          .set({ 
            currentQuantity: sql`${products.currentQuantity} - ${item.quantity}`,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId));
      }
      
      // 4. Clear cart if applicable
      if (data.cartId) {
        await tx.delete(carts)
          .where(eq(carts.id, data.cartId));
      }
      
      // 5. Return complete order
      return this.findById(order.id, data.storeId);
    });
  },
  
  async generateOrderNumber(storeId: string): Promise<string> {
    // Format: STORE-{timestamp}-{random}
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
};
```

## Service with Caching

```typescript
// services/cache.service.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const CACHE_TTL = {
  PRODUCTS: 300,    // 5 minutes
  CATEGORIES: 600,  // 10 minutes
  STORE: 60,        // 1 minute
  ANALYTICS: 3600   // 1 hour
};

export const cacheService = {
  
  async get(key: string) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },
  
  async set<T>(key: string, value: T, ttl: number = 300) {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  async delete(key: string) {
    await redis.del(key);
  },
  
  async deletePattern(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
  
  // Cache wrapper for services
  async wrap(key: string, fn: () => Promise<any>, ttl: number = 300) {
    const cached = await this.get(key);
    if (cached) return cached;
    
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
};

// Using cache in product service
export const productService = {
  async findByStoreId(storeId: string, options?: any) {
    const cacheKey = `products:${storeId}:${JSON.stringify(options)}`;
    
    return cacheService.wrap(cacheKey, async () => {
      // ... actual database query
    }, CACHE_TTL.PRODUCTS);
  },
  
  async update(data: UpdateProductInput) {
    const result = await db.update(products)...;
    
    // Invalidate cache
    await cacheService.deletePattern(`products:${data.storeId}:*`);
    
    return result;
  }
};
```

## Service with BullMQ Queue

```typescript
// services/email.service.ts
import { Queue } from 'bullmq';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Queue for async email processing
export const emailQueue = new Queue('emails', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

export const emailService = {
  
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    data?: Record<string, any>;
  }) {
    // Add to queue for async processing
    await emailQueue.add('send', options, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });
  },
  
  // Process email immediately (for worker)
  async processEmail(options: any) {
    if (options.template) {
      // Render template
      const html = await this.renderTemplate(options.template, options.data);
      options.html = html;
    }
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
    
    if (error) {
      throw new Error(`Email failed: ${error.message}`);
    }
    
    return data;
  },
  
  async renderTemplate(template: string, data: Record<string, any>) {
    // Template rendering logic
    // Could use handlebars, react-email, etc.
  }
};
```

## Service Patterns Summary

### DO:
- Keep services stateless
- Return plain objects (not class instances)
- Use transactions for multi-step operations
- Validate inputs at service level
- Use TypeScript interfaces for inputs/outputs
- Cache expensive operations
- Queue long-running tasks

### DON'T:
- Don't access request/response objects in services
- Don't send HTTP responses from services
- Don't use `console.log` - use `fastify.log`
- Don't import routes into services
- Don't create circular dependencies

## Service Organization

```
services/
├── index.ts          # Export all services
├── cache.service.ts
├── queue.service.ts
├── email.service.ts
├── upload.service.ts
├── product.service.ts
├── order.service.ts
├── customer.service.ts
├── store.service.ts
└── analytics.service.ts
```

```typescript
// services/index.ts
export { productService } from './product.service';
export { orderService } from './order.service';
export { customerService } from './customer.service';
export { storeService } from './store.service';
export { cacheService } from './cache.service';
export { emailService } from './email.service';
export { uploadService } from './upload.service';
```
