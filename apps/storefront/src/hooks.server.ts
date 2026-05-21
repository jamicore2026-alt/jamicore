import type { Handle } from '@sveltejs/kit';
import { safeDecodeJWT, isTokenExpired, getAuthScope } from '@repo/shared-utils/jwt';
import { env } from '$lib/config/env.js';

const API_BASE = env.API_BASE_URL;

export const handle: Handle = async ({ event, resolve }) => {
  // Ensure CSRF cookie exists for all sessions
  let csrfToken = event.cookies.get('csrf_token');
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
    event.cookies.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'strict',
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
      // Try to refresh the token
      try {
        const csrfToken = event.cookies.get('csrf_token');
        const refreshResponse = await fetch(`${API_BASE}/api/v1/customer/auth/refresh`, {
          method: 'POST',
          headers: {
            Cookie: `refresh_token=${event.cookies.get('refresh_token')}`,
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
        });

        if (refreshResponse.ok) {
          // Forward new cookies
          const setCookies = refreshResponse.headers.getSetCookie();
          for (const cookie of setCookies) {
            const parts = cookie.split(';');
            const eqIdx = parts[0].indexOf('=');
            const name = parts[0].substring(0, eqIdx).trim();
            const value = parts[0].substring(eqIdx + 1).trim();
            const options: { path: string; httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' | boolean; maxAge?: number; expires?: Date } = { path: '/' };
            for (const part of parts.slice(1)) {
              const trimmed = part.trim();
              if (!trimmed) continue;
              const partEqIdx = trimmed.indexOf('=');
              const key = partEqIdx >= 0 ? trimmed.substring(0, partEqIdx).trim() : trimmed;
              const val = partEqIdx >= 0 ? trimmed.substring(partEqIdx + 1).trim() : '';
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'httponly') options.httpOnly = true;
              else if (lowerKey === 'secure') options.secure = true;
              else if (lowerKey === 'samesite') {
                const v = val.toLowerCase();
                if (v === 'strict' || v === 'lax' || v === 'none') options.sameSite = v;
              }
              else if (lowerKey === 'max-age') options.maxAge = parseInt(val, 10);
              else if (lowerKey === 'expires') options.expires = new Date(val);
            }
            event.cookies.set(name, decodeURIComponent(value), options);
          }
        } else {
          // Refresh failed — clear auth cookies
          event.cookies.delete('access_token', { path: '/' });
          event.cookies.delete('refresh_token', { path: '/' });
        }
      } catch {
        // Refresh request failed — continue without refreshing
      }
    }

    // Set locals for auth state
    if (payload) {
      const scope = getAuthScope(payload);
      if (scope === 'customer' && 'customerId' in payload) {
        event.locals.customerId = payload.customerId;
        event.locals.storeId = payload.storeId;
      }
    }
  }

  const response = await resolve(event);

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
  );
  if (env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
};
