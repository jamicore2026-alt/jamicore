import { a as attr, e as escape_html, b as ensure_array_like, g as attr_style, f as stringify$1, d as derived } from './vendor-CQD3gsfc.js';
import { M as Minus, P as Plus } from './plus-C_bpn3wB.js';
import 'clsx';
import './Icon-D2L9p4nl.js';

//#region src/lib/themes/brio/routes/product/[slug]/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const product = derived(() => data.product);
		let qty = 1;
		let selectedSize = "regular";
		let selectedSpice = "medium";
		const sizes = [
			{
				id: "small",
				label: "Small",
				priceModifier: -2
			},
			{
				id: "regular",
				label: "Regular",
				priceModifier: 0
			},
			{
				id: "large",
				label: "Large",
				priceModifier: 3
			}
		];
		const spiceLevels = [
			{
				id: "mild",
				label: "Mild"
			},
			{
				id: "medium",
				label: "Medium"
			},
			{
				id: "hot",
				label: "Hot"
			}
		];
		const basePrice = derived(() => Number(product()?.price || product()?.salePrice || 0));
		const sizeModifier = derived(() => sizes.find((s) => s.id === selectedSize)?.priceModifier || 0);
		const totalPrice = derived(() => (basePrice() + sizeModifier()) * qty);
		if (!product()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16"><p class="text-sm" style="color: #666666;">Product not found</p> <a href="/menu" class="text-sm font-medium hover:text-[#1a4d2e] transition-colors mt-2 inline-block" style="color: #1a4d2e;">Back to menu</a></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="max-w-2xl mx-auto py-8 px-4"><div class="bg-white border overflow-hidden" style="border-color: #e5e5e5; border-radius: 4px;"><div class="aspect-video" style="background-color: #f5f5f5;">`);
			if (product().images?.[0] || product().image) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<img${attr("src", String(product().images?.[0] || product().image))}${attr("alt", String(product().name || ""))} class="w-full h-full object-cover"/>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-6xl">🍽️</div>`);
			}
			$$renderer.push(`<!--]--></div> <div class="p-6 space-y-6"><div><h1 class="text-2xl font-bold" style="color: #1a1a1a;">${escape_html(String(product().name || product().titleEn || product().title || ""))}</h1> <p class="text-sm mt-1" style="color: #666666;">${escape_html(String(product().description || product().descriptionEn || ""))}</p></div> <div><p class="text-sm font-medium mb-2 block" style="color: #1a1a1a;">Size</p> <div class="flex gap-2"><!--[-->`);
			const each_array = ensure_array_like(sizes);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let size = each_array[$$index];
				$$renderer.push(`<button class="flex-1 py-2 px-3 border text-sm font-medium transition-colors"${attr_style(`border-color: ${stringify$1(selectedSize === size.id ? "#1a4d2e" : "#e5e5e5")}; background-color: ${stringify$1(selectedSize === size.id ? "#e8f5e9" : "#ffffff")}; color: ${stringify$1(selectedSize === size.id ? "#1a4d2e" : "#1a1a1a")}; border-radius: 4px;`)}>${escape_html(size.label)} `);
				if (size.priceModifier !== 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="text-xs ml-1">${escape_html(size.priceModifier > 0 ? "+" : "")}$${escape_html(size.priceModifier)}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></button>`);
			}
			$$renderer.push(`<!--]--></div></div> <div><p class="text-sm font-medium mb-2 block" style="color: #1a1a1a;">Spice Level</p> <div class="flex gap-2"><!--[-->`);
			const each_array_1 = ensure_array_like(spiceLevels);
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let spice = each_array_1[$$index_1];
				$$renderer.push(`<button class="flex-1 py-2 px-3 border text-sm font-medium transition-colors"${attr_style(`border-color: ${stringify$1(selectedSpice === spice.id ? "#1a4d2e" : "#e5e5e5")}; background-color: ${stringify$1(selectedSpice === spice.id ? "#e8f5e9" : "#ffffff")}; color: ${stringify$1(selectedSpice === spice.id ? "#1a4d2e" : "#1a1a1a")}; border-radius: 4px;`)}>${escape_html(spice.label)}</button>`);
			}
			$$renderer.push(`<!--]--></div></div> <div class="flex items-center gap-4 pt-4" style="border-top: 1px solid #e5e5e5;"><div class="flex items-center gap-2"><button class="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]" style="border: 1px solid #e5e5e5; border-radius: 4px;" aria-label="Decrease quantity">`);
			Minus($$renderer, {
				class: "w-4 h-4",
				style: "color: #1a1a1a;"
			});
			$$renderer.push(`<!----></button> <span class="w-6 text-center text-sm font-medium" style="color: #1a1a1a;">${escape_html(qty)}</span> <button class="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]" style="border: 1px solid #e5e5e5; border-radius: 4px;" aria-label="Increase quantity">`);
			Plus($$renderer, {
				class: "w-4 h-4",
				style: "color: #1a1a1a;"
			});
			$$renderer.push(`<!----></button></div> <button class="flex-1 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">Add to Cart - $${escape_html(totalPrice().toFixed(2))}</button></div></div></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/product/[prodId]/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-RhQLLMN-.js.map
