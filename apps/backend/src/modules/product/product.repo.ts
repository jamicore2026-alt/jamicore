// Product repository — all Drizzle queries, no business logic
import { db } from '../../db/index.js';
import {
  products,
  productVariants,
  productVariantOptions,
} from '../../db/schema.js';
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

// Re-use the Drizzle infer types so we don't duplicate column definitions
type ProductInsert = typeof products.$inferInsert;
type VariantInsert = typeof productVariants.$inferInsert;
type VariantOptionInsert = typeof productVariantOptions.$inferInsert;

// Type for the database executor (db or tx)
type DbExecutor = typeof db;

export const productRepo = {
  // ─── Products ───

  async findByStoreId(
    storeId: string,
    options?: { limit?: number; offset?: number; isPublished?: boolean; search?: string; categoryId?: string },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const conditions = [eq(products.storeId, storeId)];

    if (options?.isPublished !== undefined) {
      conditions.push(eq(products.isPublished, options.isPublished));
    }

    if (options?.search) {
      conditions.push(or(
        ilike(products.titleEn, `%${options.search}%`),
        ilike(products.titleAr, `%${options.search}%`),
        ilike(products.descriptionEn, `%${options.search}%`),
        ilike(products.descriptionAr, `%${options.search}%`),
      ) as SQL<unknown>);
    }

    if (options?.categoryId) {
      conditions.push(eq(products.categoryId, options.categoryId));
    }

    const items = await executor.query.products.findMany({
      where: and(...conditions),
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true,
          },
        },
        modifierGroups: {
          with: {
            options: true,
          },
        },
      },
      orderBy: [desc(products.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
    });

    const [{ count }] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions));

    return { items, total: count };
  },

  async findById(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    return executor.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.storeId, storeId)),
      with: {
        category: true,
        subcategory: true,
        variants: {
          with: {
            options: true,
          },
        },
        modifierGroups: {
          with: {
            options: true,
          },
        },
      },
    });
  },

  async create(data: ProductInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [product] = await executor.insert(products).values(data).returning();
    return product;
  },

  async update(id: string, storeId: string, data: Partial<ProductInsert>, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [product] = await executor
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();
    return product;
  },

  async delete(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [product] = await executor
      .delete(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .returning();
    return product;
  },

  // ─── Variants ───

  async createVariant(data: VariantInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [variant] = await executor.insert(productVariants).values(data).returning();
    return variant;
  },

  async updateVariant(id: string, storeId: string, data: Partial<VariantInsert>, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [variant] = await executor
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productVariants.id, id), eq(productVariants.storeId, storeId)))
      .returning();
    return variant;
  },

  async deleteVariant(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [variant] = await executor
      .delete(productVariants)
      .where(and(eq(productVariants.id, id), eq(productVariants.storeId, storeId)))
      .returning();
    return variant;
  },

  // ─── Variant Options ───

  async createVariantOption(data: VariantOptionInsert, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [option] = await executor.insert(productVariantOptions).values(data).returning();
    return option;
  },

  async updateVariantOption(
    id: string,
    storeId: string,
    data: Partial<VariantOptionInsert>,
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const [option] = await executor
      .update(productVariantOptions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productVariantOptions.id, id), eq(productVariantOptions.storeId, storeId)))
      .returning();
    return option;
  },

  async deleteVariantOption(id: string, storeId: string, tx?: DbExecutor) {
    const executor = tx ?? db;
    const [option] = await executor
      .delete(productVariantOptions)
      .where(and(eq(productVariantOptions.id, id), eq(productVariantOptions.storeId, storeId)))
      .returning();
    return option;
  },

  // ─── Search ───

  async search(
    storeId: string,
    opts: {
      q?: string;
      categoryId?: string;
      minPrice?: string;
      maxPrice?: string;
      isPublished?: boolean;
      sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc';
      limit: number;
      offset: number;
    },
    tx?: DbExecutor,
  ) {
    const executor = tx ?? db;
    const conditions: SQL[] = [eq(products.storeId, storeId)];

    if (opts.isPublished !== undefined) {
      conditions.push(eq(products.isPublished, opts.isPublished));
    }

    if (opts.categoryId) {
      conditions.push(eq(products.categoryId, opts.categoryId));
    }

    if (opts.minPrice) {
      conditions.push(gte(products.salePrice, opts.minPrice));
    }

    if (opts.maxPrice) {
      conditions.push(lte(products.salePrice, opts.maxPrice));
    }

    if (opts.q) {
      const pattern = `%${opts.q}%`;
      conditions.push(
        or(
          ilike(products.titleEn, pattern),
          ilike(products.titleAr, pattern),
          ilike(products.descriptionEn, pattern),
          ilike(products.descriptionAr, pattern),
          sql`${products.tags}::text ilike ${pattern}`,
        )!,
      );
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    // Determine sort order
    let orderBy;
    switch (opts.sort) {
      case 'price_asc':
        orderBy = asc(products.salePrice);
        break;
      case 'price_desc':
        orderBy = desc(products.salePrice);
        break;
      case 'name_asc':
        orderBy = asc(products.titleEn);
        break;
      case 'name_desc':
        orderBy = desc(products.titleEn);
        break;
      case 'newest':
      default:
        orderBy = desc(products.createdAt);
        break;
    }

    const [rows, totalResult] = await Promise.all([
      executor.query.products.findMany({
        where,
        with: {
          category: { columns: { id: true, nameEn: true, nameAr: true, storeId: true } },
          subcategory: { columns: { id: true, nameEn: true, nameAr: true } },
          variants: {
            with: { options: true },
          },
          modifierGroups: {
            with: { options: true },
          },
        },
        orderBy: [orderBy],
        limit: opts.limit,
        offset: opts.offset,
      }),
      executor.select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(where),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      items: rows,
      total,
      limit: opts.limit,
      offset: opts.offset,
    };
  },
};