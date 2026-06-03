// Customer session auth routes — login, register, logout, refresh, me
import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { storeService } from '../store/store.service.js';
import { cartService } from '../cart/cart.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from '../../lib/auth-cookies.js';
import { generateCsrfToken } from '../../lib/csrf.js';
import { env } from '../../config/env.js';
import type { CustomerJwtPayload } from './auth.types.js';
import { resolveStoreId } from './auth.helpers.js';

export default async function sessionRoutes(fastify: FastifyInstance) {
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

    const store = await storeService.findById(storeId);
    if (store && store.status !== 'active') {
      reply.status(403).send({ error: 'Store suspended', code: ErrorCodes.STORE_SUSPENDED, message: 'Store is currently suspended' });
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

    // MFA required: send code and return temporary token
    if (customer.mfaEnabled) {
      const code = await authService.generateMfaCode(fastify.redis, 'customer', customer.id);
      await fastify.emailService.sendEmail({
        to: customer.email,
        subject: 'Your verification code',
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
        text: `Your verification code is: ${code}. This code expires in 5 minutes.`,
      });

      const mfaJti = crypto.randomUUID();
      const mfaToken = await reply.jwtSign({
        customerId: customer.id,
        storeId: customer.storeId,
        scope: 'customer',
        jti: mfaJti,
        type: 'mfa_pending',
      }, { expiresIn: '5m' });

      return {
        success: true,
        mfaRequired: true,
        mfaToken,
      };
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
    const csrfToken = generateCsrfToken();
    reply.setCookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });

    // Merge guest cart into customer cart on login
    const guestCartId = request.cookies.cartId;
    if (guestCartId && storeId) {
      try {
        await cartService.mergeCartOnLogin(guestCartId, customer.id, storeId, fastify.queueService);
      } catch {
        // Ignore cart merge errors — don't block login
      }
    }

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

    const store = await storeService.findById(storeId);
    if (store && store.status !== 'active') {
      reply.status(403).send({ error: 'Store suspended', code: ErrorCodes.STORE_SUSPENDED, message: 'Store is currently suspended' });
      return;
    }

    const customer = await authService.registerCustomer({
      ...parsed,
      storeId,
    });

    // Send verification email
    const { token } = await authService.resendVerification(customer.email, storeId, 'customer');
    const verifyUrl = `${env.STOREFRONT_URL}/verify-email?token=${token}`;
    await fastify.emailService.sendEmail({
      to: customer.email,
      subject: 'Verify your email address',
      html: `<p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
      text: `Verify your email address: ${verifyUrl}`,
    });

    reply.status(201).send({
      success: true,
      message: 'Account created. Please check your email to verify your account before logging in.',
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
    const signedRefresh = request.cookies.refresh_token;
    if (signedRefresh) {
      const unsignedResult = request.unsignCookie(signedRefresh);
      if (unsignedResult.valid && unsignedResult.value) {
        try {
          const decoded = fastify.jwt.verify<CustomerJwtPayload>(unsignedResult.value);
          if (decoded.jti && decoded.customerId) {
            await authService.revokeRefreshToken(fastify.redis, 'customer', decoded.customerId, decoded.jti);
          }
        } catch {
          // Token expired or invalid
        }
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
    const signedRefresh = request.cookies.refresh_token;
    if (!signedRefresh) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Missing refresh token' });
      return;
    }

    const unsignedResult = request.unsignCookie(signedRefresh);
    if (!unsignedResult.valid || !unsignedResult.value) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid refresh token signature' });
      return;
    }
    const rawRefresh = unsignedResult.value;

    let decoded: CustomerJwtPayload;
    try {
      decoded = fastify.jwt.verify<CustomerJwtPayload>(rawRefresh);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message, name: e.name }, 'Customer refresh: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.customerId) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid token type' });
      return;
    }

    const isValid = await authService.verifyRefreshToken(fastify.redis, 'customer', decoded.customerId, decoded.jti);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Refresh token revoked' });
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
}
