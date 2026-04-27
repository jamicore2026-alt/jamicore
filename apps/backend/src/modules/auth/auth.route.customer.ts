// Customer Auth Routes - Login, Register, Logout, Refresh, Verify Email, Password Reset
import { FastifyInstance, FastifyRequest } from 'fastify';
import { loginSchema, registerSchema, verifyEmailSchema, emailSchema, resetPasswordSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { storeService } from '../store/store.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import type { CustomerJwtPayload } from './auth.types.js';

const ACCESS_MAX_AGE = 15 * 60;          // 15 minutes in seconds
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export default async function customerAuthRoutes(fastify: FastifyInstance) {
  // Helper: resolve storeId from request (Host header or existing JWT)
  async function resolveStoreId(request: FastifyRequest): Promise<string | null> {
    if (request.storeId) return request.storeId;

    // Prefer X-Store-Domain header (BFF cannot override Host with Node.js fetch)
    const xDomain = request.headers['x-store-domain'];
    if (xDomain) {
      const domain = Array.isArray(xDomain) ? xDomain[0] : xDomain;
      const store = await storeService.findByDomain(domain);
      if (store) return store.id;
      // Try extracting subdomain (e.g. "techgear.localhost" -> "techgear")
      const parts = domain.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await storeService.findByDomain(subdomain);
        if (found) return found.id;
      }
    }

    const rawHost = request.headers.host;
    const host = Array.isArray(rawHost) ? rawHost[0] : rawHost;
    if (host) {
      const store = await storeService.findByDomain(host);
      if (store) return store.id;
      // Try extracting subdomain
      const parts = host.split('.');
      if (parts.length > 1) {
        const subdomain = parts[0];
        const found = await storeService.findByDomain(subdomain);
        if (found) return found.id;
      }
    }
    return null;
  }

  // POST /api/v1/customer/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Login as customer',
      description: 'Authenticate a customer with email and password for a specific store domain',
    },
  }, async (request, reply) => {
    const parsed = loginSchema.parse(request.body);
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const customer = await authService.verifyCustomerCredentials(
      parsed.email,
      parsed.password,
      storeId,
    );

    // Gate: require email verification before login
    if (!customer.isVerified) {
      throw Object.assign(new Error('Email not verified. Please check your inbox for the verification link.'), {
        code: ErrorCodes.EMAIL_NOT_VERIFIED,
      });
    }

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'customer', customer.id, refreshJti);

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    // Set CSRF token cookie (readable by JS, strict sameSite)
    const csrfToken = crypto.randomUUID();
    reply.setCookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    };
  });

  // POST /api/v1/customer/auth/register
  fastify.post('/register', {
    config: {
      rateLimit: { max: 3, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Register as customer',
      description: 'Create a new customer account for a specific store domain',
    },
  }, async (request, reply) => {
    const parsed = registerSchema.parse(request.body);
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      reply.status(400).send({ error: 'Bad Request', code: ErrorCodes.STORE_NOT_FOUND, message: 'Store not found. Please access via your store domain.' });
      return;
    }

    const customer = await authService.registerCustomer({
      ...parsed,
      storeId,
    });

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      customerId: customer.id,
      storeId: customer.storeId,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'customer', customer.id, refreshJti);

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    // Set CSRF token cookie
    const csrfToken = crypto.randomUUID();
    reply.setCookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });

    reply.status(201).send({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });
  });

  // POST /api/v1/customer/auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['Customer Auth'],
      summary: 'Logout as customer',
      description: 'Revoke the refresh token from Redis and clear both access + refresh cookies',
    },
  }, async (request, reply) => {
    const rawRefresh = request.cookies.refresh_token;
    if (rawRefresh) {
      try {
        const decoded = fastify.jwt.verify<CustomerJwtPayload>(rawRefresh);
        if (decoded.jti && decoded.customerId) {
          await authService.revokeRefreshToken(fastify.redis, 'customer', decoded.customerId, decoded.jti);
        }
      } catch {
        // Token expired or invalid — nothing to revoke in Redis, still clear cookies
      }
    }

    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });
    return { success: true };
  });

  // POST /api/v1/customer/auth/refresh
  fastify.post('/refresh', {
    schema: {
      tags: ['Customer Auth'],
      summary: 'Refresh customer tokens',
      description: 'Exchange a valid refresh token for new access + refresh tokens (rotation)',
    },
  }, async (request, reply) => {
    const rawRefresh = request.cookies.refresh_token;
    if (!rawRefresh) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Missing refresh token' });
      return;
    }

    let decoded: CustomerJwtPayload;
    try {
      decoded = fastify.jwt.verify<CustomerJwtPayload>(rawRefresh);
    } catch {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.customerId) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token type' });
      return;
    }

    const isValid = await authService.verifyRefreshToken(fastify.redis, 'customer', decoded.customerId, decoded.jti);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Refresh token revoked' });
      return;
    }

    const newPayload = await authService.refreshCustomerToken(
      fastify.redis,
      decoded.jti,
      decoded.customerId,
      decoded.storeId,
    );

    const accessJti = crypto.randomUUID();
    const refreshJti = newPayload.jti;

    const accessToken = await reply.jwtSign({
      customerId: newPayload.customerId,
      storeId: newPayload.storeId,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      customerId: newPayload.customerId,
      storeId: newPayload.storeId,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    return { success: true };
  });

  // GET /api/v1/customer/auth/me
  fastify.get('/me', {
    schema: {
      tags: ['Customer Auth'],
      summary: 'Get current customer',
      description: 'Retrieve the currently authenticated customer profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const customerId = request.customerId!;

    const customer = await authService.getCustomerProfile(customerId);

    return { customer };
  });

  // ─── Email Verification ───

  // POST /api/v1/customer/auth/verify-email
  fastify.post('/verify-email', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Verify customer email',
      description: 'Verify a customer email address using the token sent via email',
    },
  }, async (request) => {
    const { token } = verifyEmailSchema.parse(request.body);
    const result = await authService.verifyEmail(token);
    return { success: true, ...result };
  });

  // POST /api/v1/customer/auth/resend-verification
  fastify.post('/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Resend verification email',
      description: 'Request a new email verification token for the authenticated customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const customerId = request.customerId!;
    const customer = await authService.findCustomerForVerification(customerId);
    if (!customer) {
      reply.status(404).send({ error: 'Not Found', code: ErrorCodes.CUSTOMER_NOT_FOUND, message: 'Customer not found' });
      return;
    }
    const { token } = await authService.resendVerification(customer.email, customer.storeId, 'customer');
    // Queue verification email with clickable link
    const verifyUrl = `${process.env.STOREFRONT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    await fastify.emailService.sendEmail({
      to: customer.email,
      subject: 'Verify your email address',
      html: `<p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">Verify your email</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
      text: `Verify your email address: ${verifyUrl}`,
    });
    return { success: true, message: 'Verification email sent' };
  });

  // POST /api/v1/customer/auth/forgot-password
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Request password reset',
      description: 'Request a password reset token sent to the customer email',
    },
  }, async (request) => {
    const { email } = emailSchema.parse(request.body);
    const storeId = await resolveStoreId(request);
    const result = await authService.requestPasswordReset(email, storeId || undefined, 'customer');
    // Queue reset email if user was found (don't reveal if email exists)
    if (result.token) {
      await fastify.emailService.sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `<p>Click the link below to reset your password:</p><p><a href="${process.env.STOREFRONT_URL || 'http://localhost:5173'}/reset-password?token=${result.token}">Reset your password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
        text: `Reset your password: ${process.env.STOREFRONT_URL || 'http://localhost:5173'}/reset-password?token=${result.token}`,
      });
    }
    return { success: true, message: 'If an account with that email exists, a reset link has been sent' };
  });

  // POST /api/v1/customer/auth/reset-password
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Reset password',
      description: 'Reset customer password using the token from the reset email',
    },
  }, async (request) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(token, password);
    return { success: true, ...result };
  });
}