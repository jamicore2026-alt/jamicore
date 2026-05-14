import { S as attr, _ as derived, w as escape_html, y as ensure_array_like } from "../../../../../../chunks/vendor.js";
import { n as Minus, t as Plus } from "../../../../../../chunks/plus.js";
import { t as Trash_2 } from "../../../../../../chunks/trash-2.js";
//#region src/lib/themes/brio/components/CartItem.svelte
function CartItem($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { title, price, qty, image = "", variants = [], instructions = "", onUpdateQty, onRemove } = $$props;
		const lineTotal = derived(() => price * qty);
		$$renderer.push(`<div class="p-4 flex gap-4" style="border-bottom: 1px solid #e5e5e5;"><div class="w-20 h-20 flex-shrink-0 overflow-hidden" style="background-color: #f5f5f5; border-radius: 4px;">`);
		if (image) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<img${attr("src", image)}${attr("alt", title)} class="w-full h-full object-cover"/>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>`);
		}
		$$renderer.push(`<!--]--></div> <div class="flex-1 min-w-0"><h3 class="font-semibold truncate text-base" style="color: #1a1a1a;">${escape_html(title)}</h3> `);
		if (variants.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-xs mt-0.5 truncate" style="color: #666666;">${escape_html(variants.map((v) => `${v.name}: ${v.value}`).join(", "))}</p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (instructions) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<p class="text-xs mt-0.5 truncate" style="color: #666666;">Note: ${escape_html(instructions)}</p>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="flex items-center justify-between mt-3"><div class="flex items-center gap-2"><button class="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]" style="border: 1px solid #e5e5e5; border-radius: 4px;" aria-label="Decrease quantity">`);
		Minus($$renderer, {
			class: "w-3 h-3",
			style: "color: #1a1a1a;"
		});
		$$renderer.push(`<!----></button> <span class="w-6 text-center text-sm font-medium" style="color: #1a1a1a;">${escape_html(qty)}</span> <button class="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[#e8f5e9]" style="border: 1px solid #e5e5e5; border-radius: 4px;" aria-label="Increase quantity">`);
		Plus($$renderer, {
			class: "w-3 h-3",
			style: "color: #1a1a1a;"
		});
		$$renderer.push(`<!----></button></div> <div class="flex items-center gap-3"><span class="font-semibold" style="color: #1a1a1a;">$${escape_html(lineTotal().toFixed(2))}</span> <button class="p-1 transition-colors" style="color: #666666;" aria-label="Remove item">`);
		Trash_2($$renderer, { class: "w-4 h-4" });
		$$renderer.push(`<!----></button></div></div></div></div>`);
	});
}
//#endregion
//#region src/lib/themes/brio/components/CartSummary.svelte
function CartSummary($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { subtotal } = $$props;
		$$renderer.push(`<div class="bg-white border p-4" style="border-color: #e5e5e5; border-radius: 4px;"><h3 class="font-semibold text-base mb-4" style="color: #1a1a1a;">Order Summary</h3> <div class="flex items-center justify-between text-sm mb-2"><span style="color: #666666;">Subtotal</span> <span class="font-medium" style="color: #1a1a1a;">$${escape_html(subtotal.toFixed(2))}</span></div> <div class="flex items-center justify-between text-sm pt-3 mt-3" style="border-top: 1px solid #e5e5e5;"><span class="font-semibold" style="color: #1a1a1a;">Total</span> <span class="font-bold text-lg" style="color: #1a1a1a;">$${escape_html(subtotal.toFixed(2))}</span></div></div>`);
	});
}
//#endregion
//#region src/lib/themes/brio/routes/cart/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data = {} } = $$props;
		const storeSlug = derived(() => String(data.slug || data.store?.domain || ""));
		derived(() => storeSlug() ? `/store/${storeSlug()}/brio/menu` : "/menu");
		let cartItems = [];
		function updateQty(index, delta) {
			const item = cartItems[index];
			if (!item) return;
			item.qty = Math.max(0, item.qty + delta);
			if (item.qty === 0) cartItems = cartItems.filter((_, i) => i !== index);
			saveCart();
		}
		function removeItem(index) {
			cartItems = cartItems.filter((_, i) => i !== index);
			saveCart();
		}
		function saveCart() {
			localStorage.setItem("food-cart", JSON.stringify(cartItems));
			window.dispatchEvent(new CustomEvent("cart-updated"));
		}
		const subtotal = derived(() => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0));
		$$renderer.push(`<div class="max-w-2xl mx-auto py-8 px-4"><h1 class="text-2xl font-bold mb-6" style="color: #1a1a1a;">Your Cart</h1> `);
		if (cartItems.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16 bg-white border" style="border-color: #e5e5e5; border-radius: 4px;"><p class="text-lg font-medium" style="color: #666666;">Your cart is empty</p> <p class="text-sm mt-1" style="color: #666666;">Add some delicious food to get started</p> <button class="mt-4 px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">Browse Menu</button></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="space-y-4"><div class="bg-white border overflow-hidden" style="border-color: #e5e5e5; border-radius: 4px;"><!--[-->`);
			const each_array = ensure_array_like(cartItems);
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let item = each_array[i];
				CartItem($$renderer, {
					title: item.title,
					price: item.price,
					qty: item.qty,
					image: item.image,
					variants: item.variants,
					instructions: item.instructions,
					onUpdateQty: (delta) => updateQty(i, delta),
					onRemove: () => removeItem(i)
				});
			}
			$$renderer.push(`<!--]--></div> `);
			CartSummary($$renderer, { subtotal: subtotal() });
			$$renderer.push(`<!----> <button class="w-full py-3 text-sm font-semibold text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">Proceed to Checkout</button></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/cart/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}
//#endregion
export { _page as default };
