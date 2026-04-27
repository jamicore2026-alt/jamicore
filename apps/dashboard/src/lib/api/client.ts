const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers as Record<string, string>);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Forward CSRF token on mutating requests
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(options.method || '')) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));
    // Redirect to login on 401 Unauthorized (session expired)
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      return undefined as T;
    }
    throw error;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function serverApiFetch<T>(
  path: string,
  options: ApiOptions = {},
  cookie?: string,
  csrfToken?: string,
): Promise<T> {
  const API_SERVER_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
  const headers = new Headers(options.headers as Record<string, string>);
  headers.set('Content-Type', 'application/json');
  if (cookie) headers.set('Cookie', cookie);
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);

  const res = await fetch(`${API_SERVER_BASE}${path}`, {
    ...options,
    headers,
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