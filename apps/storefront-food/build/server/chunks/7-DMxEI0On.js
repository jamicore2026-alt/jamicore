//#region src/routes/menu/[id]/+page.server.ts
var load = async ({ params, url, fetch }) => {
	const subdomain = url.hostname.split(".")[0];
	const storeDomain = subdomain !== "localhost" && subdomain !== "127" ? subdomain : "techgear";
	try {
		const res = await fetch(`http://localhost:3000/api/v1/public/products/${params.id}`, { headers: { "X-Store-Domain": storeDomain } });
		if (!res.ok) return { item: null };
		const data = await res.json();
		return { item: data.product || data };
	} catch {
		return { item: null };
	}
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-B468_a5d.js')).default;
const server_id = "src/routes/menu/[id]/+page.server.ts";
const imports = ["_app/immutable/nodes/7.BItTlPxj.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/DemLrGmB.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-DMxEI0On.js.map
