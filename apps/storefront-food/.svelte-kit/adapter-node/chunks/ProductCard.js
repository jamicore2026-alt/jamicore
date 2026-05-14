import { S as attr, _ as derived, w as escape_html } from "./vendor.js";
//#region src/lib/themes/brio/components/ProductCard.svelte
function ProductCard($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id, name, description = "", price, image = "", isVegetarian = false, storeSlug = "" } = $$props;
		const href = derived(() => storeSlug ? `/store/${storeSlug}/brio/product/${id}` : `/menu/${id}`);
		$$renderer.push(`<div class="bg-white border overflow-hidden transition-all hover:shadow-lg" style="border-color: #e5e5e5; border-radius: 4px;"><a${attr("href", href())} class="block relative aspect-video" style="background-color: #f5f5f5;">`);
		if (image) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<img${attr("src", image)}${attr("alt", name)} class="w-full h-full object-cover"/>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>`);
		}
		$$renderer.push(`<!--]--> `);
		if (isVegetarian) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="absolute top-2 left-2 text-xs px-2 py-0.5 font-medium" style="background-color: #e8f5e9; color: #1a4d2e; border-radius: 4px;">Veg</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></a> <div class="p-4"><a${attr("href", href())}><h3 class="font-semibold text-base mb-1 hover:text-[#1a4d2e] transition-colors" style="color: #1a1a1a;">${escape_html(name)}</h3></a> `);
		if (description) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-sm line-clamp-2 mb-3" style="color: #666666;">${escape_html(description)}</p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="flex items-center justify-between"><span class="font-bold text-lg" style="color: #1a1a1a;">$${escape_html(price.toFixed(2))}</span> <a${attr("href", href())} class="inline-block px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">View</a></div></div></div>`);
	});
}
//#endregion
export { ProductCard as t };
