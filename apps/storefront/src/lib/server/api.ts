const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const DEFAULT_STORE_DOMAIN = process.env.DEFAULT_STORE_DOMAIN || 'techgear';

/**
 * Server-side fetch wrapper that proxies requests to the backend API.
 * Automatically injects the Host header for multi-tenant store resolution.
 * Uses `redirect: 'manual'` so Set-Cookie headers are preserved.
 * Forwards CSRF token on mutating requests.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  host?: string,
  csrfToken?: string,
): Promise<Response> {
  const headers = new Headers(options.headers as Record<string, string>);
  // Node.js fetch strips custom Host headers; use X-Store-Domain instead
  if (host) {
    const domain = host.split(':')[0];
    const parts = domain.split('.');
    const subdomain = parts.length > 1 ? parts[0] : domain;
    if (subdomain && subdomain !== 'localhost' && subdomain !== '127') {
      headers.set('X-Store-Domain', subdomain);
    } else if (subdomain === 'localhost' || subdomain === '127') {
      // Development fallback: use default store domain
      headers.set('X-Store-Domain', DEFAULT_STORE_DOMAIN);
    }
  }
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });
}