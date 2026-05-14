import { S as attr, _ as derived, b as spread_props, m as attr_class, w as escape_html, x as stringify, y as ensure_array_like } from "../../../../chunks/vendor.js";
import { t as Icon } from "../../../../chunks/Icon.js";
import { n as Minus, t as Plus } from "../../../../chunks/plus.js";
//#region ../../node_modules/.pnpm/@lucide+svelte@1.8.0_svelte_2dd9845444152a6a7689c428c508bbaa/node_modules/@lucide/svelte/dist/icons/arrow-left.svelte
function Arrow_left($$renderer, $$props) {
	/**
	* @license @lucide/svelte v1.8.0 - ISC
	*
	* ISC License
	*
	* Copyright (c) 2026 Lucide Icons and Contributors
	*
	* Permission to use, copy, modify, and/or distribute this software for any
	* purpose with or without fee is hereby granted, provided that the above
	* copyright notice and this permission notice appear in all copies.
	*
	* THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
	* WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
	* MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
	* ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
	* WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
	* ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
	* OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
	*
	* ---
	*
	* The following Lucide icons are derived from the Feather project:
	*
	* airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out
	*
	* The MIT License (MIT) (for the icons listed above)
	*
	* Copyright (c) 2013-present Cole Bemis
	*
	* Permission is hereby granted, free of charge, to any person obtaining a copy
	* of this software and associated documentation files (the "Software"), to deal
	* in the Software without restriction, including without limitation the rights
	* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	* copies of the Software, and to permit persons to whom the Software is
	* furnished to do so, subject to the following conditions:
	*
	* The above copyright notice and this permission notice shall be included in all
	* copies or substantial portions of the Software.
	*
	* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	* SOFTWARE.
	*
	*/
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "arrow-left" },
		props,
		{ iconNode: [["path", { "d": "m12 19-7-7 7-7" }], ["path", { "d": "M19 12H5" }]] }
	]));
}
//#endregion
//#region src/routes/menu/[id]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const item = derived(() => data.item);
		let qty = 1;
		let selectedSize = "regular";
		let selectedSpice = "medium";
		let instructions = "";
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
			},
			{
				id: "extra-hot",
				label: "Extra Hot"
			}
		];
		const basePrice = derived(() => Number(item()?.salePrice || 0));
		const sizeModifier = derived(() => sizes.find((s) => s.id === selectedSize)?.priceModifier || 0);
		const totalPrice = derived(() => (basePrice() + sizeModifier()) * qty);
		if (!item()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16"><p class="text-neutral-500">Item not found</p> <a href="/menu" class="text-orange-600 hover:underline mt-2 inline-block">Back to menu</a></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="max-w-2xl mx-auto"><button class="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-4">`);
			Arrow_left($$renderer, { class: "w-4 h-4" });
			$$renderer.push(`<!----> Back</button> <div class="bg-white rounded-2xl border overflow-hidden"><div class="aspect-video bg-neutral-100">`);
			if (item().images?.[0]) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<img${attr("src", item().images[0])}${attr("alt", item().titleEn)} class="w-full h-full object-cover"/>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-6xl">🍽️</div>`);
			}
			$$renderer.push(`<!--]--></div> <div class="p-6 space-y-6"><div><h1 class="text-2xl font-bold">${escape_html(item().titleEn)}</h1> <p class="text-neutral-500 mt-1">${escape_html(item().descriptionEn || "")}</p></div> <div><label class="text-sm font-medium mb-2 block">Size</label> <div class="flex gap-2"><!--[-->`);
			const each_array = ensure_array_like(sizes);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let size = each_array[$$index];
				$$renderer.push(`<button${attr_class(`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${stringify(selectedSize === size.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 hover:border-neutral-300")}`)}>${escape_html(size.label)} `);
				if (size.priceModifier !== 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="text-xs ml-1">${escape_html(size.priceModifier > 0 ? "+" : "")}$${escape_html(size.priceModifier)}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></button>`);
			}
			$$renderer.push(`<!--]--></div></div> <div><label class="text-sm font-medium mb-2 block">Spice Level</label> <div class="flex gap-2"><!--[-->`);
			const each_array_1 = ensure_array_like(spiceLevels);
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let spice = each_array_1[$$index_1];
				$$renderer.push(`<button${attr_class(`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${stringify(selectedSpice === spice.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 hover:border-neutral-300")}`)}>${escape_html(spice.label)}</button>`);
			}
			$$renderer.push(`<!--]--></div></div> <div><label class="text-sm font-medium mb-2 block">Special Instructions</label> <textarea placeholder="e.g., No onions, extra sauce..." class="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none"${attr("rows", 2)}>`);
			const $$body = escape_html(instructions);
			if ($$body) $$renderer.push(`${$$body}`);
			$$renderer.push(`</textarea></div> <div class="flex items-center gap-4 pt-4 border-t"><div class="flex items-center gap-3"><button class="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors">`);
			Minus($$renderer, { class: "w-4 h-4" });
			$$renderer.push(`<!----></button> <span class="w-8 text-center font-semibold">${escape_html(qty)}</span> <button class="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 transition-colors">`);
			Plus($$renderer, { class: "w-4 h-4" });
			$$renderer.push(`<!----></button></div> <button class="flex-1 bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 active:scale-95 transition-all">Add to Cart - $${escape_html(totalPrice().toFixed(2))}</button></div></div></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
