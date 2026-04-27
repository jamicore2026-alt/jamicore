// Unit tests for Product Zod schemas
// Tests request body validation for product, variant, and variant-option endpoints
import { describe, it, expect } from 'vitest';
import {
  productListSchema,
  productSearchSchema,
  createProductSchema,
  updateProductSchema,
  listQuerySchema,
  merchantSearchSchema,
  createVariantSchema,
  updateVariantSchema,
  createVariantOptionSchema,
  updateVariantOptionSchema,
  variantIdParamSchema,
  variantWithProductParamSchema,
  optionIdParamSchema,
  idParamSchema,
} from './product.schema.js';

// ═══════════════════════════════════════════
// productListSchema
// ═══════════════════════════════════════════
describe('productListSchema', () => {
  it('applies default values for limit and offset', () => {
    const result = productListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts valid limit and offset', () => {
    const result = productListSchema.safeParse({ limit: '50', offset: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(10);
    }
  });

  it('coerces string values to numbers', () => {
    const result = productListSchema.safeParse({ limit: '10', offset: '5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(5);
    }
  });

  it('rejects limit below 1', () => {
    const result = productListSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = productListSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects negative offset', () => {
    const result = productListSchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = productListSchema.safeParse({ limit: 20, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// productSearchSchema
// ═══════════════════════════════════════════
describe('productSearchSchema', () => {
  it('applies default values', () => {
    const result = productSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('newest');
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts all valid search params', () => {
    const result = productSearchSchema.safeParse({
      q: 'shirt',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      minPrice: '10.99',
      maxPrice: '99.00',
      sort: 'price_asc',
      limit: '10',
      offset: '5',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty search query', () => {
    const result = productSearchSchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });

  it('rejects search query over 200 chars', () => {
    const result = productSearchSchema.safeParse({ q: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid categoryId', () => {
    const result = productSearchSchema.safeParse({ categoryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid minPrice format', () => {
    const result = productSearchSchema.safeParse({ minPrice: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sort value', () => {
    const result = productSearchSchema.safeParse({ sort: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts minPrice with two decimal places', () => {
    const result = productSearchSchema.safeParse({ minPrice: '10.99' });
    expect(result.success).toBe(true);
  });

  it('accepts minPrice as whole number string', () => {
    const result = productSearchSchema.safeParse({ minPrice: '10' });
    expect(result.success).toBe(true);
  });

  it('rejects minPrice with more than 2 decimal places', () => {
    const result = productSearchSchema.safeParse({ minPrice: '10.123' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// createProductSchema
// ═══════════════════════════════════════════
describe('createProductSchema', () => {
  const validInput = {
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
    titleEn: 'Product Name',
    salePrice: '29.99',
  };

  it('accepts valid input with required fields only', () => {
    const result = createProductSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentQuantity).toBe(0);
      expect(result.data.isPublished).toBe(true);
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it('accepts full input with all optional fields', () => {
    const result = createProductSchema.safeParse({
      ...validInput,
      subcategoryId: '550e8400-e29b-41d4-a716-446655440001',
      titleAr: 'Product Arabic',
      descriptionEn: 'English description',
      descriptionAr: 'Arabic description',
      purchasePrice: '15.00',
      purchaseLimit: 10,
      barcode: '1234567890',
      discountType: 'Percent',
      discount: '5.00',
      currentQuantity: 100,
      isPublished: false,
      sortOrder: 5,
      preparationTime: 30,
      tags: ['electronics', 'gadget'],
      images: ['https://example.com/img1.png'],
      youtubeVideoLinkId: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing categoryId', () => {
    const { categoryId: _categoryId, ...without } = validInput;
    const result = createProductSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing titleEn', () => {
    const { titleEn: _titleEn, ...without } = validInput;
    const result = createProductSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects missing salePrice', () => {
    const { salePrice: _salePrice, ...without } = validInput;
    const result = createProductSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('rejects invalid categoryId format', () => {
    const result = createProductSchema.safeParse({ ...validInput, categoryId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty titleEn', () => {
    const result = createProductSchema.safeParse({ ...validInput, titleEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects titleEn over 255 chars', () => {
    const result = createProductSchema.safeParse({ ...validInput, titleEn: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid salePrice format', () => {
    const result = createProductSchema.safeParse({ ...validInput, salePrice: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid discountType', () => {
    const result = createProductSchema.safeParse({ ...validInput, discountType: 'InvalidType' });
    expect(result.success).toBe(false);
  });

  it('rejects negative purchaseLimit', () => {
    const result = createProductSchema.safeParse({ ...validInput, purchaseLimit: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts discountType Percent', () => {
    const result = createProductSchema.safeParse({ ...validInput, discountType: 'Percent' });
    expect(result.success).toBe(true);
  });

  it('accepts discountType Fixed', () => {
    const result = createProductSchema.safeParse({ ...validInput, discountType: 'Fixed' });
    expect(result.success).toBe(true);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = createProductSchema.safeParse({ ...validInput, extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// updateProductSchema
// ═══════════════════════════════════════════
describe('updateProductSchema', () => {
  it('accepts empty partial update', () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial title update', () => {
    const result = updateProductSchema.safeParse({ titleEn: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields as null', () => {
    const result = updateProductSchema.safeParse({
      subcategoryId: null,
      titleAr: null,
      descriptionEn: null,
      descriptionAr: null,
      purchasePrice: null,
      purchaseLimit: null,
      barcode: null,
      discount: null,
      preparationTime: null,
      tags: null,
      images: null,
      youtubeVideoLinkId: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial price update', () => {
    const result = updateProductSchema.safeParse({ salePrice: '39.99' });
    expect(result.success).toBe(true);
  });

  it('accepts isPublished toggle', () => {
    const result = updateProductSchema.safeParse({ isPublished: false });
    expect(result.success).toBe(true);
  });

  it('rejects empty titleEn string', () => {
    const result = updateProductSchema.safeParse({ titleEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid salePrice in update', () => {
    const result = updateProductSchema.safeParse({ salePrice: 'not-a-price' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid categoryId in update', () => {
    const result = updateProductSchema.safeParse({ categoryId: 'bad-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid discountType in update', () => {
    const result = updateProductSchema.safeParse({ discountType: 'InvalidType' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateProductSchema.safeParse({ titleEn: 'Name', extraField: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// listQuerySchema
// ═══════════════════════════════════════════
describe('listQuerySchema', () => {
  it('applies default values', () => {
    const result = listQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.isPublished).toBeUndefined();
    }
  });

  it('coerces string limit and offset to numbers', () => {
    const result = listQuerySchema.safeParse({ limit: '10', offset: '5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(5);
    }
  });

  it('transforms isPublished "true" to boolean true', () => {
    const result = listQuerySchema.safeParse({ isPublished: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(true);
    }
  });

  it('transforms isPublished "false" to boolean false', () => {
    const result = listQuerySchema.safeParse({ isPublished: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(false);
    }
  });

  it('rejects limit below 1', () => {
    const result = listQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 100', () => {
    const result = listQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects negative offset', () => {
    const result = listQuerySchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid isPublished value', () => {
    const result = listQuerySchema.safeParse({ isPublished: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = listQuerySchema.safeParse({ limit: 20, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// merchantSearchSchema
// ═══════════════════════════════════════════
describe('merchantSearchSchema', () => {
  it('applies default values', () => {
    const result = merchantSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe('newest');
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
    }
  });

  it('accepts all optional search params', () => {
    const result = merchantSearchSchema.safeParse({
      q: 'search term',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      minPrice: '5.00',
      maxPrice: '100.00',
      isPublished: 'true',
      sort: 'price_asc',
      limit: '10',
      offset: '20',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(true);
    }
  });

  it('transforms isPublished "false" to boolean false', () => {
    const result = merchantSearchSchema.safeParse({ isPublished: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(false);
    }
  });

  it('rejects invalid isPublished value', () => {
    const result = merchantSearchSchema.safeParse({ isPublished: 'maybe' });
    expect(result.success).toBe(false);
  });

  it('rejects empty query string', () => {
    const result = merchantSearchSchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sort value', () => {
    const result = merchantSearchSchema.safeParse({ sort: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = merchantSearchSchema.safeParse({ extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// createVariantSchema
// ═══════════════════════════════════════════
describe('createVariantSchema', () => {
  it('accepts valid variant with required fields', () => {
    const result = createVariantSchema.safeParse({ nameEn: 'Color' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe(0);
    }
  });

  it('accepts variant with all fields', () => {
    const result = createVariantSchema.safeParse({
      nameEn: 'Size',
      nameAr: 'المقاس',
      sortOrder: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing nameEn', () => {
    const result = createVariantSchema.safeParse({ nameAr: 'اللون' });
    expect(result.success).toBe(false);
  });

  it('rejects empty nameEn', () => {
    const result = createVariantSchema.safeParse({ nameEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects nameEn over 255 chars', () => {
    const result = createVariantSchema.safeParse({ nameEn: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = createVariantSchema.safeParse({ nameEn: 'Color', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// updateVariantSchema
// ═══════════════════════════════════════════
describe('updateVariantSchema', () => {
  it('accepts empty partial update', () => {
    const result = updateVariantSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts name update', () => {
    const result = updateVariantSchema.safeParse({ nameEn: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable nameAr', () => {
    const result = updateVariantSchema.safeParse({ nameAr: null });
    expect(result.success).toBe(true);
  });

  it('rejects empty nameEn in update', () => {
    const result = updateVariantSchema.safeParse({ nameEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects nameEn over 255 chars in update', () => {
    const result = updateVariantSchema.safeParse({ nameEn: 'a'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateVariantSchema.safeParse({ nameEn: 'Color', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// createVariantOptionSchema
// ═══════════════════════════════════════════
describe('createVariantOptionSchema', () => {
  it('accepts valid option with required fields', () => {
    const result = createVariantOptionSchema.safeParse({ nameEn: 'Red' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priceAdjustment).toBe('0');
      expect(result.data.sortOrder).toBe(0);
      expect(result.data.isAvailable).toBe(true);
    }
  });

  it('accepts option with all fields', () => {
    const result = createVariantOptionSchema.safeParse({
      nameEn: 'Large',
      nameAr: 'كبير',
      priceAdjustment: '2.50',
      sku: 'SKU-L',
      stockQuantity: 100,
      imageUrl: 'https://example.com/img.png',
      sortOrder: 3,
      isAvailable: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing nameEn', () => {
    const result = createVariantOptionSchema.safeParse({ priceAdjustment: '1.00' });
    expect(result.success).toBe(false);
  });

  it('rejects empty nameEn', () => {
    const result = createVariantOptionSchema.safeParse({ nameEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priceAdjustment format', () => {
    const result = createVariantOptionSchema.safeParse({ nameEn: 'Red', priceAdjustment: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = createVariantOptionSchema.safeParse({ nameEn: 'Red', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// updateVariantOptionSchema
// ═══════════════════════════════════════════
describe('updateVariantOptionSchema', () => {
  it('accepts empty partial update', () => {
    const result = updateVariantOptionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial name update', () => {
    const result = updateVariantOptionSchema.safeParse({ nameEn: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = updateVariantOptionSchema.safeParse({
      nameAr: null,
      sku: null,
      stockQuantity: null,
      imageUrl: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty nameEn in update', () => {
    const result = updateVariantOptionSchema.safeParse({ nameEn: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid priceAdjustment in update', () => {
    const result = updateVariantOptionSchema.safeParse({ priceAdjustment: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (strictObject)', () => {
    const result = updateVariantOptionSchema.safeParse({ nameEn: 'Red', extra: 'nope' });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// variantIdParamSchema & optionIdParamSchema
// ═══════════════════════════════════════════
describe('variantIdParamSchema', () => {
  it('accepts valid variantId UUID', () => {
    const result = variantIdParamSchema.safeParse({ variantId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = variantIdParamSchema.safeParse({ variantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing variantId', () => {
    const result = variantIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('variantWithProductParamSchema', () => {
  it('accepts valid productId and variantId UUIDs', () => {
    const result = variantWithProductParamSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440001',
      variantId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid variantId UUID', () => {
    const result = variantWithProductParamSchema.safeParse({
      productId: '550e8400-e29b-41d4-a716-446655440001',
      variantId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing productId', () => {
    const result = variantWithProductParamSchema.safeParse({
      variantId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});

describe('optionIdParamSchema', () => {
  it('accepts valid UUID', () => {
    const result = optionIdParamSchema.safeParse({ optionId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = optionIdParamSchema.safeParse({ optionId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing optionId', () => {
    const result = optionIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════
// idParamSchema (re-exported from shared)
// ═══════════════════════════════════════════
describe('idParamSchema (product)', () => {
  it('accepts valid UUID', () => {
    const result = idParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = idParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});