const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

export interface ApiError {
  error?: string;
  message?: string;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getRefreshUrl(path: string): string | null {
  if (path.startsWith('/admin')) return `${API_BASE}/admin/auth/refresh`;
  if (path.startsWith('/merchant')) return `${API_BASE}/merchant/auth/refresh`;
  return null;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(path: string): Promise<boolean> {
  const refreshUrl = getRefreshUrl(path);
  if (!refreshUrl) return false;

  const csrfToken = getCookie('csrf_token');
  try {
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function refreshToken(path: string): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise!;
  }
  isRefreshing = true;
  refreshPromise = doRefresh(path).finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers as Record<string, string>);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Forward CSRF token on mutating requests
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(options.method || '')) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const makeRequest = () =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

  let res = await makeRequest();

  // On 401, try token refresh once and retry
  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshed = await refreshToken(path);
    if (refreshed) {
      res = await makeRequest();
    }
  }

  if (!res.ok) {
    let error: ApiError;
    const contentType = res.headers.get('content-type');
    const hasJsonBody = contentType && contentType.includes('application/json');
    if (hasJsonBody) {
      error = await res.json().catch(() => ({
        error: 'Unknown Error',
        message: `Request failed with status ${res.status}`,
      }));
    } else {
      error = {
        error: 'Request Failed',
        message: `Request failed with status ${res.status}`,
      };
    }
    // Redirect to login on 401 Unauthorized (session expired and refresh failed)
    if (res.status === 401 && typeof window !== 'undefined') {
      const loginPath = path.startsWith('/admin') ? '/admin-login' : '/login';
      window.location.href = loginPath;
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
    const error: ApiError = await res.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));
    throw error;
  }

  return res.json();
}