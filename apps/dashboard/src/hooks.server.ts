import type { Handle } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope } from '@repo/shared-utils/jwt';
import { env } from '$lib/config/env.js';

const API_BASE = env.API_BASE_URL;

function getRefreshUrl(scope: 'merchant' | 'admin'): string {
  return scope === 'admin'
    ? `${API_BASE}/api/v1/admin/auth/refresh`
    : `${API_BASE}/api/v1/merchant/auth/refresh`;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Ensure CSRF cookie exists for all sessions
  let csrfToken = event.cookies.get('csrf_token');
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
    event.cookies.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  event.locals.csrfToken = csrfToken;

  const accessToken = event.cookies.get('access_token');

  if (accessToken) {
    // SECURITY WARNING: safeDecodeJWT does NOT verify the signature.
    // The decoded payload is advisory ONLY for UI state (e.g., showing logged-in user).
    // ALL authorization decisions MUST be made by the backend API.
    const payload = safeDecodeJWT(accessToken);

    if (payload && isTokenExpired(payload)) {
      const scope = getAuthScope(payload);
      if (scope === 'merchant' || scope === 'superadmin') {
        try {
          const refreshUrl = getRefreshUrl(scope === 'superadmin' ? 'admin' : 'merchant');
          const csrfToken = event.cookies.get('csrf_token');
          const refreshResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
              Cookie: `refresh_token=${event.cookies.get('refresh_token')}`,
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            },
          });

          if (refreshResponse.ok) {
            const setCookies = refreshResponse.headers.getSetCookie();
            for (const cookie of setCookies) {
              const [nameValue] = cookie.split(';');
              const eqIdx = nameValue.indexOf('=');
              const name = nameValue.substring(0, eqIdx).trim();
              const value = nameValue.substring(eqIdx + 1).trim();
              event.cookies.set(name, value, {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: env.NODE_ENV === 'production',
                maxAge: 60 * 15,
              });
            }
          } else {
            event.cookies.delete('access_token', { path: '/' });
            event.cookies.delete('refresh_token', { path: '/' });
          }
        } catch {
          // Refresh failed — continue
        }
      }
    }

    if (payload) {
      const scope = getAuthScope(payload);
      if (scope === 'merchant' && 'userId' in payload) {
        event.locals.userId = payload.userId;
        event.locals.storeId = payload.storeId;
        event.locals.userRole = payload.role;
      } else if (scope === 'superadmin' && 'superAdminId' in payload) {
        event.locals.superAdminId = payload.superAdminId;
      }
    }
  }

  const response = await resolve(event);

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
};

export const handleError = ({ error, event: _event }) => {
  const isDev = env.NODE_ENV !== 'production';
  if (isDev) {
    console.error('Server error:', error);
  } else {
    // In production, log minimal info to avoid leaking PII or secrets
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server error:', msg);
  }
  return {
    message: 'An unexpected error occurred',
  };
};