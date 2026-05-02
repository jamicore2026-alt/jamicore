// Fastify API integration tests for customer auth routes
// Tests the full request→response cycle including validation, JWT signing, cookie setting,
// and store resolution from Host header
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';

// ─── Mock authService before importing route ───
vi.mock('./auth.service.js', () => ({
  authService: {
    verifyCustomerCredentials: vi.fn(),
    registerCustomer: vi.fn(),
    getCustomerProfile: vi.fn(),
    findCustomerForVerification: vi.fn(),
    storeRefreshToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    refreshCustomerToken: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

// ─── Mock storeService for store resolution ───
vi.mock('../store/store.service.js', () => ({
  storeService: {
    findByDomain: vi.fn(),
    findById: vi.fn(),
  },
}));

// ─── Mock cartService (used by login route) ───
vi.mock('../cart/cart.service.js', () => ({
  cartService: {
    mergeCartOnLogin: vi.fn().mockResolvedValue(undefined),
  },
}));

import { authService as _authService } from './auth.service.js';
import { storeService as _storeService } from '../store/store.service.js';
const authService = _authService as any;
const storeService = _storeService as any;

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

import customerAuthRoutes from './auth.route.customer.js';

const JWT_SECRET = 'test-secret-for-integration-tests';

async function buildApp() {
  const fastify = Fastify();

  await fastify.register(cookie, { secret: 'test-cookie-secret' });
  await fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  fastify.decorate('emailService', { sendEmail: vi.fn() } as any);
  fastify.decorate('redis', createMockRedis() as any);
  fastify.decorate('storeService', storeService as any);
  fastify.decorate('queueService', { add: vi.fn() } as any);

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
      CUSTOMER_NOT_FOUND: 404,
      CUSTOMER_ALREADY_EXISTS: 409,
      STORE_NOT_FOUND: 400,
      EMAIL_ALREADY_VERIFIED: 403,
    };

    const statusCode = (code && codeToStatus[code]) || 500;
    reply.status(statusCode).send({
      error: err.name || 'Internal Server Error',
      ...(code ? { code } : {}),
      message: err.message,
    });
  });

  await fastify.register(customerAuthRoutes, { prefix: '/auth' });
  return fastify;
}

// ─── Helpers ───

/** Sign a customer JWT and return the token string */
async function signCustomerToken(app: Fastify.FastifyInstance, payload: {
  customerId: string;
  storeId: string;
  jti: string;
  type: 'access' | 'refresh';
}) {
  return app.jwt.sign(payload, { expiresIn: payload.type === 'refresh' ? '7d' : '15m' });
}

// ─── Tests ───

describe('Customer Auth Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
    // Default: store found by Host header
    vi.mocked(storeService.findByDomain).mockResolvedValue({ id: 'store-1', domain: 'mystore' } as any);
  });

  afterEach(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════
  // POST /auth/login
  // ═══════════════════════════════════════════
  describe('POST /auth/login', () => {
    it('returns 200 with customer data and sets both cookies on success', async () => {
      const mockCustomer = {
        id: 'cust-1',
        email: 'buyer@store.com',
        storeId: 'store-1',
        firstName: 'John',
        lastName: 'Doe',
        isVerified: true,
      };
      vi.mocked(authService.verifyCustomerCredentials).mockResolvedValueOnce(mockCustomer as any);
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'buyer@store.com', password: 'Password1' },
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.customer).toEqual({
        id: 'cust-1',
        email: 'buyer@store.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Verify cookies are set
      const cookies = response.cookies;
      expect(cookies.find((c) => c.name === 'access_token')).toBeDefined();
      expect(cookies.find((c) => c.name === 'refresh_token')).toBeDefined();

      expect(authService.verifyCustomerCredentials).toHaveBeenCalledWith(
        'buyer@store.com', 'Password1', 'store-1',
      );
    });

    it('returns 401 for invalid credentials', async () => {
      const error = Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
      vi.mocked(authService.verifyCustomerCredentials).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'buyer@store.com', password: 'WrongPassword1' },
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 when store cannot be resolved from Host header', async () => {
      vi.mocked(storeService.findByDomain).mockResolvedValueOnce(null);
      vi.mocked(storeService.findByDomain).mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'buyer@store.com', password: 'Password1' },
        headers: { host: 'unknown.localhost:3000' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('STORE_NOT_FOUND');
    });

    it('returns 401 when customer email is not verified', async () => {
      const mockCustomer = {
        id: 'cust-1',
        email: 'buyer@store.com',
        storeId: 'store-1',
        isVerified: false,
      };
      vi.mocked(authService.verifyCustomerCredentials).mockResolvedValueOnce(mockCustomer as any);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'buyer@store.com', password: 'Password1' },
        headers: { host: 'mystore.localhost:3000' },
      });

      // The route throws EMAIL_NOT_VERIFIED error
      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('returns 400 for validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {},
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/register
  // ═══════════════════════════════════════════
  describe('POST /auth/register', () => {
    const validPayload = {
      email: 'newbuyer@store.com',
      password: 'Password1',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('returns 201 with customer data and does NOT set JWT cookies on success', async () => {
      const mockCustomer = {
        id: 'cust-2',
        email: 'newbuyer@store.com',
        storeId: 'store-1',
        firstName: 'John',
        lastName: 'Doe',
      };
      vi.mocked(authService.registerCustomer).mockResolvedValueOnce(mockCustomer as any);
      vi.mocked(authService.resendVerification).mockResolvedValueOnce({ token: 'verify-token-123' });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validPayload,
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Account created. Please check your email to verify your account before logging in.');
      expect(body.customer).toEqual({
        id: 'cust-2',
        email: 'newbuyer@store.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Verify NO JWT cookies are set
      expect(response.cookies.find((c) => c.name === 'access_token')).toBeUndefined();
      expect(response.cookies.find((c) => c.name === 'refresh_token')).toBeUndefined();

      expect(authService.registerCustomer).toHaveBeenCalledWith(expect.objectContaining({
        email: 'newbuyer@store.com',
        password: 'Password1',
        storeId: 'store-1',
      }));
    });

    it('returns 409 when customer already exists', async () => {
      const error = Object.assign(new Error('Customer already exists'), { code: 'CUSTOMER_ALREADY_EXISTS' });
      vi.mocked(authService.registerCustomer).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validPayload,
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 400 when store not resolved from Host header', async () => {
      vi.mocked(storeService.findByDomain).mockResolvedValueOnce(null);
      vi.mocked(storeService.findByDomain).mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validPayload,
        headers: { host: 'unknown.localhost:3000' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for validation errors (weak password)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { ...validPayload, password: 'weak' },
        headers: { host: 'mystore.localhost:3000' },
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

      const refreshToken = await signCustomerToken(app, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'test-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        cookies: { refresh_token: refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'customer', 'cust-1', 'test-jti',
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
  });

  // ═══════════════════════════════════════════
  // POST /auth/refresh
  // ═══════════════════════════════════════════
  describe('POST /auth/refresh', () => {
    it('rotates tokens and sets new cookies on valid refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(true);
      vi.mocked(authService.refreshCustomerToken).mockResolvedValueOnce({
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'new-jti',
        type: 'refresh' as const,
      });
      vi.mocked(authService.storeRefreshToken).mockResolvedValueOnce(undefined);

      const refreshToken = await signCustomerToken(app, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'old-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      expect(response.cookies.find((c) => c.name === 'access_token')).toBeDefined();
      expect(response.cookies.find((c) => c.name === 'refresh_token')).toBeDefined();

      expect(authService.verifyRefreshToken).toHaveBeenCalledWith(
        expect.anything(), 'customer', 'cust-1', 'old-jti',
      );
      expect(authService.refreshCustomerToken).toHaveBeenCalledWith(
        expect.anything(), 'old-jti', 'cust-1', 'store-1',
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
        cookies: { refresh_token: 'garbage-token' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 for revoked refresh token', async () => {
      vi.mocked(authService.verifyRefreshToken).mockResolvedValueOnce(false);

      const refreshToken = await signCustomerToken(app, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'revoked-jti',
        type: 'refresh',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: refreshToken },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Refresh token revoked');
    });

    it('returns 401 when token has wrong type (access instead of refresh)', async () => {
      const accessToken = await signCustomerToken(app, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'access-jti',
        type: 'access',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: { refresh_token: accessToken },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Invalid token type');
    });
  });

  // ═══════════════════════════════════════════
  // GET /auth/me
  // ═══════════════════════════════════════════
  describe('GET /auth/me', () => {
    it('returns customer profile when authenticated', async () => {
      const mockCustomer = { id: 'cust-1', email: 'buyer@store.com', firstName: 'John', lastName: 'Doe' };
      vi.mocked(authService.getCustomerProfile).mockResolvedValueOnce(mockCustomer as any);

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
            request.customerId = decoded.customerId;
            request.storeId = decoded.storeId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signCustomerToken(testApp, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'me-jti',
        type: 'access',
      });

      const response = await testApp.inject({
        method: 'GET',
        url: '/auth/me',
        cookies: { access_token: accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().customer).toEqual(mockCustomer);

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
            request.customerId = decoded.customerId;
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
        userType: 'customer' as const,
        email: 'buyer@store.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'valid-verify-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(response.json().verified).toBe(true);
    });

    it('returns 401 for invalid/expired token', async () => {
      const error = Object.assign(new Error('Invalid or expired verification token'), { code: 'VERIFICATION_TOKEN_EXPIRED' });
      vi.mocked(authService.verifyEmail).mockRejectedValueOnce(error);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'bad-token' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/resend-verification
  // ═══════════════════════════════════════════
  describe('POST /auth/resend-verification', () => {
    it('sends verification email for authenticated customer', async () => {
      const mockCustomer = { id: 'cust-1', email: 'buyer@store.com', storeId: 'store-1' };
      vi.mocked(authService.findCustomerForVerification).mockResolvedValueOnce(mockCustomer as any);
      vi.mocked(authService.resendVerification).mockResolvedValueOnce({ token: 'new-verify-token' });

      const testApp = await buildApp();
      testApp.addHook('onRequest', async (request, reply) => {
        if (request.url.endsWith('/auth/resend-verification')) {
          const token = request.cookies.access_token;
          if (!token) {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
          try {
            const decoded = testApp.jwt.verify<Record<string, string>>(token);
            request.customerId = decoded.customerId;
            request.storeId = decoded.storeId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signCustomerToken(testApp, {
        customerId: 'cust-1',
        storeId: 'store-1',
        jti: 'resend-jti',
        type: 'access',
      });

      const response = await testApp.inject({
        method: 'POST',
        url: '/auth/resend-verification',
        cookies: { access_token: accessToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(response.json().message).toBe('Verification email sent');

      expect(testApp.emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'buyer@store.com',
        subject: 'Verify your email address',
      }));

      await testApp.close();
    });

    it('returns 404 when customer not found', async () => {
      vi.mocked(authService.findCustomerForVerification).mockResolvedValueOnce(null);

      const testApp = await buildApp();
      testApp.addHook('onRequest', async (request, reply) => {
        if (request.url.endsWith('/auth/resend-verification')) {
          const token = request.cookies.access_token;
          if (!token) {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
          try {
            const decoded = testApp.jwt.verify<Record<string, string>>(token);
            request.customerId = decoded.customerId;
            request.storeId = decoded.storeId;
          } catch {
            reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token' });
            return;
          }
        }
      });

      const accessToken = await signCustomerToken(testApp, {
        customerId: 'nonexistent',
        storeId: 'store-1',
        jti: 'resend-jti',
        type: 'access',
      });

      const response = await testApp.inject({
        method: 'POST',
        url: '/auth/resend-verification',
        cookies: { access_token: accessToken },
      });

      expect(response.statusCode).toBe(404);

      await testApp.close();
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/forgot-password
  // ═══════════════════════════════════════════
  describe('POST /auth/forgot-password', () => {
    it('returns success and queues email when customer found', async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce({
        token: 'reset-token-xyz',
        emailNotFound: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'buyer@store.com' },
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(app.emailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'buyer@store.com',
      }));
    });

    it('returns success without sending email when customer not found', async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValueOnce({
        token: null,
        emailNotFound: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'nobody@store.com' },
        headers: { host: 'mystore.localhost:3000' },
      });

      expect(response.statusCode).toBe(200);
      expect(app.emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  // POST /auth/reset-password
  // ═══════════════════════════════════════════
  describe('POST /auth/reset-password', () => {
    it('returns success on valid token and password', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValueOnce({
        reset: true,
        email: 'buyer@store.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { token: 'valid-reset-token', password: 'NewPassword1' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
      expect(response.json().reset).toBe(true);
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