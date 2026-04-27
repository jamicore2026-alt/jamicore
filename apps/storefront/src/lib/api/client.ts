const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  host?: string;
}

export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { host, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers as Record<string, string>);
  headers.set('Content-Type', 'application/json');

  if (host) {
    headers.set('Host', host);
    // Also send X-Store-Domain so backend can resolve store when Host is stripped
    const domain = host.split(':')[0];
    const parts = domain.split('.');
    const subdomain = parts.length > 1 ? parts[0] : domain;
    if (subdomain && subdomain !== 'localhost' && subdomain !== '127') {
      headers.set('X-Store-Domain', subdomain);
    }
  }

  // Forward CSRF token on mutating requests
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(fetchOptions.method || '')) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));
    throw error;
  }

  return res.json();
}