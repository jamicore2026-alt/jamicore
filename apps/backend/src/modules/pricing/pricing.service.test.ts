/* eslint-disable @typescript-eslint/no-explicit-any */
// Unit tests for pricingService — server-side price computation with mocked dependencies.
// Tests cover computeItemPrice (with/without variants, modifiers, coupons, combinations,
// discounts, edge cases) and computeOrderPricing (subtotal, discounts, shipping, tax, total).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock pricingRepo ───
vi.mock('./pricing.repo.js', () => ({
  pricingRepo: {
    findProductById: vi.fn() as any,
    findVariantOptionsByIds: vi.fn() as any,
    findVariantsByIds: vi.fn() as any,
    findCombination: vi.fn() as any,
    findModifierOptionsByIds: vi.fn() as any,
    findModifierGroupsByIds: vi.fn() as any,
  },
}));

// ─── Mock couponService ───
vi.mock('../coupon/coupon.service.js', () => ({
  couponService: {
    validateCoupon: vi.fn() as any,
    calculateDiscount: vi.fn() as any,
  },
}));

// ─── Mock shippingService ───
vi.mock('../shipping/shipping.service.js', () => ({
  shippingService: {
    calculateShipping: vi.fn() as any,
  },
}));

// ─── Mock taxService ───
vi.mock('../tax/tax.service.js', () => ({
  taxService: {
    calculateTax: vi.fn() as any,
  },
}));

import { pricingService } from './pricing.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { pricingRepo as _mockPricingRepo } from './pricing.repo.js';
import { couponService as _mockCouponService } from '../coupon/coupon.service.js';
import { shippingService as _mockShippingService } from '../shipping/shipping.service.js';
import { taxService as _mockTaxService } from '../tax/tax.service.js';

// Cast to any to allow vitest mock methods (mockResolvedValueOnce, etc.)
// on repo/service methods whose types are inferred from Drizzle's complex return types
const mockPricingRepo = _mockPricingRepo as any;
const mockCouponService = _mockCouponService as any;
const mockShippingService = _mockShippingService as any;
const mockTaxService = _mockTaxService as any;

// ─── Fixtures ───
const baseProduct = {
  id: 'prod-1',
  storeId: 'store-1',
  titleEn: 'Test Product',
  salePrice: '10.00',
  discount: null,
  discountType: null,
  currentQuantity: 100,
  isPublished: true,
  images: ['img1.jpg', 'img2.jpg'],
};

const publishedProductNoDiscount = { ...baseProduct };

const publishedProductWithPercentDiscount = {
  ...baseProduct,
  discount: '10',
  discountType: 'Percent',
};

const publishedProductWithFixedDiscount = {
  ...baseProduct,
  discount: '2.50',
  discountType: 'Fixed',
};

const unpublishedProduct = {
  ...baseProduct,
  isPublished: false,
};

const outOfStockProduct = {
  ...baseProduct,
  currentQuantity: 0,
};

const variantOption1 = {
  id: 'vo-1',
  variantId: 'v-1',
  nameEn: 'Red',
  priceAdjustment: '1.50',
  isAvailable: true,
  storeId: 'store-1',
};

const variantOption2 = {
  id: 'vo-2',
  variantId: 'v-1',
  nameEn: 'Large',
  priceAdjustment: '2.00',
  isAvailable: true,
  storeId: 'store-1',
};

const unavailableVariantOption = {
  id: 'vo-3',
  variantId: 'v-1',
  nameEn: 'Soldout',
  priceAdjustment: '0.00',
  isAvailable: false,
  storeId: 'store-1',
};

const variant1 = {
  id: 'v-1',
  productId: 'prod-1',
  nameEn: 'Color',
  storeId: 'store-1',
};

const combination1 = {
  id: 'comb-1',
  combinationKey: 'red-large',
  productId: 'prod-1',
  storeId: 'store-1',
  priceAdjustment: '5.00',
  isAvailable: true,
  stockQuantity: 20,
};

const unavailableCombination = {
  ...combination1,
  isAvailable: false,
};

const lowStockCombination = {
  ...combination1,
  stockQuantity: 1,
};

const modifierOption1 = {
  id: 'mo-1',
  modifierGroupId: 'mg-1',
  nameEn: 'Gift Wrap',
  priceAdjustment: '3.00',
  isAvailable: true,
  storeId: 'store-1',
};

const modifierOption2 = {
  id: 'mo-2',
  modifierGroupId: 'mg-1',
  nameEn: 'Rush Order',
  priceAdjustment: '5.00',
  isAvailable: true,
  storeId: 'store-1',
};

const unavailableModifierOption = {
  id: 'mo-3',
  modifierGroupId: 'mg-1',
  nameEn: 'Soldout Mod',
  priceAdjustment: '0.00',
  isAvailable: false,
  storeId: 'store-1',
};

const modifierGroup1 = {
  id: 'mg-1',
  productId: 'prod-1',
  storeId: 'store-1',
};

// Modifier group that belongs to a different product
const modifierGroupOtherProduct = {
  id: 'mg-2',
  productId: 'prod-other',
  storeId: 'store-1',
};

// Null productId = category-level modifier group (valid for any product)
const modifierGroupCategoryLevel = {
  id: 'mg-3',
  productId: null,
  storeId: 'store-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: taxService returns zero tax so computeOrderPricing tests that
  // don't care about tax still pass (shippingAddress.country is truthy).
  mockTaxService.calculateTax.mockResolvedValue({
    totalTax: '0.00',
    breakdown: [],
  });
});

// ═══════════════════════════════════════════
// computeItemPrice
// ═══════════════════════════════════════════
describe('pricingService.computeItemPrice', () => {
  // ─── Basic product (no variants, no modifiers) ───
  describe('basic product lookup', () => {
    it('computes price for a simple product with no adjustments', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 2,
      });

      expect(result.productId).toBe('prod-1');
      expect(result.productTitle).toBe('Test Product');
      expect(result.productImage).toBe('img1.jpg');
      expect(result.salePrice).toBe('10.00');
      expect(result.variantAdjustment).toBe('0.00');
      expect(result.modifierAdjustment).toBe('0.00');
      expect(result.discountType).toBeNull();
      expect(result.discountAmount).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
      expect(result.lineTotal).toBe('20.00');
      expect(result.quantityRequested).toBe(2);
      expect(result.currentQuantity).toBe(100);
      expect(result.isPublished).toBe(true);
    });

    it('throws PRODUCT_NOT_FOUND when product does not exist', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(null);

      await expect(
        pricingService.computeItemPrice({ storeId: 'store-1', productId: 'prod-missing', quantity: 1 }),
      ).rejects.toMatchObject({ code: ErrorCodes.PRODUCT_NOT_FOUND });
    });

    it('throws PRODUCT_UNPUBLISHED when product is not published', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(unpublishedProduct);

      await expect(
        pricingService.computeItemPrice({ storeId: 'store-1', productId: 'prod-1', quantity: 1 }),
      ).rejects.toMatchObject({ code: ErrorCodes.PRODUCT_UNPUBLISHED });
    });

    it('throws INSUFFICIENT_INVENTORY when product stock is too low', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(outOfStockProduct);

      await expect(
        pricingService.computeItemPrice({ storeId: 'store-1', productId: 'prod-1', quantity: 5 }),
      ).rejects.toMatchObject({ code: ErrorCodes.INSUFFICIENT_INVENTORY });
    });

    it('allows purchase when currentQuantity equals quantity requested', async () => {
      const exactStockProduct = { ...baseProduct, currentQuantity: 3 };
      mockPricingRepo.findProductById.mockResolvedValueOnce(exactStockProduct);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 3,
      });

      expect(result.effectivePrice).toBe('10.00');
      expect(result.lineTotal).toBe('30.00');
    });

    it('handles null currentQuantity as zero stock', async () => {
      const nullStockProduct = { ...baseProduct, currentQuantity: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(nullStockProduct);

      await expect(
        pricingService.computeItemPrice({ storeId: 'store-1', productId: 'prod-1', quantity: 1 }),
      ).rejects.toMatchObject({ code: ErrorCodes.INSUFFICIENT_INVENTORY });
    });

    it('extracts first image from images array', async () => {
      const product = { ...baseProduct, images: ['first.png', 'second.png'] };
      mockPricingRepo.findProductById.mockResolvedValueOnce(product);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      expect(result.productImage).toBe('first.png');
    });

    it('returns null productImage when images is null', async () => {
      const product = { ...baseProduct, images: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(product);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      expect(result.productImage).toBeNull();
    });
  });

  // ─── Variant options ───
  describe('variant options', () => {
    it('applies variant option adjustments and builds variant name', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([variantOption1, variantOption2]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([variant1]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        variantOptionIds: ['vo-1', 'vo-2'],
        quantity: 1,
      });

      // effectivePrice = 10.00 + 1.50 + 2.00 = 13.50
      expect(result.effectivePrice).toBe('13.50');
      expect(result.variantAdjustment).toBe('3.50');
      expect(result.variantName).toBe('Red / Large');
      expect(result.lineTotal).toBe('13.50');
    });

    it('throws VARIANT_NOT_FOUND when not all variant options are found', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([variantOption1]); // only 1 of 2

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          variantOptionIds: ['vo-1', 'vo-2'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.VARIANT_NOT_FOUND });
    });

    it('throws VARIANT_NOT_FOUND when options do not belong to product variants', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([variantOption1, variantOption2]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([]); // no variants belong to this product

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          variantOptionIds: ['vo-1', 'vo-2'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.VARIANT_NOT_FOUND });
    });

    it('throws PRODUCT_UNAVAILABLE when variant option is not available', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([unavailableVariantOption]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([variant1]);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          variantOptionIds: ['vo-3'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.PRODUCT_UNAVAILABLE });
    });

    it('treats null priceAdjustment on variant option as zero', async () => {
      const nullAdjustmentOption = {
        ...variantOption1,
        priceAdjustment: null,
      };
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([nullAdjustmentOption]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([variant1]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        variantOptionIds: ['vo-1'],
        quantity: 1,
      });

      expect(result.variantAdjustment).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
    });
  });

  // ─── Combination (overrides variant adjustments) ───
  describe('combination key', () => {
    it('applies combination adjustment instead of individual variant adjustments', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      // When both variantOptionIds and combinationKey are provided,
      // the service first adds variant adjustments, then undoes them
      // and applies the combination adjustment instead.
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([variantOption1]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([variant1]);
      mockPricingRepo.findCombination.mockResolvedValueOnce(combination1);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        variantOptionIds: ['vo-1'],
        combinationKey: 'red-large',
        quantity: 1,
      });

      // effectivePrice = base 10.00 + combination adjustment 5.00 = 15.00
      expect(result.effectivePrice).toBe('15.00');
      expect(result.variantAdjustment).toBe('5.00');
    });

    it('applies combination adjustment without variant options', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(combination1);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        combinationKey: 'red-large',
        quantity: 1,
      });

      // effectivePrice = 10.00 + 5.00 = 15.00
      expect(result.effectivePrice).toBe('15.00');
      expect(result.variantAdjustment).toBe('5.00');
    });

    it('throws VARIANT_NOT_FOUND when combination does not exist', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(null);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          combinationKey: 'nonexistent',
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.VARIANT_NOT_FOUND });
    });

    it('throws PRODUCT_UNAVAILABLE when combination is not available', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(unavailableCombination);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          combinationKey: 'red-large',
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.PRODUCT_UNAVAILABLE });
    });

    it('throws INSUFFICIENT_INVENTORY when combination stock is insufficient', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(lowStockCombination);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          combinationKey: 'red-large',
          quantity: 5,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.INSUFFICIENT_INVENTORY });
    });

    it('allows purchase when combination stock equals quantity requested', async () => {
      const exactStockCombination = { ...combination1, stockQuantity: 1 };
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(exactStockCombination);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        combinationKey: 'red-large',
        quantity: 1,
      });

      expect(result.effectivePrice).toBe('15.00');
    });

    it('allows purchase when combination stockQuantity is null (unlimited)', async () => {
      const unlimitedCombination = { ...combination1, stockQuantity: null };
      const highStockProduct = { ...baseProduct, currentQuantity: 9999 };
      mockPricingRepo.findProductById.mockResolvedValueOnce(highStockProduct);
      mockPricingRepo.findCombination.mockResolvedValueOnce(unlimitedCombination);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        combinationKey: 'red-large',
        quantity: 999,
      });

      expect(result.effectivePrice).toBe('15.00');
    });

    it('treats null combination priceAdjustment as zero', async () => {
      const noAdjustCombination = { ...combination1, priceAdjustment: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findCombination.mockResolvedValueOnce(noAdjustCombination);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        combinationKey: 'red-large',
        quantity: 1,
      });

      expect(result.variantAdjustment).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
    });
  });

  // ─── Modifier options ───
  describe('modifier options', () => {
    it('applies modifier option adjustments', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([modifierOption1, modifierOption2]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroup1]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        modifierOptionIds: ['mo-1', 'mo-2'],
        quantity: 1,
      });

      // effectivePrice = 10.00 + 3.00 + 5.00 = 18.00
      expect(result.effectivePrice).toBe('18.00');
      expect(result.modifierAdjustment).toBe('8.00');
    });

    it('throws MODIFIER_NOT_FOUND when not all modifier options found', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([modifierOption1]); // 1 of 2

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          modifierOptionIds: ['mo-1', 'mo-2'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.MODIFIER_NOT_FOUND });
    });

    it('throws MODIFIER_NOT_FOUND when modifier group belongs to different product', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([modifierOption1]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroupOtherProduct]);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          modifierOptionIds: ['mo-1'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.MODIFIER_NOT_FOUND });
    });

    it('allows category-level modifier groups (null productId)', async () => {
      const catLevelModOpt = {
        ...modifierOption1,
        modifierGroupId: 'mg-3',
      };
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([catLevelModOpt]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroupCategoryLevel]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        modifierOptionIds: ['mo-1'],
        quantity: 1,
      });

      // 10.00 + 3.00 = 13.00
      expect(result.effectivePrice).toBe('13.00');
    });

    it('throws PRODUCT_UNAVAILABLE when modifier option is not available', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([unavailableModifierOption]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroup1]);

      await expect(
        pricingService.computeItemPrice({
          storeId: 'store-1',
          productId: 'prod-1',
          modifierOptionIds: ['mo-3'],
          quantity: 1,
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.PRODUCT_UNAVAILABLE });
    });

    it('treats null priceAdjustment on modifier option as zero', async () => {
      const nullModOpt = { ...modifierOption1, priceAdjustment: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductNoDiscount);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([nullModOpt]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroup1]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        modifierOptionIds: ['mo-1'],
        quantity: 1,
      });

      expect(result.modifierAdjustment).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
    });
  });

  // ─── Product-level discounts ───
  describe('product-level discount', () => {
    it('applies percentage discount correctly', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductWithPercentDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      // 10% of 10.00 = 1.00; effectivePrice = 10.00 - 1.00 = 9.00
      expect(result.discountType).toBe('Percent');
      expect(result.discountAmount).toBe('1.00');
      expect(result.effectivePrice).toBe('9.00');
      expect(result.lineTotal).toBe('9.00');
    });

    it('applies fixed discount correctly', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductWithFixedDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      // effectivePrice = 10.00 - 2.50 = 7.50
      expect(result.discountType).toBe('Fixed');
      expect(result.discountAmount).toBe('2.50');
      expect(result.effectivePrice).toBe('7.50');
    });

    it('caps percentage discount at effective price (100%+ discount)', async () => {
      const hugeDiscountProduct = {
        ...baseProduct,
        discount: '150',
        discountType: 'Percent',
      };
      mockPricingRepo.findProductById.mockResolvedValueOnce(hugeDiscountProduct);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      // 150% of 10.00 = 15.00 but capped at 10.00
      expect(result.discountAmount).toBe('10.00');
      expect(result.effectivePrice).toBe('0.00');
    });

    it('caps fixed discount at effective price', async () => {
      const hugeFixedDiscount = {
        ...baseProduct,
        discount: '50.00',
        discountType: 'Fixed',
      };
      mockPricingRepo.findProductById.mockResolvedValueOnce(hugeFixedDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      // min(50.00, 10.00) = 10.00
      expect(result.discountAmount).toBe('10.00');
      expect(result.effectivePrice).toBe('0.00');
    });

    it('skips discount when discount is null', async () => {
      const noDiscount = { ...baseProduct, discount: null, discountType: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(noDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      expect(result.discountAmount).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
    });

    it('skips discount when discount is "0"', async () => {
      const zeroDiscount = { ...baseProduct, discount: '0', discountType: 'Percent' };
      mockPricingRepo.findProductById.mockResolvedValueOnce(zeroDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      expect(result.discountAmount).toBe('0.00');
      expect(result.effectivePrice).toBe('10.00');
    });

    it('skips discount when discountType is null', async () => {
      const noTypeDiscount = { ...baseProduct, discount: '5.00', discountType: null };
      mockPricingRepo.findProductById.mockResolvedValueOnce(noTypeDiscount);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      expect(result.discountAmount).toBe('0.00');
    });
  });

  // ─── Combined: variants + modifiers + discount ───
  describe('combined adjustments', () => {
    it('computes correct price with variants, modifiers, and discount', async () => {
      mockPricingRepo.findProductById.mockResolvedValueOnce(publishedProductWithPercentDiscount);
      mockPricingRepo.findVariantOptionsByIds.mockResolvedValueOnce([variantOption1]);
      mockPricingRepo.findVariantsByIds.mockResolvedValueOnce([variant1]);
      mockPricingRepo.findModifierOptionsByIds.mockResolvedValueOnce([modifierOption1]);
      mockPricingRepo.findModifierGroupsByIds.mockResolvedValueOnce([modifierGroup1]);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        variantOptionIds: ['vo-1'],
        modifierOptionIds: ['mo-1'],
        quantity: 2,
      });

      // Base: 10.00 + variant 1.50 = 11.50
      // + modifier 3.00 = 14.50
      // 10% discount of 14.50 = 1.45
      // effectivePrice = 14.50 - 1.45 = 13.05
      // lineTotal = 13.05 * 2 = 26.10
      expect(result.effectivePrice).toBe('13.05');
      expect(result.variantAdjustment).toBe('1.50');
      expect(result.modifierAdjustment).toBe('3.00');
      expect(result.discountAmount).toBe('1.45');
      expect(result.lineTotal).toBe('26.10');
    });

    it('clamps negative effective price to zero', async () => {
      // Create a scenario where discount exceeds price after adjustments
      // Using a fixed discount larger than the price
      const product = {
        ...baseProduct,
        salePrice: '5.00',
        discount: '10.00',
        discountType: 'Fixed',
      };
      mockPricingRepo.findProductById.mockResolvedValueOnce(product);

      const result = await pricingService.computeItemPrice({
        storeId: 'store-1',
        productId: 'prod-1',
        quantity: 1,
      });

      // min(10.00, 5.00) = 5.00, so effectivePrice = 5.00 - 5.00 = 0.00
      expect(result.effectivePrice).toBe('0.00');
      expect(result.lineTotal).toBe('0.00');
    });
  });
});

// ═══════════════════════════════════════════
// computeOrderPricing
// ═══════════════════════════════════════════
describe('pricingService.computeOrderPricing', () => {
  const shippingAddress = {
    country: 'US',
    state: 'CA',
    postalCode: '90210',
  };

  it('computes full order pricing without coupon, shipping, or tax', async () => {
    // Override computeItemPrice to return a simple result
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test Product',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '20.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 2,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress,
    });

    expect(result.subtotal).toBe('20.00');
    expect(result.discount).toBe('0.00');
    expect(result.subtotalAfterDiscount).toBe('20.00');
    expect(result.shipping).toBe('0.00');
    expect(result.tax).toBe('0.00');
    expect(result.total).toBe('20.00');
    expect(result.coupon).toBeNull();
    expect(result.freeShipping).toBe(false);
    expect(result.shippingOptionId).toBeNull();
    expect(itemSpy).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store-1', productId: 'prod-1', quantity: 2 }),
    );

    itemSpy.mockRestore();
  });

  it('computes order pricing with coupon discount', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test Product',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '30.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 3,
    });

    const mockCoupon = { id: 'coupon-1', code: 'SAVE10', type: 'Percent' };
    mockCouponService.validateCoupon.mockResolvedValueOnce(mockCoupon);
    mockCouponService.calculateDiscount.mockResolvedValueOnce({
      discountAmount: '3.00',
      freeShipping: false,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 3 }],
      couponCode: 'SAVE10',
      customerId: 'cust-1',
      shippingAddress,
    });

    expect(result.subtotal).toBe('30.00');
    expect(result.discount).toBe('3.00');
    expect(result.subtotalAfterDiscount).toBe('27.00');
    expect(result.coupon).toEqual(mockCoupon);
    expect(result.freeShipping).toBe(false);
    expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('SAVE10', 'store-1', '30.00', 'cust-1');

    itemSpy.mockRestore();
  });

  it('computes order pricing with free shipping coupon', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    const mockCoupon = { id: 'coupon-1', code: 'FREESHIP', type: 'Fixed' };
    mockCouponService.validateCoupon.mockResolvedValueOnce(mockCoupon);
    mockCouponService.calculateDiscount.mockResolvedValueOnce({
      discountAmount: '0.00',
      freeShipping: true,
    });

    mockShippingService.calculateShipping.mockResolvedValueOnce({
      options: [{ id: 'rate-1', price: '5.99', name: 'Standard' }],
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      couponCode: 'FREESHIP',
      customerId: 'cust-1',
      shippingAddress,
      shippingRateId: 'rate-1',
    });

    // Free shipping means shipping is 0.00 even though rate was selected
    expect(result.shipping).toBe('0.00');
    expect(result.shippingOptionId).toBe('rate-1');
    expect(result.freeShipping).toBe(true);

    itemSpy.mockRestore();
  });

  it('computes order pricing with shipping and tax', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '20.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 2,
    });

    mockShippingService.calculateShipping.mockResolvedValueOnce({
      options: [{ id: 'rate-1', price: '5.99', name: 'Standard' }],
    });

    mockTaxService.calculateTax.mockResolvedValueOnce({
      totalTax: '2.00',
      breakdown: [{ name: 'CA State Tax', rate: '0.10', amount: '2.00' }],
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddress,
      shippingRateId: 'rate-1',
    });

    expect(result.subtotal).toBe('20.00');
    expect(result.shipping).toBe('5.99');
    expect(result.shippingOptionId).toBe('rate-1');
    expect(result.tax).toBe('2.00');
    expect(result.taxBreakdown).toEqual([{ name: 'CA State Tax', rate: '0.10', amount: '2.00' }]);
    // total = 20.00 + 5.99 + 2.00 = 27.99
    expect(result.total).toBe('27.99');

    itemSpy.mockRestore();
  });

  it('computes order with multiple items', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice')
      .mockResolvedValueOnce({
        productId: 'prod-1',
        productTitle: 'Product 1',
        productImage: null,
        variantName: null,
      combinationId: null,
        salePrice: '10.00',
        variantAdjustment: '0.00',
        modifierAdjustment: '0.00',
        discountType: null,
        discountAmount: '0.00',
        effectivePrice: '10.00',
        lineTotal: '20.00',
        currentQuantity: 100,
        isPublished: true,
        quantityRequested: 2,
      })
      .mockResolvedValueOnce({
        productId: 'prod-2',
        productTitle: 'Product 2',
        productImage: null,
        variantName: null,
      combinationId: null,
        salePrice: '5.00',
        variantAdjustment: '0.00',
        modifierAdjustment: '0.00',
        discountType: null,
        discountAmount: '0.00',
        effectivePrice: '5.00',
        lineTotal: '15.00',
        currentQuantity: 50,
        isPublished: true,
        quantityRequested: 3,
      });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 3 },
      ],
      shippingAddress,
    });

    expect(result.subtotal).toBe('35.00'); // 20.00 + 15.00
    expect(result.items).toHaveLength(2);

    itemSpy.mockRestore();
  });

  it('throws SHIPPING_OPTION_INVALID when selected shipping rate is not available', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    mockShippingService.calculateShipping.mockResolvedValueOnce({
      options: [{ id: 'rate-1', price: '5.99', name: 'Standard' }],
    });

    await expect(
      pricingService.computeOrderPricing({
        storeId: 'store-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress,
        shippingRateId: 'rate-nonexistent',
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SHIPPING_OPTION_INVALID });

    itemSpy.mockRestore();
  });

  it('returns zero shipping when no shippingRateId is provided', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress,
    });

    expect(result.shipping).toBe('0.00');
    expect(result.shippingOptionId).toBeNull();
    expect(mockShippingService.calculateShipping).not.toHaveBeenCalled();

    itemSpy.mockRestore();
  });

  it('returns zero shipping when country is empty', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress: { country: '' },
      shippingRateId: 'rate-1',
    });

    // No country means no shipping calculation
    expect(result.shipping).toBe('0.00');
    expect(mockShippingService.calculateShipping).not.toHaveBeenCalled();

    itemSpy.mockRestore();
  });

  it('clamps subtotalAfterDiscount to zero when discount exceeds subtotal', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '5.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    const mockCoupon = { id: 'c1', code: 'BIGSALE' };
    mockCouponService.validateCoupon.mockResolvedValueOnce(mockCoupon);
    mockCouponService.calculateDiscount.mockResolvedValueOnce({
      discountAmount: '10.00', // exceeds subtotal of 5.00
      freeShipping: false,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      couponCode: 'BIGSALE',
      shippingAddress,
    });

    expect(result.discount).toBe('10.00');
    expect(result.subtotalAfterDiscount).toBe('0.00');

    itemSpy.mockRestore();
  });

  it('skips tax when shipping address has no country', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress: { country: '' },
    });

    expect(result.tax).toBe('0.00');
    expect(result.taxBreakdown).toEqual([]);
    expect(mockTaxService.calculateTax).not.toHaveBeenCalled();

    itemSpy.mockRestore();
  });

  it('handles empty no shipping options (shipping still returns empty array)', async () => {
    const itemSpy = vi.spyOn(pricingService, 'computeItemPrice').mockResolvedValueOnce({
      productId: 'prod-1',
      productTitle: 'Test',
      productImage: null,
      variantName: null,
      combinationId: null,
      salePrice: '10.00',
      variantAdjustment: '0.00',
      modifierAdjustment: '0.00',
      discountType: null,
      discountAmount: '0.00',
      effectivePrice: '10.00',
      lineTotal: '10.00',
      currentQuantity: 100,
      isPublished: true,
      quantityRequested: 1,
    });

    mockShippingService.calculateShipping.mockResolvedValueOnce({
      options: [],
    });

    const result = await pricingService.computeOrderPricing({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      shippingAddress,
      shippingRateId: 'rate-1',
    });

    // No options available → shipping stays 0.00
    expect(result.shipping).toBe('0.00');
    expect(result.shippingOptionId).toBeNull();

    itemSpy.mockRestore();
  });
});