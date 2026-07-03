// Modifier repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { modifierGroups, modifierOptions } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

// ─── Modifier Group queries ───

export async function findGroupsByStoreId(
  storeId: string,
  options?: { limit?: number; offset?: number },
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  const items = await executor.query.modifierGroups.findMany({
    where: eq(modifierGroups.storeId, storeId),
    with: {
      product: true,
      category: true,
      options: true,
    },
    orderBy: [desc(modifierGroups.createdAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset,
  });

  const [{ count }] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(modifierGroups)
    .where(eq(modifierGroups.storeId, storeId));

  return { items, total: count };
}

export async function findGroupById(id: string, storeId: string, tx?: DbOrTx) {
  const executor = tx ?? db;
  return executor.query.modifierGroups.findFirst({
    where: and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)),
    with: {
      product: true,
      category: true,
      options: true,
    },
  });
}

// NOTE: `tx` is added AFTER the existing `limit` default arg to preserve the
// positional `limit` parameter for any caller that passes it positionally.
export async function findGroupsByProductId(
  productId: string,
  storeId: string,
  limit = 50,
  tx?: DbOrTx,
) {
  const executor = tx ?? db;
  return executor.query.modifierGroups.findMany({
    where: and(
      eq(modifierGroups.productId, productId),
      eq(modifierGroups.storeId, storeId),
    ),
    with: {
      options: true,
    },
    orderBy: [desc(modifierGroups.sortOrder)],
    limit,
  });
}

export async function insertGroup(data: typeof modifierGroups.$inferInsert, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect> {
  const executor = tx ?? db;
  const [group] = await executor.insert(modifierGroups).values(data).returning();
  return group;
}

export async function updateGroup(
  id: string,
  storeId: string,
  data: Partial<typeof modifierGroups.$inferInsert>,
  tx?: DbOrTx,
): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [group] = await executor
    .update(modifierGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

export async function deleteGroup(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [group] = await executor
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

// ─── Modifier Option queries ───

export async function findOptionById(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  return executor.query.modifierOptions.findFirst({
    where: and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)),
  });
}

export async function insertOption(data: typeof modifierOptions.$inferInsert, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect> {
  const executor = tx ?? db;
  const [option] = await executor.insert(modifierOptions).values(data).returning();
  return option;
}

export async function updateOption(
  id: string,
  storeId: string,
  data: Partial<typeof modifierOptions.$inferInsert>,
  tx?: DbOrTx,
): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [option] = await executor
    .update(modifierOptions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}

export async function deleteOption(id: string, storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const executor = tx ?? db;
  const [option] = await executor
    .delete(modifierOptions)
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}