//#region ../../packages/shared-utils/src/jwt.ts
function addBase64Padding(base64url) {
	const padLen = 4 - base64url.length % 4;
	return padLen === 4 ? base64url : base64url + "=".repeat(padLen);
}
/**
* Decode JWT payload without verification.
* The backend already verified the token — we just need the claims.
*
* Handles signed cookies: Fastify's @fastify/cookie plugin may sign cookies,
* creating 4+ dot-separated parts. We extract only the first 3 parts
* (header.payload.signature) for decoding.
*/
function decodeJWTPayload(token) {
	const parts = (token.includes(".s:") ? token.split(".s:")[0] : token).split(".");
	if (parts.length < 3) throw new Error("Invalid JWT format");
	const payloadPart = parts[1];
	const base64 = addBase64Padding(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
	const decoded = atob(base64);
	return JSON.parse(decoded);
}
/**
* Safely decode a JWT, returning null on failure.
*/
function safeDecodeJWT(token) {
	if (!token) return null;
	try {
		return decodeJWTPayload(token);
	} catch {
		return null;
	}
}
/**
* Determine the auth scope from a JWT payload.
*/
function getAuthScope(payload) {
	if ("superAdminId" in payload) return "superadmin";
	if ("customerId" in payload) return "customer";
	if ("userId" in payload) return "merchant";
	return null;
}
//#endregion
//#region src/routes/+layout.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ cookies, url, fetch }) => {
	const subdomain = url.hostname.split(".")[0];
	const storeDomain = subdomain !== "localhost" && subdomain !== "127" ? subdomain : void 0;
	let store = null;
	if (storeDomain) try {
		const res = await fetch(`${API_BASE}/api/v1/public/store`, { headers: { "X-Store-Domain": storeDomain } });
		if (res.ok) {
			const data = await res.json();
			store = data.store ?? data;
		}
	} catch {}
	const payload = safeDecodeJWT(cookies.get("access_token"));
	const isLoggedIn = (payload ? getAuthScope(payload) : null) === "customer";
	return {
		store,
		isLoggedIn
	};
};
//#endregion
export { load };
