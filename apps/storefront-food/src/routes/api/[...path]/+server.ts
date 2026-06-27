import type { RequestHandler } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

function buildCookieHeader(cookies: { getAll: () => Array<{ name: string; value: string }> }): string {
  return cookies.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

async function proxy(request: Request, cookies: { getAll: () => Array<{ name: string; value: string }> }, method: string, path: string): Promise<Response> {
  const url = new URL(request.url);
  const cleanPath = path.replace(/^v1\//, '').replace(/(?:^|\/)\.\.(?:\/|$)/g, '');
  const target = `${API_BASE}/api/v1/${cleanPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const res = await fetch(target, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
  });

  // Forward Set-Cookie headers from backend to browser
  const responseHeaders = new Headers(res.headers);
  responseHeaders.delete('Set-Cookie');
  const setCookies = res.headers.getSetCookie?.() || [];
  // F1: in production keep the backend's Secure flag so auth cookies are only
  // sent over HTTPS (mitigates MITM interception of the JWT). In development
  // the BFF serves over http://localhost, where a Secure cookie would be
  // rejected by the browser — strip Secure there only.
  const stripSecure = process.env.NODE_ENV !== 'production';
  for (const sc of setCookies) {
    const cleaned = stripSecure ? sc.replace(/;\s*Secure/gi, '') : sc;
    responseHeaders.append('Set-Cookie', cleaned);
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export const GET: RequestHandler = async ({ request, params, cookies }) => {
  return proxy(request, cookies, 'GET', params.path);
};

export const POST: RequestHandler = async ({ request, params, cookies }) => {
  return proxy(request, cookies, 'POST', params.path);
};

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
  return proxy(request, cookies, 'PATCH', params.path);
};

export const PUT: RequestHandler = async ({ request, params, cookies }) => {
  return proxy(request, cookies, 'PUT', params.path);
};

export const DELETE: RequestHandler = async ({ request, params, cookies }) => {
  return proxy(request, cookies, 'DELETE', params.path);
};