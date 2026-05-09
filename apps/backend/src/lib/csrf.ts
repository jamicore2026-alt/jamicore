// CSRF token generation and validation utilities
import crypto from 'node:crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCodes } from '../errors/codes.js';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** Generate a new cryptographically random CSRF token */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64');
}

/** Set the CSRF token cookie (httpOnly: false so JS can read it, sameSite: strict) */
export function setCsrfCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

/** Paths exempt from CSRF validation (auth endpoints and safe methods are handled separately) */
function isCsrfExemptPath(url: string): boolean {
  const exemptSuffixes = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
  ];
  for (const suffix of exemptSuffixes) {
    if (url.endsWith(suffix)) return true;
  }
  // Staff invitation accept/reject (no auth)
  if (url.includes('/staff/invitations/')) return true;
  return false;
}

/** Validate CSRF token for mutating requests. Returns true if valid or exempt. */
export function validateCsrf(request: FastifyRequest, reply: FastifyReply): boolean {
  // Safe methods never require CSRF validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  if (isCsrfExemptPath(request.url)) {
    return true;
  }

  const cookieToken = request.cookies[CSRF_COOKIE_NAME];
  const headerToken = request.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    reply.status(403).send({
      error: 'Forbidden',
      code: ErrorCodes.PERMISSION_DENIED,
      message: 'Invalid or missing CSRF token',
    });
    return false;
  }

  return true;
}
