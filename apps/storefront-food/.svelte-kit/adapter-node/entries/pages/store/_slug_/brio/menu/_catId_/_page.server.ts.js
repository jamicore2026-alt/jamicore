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
//#endregion
export { load };
