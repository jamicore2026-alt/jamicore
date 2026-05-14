//#region src/routes/store/[slug]/brio/+page.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ params, fetch, url }) => {
	const { slug } = params;
	const host = url.hostname;
	const storeDomain = host.split(".")[0] !== "localhost" ? host.split(".")[0] : slug;
	let store = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/store`, { headers: { "X-Store-Domain": storeDomain } });
		if (res.ok) {
			const data = await res.json();
			store = data.store ?? data;
		}
	} catch {}
	let theme = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/theme`);
		if (res.ok) theme = (await res.json()).theme;
	} catch {}
	let categories = [];
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/categories`);
		if (res.ok) categories = (await res.json()).categories || [];
	} catch {}
	let featuredProducts = [];
	if (theme?.featuredProductIds?.length > 0) try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/products?ids=${theme.featuredProductIds.join(",")}`);
		if (res.ok) featuredProducts = (await res.json()).products || [];
	} catch {}
	return {
		store,
		theme: theme || {},
		categories,
		featuredProducts
	};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CnEnEI75.js')).default;
const server_id = "src/routes/store/[slug]/brio/+page.server.ts";
const imports = ["_app/immutable/nodes/8.B75pzVTF.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/DrLpmv6O.js","_app/immutable/chunks/DeYjleqT.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/KbyBEkFH.js","_app/immutable/chunks/BEwP5wNp.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-GdvgGUUr.js.map
