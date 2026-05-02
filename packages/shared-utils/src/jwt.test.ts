import { describe, it, expect } from 'vitest';
import { decodeJWTPayload, safeDecodeJWT, isTokenExpired, getAuthScope } from './jwt.js';

function buildJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJWTPayload', () => {
  it('decodes a valid JWT payload', () => {
    const payload = { userId: 'u1', storeId: 's1', role: 'owner', jti: 'j1', type: 'access' as const };
    const token = buildJWT(payload);
    expect(decodeJWTPayload(token)).toEqual(payload);
  });

  it('throws for invalid JWT format (no dots)', () => {
    expect(() => decodeJWTPayload('invalid')).toThrow('Invalid JWT format');
  });

  it('throws for JWT with too many parts', () => {
    expect(() => decodeJWTPayload('a.b.c.d')).toThrow('Invalid JWT format');
  });

  it('handles base64url encoding with - and _', () => {
    const payload = { test: 'value-with-dashes_and_underscores' };
    const token = buildJWT(payload);
    expect(decodeJWTPayload(token)).toEqual(payload);
  });
});

describe('safeDecodeJWT', () => {
  it('returns null for undefined token', () => {
    expect(safeDecodeJWT(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeDecodeJWT('')).toBeNull();
  });

  it('returns null for invalid token', () => {
    expect(safeDecodeJWT('garbage')).toBeNull();
  });

  it('returns decoded payload for valid token', () => {
    const payload = { customerId: 'c1', storeId: 's1', jti: 'j1', type: 'access' as const };
    const token = buildJWT(payload);
    expect(safeDecodeJWT(token)).toEqual(expect.objectContaining(payload));
  });
});

describe('isTokenExpired', () => {
  it('returns false when exp is missing', () => {
    expect(isTokenExpired({})).toBe(false);
  });

  it('returns false when token is not expired', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired({ exp: futureExp })).toBe(false);
  });

  it('returns true when token is expired', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    expect(isTokenExpired({ exp: pastExp })).toBe(true);
  });
});

describe('getAuthScope', () => {
  it('returns superadmin for superAdminId payload', () => {
    expect(getAuthScope({ superAdminId: 'a1', role: 'superAdmin', jti: 'j1', type: 'access' })).toBe('superadmin');
  });

  it('returns customer for customerId payload', () => {
    expect(getAuthScope({ customerId: 'c1', storeId: 's1', jti: 'j1', type: 'access' })).toBe('customer');
  });

  it('returns merchant for userId payload', () => {
    expect(getAuthScope({ userId: 'u1', storeId: 's1', role: 'owner', jti: 'j1', type: 'access' })).toBe('merchant');
  });

  it('returns null for unknown payload', () => {
    expect(getAuthScope({ jti: 'j1', type: 'access' } as any)).toBeNull();
  });
});
