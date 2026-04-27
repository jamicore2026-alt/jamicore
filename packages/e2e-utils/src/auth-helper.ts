import { API_BASE_URL, DEFAULT_STORE_DOMAIN } from './test-data.js';

export type AuthRole = 'customer' | 'merchant' | 'admin';

interface LoginResponse {
  success?: boolean;
  message?: string;
}

/**
 * Log in via API and return the raw Set-Cookie header string(s).
 * Customer login requires the store domain in the Host header.
 */
export async function loginViaApi(
  role: AuthRole,
  email: string,
  password: string,
): Promise<string[]> {
  let endpoint: string;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (role === 'customer') {
    endpoint = `${API_BASE_URL}/api/v1/customer/auth/login`;
    headers.Host = DEFAULT_STORE_DOMAIN;
    headers['X-Store-Domain'] = DEFAULT_STORE_DOMAIN;
  } else if (role === 'merchant') {
    endpoint = `${API_BASE_URL}/api/v1/merchant/auth/login`;
  } else {
    endpoint = `${API_BASE_URL}/api/v1/admin/auth/login`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Login failed (${res.status}): ${body.message || body.error || 'Unknown error'}`);
  }

  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie')?.split(', ') ?? [];
  return setCookie;
}

/**
 * Parse cookie strings into Playwright-compatible cookie objects.
 * @param setCookieHeaders - Raw Set-Cookie header strings
 * @param defaultUrl - Optional URL to attach when domain is absent (required by Playwright)
 */
export function parseCookies(
  setCookieHeaders: string[],
  defaultUrl?: string,
): Array<{
  name: string;
  value: string;
  domain?: string;
  path?: string;
  url?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}> {
  return setCookieHeaders.map((header) => {
    const parts = header.split(';').map((p) => p.trim());
    const [nameValue] = parts;
    const eqIdx = nameValue.indexOf('=');
    const name = nameValue.substring(0, eqIdx);
    const value = nameValue.substring(eqIdx + 1);

    const cookie: ReturnType<typeof parseCookies>[number] = {
      name,
      value,
      path: '/',
    };

    for (const part of parts.slice(1)) {
      const lower = part.toLowerCase();
      if (lower === 'httponly') cookie.httpOnly = true;
      if (lower === 'secure') cookie.secure = true;
      if (lower.startsWith('samesite=')) {
        cookie.sameSite = part.split('=')[1] as 'Strict' | 'Lax' | 'None';
      }
      if (lower.startsWith('path=')) {
        cookie.path = part.split('=')[1];
      }
      if (lower.startsWith('domain=')) {
        cookie.domain = part.split('=')[1];
      }
    }

    if (defaultUrl) {
      try {
        const u = new URL(defaultUrl);
        cookie.domain = u.hostname;
      } catch {
        // ignore invalid URL
      }
    }

    return cookie;
  });
}
