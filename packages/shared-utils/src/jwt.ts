export interface MerchantJWTPayload {
  userId: string;
  storeId: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

export interface CustomerJWTPayload {
  customerId: string;
  storeId: string;
  jti: string;
  type: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

export interface SuperAdminJWTPayload {
  superAdminId: string;
  role: 'superAdmin';
  jti: string;
  type: 'access' | 'refresh';
  exp?: number;
  iat?: number;
}

export type AnyJWTPayload = MerchantJWTPayload | CustomerJWTPayload | SuperAdminJWTPayload;

function addBase64Padding(base64url: string): string {
  const padLen = 4 - (base64url.length % 4);
  return padLen === 4 ? base64url : base64url + '='.repeat(padLen);
}

/**
 * Decode JWT payload without verification.
 * The backend already verified the token — we just need the claims.
 *
 * Handles signed cookies: Fastify's @fastify/cookie plugin may sign cookies,
 * creating 4+ dot-separated parts. We extract only the first 3 parts
 * (header.payload.signature) for decoding.
 */
export function decodeJWTPayload(token: string): unknown {
  // Fastify signed cookies use `.s:<signature>` suffix
  let cleanToken = token.includes('.s:') ? token.split('.s:')[0] : token;

  // cookie-signature (used by Fastify cookie plugin): appends a base64 HMAC
  // after the JWT, creating 4+ dot-separated parts. Extract only the JWT.
  const parts = cleanToken.split('.');
  if (parts.length < 3) {
    throw new Error('Invalid JWT format');
  }

  // Take only the first 3 parts (header.payload.jwtSignature), drop cookie signature
  const payloadPart = parts[1];

  // base64url → base64 (replace chars + add padding) then decode
  const base64 = addBase64Padding(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
  const decoded = atob(base64);
  return JSON.parse(decoded);
}

/**
 * Safely decode a JWT, returning null on failure.
 */
export function safeDecodeJWT(token: string | undefined): AnyJWTPayload | null {
  if (!token) return null;
  try {
    const payload = decodeJWTPayload(token) as AnyJWTPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if a decoded JWT is expired.
 * Includes 5-second clock-skew tolerance.
 */
export function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return false;
  return Date.now() / 1000 > payload.exp + 5;
}

/**
 * Determine the auth scope from a JWT payload.
 */
export function getAuthScope(payload: AnyJWTPayload): 'merchant' | 'customer' | 'superadmin' | null {
  if ('superAdminId' in payload) return 'superadmin';
  if ('customerId' in payload) return 'customer';
  if ('userId' in payload) return 'merchant';
  return null;
}
