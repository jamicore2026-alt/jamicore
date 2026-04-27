// Product Zod schemas
import { z } from 'zod';
import { idParamSchema } from '../_shared/schema.js';

export { idParamSchema };

// --- Public route schemas ---

export const productListSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const productSearchSchema = z.strictObject({
  q: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// --- Merchant route schemas ---

export const createProductSchema = z.strictObject({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  titleEn: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  purchaseLimit: z.number().int().min(0).optional(),
  barcode: z.string().optional(),
  discountType: z.enum(['Percent', 'Fixed']).optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currentQuantity: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  preparationTime: z.number().int().optional(),
  tags: z.array(z.string().max(100)).optional(),
  images: z.array(z.string().url()).optional(),
  youtubeVideoLinkId: z.string().optional(),
});

export const updateProductSchema = z.strictObject({
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().nullable().optional(),
  titleEn: z.string().min(1).max(255).optional(),
  titleAr: z.string().max(255).nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  salePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  purchasePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  purchaseLimit: z.number().int().min(0).nullable().optional(),
  barcode: z.string().nullable().optional(),
  discountType: z.enum(['Percent', 'Fixed']).optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  currentQuantity: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  preparationTime: z.number().int().nullable().optional(),
  tags: z.array(z.string().max(100)).nullable().optional(),
  images: z.array(z.string().url()).nullable().optional(),
  youtubeVideoLinkId: z.string().nullable().optional(),
});

export const listQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  isPublished: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  search: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
});

export const merchantSearchSchema = z.strictObject({
  q: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  isPublished: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc']).default('newest'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createVariantSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  sortOrder: z.number().int().default(0),
});

export const updateVariantSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const createVariantOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255),
  nameAr: z.string().max(255).optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  sku: z.string().optional(),
  stockQuantity: z.number().int().optional(),
  imageUrl: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isAvailable: z.boolean().default(true),
});

export const updateVariantOptionSchema = z.strictObject({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  priceAdjustment: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  sku: z.string().nullable().optional(),
  stockQuantity: z.number().int().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isAvailable: z.boolean().optional(),
});

export const variantIdParamSchema = z.strictObject({
  variantId: z.string().uuid(),
});

export const variantWithProductParamSchema = z.strictObject({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
});

export const optionIdParamSchema = z.strictObject({
  optionId: z.string().uuid(),
});