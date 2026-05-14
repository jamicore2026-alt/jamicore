import { S as attr, w as escape_html } from "./vendor.js";
import { n as Clock, t as Map_pin } from "./map-pin.js";
import { t as Phone } from "./phone.js";
//#region src/lib/themes/brio/components/CafeInfo.svelte
function CafeInfo($$renderer, $$props) {
	let { phone = "", address = "", hours = "", mapEmbedUrl = "" } = $$props;
	$$renderer.push(`<div class="bg-white border p-6" style="border-color: #e5e5e5; border-radius: 4px;"><h3 class="font-semibold text-base mb-4" style="color: #1a1a1a;">Visit Us</h3> <div class="space-y-4">`);
	if (phone) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-start gap-3"><div class="mt-0.5">`);
		Phone($$renderer, {
			class: "w-4 h-4",
			style: "color: #1a4d2e;"
		});
		$$renderer.push(`<!----></div> <div><p class="text-xs font-medium mb-0.5" style="color: #666666;">Phone</p> <a${attr("href", `tel:${phone}`)} class="text-sm font-medium hover:text-[#1a4d2e] transition-colors" style="color: #1a1a1a;">${escape_html(phone)}</a></div></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> `);
	if (address) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-start gap-3"><div class="mt-0.5">`);
		Map_pin($$renderer, {
			class: "w-4 h-4",
			style: "color: #1a4d2e;"
		});
		$$renderer.push(`<!----></div> <div><p class="text-xs font-medium mb-0.5" style="color: #666666;">Address</p> <p class="text-sm font-medium" style="color: #1a1a1a;">${escape_html(address)}</p></div></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> `);
	if (hours) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="flex items-start gap-3"><div class="mt-0.5">`);
		Clock($$renderer, {
			class: "w-4 h-4",
			style: "color: #1a4d2e;"
		});
		$$renderer.push(`<!----></div> <div><p class="text-xs font-medium mb-0.5" style="color: #666666;">Hours</p> <p class="text-sm font-medium whitespace-pre-line" style="color: #1a1a1a;">${escape_html(hours)}</p></div></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div> `);
	if (mapEmbedUrl) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="mt-6 w-full overflow-hidden" style="border: 1px solid #e5e5e5; border-radius: 4px;"><iframe title="Location map"${attr("src", mapEmbedUrl)} width="100%" height="240" style="border: 0;" loading="lazy" allowfullscreen="" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></div>`);
}
//#endregion
export { CafeInfo as t };
