import { a as attr, b as ensure_array_like, e as escape_html, s as spread_props, d as derived } from './vendor-CQD3gsfc.js';
import { I as Icon } from './Icon-D2L9p4nl.js';
import { S as Search } from './search-Bdl6i3FA.js';
import { C as Clock, M as Map_pin } from './map-pin-Dyv78CER.js';
import 'clsx';

//#region ../../node_modules/.pnpm/@lucide+svelte@1.8.0_svelte_2dd9845444152a6a7689c428c508bbaa/node_modules/@lucide/svelte/dist/icons/star.svelte
function Star($$renderer, $$props) {
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
		{ name: "star" },
		props,
		{ iconNode: [["path", { "d": "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" }]] }
	]));
}
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const categories = derived(() => data.categories || []);
		const featuredItems = derived(() => data.featuredItems || []);
		let searchQuery = "";
		$$renderer.push(`<div class="space-y-8"><section class="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-8 text-white overflow-hidden"><div class="relative z-10 max-w-xl"><h1 class="text-3xl md:text-4xl font-bold mb-3">Hungry? We got you covered</h1> <p class="text-orange-100 mb-6">Order delicious food from the best restaurants. Fast delivery, fresh taste.</p> <div class="flex items-center gap-4 text-sm"><div class="flex items-center gap-1">`);
		Clock($$renderer, { class: "w-4 h-4" });
		$$renderer.push(`<!----> <span>30-45 min delivery</span></div> <div class="flex items-center gap-1">`);
		Star($$renderer, { class: "w-4 h-4" });
		$$renderer.push(`<!----> <span>4.8 rating</span></div> <div class="flex items-center gap-1">`);
		Map_pin($$renderer, { class: "w-4 h-4" });
		$$renderer.push(`<!----> <span>Free delivery over $25</span></div></div></div></section> <div class="max-w-xl mx-auto"><form class="relative">`);
		Search($$renderer, { class: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" });
		$$renderer.push(`<!----> <input type="text" placeholder="Search for dishes, cuisines..." class="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"${attr("value", searchQuery)}/></form></div> <section><h2 class="text-xl font-bold mb-4">Browse by Category</h2> `);
		if (categories().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-neutral-500">No categories available</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"><!--[-->`);
			const each_array = ensure_array_like(categories());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let category = each_array[$$index];
				$$renderer.push(`<a${attr("href", `/menu?category=${category.id}`)} class="bg-white rounded-xl p-4 text-center border hover:border-orange-300 hover:shadow-md transition-all group"><div class="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors"><span class="text-xl">${escape_html(category.icon || "🍽️")}</span></div> <p class="font-medium text-sm">${escape_html(category.nameEn || category.name)}</p></a>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></section> <section><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold">Popular Dishes</h2> <a href="/menu" class="text-sm text-orange-600 hover:underline">View all</a></div> `);
		if (featuredItems().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-neutral-500">No dishes available yet</p>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"><!--[-->`);
			const each_array_1 = ensure_array_like(featuredItems());
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let item = each_array_1[$$index_1];
				$$renderer.push(`<div class="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all group"><div class="relative aspect-video bg-neutral-100">`);
				if (item.images?.[0]) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", item.images[0])}${attr("alt", item.titleEn)} class="w-full h-full object-cover"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-4xl">🍕</div>`);
				}
				$$renderer.push(`<!--]--> `);
				if (item.isVegetarian) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="absolute top-2 left-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Veg</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <div class="p-4"><h3 class="font-semibold mb-1">${escape_html(item.titleEn)}</h3> <p class="text-sm text-neutral-500 line-clamp-2 mb-2">${escape_html(item.descriptionEn || "Delicious food")}</p> <div class="flex items-center justify-between"><span class="font-bold text-lg">$${escape_html(Number(item.salePrice).toFixed(2))}</span> <button class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all">Add</button></div></div></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></section></div>`);
	});
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BEHyLznx.js.map
