import { API_BASE_URL, DEFAULT_STORE_DOMAIN } from './test-data.js';

export class ApiClient {
  private cookies: string[] = [];
  private role: 'customer' | 'merchant' | 'admin' | null = null;
  private csrfToken: string | null = null;

  constructor(role?: 'customer' | 'merchant' | 'admin') {
    if (role) this.role = role;
  }

  setCookies(cookies: string[]) {
    this.cookies = cookies;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.cookies.length > 0) {
      headers.Cookie = this.cookies.join('; ');
    }
    if (this.role === 'customer') {
      headers.Host = DEFAULT_STORE_DOMAIN;
    }
    return headers;
  }

  async login(email: string, password: string): Promise<void> {
    if (!this.role) {
      throw new Error('Role must be set before logging in');
    }

    let endpoint: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.role === 'customer') {
      endpoint = `${API_BASE_URL}/api/v1/customer/auth/login`;
      headers.Host = DEFAULT_STORE_DOMAIN;
      headers['X-Store-Domain'] = DEFAULT_STORE_DOMAIN;
    } else if (this.role === 'merchant') {
      endpoint = `${API_BASE_URL}/api/v1/merchant/auth/login`;
    } else {
      endpoint = `${API_BASE_URL}/api/v1/admin/auth/login`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
      redirect: 'manual',
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `Login failed (${response.status}): ${body.message || body.error || 'Unknown error'}`,
      );
    }

    const setCookie =
      response.headers.getSetCookie?.() ??
      response.headers.get('set-cookie')?.split(', ') ??
      [];
    this.cookies = setCookie;

    const csrfMatch = setCookie.find((c) => c.includes('csrf_token='));
    if (csrfMatch) {
      this.csrfToken = csrfMatch.split('csrf_token=')[1].split(';')[0];
    }
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const headers = this.getHeaders();
    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const headers = this.getHeaders();
    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async delete<T>(path: string): Promise<T> {
    const headers = this.getHeaders();
    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }
}
