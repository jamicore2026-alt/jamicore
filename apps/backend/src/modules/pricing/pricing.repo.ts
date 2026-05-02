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

export const pricingRepo = {
  // ─── Product lookups ───

  async findProductById(productId: string, storeId: string): Promise<typeof products.$inferSelect | undefined> {
    return db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.storeId, storeId)),
    });
  },

  // ─── Variant option lookups ───

  async findVariantOptionsByIds(optionIds: string[], storeId: string): Promise<typeof productVariantOptions.$inferSelect[]> {
    return db.query.productVariantOptions.findMany({
      where: and(
        inArray(productVariantOptions.id, optionIds),
        eq(productVariantOptions.storeId, storeId),
      ),
    });
  },

  async findVariantsByIds(variantIds: string[], productId: string): Promise<typeof productVariants.$inferSelect[]> {
    return db.query.productVariants.findMany({
      where: and(
        inArray(productVariants.id, variantIds),
        eq(productVariants.productId, productId),
      ),
    });
  },

  // ─── Combination lookups ───

  async findCombination(combinationKey: string, productId: string, storeId: string): Promise<typeof productVariantCombinations.$inferSelect | undefined> {
    return db.query.productVariantCombinations.findFirst({
      where: and(
        eq(productVariantCombinations.combinationKey, combinationKey),
        eq(productVariantCombinations.productId, productId),
        eq(productVariantCombinations.storeId, storeId),
      ),
    });
  },

  // ─── Modifier lookups ───

  async findModifierOptionsByIds(optionIds: string[], storeId: string): Promise<typeof modifierOptions.$inferSelect[]> {
    return db.query.modifierOptions.findMany({
      where: and(
        inArray(modifierOptions.id, optionIds),
        eq(modifierOptions.storeId, storeId),
      ),
    });
  },

  async findModifierGroupsByIds(groupIds: string[], storeId: string): Promise<typeof modifierGroups.$inferSelect[]> {
    return db.query.modifierGroups.findMany({
      where: and(
        inArray(modifierGroups.id, groupIds),
        eq(modifierGroups.storeId, storeId),
      ),
    });
  },
};