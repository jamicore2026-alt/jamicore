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
//#endregion
export { load };
