import { _ as derived, w as escape_html, y as ensure_array_like } from "../../../../../../../chunks/vendor.js";
import { t as ProductCard } from "../../../../../../../chunks/ProductCard.js";
//#region src/lib/themes/brio/routes/menu/[slug]/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const category = derived(() => data.category || {});
		const products = derived(() => data.products || []);
		const storeSlug = derived(() => data.slug || data.store?.domain || "");
		$$renderer.push(`<section class="py-16 px-4" style="background-color: #ffffff;"><div class="max-w-6xl mx-auto"><h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">${escape_html(String(category().nameEn || category().name || "Menu"))}</h1> `);
		if (products().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-sm" style="color: #666666;">No items in this category.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"><!--[-->`);
			const each_array = ensure_array_like(products());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let product = each_array[$$index];
				ProductCard($$renderer, {
					id: String(product.id || ""),
					name: String(product.name || product.titleEn || product.title || ""),
					description: String(product.description || product.descriptionEn || ""),
					price: Number(product.price || product.salePrice || 0),
					image: String(product.image || product.images?.[0] || ""),
					isVegetarian: Boolean(product.isVegetarian),
					storeSlug: storeSlug()
				});
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div></section>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/menu/[catId]/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}
//#endregion
export { _page as default };
