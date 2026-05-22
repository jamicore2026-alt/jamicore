// Auth types — JWT payloads and auth-related type definitions

/** Token type discriminator for access vs refresh tokens */
export type JwtTokenType = 'access' | 'refresh';

/** Scope for refresh token Redis key prefix */
export type RefreshTokenScope = 'merchant' | 'customer' | 'admin';

/** JWT payload for merchant/staff users */
export interface MerchantJwtPayload {
  userId: string;
  storeId: string;
  role: string;
  jti: string;
  type: JwtTokenType;
}

/** JWT payload for customer users */
export interface CustomerJwtPayload {
  customerId: string;
  storeId: string;
  jti: string;
  type: JwtTokenType;
}

/** JWT payload for super admin users */
export interface SuperAdminJwtPayload {
  superAdminId: string;
  role: 'superAdmin';
  jti: string;
  type: JwtTokenType;
}

/** Data needed to register a merchant */
export interface RegisterMerchantData {
  storeName: string;
  domain: string;
  ownerEmail: string;
  ownerName?: string;
  ownerPhone?: string;
  password: string;
}

/** Data needed to register a customer */
export interface RegisterCustomerData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  storeId: string;
}

/** Token type for verification/reset */
export type TokenType = 'email_verification' | 'password_reset';

/** User type for auth operations */
export type AuthUserType = 'customer' | 'merchant';

/** JWT payload for MFA pending token (short-lived, 5 min) */
export interface MfaJwtPayload {
  userId: string;
  storeId?: string;
  role?: string;
  customerId?: string;
  superAdminId?: string;
  scope: 'merchant' | 'customer' | 'admin';
  jti: string;
  type: 'mfa_pending';
}

/** Scope for MFA Redis key prefix */
export type MfaScope = 'merchant' | 'customer' | 'admin';