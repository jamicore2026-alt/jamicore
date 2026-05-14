//#region src/routes/store/[slug]/brio/product/[prodId]/+page.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ params, fetch }) => {
	const { slug, prodId } = params;
	let store = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/store`, { headers: { "X-Store-Domain": slug } });
		if (res.ok) {
			const data = await res.json();
			store = data.store ?? data;
		}
	} catch {}
	let item = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${slug}/products/${prodId}`);
		if (res.ok) item = (await res.json()).product;
	} catch {}
	return {
		store,
		item
	};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 14;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-RhQLLMN-.js')).default;
const server_id = "src/routes/store/[slug]/brio/product/[prodId]/+page.server.ts";
const imports = ["_app/immutable/nodes/14.CTlzBt90.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/DemLrGmB.js","_app/immutable/chunks/BShPHrbv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-Dv1d8xn_.js.map
