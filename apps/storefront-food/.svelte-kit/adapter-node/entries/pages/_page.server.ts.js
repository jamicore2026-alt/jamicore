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
//#endregion
export { load };
