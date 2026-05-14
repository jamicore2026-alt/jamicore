import { S as attr, _ as derived, w as escape_html, y as ensure_array_like } from "../../../chunks/vendor.js";
import { t as Shopping_cart } from "../../../chunks/shopping-cart.js";
import { n as Minus, t as Plus } from "../../../chunks/plus.js";
import { t as Trash_2 } from "../../../chunks/trash-2.js";
//#region src/routes/cart/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let cartItems = [];
		const subtotal = derived(() => cartItems.reduce((sum, item) => sum + Number(item.price) * item.qty, 0));
		const deliveryFee = derived(() => subtotal() > 25 ? 0 : 3.99);
		const total = derived(() => subtotal() + deliveryFee());
		$$renderer.push(`<div class="max-w-2xl mx-auto"><h1 class="text-2xl font-bold mb-6">Your Cart</h1> `);
		if (cartItems.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16 bg-white rounded-2xl border">`);
			Shopping_cart($$renderer, { class: "w-16 h-16 mx-auto mb-4 text-neutral-300" });
			$$renderer.push(`<!----> <p class="text-lg font-medium text-neutral-500">Your cart is empty</p> <p class="text-sm text-neutral-400 mt-1">Add some delicious food to get started</p> <button class="mt-4 bg-orange-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-orange-700 transition-colors">Browse Menu</button></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="space-y-4"><div class="bg-white rounded-2xl border divide-y"><!--[-->`);
			const each_array = ensure_array_like(cartItems);
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let item = each_array[i];
				$$renderer.push(`<div class="p-4 flex gap-4"><div class="w-20 h-20 rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden">`);
				if (item.image) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", item.image)}${attr("alt", item.title)} class="w-full h-full object-cover"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-2xl">🍽️</div>`);
				}
				$$renderer.push(`<!--]--></div> <div class="flex-1 min-w-0"><h3 class="font-semibold truncate">${escape_html(item.title)}</h3> `);
				if (item.variants?.length) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="text-xs text-neutral-500 mt-0.5">${escape_html(item.variants.map((v) => `${v.name}: ${v.value}`).join(", "))}</p>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (item.instructions) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="text-xs text-neutral-400 mt-0.5 truncate">Note: ${escape_html(item.instructions)}</p>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <div class="flex items-center justify-between mt-2"><div class="flex items-center gap-2"><button class="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100">`);
				Minus($$renderer, { class: "w-3 h-3" });
				$$renderer.push(`<!----></button> <span class="w-6 text-center text-sm font-medium">${escape_html(item.qty)}</span> <button class="w-7 h-7 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100">`);
				Plus($$renderer, { class: "w-3 h-3" });
				$$renderer.push(`<!----></button></div> <div class="flex items-center gap-3"><span class="font-semibold">$${escape_html((Number(item.price) * item.qty).toFixed(2))}</span> <button class="text-red-500 hover:text-red-700 p-1">`);
				Trash_2($$renderer, { class: "w-4 h-4" });
				$$renderer.push(`<!----></button></div></div></div></div>`);
			}
			$$renderer.push(`<!--]--></div> <div class="bg-white rounded-2xl border p-4 space-y-2"><div class="flex justify-between text-sm"><span class="text-neutral-500">Subtotal</span> <span>$${escape_html(subtotal().toFixed(2))}</span></div> <div class="flex justify-between text-sm"><span class="text-neutral-500">Delivery</span> <span>${escape_html(deliveryFee() === 0 ? "Free" : `$${deliveryFee().toFixed(2)}`)}</span></div> <div class="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span> <span>$${escape_html(total().toFixed(2))}</span></div></div> <button class="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 active:scale-95 transition-all">Proceed to Checkout</button></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
