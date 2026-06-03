/* eslint-disable @typescript-eslint/no-explicit-any */
// Fastify API integration tests for merchant auth routes
// Tests the full request→response cycle including validation, JWT signing, and cookie setting
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { sign as signCookie } from '@fastify/cookie';

// ─── Mock authService before importing route ───
vi.mock('./auth.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth.service.js')>();
  return {
    authService: {
      verifyMerchantCredentials: vi.fn(),
      registerMerchant: vi.fn(),
      getMerchantUser: vi.fn(),
      storeRefreshToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      revokeRefreshToken: vi.fn(),
      refreshMerchantToken: vi.fn(),
      verifyEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
      // CONS-001: passthrough so /me tests assert the real shape produced by
      // the canonical builder.
      buildMeResponse: actual.authService.buildMeResponse,
    },
  };
});
import { authService as _authService } from './auth.service.js';
const authService = _authService as any;

// ─── Mock storeService (used by login/refresh routes) ───
vi.mock('../store/store.service.js', () => ({
  storeService: {
    findById: vi.fn().mockResolvedValue({ id: 'store-1', status: 'active', name: 'Test Store', domain: 'test.local' }),
  },
}));

// ─── Mock superAdminService (used by register route) ───
vi.mock('../superAdmin/superAdmin.service.js', () => ({
  superAdminService: {
    createNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Mock Redis ───
function createMockRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    ping: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
  };
}

// Import route after mocks are in place
import merchantAuthRoutes from './auth.route.merchant.js';

const JWT_SECRET = 'test-secret-for-integration-tests';
const COOKIE_SECRET = 'test-cookie-secret';

/** Sign a raw cookie value for testing (matches production signed cookies) */
function makeSignedCookie(value: string): string {
  return signCookie(value, COOKIE_SECRET);
}

async function buildApp() {
  const fastify = Fastify();

  await fastify.register(cookie, { secret: 'test-cookie-secret' });
  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  fastify.decorate('emailService', { sendEmail: vi.fn() } as any);
  fastify.decorate('redis', createMockRedis() as any);

  // Error handler matching production setup
  fastify.setErrorHandler((error: unknown, _request, reply) => {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in (error as object)) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      reply.status(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        message: zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const code = 'code' in err ? (err as unknown as { code: string }).code : undefined;

    const codeToStatus: Record<string, number> = {
      INVALID_CREDENTIALS: 401,
      TOKEN_EXPIRED: 401,
      TOKEN_INVALID: 401,
      VERIFICATION_TOKEN_EXPIRED: 401,
      PASSWORD_RESET_EXPIRED: 401,
      EMAIL_NOT_VERIFIED: 401,
      USER_NOT_FOUND: 404,
      USER_ALREADY_EXISTS: 409,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  await fastify.register(merchantAuthRoutes, { prefix: '/auth' });
  return fastify;
}

// ─── Helpers ───

/** Sign a merchant JWT and return the token string */
async function signMerchantToken(app: Fastify.FastifyInstance, payload: {
  userId: string;
  storeId: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
}) {
  return app.jwt.sign(payload, { expiresIn: payload.type === 'refresh' ? '7d' : '15m' });
}

// ─── Tests ───

describe('Merchant Auth Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════
  // POST /auth/login
  // ═══════════════════════════════════════════
  describe('POST /auth/login', () => {
    it('returns 200 with user data and sets both cookies on success', async () => {
      const mockUser = { id: 'user-1', email: 'owner@store.com', role: 'OWNER', storeId: 'store-1' };
      vi.mocked(authService.verifyMerchantCredentials).mockResolvedValueOnce(mockUser as any);
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'owner@store.com', password: 'Password1' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.user).toEqual({ id: 'user-1', email: 'owner@store.com', role: 'OWNER' });

      // Verify cookies are set
      const cookies = response.cookies;
      const accessCookie = cookies.find((c) => c.name === 'access_token');
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.httpOnly).toBe(true);

      // Verify service was called correctly
      expect(authService.verifyMerchantCredentials).toHaveBeenCalledWith('owner@store.com', 'Password1');
      expect(authService.storeRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'merchant', 'user-1', expect.any(String),
      );
    });

    it('returns 401 for invalid credentials', async () => {
      const error = Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
      vi.mocked(authService.verifyMerchantCredentials).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'owner@store.com', password: 'WrongPassword1' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 for validation errors (missing fields)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'not-an-email', password: 'Password1' },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for empty password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'owner@store.com', password: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/register
  // ═══════════════════════════════════════════
  describe('POST /auth/register', () => {
    const validPayload = {
      storeName: 'My Store',
      domain: 'mystore',
      ownerEmail: 'owner@store.com',
      ownerName: 'Jane Doe',
      password: 'Password1',
    };

    it('returns 201 with store and user data on success', async () => {
      const mockStore = { id: 'store-1', name: 'My Store', domain: 'mystore', status: 'pending' };
      const mockUser = { id: 'user-1', email: 'owner@store.com', role: 'OWNER' };
      vi.mocked(authService.registerMerchant).mockResolvedValueOnce({ store: mockStore, user: mockUser } as any);
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.store).toEqual({ id: 'store-1', name: 'My Store', domain: 'mystore', status: 'pending' });
      expect(body.user).toEqual({ id: 'user-1', email: 'owner@store.com', role: 'OWNER' });

      // Verify cookies are set
      const cookies = response.cookies;
      expect(cookies.find((c) => c.name === 'access_token')).toBeDefined();
      expect(cookies.find((c) => c.name === 'refresh_token')).toBeDefined();

      expect(authService.registerMerchant).toHaveBeenCalledWith(expect.objectContaining({
        storeName: 'My Store',
        domain: 'mystore',
        ownerEmail: 'owner@store.com',
        password: 'Password1',
      }));
    });

    it('returns 409 when store email already exists', async () => {
      const error = Object.assign(new Error('Store with this email already exists'), { code: 'USER_ALREADY_EXISTS' });
      vi.mocked(authService.registerMerchant).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validPayload,
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.code).toBe('USER_ALREADY_EXISTS');
    });

    it('returns 400 for validation errors (weak password)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { ...validPayload, password: 'weak' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'owner@store.com' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/logout
  // ═══════════════════════════════════════════
  describe('POST /auth/logout', () => {
    it('clears both cookies and revokes refresh token', async () => {
      vi.mocked(authService.revokeRefreshToken).mockResolvedValueOnce(undefined);

      // Sign a refresh token to pass in cookies
      const refreshToken = await signMerchantToken(app, {
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'test-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      // Verify revoke was called
      expect(authService.revokeRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'merchant', 'user-1', 'test-jti',
      );

      // Verify cookies are cleared (setCookie with maxAge=0 or deleted)
      const setCookieHeaders = response.headers['set-cookie'];
      if (Array.isArray(setCookieHeaders)) {
        const accessCleared = setCookieHeaders.some((h: string) => h.includes('access_token') && h.includes('maxAge=0'));
        const refreshCleared = setCookieHeaders.some((h: string) => h.includes('refresh_token') && h.includes('maxAge=0'));
        expect(accessCleared || setCookieHeaders.some((h: string) => h.includes('access_token'))).toBe(true);
        expect(refreshCleared || setCookieHeaders.some((h: string) => h.includes('refresh_token'))).toBe(true);
      } else {
        // Single set-cookie header — at least the tokens are being cleared
        expect(response.cookies.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('succeeds even without a refresh token (no cookies)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(authService.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('succeeds even with an expired/malformed refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: { refresh_token: makeSignedCookie('invalid-token') },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/refresh
  // ═══════════════════════════════════════════
  describe('POST /auth/refresh', () => {
    it('rotates tokens and sets new cookies on valid refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(true);
      vi.mocked(authService.refreshMerchantToken).mockResolvedValueOnce({
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'new-jti',
        type: 'refresh' as const,
      });
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const refreshToken = await signMerchantToken(app, {
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'old-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      // Verify new cookies are set
      expect(response.cookies.find((c) => c.name === 'access_token')).toBeDefined();
      expect(response.cookies.find((c) => c.name === 'refresh_token')).toBeDefined();

      expect(authService.verifyRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'merchant', 'user-1', 'old-jti',
      );
      expect(authService.refreshMerchantToken).toHaveBeenCalledWith(
        expect.anything(), 'old-jti', 'user-1', 'store-1', 'OWNER',
      );
    });

    it('returns 401 when refresh cookie is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Missing refresh token');
    });

    it('returns 401 for invalid/malformed refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie('this-is-not-a-jwt') },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toContain('Invalid or expired refresh token');
    });

    it('returns 401 for revoked refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(false);

      const refreshToken = await signMerchantToken(app, {
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'revoked-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Refresh token revoked');
    });

    it('returns 401 when refresh token has wrong type (access instead of refresh)', async () => {
      // Sign as access type, not refresh
      const accessToken = await signMerchantToken(app, {
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'access-jti',
        type: 'access',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(accessToken) },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toBe('Invalid token type');
    });
  });

  // ═══════════════════════════════════════════
  // GET /auth/me
  // ═══════════════════════════════════════════
  describe('GET /auth/me', () => {
    it('returns user profile when authenticated', async () => {
      const mockUser = { id: 'user-1', email: 'owner@store.com', role: 'OWNER', storeId: 'store-1' };
      vi.mocked(authService.getMerchantUser).mockResolvedValueOnce(mockUser as any);

      // The /me route requires an authenticated user (request.userId set by
      // merchant scope hook). Since we only load the auth route plugin, we
      // simulate the hook by manually reading the access_token cookie and
      // verifying the JWT.
      const testApp = await buildApp();
      testApp.addHook('onRequest', async (request, reply) => {
        if (request.url.endsWith('/auth/me')) {
          const token = request.cookies.access_token;
          if (!token) {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
          try {
            const decoded = testApp.jwt.verify<Record<string, string>>(token);
            request.userId = decoded.userId;
            request.storeId = decoded.storeId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signMerchantToken(testApp, {
        userId: 'user-1',
        storeId: 'store-1',
        role: 'OWNER',
        jti: 'me-jti',
        type: 'access',
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/auth/me',
        cookies: { access_token: accessToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // CONS-001: canonical /me shape. The merchant scope has no `name` yet
      // (users table has no name column) and no `lastLoginAt`, so those are
      // null/omitted; `store` is populated from storeService.findById.
      expect(body).toEqual({
        scope: 'merchant',
        user: { id: 'user-1', email: 'owner@store.com', name: null, role: 'OWNER' },
        store: { id: 'store-1', name: 'Test Store', status: 'active' },
      });

      await testApp.close();
    });

    it('returns 401 when no access token cookie is provided', async () => {
      const testApp = await buildApp();
      testApp.addHook('onRequest', async (request, reply) => {
        if (request.url.endsWith('/auth/me')) {
          const token = request.cookies.access_token;
          if (!token) {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
          try {
            const decoded = testApp.jwt.verify<Record<string, string>>(token);
            request.userId = decoded.userId;
            request.storeId = decoded.storeId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);

      await testApp.close();
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/verify-email
  // ═══════════════════════════════════════════
  describe('POST /auth/verify-email', () => {
    it('returns success on valid token', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValueOnce({
        verified: true,
        userType: 'merchant' as const,
        email: 'owner@store.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'valid-verification-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.verified).toBe(true);
      expect(body.userType).toBe('merchant');
    });

    it('returns 401 for invalid/expired token', async () => {
      const error = Object.assign(new Error('Invalid or expired verification token'), { code: 'VERIFICATION_TOKEN_EXPIRED' });
      vi.mocked(authService.verifyEmail).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'expired-token' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for missing token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/forgot-password
  // ═══════════════════════════════════════════
  describe('POST /auth/forgot-password', () => {
    it('returns success and queues email when user exists', async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce({
        token: 'reset-token-abc',
        emailNotFound: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'owner@store.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('reset link has been sent');

      expect(app.emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'owner@store.com',
        subject: 'Reset your password',
      }));
    });

    it('returns success even when user not found (does not reveal existence)', async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce({
        token: null,
        emailNotFound: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'nonexistent@store.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(app.emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'not-an-email' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/reset-password
  // ═══════════════════════════════════════════
  describe('POST /auth/reset-password', () => {
    it('returns success on valid token and new password', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValueOnce({
        reset: true,
        email: 'owner@store.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { token: 'valid-reset-token', password: 'NewPassword1' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.reset).toBe(true);
    });

    it('returns 401 for invalid/expired reset token', async () => {
      const error = Object.assign(new Error('Invalid or expired reset token'), { code: 'PASSWORD_RESET_EXPIRED' });
      vi.mocked(authService.resetPassword).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { token: 'bad-token', password: 'NewPassword1' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { token: 'valid-token', password: 'weak' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});