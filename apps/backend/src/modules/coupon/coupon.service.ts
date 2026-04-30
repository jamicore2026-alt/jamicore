// Coupon service — business logic, calls repo, throws domain errors
import { couponRepo, type CouponSelect } from './coupon.repo.js';
import { ErrorCodes } from '../../errors/codes.js';
import { minDecimal, toCents, fromCents } from '../../lib/decimal.js';

export const couponService = {
  async findByStoreId(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.max(1, opts?.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, totalResult] = await Promise.all([
      couponRepo.findManyByStoreId(storeId, { limit, offset }),
      couponRepo.countByStoreId(storeId),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findById(couponId: string, storeId: string) {
    const coupon = await couponRepo.findById(couponId, storeId);

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    return coupon;
  },

  async findByCode(code: string, storeId: string) {
    return couponRepo.findByCode(code, storeId);
  },

  async create(data: {
    storeId: string;
    code: string;
    description?: string;
    type: string;
    value: string;
    minOrderAmount?: string;
    maxDiscountAmount?: string;
    freeShipping?: boolean;
    usageLimit?: number;
    usageLimitPerCustomer?: number;
    startsAt?: Date;
    expiresAt?: Date;
    appliesTo?: string;
    productIds?: string;
    categoryIds?: string;
  }) {
    // Check for duplicate code within the store
    const existing = await couponRepo.findByCode(data.code, data.storeId);
    if (existing) {
      throw Object.assign(new Error('Coupon code already exists in this store'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    const [coupon] = await couponRepo.create({
      storeId: data.storeId,
      code: data.code.toUpperCase(),
      description: data.description,
      type: data.type,
      value: data.value,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      freeShipping: data.freeShipping ?? false,
      usageLimit: data.usageLimit,
      usageLimitPerCustomer: data.usageLimitPerCustomer ?? 1,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      appliesTo: data.appliesTo ?? 'all',
      productIds: data.productIds,
      categoryIds: data.categoryIds,
    });

    return coupon;
  },

  async update(couponId: string, storeId: string, data: Partial<{
    code: string;
    description: string;
    type: string;
    value: string;
    minOrderAmount: string;
    maxDiscountAmount: string;
    freeShipping: boolean;
    usageLimit: number;
    usageLimitPerCustomer: number;
    isActive: boolean;
    startsAt: Date;
    expiresAt: Date;
    appliesTo: string;
    productIds: string;
    categoryIds: string;
  }>) {
    const coupon = await couponRepo.findById(couponId, storeId);

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    // If updating the code, check for duplicates
    if (data.code && data.code.toUpperCase() !== coupon.code) {
      const existing = await couponRepo.findByCode(data.code, storeId);
      if (existing) {
        throw Object.assign(new Error('Coupon code already exists in this store'), {
          code: ErrorCodes.INVALID_COUPON,
        });
      }
    }

    const updateData = {
      ...data,
      ...(data.code ? { code: data.code.toUpperCase() } : {}),
    };

    const [updated] = await couponRepo.update(couponId, storeId, updateData);

    return updated;
  },

  async delete(couponId: string, storeId: string) {
    const coupon = await couponRepo.findById(couponId, storeId);

    if (!coupon) {
      throw Object.assign(new Error('Coupon not found'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    await couponRepo.deleteById(couponId, storeId);

    return { id: couponId, deleted: true };
  },

  async validateCoupon(code: string, storeId: string, orderAmount?: string, _customerId?: string) {
    const coupon = await couponRepo.findByCode(code, storeId);

    if (!coupon) {
      throw Object.assign(new Error('Invalid coupon code'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    if (!coupon.isActive) {
      throw Object.assign(new Error('Coupon is not active'), {
        code: ErrorCodes.INVALID_COUPON,
      });
    }

    const now = new Date();

    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw Object.assign(new Error('Coupon is not yet active'), {
        code: ErrorCodes.COUPON_EXPIRED,
      });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      throw Object.assign(new Error('Coupon has expired'), {
        code: ErrorCodes.COUPON_EXPIRED,
      });
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
      throw Object.assign(new Error('Coupon usage limit has been reached'), {
        code: ErrorCodes.COUPON_USAGE_EXCEEDED,
      });
    }

    if (coupon.usageLimitPerCustomer && _customerId) {
      const usageCount = await couponRepo.countCustomerUsages(coupon.id, _customerId);
      if (usageCount >= coupon.usageLimitPerCustomer) {
        throw Object.assign(new Error('Coupon usage limit per customer reached'), {
          code: ErrorCodes.COUPON_USAGE_EXCEEDED,
        });
      }
    }

    if (coupon.minOrderAmount && orderAmount) {
      const minAmountCents = toCents(coupon.minOrderAmount);
      const amountCents = toCents(orderAmount);
      if (amountCents < minAmountCents) {
        throw Object.assign(new Error(`Minimum order amount of ${coupon.minOrderAmount} required`), {
          code: ErrorCodes.INVALID_COUPON,
        });
      }
    }

    return coupon;
  },

  async calculateDiscount(
    coupon: CouponSelect,
    subtotal: string,
    productIds?: string[],
  ): Promise<{ discountAmount: string; freeShipping: boolean }> {
    // Check product applicability
    if (coupon.appliesTo === 'products' && coupon.productIds && productIds && productIds.length > 0) {
      const allowedIds = coupon.productIds.split(',').map((s) => s.trim());
      const hasApplicableProduct = productIds.some((id) => allowedIds.includes(id));
      if (!hasApplicableProduct) {
        throw Object.assign(new Error('Coupon does not apply to these products'), {
          code: ErrorCodes.COUPON_NOT_APPLICABLE,
        });
      }
    }

    let discountAmount = '0.00';

    if (coupon.type === 'percentage') {
      // discountAmount = subtotal * (value / 100), capped at maxDiscountAmount
      const subtotalCents = toCents(subtotal);
      const percentageCents = toCents(coupon.value);
      let discountCents = Math.round((subtotalCents * percentageCents) / 10000);
      if (coupon.maxDiscountAmount) {
        const maxCents = toCents(coupon.maxDiscountAmount);
        if (discountCents > maxCents) {
          discountCents = maxCents;
        }
      }
      discountAmount = fromCents(discountCents);
    } else if (coupon.type === 'fixed') {
      // Fixed discount, capped at subtotal
      discountAmount = minDecimal(coupon.value, subtotal);
    }
    // type === 'free_shipping' — no discount on subtotal, just free shipping

    return {
      discountAmount,
      freeShipping: coupon.freeShipping || coupon.type === 'free_shipping',
    };
  },
};
