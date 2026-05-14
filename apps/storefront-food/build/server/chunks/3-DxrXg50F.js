//#region src/routes/+page.server.ts
var load = async ({ url, fetch }) => {
	const subdomain = url.hostname.split(".")[0];
	const storeDomain = subdomain !== "localhost" && subdomain !== "127" ? subdomain : "techgear";
	try {
		const [categoriesRes, featuredRes] = await Promise.all([fetch(`http://localhost:3000/api/v1/public/categories?limit=20`, { headers: { "X-Store-Domain": storeDomain } }), fetch(`http://localhost:3000/api/v1/public/products?limit=8&isFeatured=true`, { headers: { "X-Store-Domain": storeDomain } })]);
		const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
		const featuredData = featuredRes.ok ? await featuredRes.json() : { products: [] };
		return {
			categories: categoriesData.categories || [],
			featuredItems: featuredData.products || []
		};
	} catch {
		return {
			categories: [],
			featuredItems: []
		};
	}
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BEHyLznx.js')).default;
const server_id = "src/routes/+page.server.ts";
const imports = ["_app/immutable/nodes/3.Bs1L6tc0.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/DeYjleqT.js","_app/immutable/chunks/Jf-R4JZ3.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-DxrXg50F.js.map
