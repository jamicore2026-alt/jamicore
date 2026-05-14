//#region src/routes/store/[slug]/brio/menu/+page.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ params, fetch }) => {
	const { slug } = params;
	let categories = [];
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/categories?limit=50`, { headers: { "X-Store-Domain": slug } });
		if (res.ok) categories = (await res.json()).categories || [];
	} catch {}
	return { categories };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-CJ1lbRpR.js')).default;
const server_id = "src/routes/store/[slug]/brio/menu/+page.server.ts";
const imports = ["_app/immutable/nodes/12.VLh1mdmU.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=12-DIEEwy9D.js.map
