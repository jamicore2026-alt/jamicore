export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
  domain?: string;
}

interface SvelteKitCookies {
  set(name: string, value: string, options: CookieOptions): void;
  get(name: string): string | undefined;
  delete(name: string, options?: { path?: string }): void;
}

/**
 * Parse a Set-Cookie header string into its components.
 */
function parseSetCookie(header: string): {
  name: string;
  value: string;
  options: CookieOptions;
} {
  const parts = header.split(';').map((s) => s.trim());
  const [nameValue, ...attrs] = parts;
  const eqIdx = nameValue.indexOf('=');
  const name = nameValue.substring(0, eqIdx);
  const value = nameValue.substring(eqIdx + 1);

  const options: CookieOptions = {
    path: '/',
    sameSite: 'strict',
    httpOnly: false,
    secure: false,
  };

  for (const attr of attrs) {
    const [key, ...rest] = attr.split('=');
    const val = rest.join('=');
    switch (key.toLowerCase()) {
      case 'httponly':
        options.httpOnly = true;
        break;
      case 'secure':
        options.secure = true;
        break;
      case 'samesite':
        options.sameSite = val.toLowerCase() as CookieOptions['sameSite'];
        break;
      case 'path':
        options.path = val;
        break;
      case 'max-age':
        options.maxAge = parseInt(val, 10);
        break;
      case 'domain':
        options.domain = val;
        break;
    }
  }

  return { name, value, options };
}

/**
 * Forward Set-Cookie headers from a backend response to the SvelteKit response.
 *
 * When the SvelteKit BFF proxies a request to the backend, the backend's
 * Set-Cookie headers do NOT automatically reach the browser. This helper
 * parses them and re-sends via SvelteKit's cookie API.
 */
export function forwardCookies(
  backendResponse: Response,
  cookies: SvelteKitCookies,
): void {
  const setCookieHeaders = backendResponse.headers.getSetCookie();
  for (const header of setCookieHeaders) {
    const { name, value, options } = parseSetCookie(header);
    options.secure = false;
    // Decode the value because cookie.serialize() (used by both Fastify and SvelteKit)
    // URL-encodes it. parseSetCookie reads the already-encoded header value, so we must
    // decode before passing to cookies.set() to avoid double-encoding which corrupts
    // signed cookie signatures (e.g., + becomes %2B, then %252B after double-encode).
    cookies.set(name, decodeURIComponent(value), options);
  }
}

/**
 * Clear auth cookies (access_token + refresh_token).
 */
export function clearAuthCookies(cookies: SvelteKitCookies): void {
  cookies.delete('access_token', { path: '/' });
  cookies.delete('refresh_token', { path: '/' });
}
