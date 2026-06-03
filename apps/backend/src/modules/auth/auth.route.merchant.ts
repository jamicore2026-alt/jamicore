// Merchant Auth Routes - Login, Register, Logout, Refresh, Verify Email, Password Reset
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { storeService } from '../store/store.service.js';
import { superAdminService } from '../superAdmin/superAdmin.service.js';
import { loginSchema, verifyEmailSchema, emailSchema, resetPasswordSchema } from '../_shared/schema.js';
import { verifyMfaSchema, enableMfaSchema, merchantRegisterSchema as registerSchema } from './auth.schema.js';
import { ErrorCodes } from '../../errors/codes.js';
import { env } from '../../config/env.js';
import { cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from '../../lib/auth-cookies.js';
import { generateCsrfToken } from '../../lib/csrf.js';
import { checkStoreActive } from '../_shared/store-gate.js';
import type { MerchantJwtPayload } from './auth.types.js';

export default async function merchantAuthRoutes(fastify: FastifyInstance) {
  // POST /api/v1/merchant/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Login as merchant',
      description: 'Authenticate a merchant user with email and password to receive httpOnly access + refresh cookies',
    },
  }, async (request, reply) => {
    const parsed = loginSchema.parse(request.body);

    const user = await authService.verifyMerchantCredentials(parsed.email, parsed.password);

    // Verify store is active before issuing tokens
    const store = await storeService.findById(user.storeId);
    if (checkStoreActive(reply, store)) return;
    const activeStore = store!;

    // MFA required: send code and return temporary token
    if (user.mfaEnabled) {
      const code = await authService.generateMfaCode(fastify.redis, 'merchant', user.id);
      await fastify.emailService.sendEmail({
        to: user.email,
        subject: 'Your verification code',
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
        text: `Your verification code is: ${code}. This code expires in 5 minutes.`,
      });

      const mfaJti = crypto.randomUUID();
      const mfaToken = await reply.jwtSign({
        userId: user.id,
        storeId: user.storeId,
        role: user.role,
        scope: 'merchant',
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

    // Sign access token (15 min default) and refresh token (7d explicit)
    const accessToken = await reply.jwtSign({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    // Store refresh token in Redis
    await authService.storeRefreshToken(fastify.redis, 'merchant', user.id, refreshJti);

    // Set httpOnly cookies — NEVER return tokens in body
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

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      store: {
        id: activeStore.id,
        name: activeStore.name,
        status: activeStore.status,
      },
    };
  });

  // POST /api/v1/merchant/auth/register
  fastify.post('/register', {
    config: {
      rateLimit: { max: 3, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Register a merchant',
      description: 'Create a new merchant account with store, owner, and domain details',
    },
  }, async (request, reply) => {
    const parsed = registerSchema.parse(request.body);

    const { store, user } = await authService.registerMerchant(parsed);

    // Notify super admins of new pending merchant
    superAdminService.createNotification({
      type: 'merchant_registered',
      title: 'New Merchant Registration',
      body: `${parsed.storeName} (${parsed.ownerEmail}) registered and is pending approval.`,
      targetStoreId: store.id,
    }).catch(() => {});

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      userId: user.id,
      storeId: store.id,
      role: user.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      userId: user.id,
      storeId: store.id,
      role: user.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'merchant', user.id, refreshJti);

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    // Set CSRF token cookie
    const csrfToken = generateCsrfToken();
    reply.setCookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });

    reply.status(201).send({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        status: store.status,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  });

  // POST /api/v1/merchant/auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Logout as merchant',
      description: 'Revoke the refresh token from Redis and clear both access + refresh cookies',
    },
  }, async (request, reply) => {
    // Attempt to revoke refresh token from Redis
    const signedRefresh = request.cookies.refresh_token;
    if (signedRefresh) {
      const unsignedResult = request.unsignCookie(signedRefresh);
      if (unsignedResult.valid && unsignedResult.value) {
        try {
          const decoded = fastify.jwt.verify<MerchantJwtPayload>(unsignedResult.value);
          if (decoded.jti && decoded.userId) {
            await authService.revokeRefreshToken(fastify.redis, 'merchant', decoded.userId, decoded.jti);
          }
        } catch {
          // Token expired or invalid — nothing to revoke in Redis, still clear cookies
        }
      }
    }

    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });
    return { success: true };
  });

  // POST /api/v1/merchant/auth/refresh
  fastify.post('/refresh', {
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Refresh merchant tokens',
      description: 'Exchange a valid refresh token for new access + refresh tokens (rotation)',
    },
  }, async (request, reply) => {
    const signedRefresh = request.cookies.refresh_token;
    if (!signedRefresh) {
      fastify.log.info('Refresh: no refresh_token cookie found');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Missing refresh token' });
      return;
    }

    const unsignedResult = request.unsignCookie(signedRefresh);
    if (!unsignedResult.valid || !unsignedResult.value) {
      fastify.log.warn('Refresh: invalid refresh token signature');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid refresh token signature' });
      return;
    }
    const rawRefresh = unsignedResult.value;

    let decoded: MerchantJwtPayload;
    try {
      decoded = fastify.jwt.verify<MerchantJwtPayload>(rawRefresh);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message, name: e.name }, 'Refresh: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.userId) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid token type' });
      return;
    }

    // Check Redis — if key doesn't exist, token was revoked
    const isValid = await authService.verifyRefreshToken(fastify.redis, 'merchant', decoded.userId, decoded.jti);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Refresh token revoked' });
      return;
    }

    // Verify store is active before rotating tokens
    const store = await storeService.findById(decoded.storeId);
    if (checkStoreActive(reply, store)) return;

    // Rotate: revoke old, issue new
    const newPayload = await authService.refreshMerchantToken(
      fastify.redis,
      decoded.jti,
      decoded.userId,
      decoded.storeId,
      decoded.role,
    );

    const accessJti = crypto.randomUUID();
    const refreshJti = newPayload.jti;

    const accessToken = await reply.jwtSign({
      userId: newPayload.userId,
      storeId: newPayload.storeId,
      role: newPayload.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      userId: newPayload.userId,
      storeId: newPayload.storeId,
      role: newPayload.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    return { success: true };
  });

  // GET /api/v1/merchant/auth/me
  fastify.get('/me', {
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Get current merchant user',
      description: 'Retrieve the currently authenticated merchant user profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const currentUser = await authService.getMerchantUser(request.userId);
    const store = await storeService.findById(currentUser.storeId);

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
      },
      store: {
        id: store?.id ?? currentUser.storeId,
        name: store?.name ?? null,
        status: store?.status ?? 'unknown',
      },
    };
  });

  // ─── Email Verification ───

  // POST /api/v1/merchant/auth/verify-email
  fastify.post('/verify-email', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Verify merchant email',
      description: 'Verify a merchant email address using the token sent via email',
    },
  }, async (request) => {
    const { token } = verifyEmailSchema.parse(request.body);
    const result = await authService.verifyEmail(token);
    return { success: true, ...result };
  });

  // POST /api/v1/merchant/auth/forgot-password
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Request password reset',
      description: 'Request a password reset token sent to the merchant email',
    },
  }, async (request) => {
    const { email } = emailSchema.parse(request.body);
    const result = await authService.requestPasswordReset(email, undefined, 'merchant');
    // Queue reset email if user was found (don't reveal if email exists)
    if (result.token) {
      await fastify.emailService.sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `<p>Click the link below to reset your password:</p><p><a href="${env.STOREFRONT_URL}/reset-password?token=${result.token}">Reset your password</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
        text: `Reset your password: ${env.STOREFRONT_URL}/reset-password?token=${result.token}`,
      });
    }
    return { success: true, message: 'If an account with that email exists, a reset link has been sent' };
  });

  // POST /api/v1/merchant/auth/reset-password
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Reset password',
      description: 'Reset merchant password using the token from the reset email',
    },
  }, async (request) => {
    const { token, password } = resetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(token, password);
    return { success: true, ...result };
  });

  // ─── MFA Endpoints ───

  // POST /api/v1/merchant/auth/verify-mfa
  fastify.post('/verify-mfa', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Verify MFA code',
      description: 'Submit email MFA code to complete login and receive access + refresh cookies',
    },
  }, async (request, reply) => {
    const { mfaToken, code } = verifyMfaSchema.parse(request.body);

    let decoded: { userId: string; storeId: string; role: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { userId: string; storeId: string; role: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA verify: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired. Please log in again.' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'merchant') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const isValid = await authService.verifyMfaCode(fastify.redis, 'merchant', decoded.userId, code);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid or expired verification code' });
      return;
    }

    const store = await storeService.findById(decoded.storeId);
    if (checkStoreActive(reply, store)) return;
    const activeStore = store!;

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      userId: decoded.userId,
      storeId: decoded.storeId,
      role: decoded.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      userId: decoded.userId,
      storeId: decoded.storeId,
      role: decoded.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'merchant', decoded.userId, refreshJti);

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    const csrfToken = generateCsrfToken();
    reply.setCookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: REFRESH_MAX_AGE,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: decoded.userId,
        email: '',
        role: decoded.role,
      },
      store: {
        id: activeStore.id,
        name: activeStore.name,
        status: activeStore.status,
      },
    };
  });

  // POST /api/v1/merchant/auth/mfa/resend
  fastify.post('/mfa/resend', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Resend MFA code',
      description: 'Resend the email MFA code using an existing mfaToken',
    },
  }, async (request, reply) => {
    const { mfaToken } = z.strictObject({ mfaToken: z.string().min(1) }).parse(request.body);

    let decoded: { userId: string; email: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { userId: string; email: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA resend: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'merchant') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const user = await authService.getMerchantUser(decoded.userId);
    const code = await authService.generateMfaCode(fastify.redis, 'merchant', decoded.userId);
    await fastify.emailService.sendEmail({
      to: user.email,
      subject: 'Your verification code',
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
      text: `Your verification code is: ${code}. This code expires in 5 minutes.`,
    });

    return { success: true, message: 'Verification code resent' };
  });

  // POST /api/v1/merchant/auth/mfa/enable
  fastify.post('/mfa/enable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Enable MFA',
      description: 'Enable email-based MFA for the current merchant user',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const userId = request.userId!;
    const { password } = enableMfaSchema.parse(request.body);

    const user = await authService.getMerchantUser(userId);
    const valid = await authService.verifyPassword(password, user.password);
    if (!valid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid password' });
      return;
    }

    await authService.enableMerchantMfa(userId);
    return { success: true, message: 'MFA enabled' };
  });

  // POST /api/v1/merchant/auth/mfa/disable
  fastify.post('/mfa/disable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Merchant Auth'],
      summary: 'Disable MFA',
      description: 'Disable email-based MFA for the current merchant user',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const userId = request.userId!;
    await authService.disableMerchantMfa(userId);
    return { success: true, message: 'MFA disabled' };
  });
}