import { S as attr, _ as derived, w as escape_html, y as ensure_array_like } from "../../../../../../chunks/vendor.js";
//#region src/lib/themes/brio/components/CategoryCard.svelte
function CategoryCard($$renderer, $$props) {
	let { name, image = "", productCount, storeSlug = "", slug = "", icon = "" } = $$props;
	const href = derived(() => storeSlug && slug ? `/store/${storeSlug}/brio/menu/${slug}` : `/menu/${slug}`);
	$$renderer.push(`<a${attr("href", href())} class="block bg-white border transition-all hover:shadow-lg" style="border-color: #e5e5e5; border-radius: 4px;"><div class="aspect-[4/3] overflow-hidden" style="background-color: #f5f5f5;">`);
	if (image) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<img${attr("src", image)}${attr("alt", name)} class="w-full h-full object-cover"/>`);
	} else if (icon) {
		$$renderer.push("<!--[1-->");
		$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-4xl">${escape_html(icon)}</div>`);
	} else {
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>`);
	}
	$$renderer.push(`<!--]--></div> <div class="p-4"><h3 class="font-semibold text-base mb-1" style="color: #1a1a1a;">${escape_html(name)}</h3> <p class="text-sm" style="color: #666666;">${escape_html(productCount)} ${escape_html(productCount === 1 ? "item" : "items")}</p></div></a>`);
}
//#endregion
//#region src/lib/themes/brio/routes/menu/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const categories = derived(() => data.categories || []);
		const storeSlug = derived(() => data.slug || data.store?.domain || "");
		$$renderer.push(`<section class="py-16 px-4" style="background-color: #ffffff;"><div class="max-w-6xl mx-auto"><h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">Our Menu</h1> `);
		if (categories().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-sm" style="color: #666666;">No categories available.</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"><!--[-->`);
			const each_array = ensure_array_like(categories());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let category = each_array[$$index];
				CategoryCard($$renderer, {
					name: String(category.nameEn || category.name || ""),
					image: String(category.image || ""),
					productCount: Number(category.productCount || 0),
					storeSlug: storeSlug(),
					slug: String(category.slug || category.id || ""),
					icon: String(category.icon || "")
				});
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div></section>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/menu/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}
//#endregion
export { _page as default };
