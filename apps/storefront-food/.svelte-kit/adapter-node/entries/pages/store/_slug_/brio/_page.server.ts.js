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
//#endregion
export { load };
