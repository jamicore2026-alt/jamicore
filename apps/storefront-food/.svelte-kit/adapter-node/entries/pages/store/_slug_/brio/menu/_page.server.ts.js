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
//#endregion
export { load };
