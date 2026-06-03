// Customer MFA routes — verify-mfa, mfa/resend, mfa/enable, mfa/disable
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyMfaSchema, enableMfaSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from '../../lib/auth-cookies.js';
import { generateCsrfToken } from '../../lib/csrf.js';
import { env } from '../../config/env.js';

export default async function mfaRoutes(fastify: FastifyInstance) {
  // POST /api/v1/customer/auth/verify-mfa
  fastify.post('/verify-mfa', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Verify MFA code',
      description: 'Submit email MFA code to complete login and receive access + refresh cookies',
    },
  }, async (request, reply) => {
    const { mfaToken, code } = verifyMfaSchema.parse(request.body);

    let decoded: { customerId: string; storeId: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { customerId: string; storeId: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA verify: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired. Please log in again.' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'customer') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const isValid = await authService.verifyMfaCode(fastify.redis, 'customer', decoded.customerId, code);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid or expired verification code' });
      return;
    }

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      customerId: decoded.customerId,
      storeId: decoded.storeId,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      customerId: decoded.customerId,
      storeId: decoded.storeId,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'customer', decoded.customerId, refreshJti);

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
      customer: {
        id: decoded.customerId,
        email: '',
        firstName: '',
        lastName: '',
      },
    };
  });

  // POST /api/v1/customer/auth/mfa/resend
  fastify.post('/mfa/resend', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Resend MFA code',
      description: 'Resend the email MFA code using an existing mfaToken',
    },
  }, async (request, reply) => {
    const { mfaToken } = z.strictObject({ mfaToken: z.string().min(1) }).parse(request.body);

    let decoded: { customerId: string; email: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { customerId: string; email: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA resend: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'customer') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const customer = await authService.getCustomerProfile(decoded.customerId);
    const newCode = await authService.generateMfaCode(fastify.redis, 'customer', decoded.customerId);
    await fastify.emailService.sendEmail({
      to: customer.email,
      subject: 'Your verification code',
      html: `<p>Your verification code is: <strong>${newCode}</strong></p><p>This code expires in 5 minutes.</p>`,
      text: `Your verification code is: ${newCode}. This code expires in 5 minutes.`,
    });

    return { success: true, message: 'Verification code resent' };
  });

  // POST /api/v1/customer/auth/mfa/enable
  fastify.post('/mfa/enable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Enable MFA',
      description: 'Enable email-based MFA for the current customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const customerId = request.customerId!;
    const { password } = enableMfaSchema.parse(request.body);

    const customer = await authService.getCustomerProfile(customerId);
    try {
      await authService.verifyCustomerCredentials(customer.email, password, customer.storeId);
    } catch {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid password' });
      return;
    }

    await authService.enableCustomerMfa(customerId);
    return { success: true, message: 'MFA enabled' };
  });

  // POST /api/v1/customer/auth/mfa/disable
  fastify.post('/mfa/disable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['Customer Auth'],
      summary: 'Disable MFA',
      description: 'Disable email-based MFA for the current customer',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const customerId = request.customerId!;
    await authService.disableCustomerMfa(customerId);
    return { success: true, message: 'MFA disabled' };
  });
}
