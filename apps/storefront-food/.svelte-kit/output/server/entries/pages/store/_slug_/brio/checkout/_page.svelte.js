import { S as attr, _ as derived, h as attr_style, w as escape_html, x as stringify, y as ensure_array_like } from "../../../../../../chunks/vendor.js";
import { n as Clock, t as Map_pin } from "../../../../../../chunks/map-pin.js";
//#region src/lib/themes/brio/routes/checkout/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data = {} } = $$props;
		const storeSlug = derived(() => String(data.slug || data.store?.domain || ""));
		const menuPath = derived(() => storeSlug() ? `/store/${storeSlug()}/brio/menu` : "/menu");
		let cartItems = [];
		let name = "";
		let phone = "";
		let email = "";
		let deliveryType = "delivery";
		let address = "";
		let tableNumber = "";
		let deliveryTime = "asap";
		const subtotal = derived(() => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0));
		$$renderer.push(`<div class="max-w-xl mx-auto py-8 px-4"><h1 class="text-2xl font-bold mb-6" style="color: #1a1a1a;">Checkout</h1> `);
		if (cartItems.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16"><p style="color: #666666;">Your cart is empty</p> <a${attr("href", menuPath())} class="text-sm font-medium hover:text-[#1a4d2e] transition-colors mt-2 inline-block" style="color: #1a4d2e;">Browse Menu</a></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="space-y-6"><div class="bg-white border p-4" style="border-color: #e5e5e5; border-radius: 4px;"><p class="text-sm font-medium mb-3 block" style="color: #1a1a1a;">Delivery Type</p> <div class="flex gap-3"><button class="flex-1 py-3 border text-sm font-medium transition-colors"${attr_style(`border-color: ${stringify(deliveryType === "delivery" ? "#1a4d2e" : "#e5e5e5")}; background-color: ${stringify(deliveryType === "delivery" ? "#e8f5e9" : "#ffffff")}; color: ${stringify(deliveryType === "delivery" ? "#1a4d2e" : "#1a1a1a")}; border-radius: 4px;`)}>`);
			Map_pin($$renderer, { class: "w-4 h-4 mx-auto mb-1" });
			$$renderer.push(`<!----> Delivery</button> <button class="flex-1 py-3 border text-sm font-medium transition-colors"${attr_style(`border-color: ${stringify(deliveryType === "dinein" ? "#1a4d2e" : "#e5e5e5")}; background-color: ${stringify(deliveryType === "dinein" ? "#e8f5e9" : "#ffffff")}; color: ${stringify(deliveryType === "dinein" ? "#1a4d2e" : "#1a1a1a")}; border-radius: 4px;`)}>`);
			Clock($$renderer, { class: "w-4 h-4 mx-auto mb-1" });
			$$renderer.push(`<!----> Dine-in</button></div></div> <div class="bg-white border p-4 space-y-4" style="border-color: #e5e5e5; border-radius: 4px;"><h2 class="font-semibold" style="color: #1a1a1a;">Contact Details</h2> <div class="space-y-3"><div><label class="text-xs font-medium mb-1 block" style="color: #666666;" for="checkout-name">Full Name *</label> <input id="checkout-name"${attr("value", name)} placeholder="John Doe" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"/></div> <div><label class="text-xs font-medium mb-1 block" style="color: #666666;" for="checkout-phone">Phone *</label> <input id="checkout-phone"${attr("value", phone)} placeholder="+1 234 567 890" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"/></div> <div><label class="text-xs font-medium mb-1 block" style="color: #666666;" for="checkout-email">Email</label> <input id="checkout-email" type="email"${attr("value", email)} placeholder="your@email.com" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"/></div> `);
			if (deliveryType === "delivery") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div><label class="text-xs font-medium mb-1 block" style="color: #666666;" for="checkout-address">Delivery Address *</label> <textarea id="checkout-address" placeholder="123 Main St, Apt 4B"${attr("rows", 2)} class="w-full px-3 py-2 text-sm outline-none transition-colors resize-none focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;">`);
				const $$body = escape_html(address);
				if ($$body) $$renderer.push(`${$$body}`);
				$$renderer.push(`</textarea></div>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div><label class="text-xs font-medium mb-1 block" style="color: #666666;" for="checkout-table">Table Number</label> <input id="checkout-table"${attr("value", tableNumber)} placeholder="e.g., 12" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"/></div>`);
			}
			$$renderer.push(`<!--]--></div></div> <div class="bg-white border p-4" style="border-color: #e5e5e5; border-radius: 4px;"><p class="text-sm font-medium mb-3 block" style="color: #1a1a1a;">Delivery Time</p> `);
			$$renderer.select({
				value: deliveryTime,
				class: "w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]",
				style: "border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;"
			}, ($$renderer) => {
				$$renderer.option({ value: "asap" }, ($$renderer) => {
					$$renderer.push(`As soon as possible`);
				});
				$$renderer.option({ value: "30" }, ($$renderer) => {
					$$renderer.push(`In 30 minutes`);
				});
				$$renderer.option({ value: "60" }, ($$renderer) => {
					$$renderer.push(`In 1 hour`);
				});
				$$renderer.option({ value: "90" }, ($$renderer) => {
					$$renderer.push(`In 1.5 hours`);
				});
				$$renderer.option({ value: "120" }, ($$renderer) => {
					$$renderer.push(`In 2 hours`);
				});
			});
			$$renderer.push(`</div> <div class="bg-white border p-4 space-y-2" style="border-color: #e5e5e5; border-radius: 4px;"><h2 class="font-semibold mb-2" style="color: #1a1a1a;">Order Summary</h2> <!--[-->`);
			const each_array = ensure_array_like(cartItems);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];
				$$renderer.push(`<div class="flex justify-between text-sm"><span>${escape_html(item.qty)}x ${escape_html(item.title)}</span> <span class="font-medium">$${escape_html((item.price * item.qty).toFixed(2))}</span></div>`);
			}
			$$renderer.push(`<!--]--> <div class="flex justify-between text-sm pt-2 mt-2" style="border-top: 1px solid #e5e5e5;"><span class="font-semibold" style="color: #1a1a1a;">Total</span> <span class="font-bold text-lg" style="color: #1a1a1a;">$${escape_html(subtotal().toFixed(2))}</span></div></div> <button class="w-full py-3 text-sm font-semibold text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">Place Order - $${escape_html(subtotal().toFixed(2))}</button></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/checkout/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}
//#endregion
export { _page as default };
