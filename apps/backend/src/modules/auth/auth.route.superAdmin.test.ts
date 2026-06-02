/* eslint-disable @typescript-eslint/no-explicit-any */
// Fastify API integration tests for superAdmin auth routes
// Tests the full request→response cycle including validation, JWT signing, and cookie setting
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { sign as signCookie } from '@fastify/cookie';

// ─── Mock authService before importing route ───
vi.mock('./auth.service.js', () => ({
  authService: {
    verifySuperAdminCredentials: vi.fn(),
    getSuperAdminProfile: vi.fn(),
    updateSuperAdminLastLogin: vi.fn(),
    storeRefreshToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    refreshAdminToken: vi.fn(),
  },
}));
import { authService as _authService } from './auth.service.js';
const authService = _authService as any;

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

import superAdminAuthRoutes from './auth.route.superAdmin.js';

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
      ADMIN_NOT_FOUND: 404,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  await fastify.register(superAdminAuthRoutes, { prefix: '/auth' });
  return fastify;
}

// ─── Helpers ───

/** Sign a superAdmin JWT and return the token string */
async function signAdminToken(app: Fastify.FastifyInstance, payload: {
  superAdminId: string;
  role: string;
  jti: string;
  type: 'access' | 'refresh';
}) {
  return app.jwt.sign(payload, { expiresIn: payload.type === 'refresh' ? '7d' : '15m' });
}

// ─── Tests ───

describe('SuperAdmin Auth Routes', () => {
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
    it('returns 200 with admin data and sets both cookies on success', async () => {
      const mockAdmin = { id: 'admin-1', email: 'admin@platform.com', isActive: true, password: 'hashed' };
      vi.mocked(authService.verifySuperAdminCredentials).mockResolvedValueOnce(mockAdmin as any);
      vi.mocked(authService.updateSuperAdminLastLogin).mockResolvedValueOnce(undefined);
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@platform.com', password: 'AdminPass1' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.admin).toEqual({ id: 'admin-1', email: 'admin@platform.com', name: undefined });

      // Verify cookies are set
      const cookies = response.cookies;
      const accessCookie = cookies.find((c) => c.name === 'access_token');
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.httpOnly).toBe(true);

      // Verify last login update was called
      expect(authService.updateSuperAdminLastLogin).toHaveBeenCalledWith('admin-1');

      // Verify storeRefreshToken was called
      expect(authService.storeRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'admin', 'admin-1', expect.any(String),
      );
    });

    it('returns 401 for invalid credentials', async () => {
      const error = Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
      vi.mocked(authService.verifySuperAdminCredentials).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@platform.com', password: 'WrongPass1' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 for validation errors (missing fields)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'not-an-email', password: 'AdminPass1' },
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

      const refreshToken = await signAdminToken(app, {
        superAdminId: 'admin-1',
        role: 'superAdmin',
        jti: 'test-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'admin', 'admin-1', 'test-jti',
      );
    });

    it('succeeds even without a refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(authService.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('succeeds even with an expired/malformed refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: { refresh_token: makeSignedCookie('garbage-token') },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/refresh
  // ═══════════════════════════════════════════
  describe('POST /auth/refresh', () => {
    it('rotates tokens and sets new cookies on valid refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(true);
      vi.mocked(authService.refreshAdminToken).mockResolvedValueOnce({
        superAdminId: 'admin-1',
        role: 'superAdmin',
        jti: 'new-jti',
        type: 'refresh' as const,
      });
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const refreshToken = await signAdminToken(app, {
        superAdminId: 'admin-1',
        role: 'superAdmin',
        jti: 'old-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Verify new cookies are set
      expect(response.cookies.find((c) => c.name === 'access_token')).toBeDefined();
      expect(response.cookies.find((c) => c.name === 'refresh_token')).toBeDefined();

      expect(authService.verifyRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'admin', 'admin-1', 'old-jti',
      );
      expect(authService.refreshAdminToken).toHaveBeenCalledWith(
        expect.anything(), 'old-jti', 'admin-1', 'superAdmin',
      );
    });

    it('returns 401 when refresh cookie is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Missing refresh token');
    });

    it('returns 401 for invalid/malformed refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie('not-a-valid-jwt') },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain('Invalid or expired refresh token');
    });

    it('returns 401 for revoked refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(false);

      const refreshToken = await signAdminToken(app, {
        superAdminId: 'admin-1',
        role: 'superAdmin',
        jti: 'revoked-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(refreshToken) },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Refresh token revoked');
    });

    it('returns 401 when token has wrong type (access instead of refresh)', async () => {
      const accessToken = await signAdminToken(app, {
        superAdminId: 'admin-1',
        role: 'superAdmin',
        jti: 'access-jti',
        type: 'access',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: makeSignedCookie(accessToken) },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Invalid token type');
    });
  });

  // ═══════════════════════════════════════════
  // GET /auth/me
  // ═══════════════════════════════════════════
  describe('GET /auth/me', () => {
    it('returns admin profile when authenticated', async () => {
      const mockAdmin = { id: 'admin-1', email: 'admin@platform.com', name: 'Super Admin', isActive: true, lastLoginAt: null };
      vi.mocked(authService.getSuperAdminProfile).mockResolvedValueOnce(mockAdmin as any);

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
            request.superAdminId = decoded.superAdminId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signAdminToken(testApp, {
        superAdminId: 'admin-1',
        role: 'superAdmin',
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
      expect(body.admin).toEqual({
        id: 'admin-1',
        email: 'admin@platform.com',
        name: 'Super Admin',
        isActive: true,
        lastLoginAt: null,
      });

      await testApp.close();
    });

    it('returns 404 when admin not found', async () => {
      const error = Object.assign(new Error('Admin not found'), { code: 'ADMIN_NOT_FOUND' });
      vi.mocked(authService.getSuperAdminProfile).mockRejectedValueOnce(error);

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
            request.superAdminId = decoded.superAdminId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signAdminToken(testApp, {
        superAdminId: 'nonexistent',
        role: 'superAdmin',
        jti: 'me-jti',
        type: 'access',
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/auth/me',
        cookies: { access_token: accessToken },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe('ADMIN_NOT_FOUND');

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
            request.superAdminId = decoded.superAdminId;
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
});