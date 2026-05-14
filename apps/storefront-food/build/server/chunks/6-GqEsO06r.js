//#region src/routes/menu/+page.server.ts
var load = async ({ url, fetch }) => {
	const subdomain = url.hostname.split(".")[0];
	const storeDomain = subdomain !== "localhost" && subdomain !== "127" ? subdomain : "techgear";
	const category = url.searchParams.get("category");
	const search = url.searchParams.get("search");
	try {
		const params = new URLSearchParams({ limit: "50" });
		if (category) params.set("categoryId", category);
		if (search) params.set("q", search);
		const [productsRes, categoriesRes] = await Promise.all([fetch(`http://localhost:3000/api/v1/public/products?${params}`, { headers: { "X-Store-Domain": storeDomain } }), fetch(`http://localhost:3000/api/v1/public/categories?limit=50`, { headers: { "X-Store-Domain": storeDomain } })]);
		const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
		const categoriesData = categoriesRes.ok ? await categoriesRes.json() : { categories: [] };
		return {
			items: productsData.products || [],
			categories: categoriesData.categories || [],
			category,
			search
		};
	} catch {
		return {
			items: [],
			categories: [],
			category,
			search
		};
	}
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-DQHKpOFh.js')).default;
const server_id = "src/routes/menu/+page.server.ts";
const imports = ["_app/immutable/nodes/6.B5vKkK0Y.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/Jf-R4JZ3.js","_app/immutable/chunks/BShPHrbv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-GqEsO06r.js.map
