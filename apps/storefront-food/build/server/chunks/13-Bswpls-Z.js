//#region src/routes/store/[slug]/brio/menu/[catId]/+page.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ params, fetch }) => {
	const { slug, catId } = params;
	let store = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/store`, { headers: { "X-Store-Domain": slug } });
		if (res.ok) {
			const data = await res.json();
			store = data.store ?? data;
		}
	} catch {}
	let category = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/categories/${catId}`);
		if (res.ok) category = (await res.json()).category;
	} catch {}
	let products = [];
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/products?categoryId=${catId}`);
		if (res.ok) products = (await res.json()).products || [];
	} catch {}
	return {
		store,
		category,
		products
	};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 13;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-gL1rS5QH.js')).default;
const server_id = "src/routes/store/[slug]/brio/menu/[catId]/+page.server.ts";
const imports = ["_app/immutable/nodes/13._Ppwjlmc.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BEwP5wNp.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-Bswpls-Z.js.map
