// Pricing repository — Drizzle queries only. No business logic, no ErrorCodes.
import { db } from '../../db/index.js';
import {
  products,
  productVariantOptions,
  productVariantCombinations,
  modifierOptions,
  modifierGroups,
  productVariants,
} from '../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { DbOrTx } from '../_shared/db-types.js';

export const pricingRepo = {
  // ─── Product lookups ───

  async findProductById(productId: string, storeId: string, tx?: DbOrTx): Promise<typeof products.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.storeId, storeId)),
    });
  },

  // ─── Variant option lookups ───

  async findVariantOptionsByIds(optionIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof productVariantOptions.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.productVariantOptions.findMany({
      where: and(
        inArray(productVariantOptions.id, optionIds),
        eq(productVariantOptions.storeId, storeId),
      ),
    });
  },

  async findVariantsByIds(variantIds: string[], productId: string, tx?: DbOrTx): Promise<typeof productVariants.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.productVariants.findMany({
      where: and(
        inArray(productVariants.id, variantIds),
        eq(productVariants.productId, productId),
      ),
    });
  },

  // ─── Combination lookups ───

  async findCombination(combinationKey: string, productId: string, storeId: string, tx?: DbOrTx): Promise<typeof productVariantCombinations.$inferSelect | undefined> {
    const executor = tx ?? db;
    return executor.query.productVariantCombinations.findFirst({
      where: and(
        eq(productVariantCombinations.combinationKey, combinationKey),
        eq(productVariantCombinations.productId, productId),
        eq(productVariantCombinations.storeId, storeId),
      ),
    });
  },

  // ─── Modifier lookups ───

  async findModifierOptionsByIds(optionIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof modifierOptions.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.modifierOptions.findMany({
      where: and(
        inArray(modifierOptions.id, optionIds),
        eq(modifierOptions.storeId, storeId),
      ),
    });
  },

  async findModifierGroupsByIds(groupIds: string[], storeId: string, tx?: DbOrTx): Promise<typeof modifierGroups.$inferSelect[]> {
    const executor = tx ?? db;
    return executor.query.modifierGroups.findMany({
      where: and(
        inArray(modifierGroups.id, groupIds),
        eq(modifierGroups.storeId, storeId),
      ),
    });
  },
};