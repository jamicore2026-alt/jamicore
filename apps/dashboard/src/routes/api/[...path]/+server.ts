import type { RequestHandler } from './$types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

function buildCookieHeader(cookies: { getAll: () => Array<{ name: string; value: string }> }): string {
	return cookies.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
}

async function proxy(request: Request, cookies: { getAll: () => Array<{ name: string; value: string }> }, method: string, path: string): Promise<Response> {
	const url = new URL(request.url);
	const target = `${API_BASE}/api/v1/${path}${url.search}`;

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
	const setCookies = res.headers.getSetCookie?.() || [];
	for (const sc of setCookies) {
		// Strip Secure flag so cookies work over HTTP
		const cleaned = sc.replace(/;\s*Secure/gi, '');
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
