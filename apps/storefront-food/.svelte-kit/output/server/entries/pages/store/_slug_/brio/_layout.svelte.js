import { S as attr, _ as derived, b as spread_props, w as escape_html, y as ensure_array_like } from "../../../../../chunks/vendor.js";
import { t as Icon } from "../../../../../chunks/Icon.js";
import { t as Shopping_cart } from "../../../../../chunks/shopping-cart.js";
//#region ../../node_modules/.pnpm/@lucide+svelte@1.8.0_svelte_2dd9845444152a6a7689c428c508bbaa/node_modules/@lucide/svelte/dist/icons/menu.svelte
function Menu($$renderer, $$props) {
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
		{ name: "menu" },
		props,
		{ iconNode: [
			["path", { "d": "M4 5h16" }],
			["path", { "d": "M4 12h16" }],
			["path", { "d": "M4 19h16" }]
		] }
	]));
}
//#endregion
//#region src/lib/themes/brio/components/Header.svelte
function Header($$renderer, $$props) {
	let { storeName = "Brio", storeSlug = "", cartCount = 0 } = $$props;
	const basePath = derived(() => storeSlug ? `/store/${storeSlug}/brio` : "");
	const navLinks = derived(() => [
		{
			label: "Home",
			href: basePath() || "/"
		},
		{
			label: "Explore Menu",
			href: `${basePath()}/menu`
		},
		{
			label: "Contact Us",
			href: `${basePath()}/contact`
		}
	]);
	$$renderer.push(`<header class="sticky top-0 z-50 bg-white border-b" style="border-color: #e5e5e5;"><div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"><a${attr("href", basePath() || "/")} class="flex items-center gap-2"><span class="text-xl font-bold" style="color: #1a4d2e;">${escape_html(storeName)}</span></a> <nav class="hidden md:flex items-center gap-6"><!--[-->`);
	const each_array = ensure_array_like(navLinks());
	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let link = each_array[$$index];
		$$renderer.push(`<a${attr("href", link.href)} class="text-sm font-medium transition-colors hover:text-[#1a4d2e]" style="color: #1a1a1a;">${escape_html(link.label)}</a>`);
	}
	$$renderer.push(`<!--]--></nav> <div class="flex items-center gap-3"><a${attr("href", `${basePath()}/cart`)} class="relative p-2 rounded-full transition-colors hover:bg-[#e8f5e9]">`);
	Shopping_cart($$renderer, {
		class: "w-5 h-5",
		style: "color: #1a4d2e;"
	});
	$$renderer.push(`<!----> `);
	if (cartCount > 0) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span class="absolute -top-1 -right-1 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style="background-color: #1a4d2e;">${escape_html(cartCount)}</span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></a> <button class="md:hidden p-2 rounded-full transition-colors hover:bg-[#e8f5e9]" aria-label="Toggle menu">`);
	$$renderer.push("<!--[-1-->");
	Menu($$renderer, {
		class: "w-5 h-5",
		style: "color: #1a4d2e;"
	});
	$$renderer.push(`<!--]--></button></div></div> `);
	$$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></header>`);
}
//#endregion
//#region src/lib/themes/brio/components/Footer.svelte
function Footer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { storeName = "Brio" } = $$props;
		$$renderer.push(`<footer class="py-10" style="background-color: #1a4d2e; color: #ffffff;"><div class="max-w-6xl mx-auto px-4 text-center"><h3 class="text-xl font-bold mb-2">${escape_html(storeName)}</h3> <p class="text-sm mb-4" style="color: rgba(255,255,255,0.8);">Fresh food, served with love</p> <p class="text-xs" style="color: rgba(255,255,255,0.6);">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} ${escape_html(storeName)}. All rights reserved.</p></div></footer>`);
	});
}
//#endregion
//#region src/lib/themes/brio/routes/+layout.svelte
function _layout$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data, children } = $$props;
		let cartCount = 0;
		const storeSlug = derived(() => data.slug || data.store?.domain || "");
		$$renderer.push(`<div class="min-h-screen bg-white text-neutral-900">`);
		Header($$renderer, {
			storeName: data.store?.name,
			storeSlug: storeSlug(),
			cartCount
		});
		$$renderer.push(`<!----> <main>`);
		children($$renderer);
		$$renderer.push(`<!----></main> `);
		Footer($$renderer, { storeName: data.store?.name });
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/+layout.svelte
function _layout($$renderer, $$props) {
	let { data, children } = $$props;
	_layout$1($$renderer, {
		data,
		children: ($$renderer) => {
			children($$renderer);
			$$renderer.push(`<!---->`);
		},
		$$slots: { default: true }
	});
}
//#endregion
export { _layout as default };
