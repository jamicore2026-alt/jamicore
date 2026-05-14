import { a as attr, e as escape_html, d as derived } from './vendor-CQD3gsfc.js';
import { C as CafeInfo } from './CafeInfo-DNnuEJ-C.js';
import 'clsx';
import './map-pin-Dyv78CER.js';
import './Icon-D2L9p4nl.js';
import './phone-DpLhBGPI.js';

//#region src/lib/themes/brio/components/ContactForm.svelte
function ContactForm($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let name = "";
		let email = "";
		let subject = "";
		let message = "";
		let loading = false;
		$$renderer.push(`<div class="bg-white border p-6" style="border-color: #e5e5e5; border-radius: 4px;">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <form class="space-y-4"><div><label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-name">Name</label> <input id="contact-name" type="text"${attr("value", name)} required="" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;" placeholder="Your name"/></div> <div><label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-email">Email</label> <input id="contact-email" type="email"${attr("value", email)} required="" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;" placeholder="your@email.com"/></div> <div><label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-subject">Subject</label> <input id="contact-subject" type="text"${attr("value", subject)} required="" class="w-full px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;" placeholder="What's this about?"/></div> <div><label class="block text-sm font-medium mb-1" style="color: #1a1a1a;" for="contact-message">Message</label> <textarea id="contact-message" required=""${attr("rows", 4)} class="w-full px-3 py-2 text-sm outline-none transition-colors resize-none focus:border-[#1a4d2e]" style="border: 1px solid #e5e5e5; border-radius: 4px; color: #1a1a1a;" placeholder="Your message...">`);
		const $$body = escape_html(message);
		if ($$body) $$renderer.push(`${$$body}`);
		$$renderer.push(`</textarea></div> <button type="submit"${attr("disabled", loading, true)} class="w-full py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60" style="background-color: #1a4d2e; border-radius: 4px;">`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`Send Message`);
		$$renderer.push(`<!--]--></button></form></div>`);
	});
}
//#endregion
//#region src/lib/themes/brio/routes/contact/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const theme = derived(() => data.theme || {});
		$$renderer.push(`<div class="max-w-6xl mx-auto py-16 px-4"><h1 class="text-2xl md:text-3xl font-bold mb-8" style="color: #1a1a1a;">Contact Us</h1> <div class="grid grid-cols-1 md:grid-cols-2 gap-8">`);
		ContactForm($$renderer);
		$$renderer.push(`<!----> `);
		CafeInfo($$renderer, {
			phone: String(theme().phone || ""),
			address: String(theme().address || ""),
			hours: String(theme().hours || ""),
			mapEmbedUrl: String(theme().mapEmbedUrl || "")
		});
		$$renderer.push(`<!----></div></div>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/contact/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-BbxkLTGJ.js.map
