// SuperAdmin Auth Routes - Login, Logout, Refresh
import { FastifyInstance } from 'fastify';
import { loginSchema } from './auth.schema.js';
import { authService } from './auth.service.js';
import { ErrorCodes } from '../../errors/codes.js';
import type { SuperAdminJwtPayload } from './auth.types.js';

const ACCESS_MAX_AGE = 15 * 60;          // 15 minutes in seconds
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

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
    const rawRefresh = request.cookies.refresh_token;
    if (rawRefresh) {
      try {
        const decoded = fastify.jwt.verify<SuperAdminJwtPayload>(rawRefresh);
        if (decoded.jti && decoded.superAdminId) {
          await authService.revokeRefreshToken(fastify.redis, 'admin', decoded.superAdminId, decoded.jti);
        }
      } catch {
        // Token expired or invalid — nothing to revoke in Redis, still clear cookies
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
    const rawRefresh = request.cookies.refresh_token;
    if (!rawRefresh) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Missing refresh token' });
      return;
    }

    let decoded: SuperAdminJwtPayload;
    try {
      decoded = fastify.jwt.verify<SuperAdminJwtPayload>(rawRefresh);
    } catch {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid or expired refresh token' });
      return;
    }

    if (decoded.type !== 'refresh' || !decoded.jti || !decoded.superAdminId) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Invalid token type' });
      return;
    }

    const isValid = await authService.verifyRefreshToken(fastify.redis, 'admin', decoded.superAdminId, decoded.jti);
    if (!isValid) {
      reply.status(401).send({ error: 'Unauthorized', code: 'INVALID_CREDENTIALS', message: 'Refresh token revoked' });
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
        },
      };
    } catch (err: any) {
      if (err.code === ErrorCodes.ADMIN_NOT_FOUND) {
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
    const body = request.body as { currentPassword: string; newPassword: string };
    try {
      await authService.changeSuperAdminPassword(adminId, body.currentPassword, body.newPassword);
      return { success: true };
    } catch (err: any) {
      if (err.code === ErrorCodes.INVALID_CREDENTIALS) {
        reply.status(401).send({ error: 'Unauthorized', code: ErrorCodes.INVALID_CREDENTIALS, message: err.message });
        return;
      }
      throw err;
    }
  });
}