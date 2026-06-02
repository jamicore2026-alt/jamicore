// SuperAdmin Auth Routes - Login, Logout, Refresh
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { loginSchema, verifyMfaSchema, enableMfaSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import { env } from '../../config/env.js';
import { cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from '../../lib/auth-cookies.js';
import { generateCsrfToken } from '../../lib/csrf.js';
import type { SuperAdminJwtPayload } from './auth.types.js';

const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  }),
});

export default async function superAdminAuthRoutes(fastify: FastifyInstance) {
  // POST /api/v1/admin/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Login as super admin',
      description: 'Authenticate a super admin user with email and password to receive httpOnly access + refresh cookies',
    },
  }, async (request, reply) => {
    const parsed = loginSchema.parse(request.body);

    const admin = await authService.verifySuperAdminCredentials(parsed.email, parsed.password);

    // Update last login
    await authService.updateSuperAdminLastLogin(admin.id);

    // MFA required: send code and return temporary token
    if (admin.mfaEnabled) {
      const code = await authService.generateMfaCode(fastify.redis, 'admin', admin.id);
      await fastify.emailService.sendEmail({
        to: admin.email,
        subject: 'Your verification code',
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
        text: `Your verification code is: ${code}. This code expires in 5 minutes.`,
      });

      const mfaJti = crypto.randomUUID();
      const mfaToken = await reply.jwtSign({
        superAdminId: admin.id,
        role: 'superAdmin',
        scope: 'admin',
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
      superAdminId: admin.id,
      role: 'superAdmin',
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      superAdminId: admin.id,
      role: 'superAdmin',
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'admin', admin.id, refreshJti);

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
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  });

  // POST /api/v1/admin/auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Logout as super admin',
      description: 'Revoke the refresh token from Redis and clear both access + refresh cookies',
    },
  }, async (request, reply) => {
    const signedRefresh = request.cookies.refresh_token;
    if (signedRefresh) {
      const unsignedResult = request.unsignCookie(signedRefresh);
      if (unsignedResult.valid && unsignedResult.value) {
        try {
          const decoded = fastify.jwt.verify<SuperAdminJwtPayload>(unsignedResult.value);
          if (decoded.jti && decoded.superAdminId) {
            await authService.revokeRefreshToken(fastify.redis, 'admin', decoded.superAdminId, decoded.jti);
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

  // POST /api/v1/admin/auth/refresh
  fastify.post('/refresh', {
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Refresh admin tokens',
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

    let decoded: SuperAdminJwtPayload;
    try {
      decoded = fastify.jwt.verify<SuperAdminJwtPayload>(rawRefresh);
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message, name: e.name }, 'Admin refresh: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.superAdminId) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid token type' });
      return;
    }

    const isValid = await authService.verifyRefreshToken(fastify.redis, 'admin', decoded.superAdminId, decoded.jti);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Refresh token revoked' });
      return;
    }

    const newPayload = await authService.refreshAdminToken(
      fastify.redis,
      decoded.jti,
      decoded.superAdminId,
      decoded.role,
    );

    const accessJti = crypto.randomUUID();
    const refreshJti = newPayload.jti;

    const accessToken = await reply.jwtSign({
      superAdminId: newPayload.superAdminId,
      role: newPayload.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      superAdminId: newPayload.superAdminId,
      role: newPayload.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    reply.setCookie('access_token', accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
    reply.setCookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });

    return { success: true };
  });

  // GET /api/v1/admin/auth/me
  fastify.get('/me', {
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Get current super admin',
      description: 'Retrieve the currently authenticated super admin profile',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const adminId = request.superAdminId!;

    try {
      const admin = await authService.getSuperAdminProfile(adminId);
      return {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          isActive: admin.isActive,
          lastLoginAt: admin.lastLoginAt,
        },
      };
    } catch (err: unknown) {
      const typedErr = err as { code?: string };
      if (typedErr.code === ErrorCodes.ADMIN_NOT_FOUND) {
        reply.status(404).send({ error: 'Not Found', code: ErrorCodes.ADMIN_NOT_FOUND, message: 'Admin not found' });
        return;
      }
      throw err;
    }
  });

  // PATCH /api/v1/admin/auth/password - Change super admin password
  fastify.patch('/password', {
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Change password',
      description: 'Change the current super admin password',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const adminId = request.superAdminId!;
    const body = changePasswordSchema.parse(request.body);
    try {
      await authService.changeSuperAdminPassword(adminId, body.currentPassword, body.newPassword);
      return { success: true };
    } catch (err: unknown) {
      const typedErr = err as { code?: string; message?: string };
      if (typedErr.code === ErrorCodes.INVALID_CREDENTIALS) {
        reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: typedErr.message });
        return;
      }
      throw err;
    }
  });

  // ─── MFA Endpoints ───

  // POST /api/v1/admin/auth/verify-mfa
  fastify.post('/verify-mfa', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Verify MFA code',
      description: 'Submit email MFA code to complete login and receive access + refresh cookies',
    },
  }, async (request, reply) => {
    const { mfaToken, code } = verifyMfaSchema.parse(request.body);

    let decoded: { superAdminId: string; role: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { superAdminId: string; role: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA verify: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired. Please log in again.' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'admin') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const isValid = await authService.verifyMfaCode(fastify.redis, 'admin', decoded.superAdminId, code);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid or expired verification code' });
      return;
    }

    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const accessToken = await reply.jwtSign({
      superAdminId: decoded.superAdminId,
      role: decoded.role,
      jti: accessJti,
      type: 'access',
    });

    const refreshToken = await reply.jwtSign({
      superAdminId: decoded.superAdminId,
      role: decoded.role,
      jti: refreshJti,
      type: 'refresh',
    }, { expiresIn: '7d' });

    await authService.storeRefreshToken(fastify.redis, 'admin', decoded.superAdminId, refreshJti);

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
      admin: {
        id: decoded.superAdminId,
        email: '',
        name: '',
      },
    };
  });

  // POST /api/v1/admin/auth/mfa/resend
  fastify.post('/mfa/resend', {
    config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Resend MFA code',
      description: 'Resend the email MFA code using an existing mfaToken',
    },
  }, async (request, reply) => {
    const { mfaToken } = z.strictObject({ mfaToken: z.string().min(1) }).parse(request.body);

    let decoded: { superAdminId: string; email: string; scope: string; type: string };
    try {
      decoded = fastify.jwt.verify(mfaToken) as { superAdminId: string; email: string; scope: string; type: string };
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      fastify.log.warn({ error: e.message }, 'MFA resend: JWT verification failed');
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_EXPIRED, message: 'MFA session expired' });
      return;
    }

    if (decoded.type !== 'mfa_pending' || decoded.scope !== 'admin') {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.MFA_CODE_INVALID, message: 'Invalid MFA token' });
      return;
    }

    const admin = await authService.getSuperAdminProfile(decoded.superAdminId);
    const newCode = await authService.generateMfaCode(fastify.redis, 'admin', decoded.superAdminId);
    await fastify.emailService.sendEmail({
      to: admin.email,
      subject: 'Your verification code',
      html: `<p>Your verification code is: <strong>${newCode}</strong></p><p>This code expires in 5 minutes.</p>`,
      text: `Your verification code is: ${newCode}. This code expires in 5 minutes.`,
    });

    return { success: true, message: 'Verification code resent' };
  });

  // POST /api/v1/admin/auth/mfa/enable
  fastify.post('/mfa/enable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Enable MFA',
      description: 'Enable email-based MFA for the current super admin',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const adminId = request.superAdminId!;
    const { password } = enableMfaSchema.parse(request.body);

    const admin = await authService.getSuperAdminProfile(adminId);
    const valid = await authService.verifyPassword(password, admin.password);
    if (!valid) {
      reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: 'Invalid password' });
      return;
    }

    await authService.enableSuperAdminMfa(adminId);
    return { success: true, message: 'MFA enabled' };
  });

  // POST /api/v1/admin/auth/mfa/disable
  fastify.post('/mfa/disable', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['SuperAdmin Auth'],
      summary: 'Disable MFA',
      description: 'Disable email-based MFA for the current super admin',
      security: [{ cookieAuth: [] }],
    },
  }, async (request) => {
    const adminId = request.superAdminId!;
    await authService.disableSuperAdminMfa(adminId);
    return { success: true, message: 'MFA disabled' };
  });
}
