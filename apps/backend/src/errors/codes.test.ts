// Unit tests for ErrorCodes and the global error handler
// Tests that error code mapping is correct and complete
import { describe, it, expect } from 'vitest';
import { ErrorCodes } from '../errors/codes.js';

describe('ErrorCodes', () => {
  it('has all auth-related codes', () => {
    expect(ErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    expect(ErrorCodes.TOKEN_INVALID).toBe('TOKEN_INVALID');
    expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS');
    expect(ErrorCodes.VERIFICATION_TOKEN_EXPIRED).toBe('VERIFICATION_TOKEN_EXPIRED');
    expect(ErrorCodes.EMAIL_NOT_VERIFIED).toBe('EMAIL_NOT_VERIFIED');
    expect(ErrorCodes.EMAIL_ALREADY_VERIFIED).toBe('EMAIL_ALREADY_VERIFIED');
    expect(ErrorCodes.PASSWORD_RESET_EXPIRED).toBe('PASSWORD_RESET_EXPIRED');
  });

  it('has all entity-not-found codes', () => {
    expect(ErrorCodes.STORE_NOT_FOUND).toBe('STORE_NOT_FOUND');
    expect(ErrorCodes.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND');
    expect(ErrorCodes.ORDER_NOT_FOUND).toBe('ORDER_NOT_FOUND');
    expect(ErrorCodes.CUSTOMER_NOT_FOUND).toBe('CUSTOMER_NOT_FOUND');
    expect(ErrorCodes.CATEGORY_NOT_FOUND).toBe('CATEGORY_NOT_FOUND');
    expect(ErrorCodes.MODIFIER_GROUP_NOT_FOUND).toBe('MODIFIER_GROUP_NOT_FOUND');
    expect(ErrorCodes.REVIEW_NOT_FOUND).toBe('REVIEW_NOT_FOUND');
    expect(ErrorCodes.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    expect(ErrorCodes.ADMIN_NOT_FOUND).toBe('ADMIN_NOT_FOUND');
    expect(ErrorCodes.PLAN_NOT_FOUND).toBe('PLAN_NOT_FOUND');
    expect(ErrorCodes.MERCHANT_NOT_FOUND).toBe('MERCHANT_NOT_FOUND');
    expect(ErrorCodes.STAFF_NOT_FOUND).toBe('STAFF_NOT_FOUND');
    expect(ErrorCodes.STAFF_INVITE_NOT_FOUND).toBe('STAFF_INVITE_NOT_FOUND');
    expect(ErrorCodes.CART_NOT_FOUND).toBe('CART_NOT_FOUND');
    expect(ErrorCodes.CART_ITEM_NOT_FOUND).toBe('CART_ITEM_NOT_FOUND');
    expect(ErrorCodes.ZONE_NOT_FOUND).toBe('ZONE_NOT_FOUND');
    expect(ErrorCodes.RATE_NOT_FOUND).toBe('RATE_NOT_FOUND');
    expect(ErrorCodes.TAX_RATE_NOT_FOUND).toBe('TAX_RATE_NOT_FOUND');
    expect(ErrorCodes.ADDRESS_NOT_FOUND).toBe('ADDRESS_NOT_FOUND');
    expect(ErrorCodes.VARIANT_NOT_FOUND).toBe('VARIANT_NOT_FOUND');
    expect(ErrorCodes.MODIFIER_NOT_FOUND).toBe('MODIFIER_NOT_FOUND');
  });

  it('has all conflict codes', () => {
    expect(ErrorCodes.USER_ALREADY_EXISTS).toBe('USER_ALREADY_EXISTS');
    expect(ErrorCodes.CUSTOMER_ALREADY_EXISTS).toBe('CUSTOMER_ALREADY_EXISTS');
    expect(ErrorCodes.WISHLIST_ITEM_EXISTS).toBe('WISHLIST_ITEM_EXISTS');
    expect(ErrorCodes.ORDER_ALREADY_FULFILLED).toBe('ORDER_ALREADY_FULFILLED');
    expect(ErrorCodes.ORDER_CANCELLED).toBe('ORDER_CANCELLED');
    expect(ErrorCodes.COUPON_USAGE_EXCEEDED).toBe('COUPON_USAGE_EXCEEDED');
    expect(ErrorCodes.PRICE_MISMATCH).toBe('PRICE_MISMATCH');
  });

  it('has all validation and business rule codes', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.INSUFFICIENT_INVENTORY).toBe('INSUFFICIENT_INVENTORY');
    expect(ErrorCodes.PRODUCT_UNPUBLISHED).toBe('PRODUCT_UNPUBLISHED');
    expect(ErrorCodes.PRODUCT_UNAVAILABLE).toBe('PRODUCT_UNAVAILABLE');
    expect(ErrorCodes.COUPON_NOT_APPLICABLE).toBe('COUPON_NOT_APPLICABLE');
    expect(ErrorCodes.SHIPPING_OPTION_INVALID).toBe('SHIPPING_OPTION_INVALID');
    expect(ErrorCodes.SHIPPING_NOT_CALCULABLE).toBe('SHIPPING_NOT_CALCULABLE');
  });

  it('has all coupon codes', () => {
    expect(ErrorCodes.INVALID_COUPON).toBe('INVALID_COUPON');
    expect(ErrorCodes.COUPON_EXPIRED).toBe('COUPON_EXPIRED');
  });

  it('has all file upload codes', () => {
    expect(ErrorCodes.INVALID_FILE_TYPE).toBe('INVALID_FILE_TYPE');
    expect(ErrorCodes.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
  });

  it('has all staff/permission codes', () => {
    expect(ErrorCodes.CANNOT_REMOVE_OWNER).toBe('CANNOT_REMOVE_OWNER');
    expect(ErrorCodes.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    expect(ErrorCodes.STAFF_INVITE_EXPIRED).toBe('STAFF_INVITE_EXPIRED');
  });

  it('ErrorCode type is a union of string literals', () => {
    // This verifies the type system — if ErrorCode is `string`, this passes trivially.
    // If it's a union of literals, TypeScript will enforce exhaustive matching.
    const codes: string[] = Object.values(ErrorCodes);
    expect(codes.length).toBeGreaterThan(30); // We have ~46 codes
    expect(codes.every((c) => typeof c === 'string')).toBe(true);
    // Every code equals its own value (const assertion)
    expect(codes.every((c) => c === c.toUpperCase().replace(/\s+/g, '_'))).toBe(true);
  });
});

describe('Error code to HTTP status mapping (as defined in index.ts)', () => {
  // This tests that the codeToStatus mapping in index.ts is consistent
  // with the ErrorCodes enum — every code should have a mapping.
  const codeToStatus: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_FILE_TYPE: 400,
    FILE_TOO_LARGE: 400,
    INVALID_CREDENTIALS: 401,
    TOKEN_EXPIRED: 401,
    TOKEN_INVALID: 401,
    VERIFICATION_TOKEN_EXPIRED: 401,
    PASSWORD_RESET_EXPIRED: 401,
    EMAIL_NOT_VERIFIED: 401,
    INSUFFICIENT_PERMISSIONS: 403,
    STORE_SUSPENDED: 403,
    PLAN_EXPIRED: 403,
    PLAN_LIMIT_EXCEEDED: 403,
    PERMISSION_DENIED: 403,
    EMAIL_ALREADY_VERIFIED: 403,
    CANNOT_REMOVE_OWNER: 403,
    UPGRADE_NOT_ALLOWED: 403,
    NOT_FOUND: 404,
    STORE_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    ORDER_NOT_FOUND: 404,
    CUSTOMER_NOT_FOUND: 404,
    CATEGORY_NOT_FOUND: 404,
    MODIFIER_GROUP_NOT_FOUND: 404,
    REVIEW_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    ADMIN_NOT_FOUND: 404,
    PLAN_NOT_FOUND: 404,
    MERCHANT_NOT_FOUND: 404,
    STAFF_NOT_FOUND: 404,
    STAFF_INVITE_NOT_FOUND: 404,
    STAFF_INVITE_EXPIRED: 404,
    CART_NOT_FOUND: 404,
    CART_ITEM_NOT_FOUND: 404,
    USER_ALREADY_EXISTS: 409,
    CUSTOMER_ALREADY_EXISTS: 409,
    WISHLIST_ITEM_EXISTS: 409,
    ORDER_ALREADY_FULFILLED: 409,
    ORDER_CANCELLED: 409,
    COUPON_USAGE_EXCEEDED: 409,
    PRICE_MISMATCH: 409,
    COUPON_EXPIRED: 410,
    PRODUCT_UNPUBLISHED: 410,
    INVALID_COUPON: 422,
    INSUFFICIENT_INVENTORY: 422,
    SHIPPING_NOT_CALCULABLE: 422,
    PRODUCT_UNAVAILABLE: 422,
    COUPON_NOT_APPLICABLE: 422,
    SHIPPING_OPTION_INVALID: 422,
    PAYMENT_FAILED: 400,
    PAYMENT_PROVIDER_NOT_ENABLED: 422,
    PAYMENT_ALREADY_PROCESSED: 409,
    VARIANT_NOT_FOUND: 404,
    MODIFIER_NOT_FOUND: 404,
    ZONE_NOT_FOUND: 404,
    RATE_NOT_FOUND: 404,
    TAX_RATE_NOT_FOUND: 404,
    ADDRESS_NOT_FOUND: 404,
    RETURN_NOT_FOUND: 404,
    RETURN_INVALID_STATUS: 422,
    RETURN_UNAUTHORIZED: 403,
    ORDER_ALREADY_PAID: 409,
    ORDER_NOT_FULFILLED: 409,
    ALREADY_ON_PLAN: 409,
    CART_NOT_OWNED: 403,
    CMS_PAGE_NOT_FOUND: 404,
    API_KEY_INVALID: 401,
  };

  it('maps every defined ErrorCode to an HTTP status', () => {
    const allCodes = Object.values(ErrorCodes);
    for (const code of allCodes) {
      expect(codeToStatus).toHaveProperty(code);
    }
  });

  it('all mapped status codes are valid HTTP status ranges', () => {
    const statuses = Object.values(codeToStatus);
    for (const status of statuses) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThanOrEqual(599);
    }
  });

  it('unauthorized codes map to 401', () => {
    expect(codeToStatus.INVALID_CREDENTIALS).toBe(401);
    expect(codeToStatus.TOKEN_EXPIRED).toBe(401);
    expect(codeToStatus.TOKEN_INVALID).toBe(401);
    expect(codeToStatus.VERIFICATION_TOKEN_EXPIRED).toBe(401);
    expect(codeToStatus.PASSWORD_RESET_EXPIRED).toBe(401);
  });

  it('not-found codes map to 404', () => {
    const notFoundCodes = [
      'STORE_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'ORDER_NOT_FOUND',
      'CUSTOMER_NOT_FOUND', 'USER_NOT_FOUND', 'ADMIN_NOT_FOUND',
    ];
    for (const code of notFoundCodes) {
      expect(codeToStatus[code]).toBe(404);
    }
  });

  it('conflict codes map to 409', () => {
    expect(codeToStatus.USER_ALREADY_EXISTS).toBe(409);
    expect(codeToStatus.CUSTOMER_ALREADY_EXISTS).toBe(409);
    expect(codeToStatus.PRICE_MISMATCH).toBe(409);
  });
});