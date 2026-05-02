// Modifier repository — DB-only operations, no business logic
import { db } from '../../db/index.js';
import { modifierGroups, modifierOptions } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

// ─── Modifier Group queries ───

export async function findGroupsByStoreId(
  storeId: string,
  options?: { limit?: number; offset?: number },
) {
  const items = await db.query.modifierGroups.findMany({
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

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(modifierGroups)
    .where(eq(modifierGroups.storeId, storeId));

  return { items, total: count };
}

export async function findGroupById(id: string, storeId: string) {
  return db.query.modifierGroups.findFirst({
    where: and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)),
    with: {
      product: true,
      category: true,
      options: true,
    },
  });
}

export async function findGroupsByProductId(productId: string, storeId: string, limit = 50) {
  return db.query.modifierGroups.findMany({
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

export async function insertGroup(data: typeof modifierGroups.$inferInsert): Promise<typeof modifierGroups.$inferSelect> {
  const [group] = await db.insert(modifierGroups).values(data).returning();
  return group;
}

export async function updateGroup(
  id: string,
  storeId: string,
  data: Partial<typeof modifierGroups.$inferInsert>,
): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const [group] = await db
    .update(modifierGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

export async function deleteGroup(id: string, storeId: string): Promise<typeof modifierGroups.$inferSelect | undefined> {
  const [group] = await db
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, id), eq(modifierGroups.storeId, storeId)))
    .returning();
  return group;
}

// ─── Modifier Option queries ───

export async function findOptionById(id: string, storeId: string): Promise<typeof modifierOptions.$inferSelect | undefined> {
  return db.query.modifierOptions.findFirst({
    where: and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)),
  });
}

export async function insertOption(data: typeof modifierOptions.$inferInsert): Promise<typeof modifierOptions.$inferSelect> {
  const [option] = await db.insert(modifierOptions).values(data).returning();
  return option;
}

export async function updateOption(
  id: string,
  storeId: string,
  data: Partial<typeof modifierOptions.$inferInsert>,
): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const [option] = await db
    .update(modifierOptions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}

export async function deleteOption(id: string, storeId: string): Promise<typeof modifierOptions.$inferSelect | undefined> {
  const [option] = await db
    .delete(modifierOptions)
    .where(and(eq(modifierOptions.id, id), eq(modifierOptions.storeId, storeId)))
    .returning();
  return option;
}