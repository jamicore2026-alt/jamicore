import { S as attr, _ as derived, w as escape_html, y as ensure_array_like } from "../../../../../chunks/vendor.js";
import { t as ProductCard } from "../../../../../chunks/ProductCard.js";
import { t as CafeInfo } from "../../../../../chunks/CafeInfo.js";
//#region src/lib/themes/brio/components/Hero.svelte
function Hero($$renderer, $$props) {
	let { headline = "Fresh Flavors, Delivered to You", subtitle = "Explore our handcrafted menu made with locally sourced ingredients.", ctaLabel = "Explore Menu", ctaHref = "/menu", backgroundImage = "" } = $$props;
	$$renderer.push(`<section class="relative w-full py-16 md:py-24 px-4 text-center" style="background-color: #e8f5e9;">`);
	if (backgroundImage) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<img${attr("src", backgroundImage)} alt="" class="absolute inset-0 w-full h-full object-cover opacity-20"/>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> <div class="relative z-10 max-w-2xl mx-auto"><h1 class="text-3xl md:text-5xl font-bold mb-4" style="color: #1a1a1a;">${escape_html(headline)}</h1> <p class="text-base md:text-lg mb-8" style="color: #666666;">${escape_html(subtitle)}</p> <a${attr("href", ctaHref)} class="inline-block px-8 py-3 rounded text-sm font-semibold text-white transition-colors hover:opacity-90" style="background-color: #1a4d2e; border-radius: 4px;">${escape_html(ctaLabel)}</a></div></section>`);
}
//#endregion
//#region src/lib/themes/brio/components/StorySection.svelte
function StorySection($$renderer, $$props) {
	let { story = "" } = $$props;
	$$renderer.push(`<section class="py-16 px-4" style="background-color: #ffffff;"><div class="max-w-3xl mx-auto text-center"><h2 class="text-2xl md:text-3xl font-bold mb-6" style="color: #1a1a1a;">Our Story</h2> `);
	if (story) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<p class="text-base leading-relaxed" style="color: #666666;">${escape_html(story)}</p>`);
	} else {
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<p class="text-base leading-relaxed" style="color: #666666;">Welcome to our kitchen. We believe in honest food made with passion and the freshest ingredients. Every dish tells a story of tradition, care, and a love for great flavor.</p>`);
	}
	$$renderer.push(`<!--]--></div></section>`);
}
//#endregion
//#region src/lib/themes/brio/routes/+page.svelte
function _page$1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const theme = derived(() => data.theme || {});
		const featuredProducts = derived(() => data.featuredProducts || []);
		const storeSlug = derived(() => data.slug || data.store?.domain || "");
		Hero($$renderer, {
			headline: theme().heroHeadline || void 0,
			subtitle: theme().heroSubtitle || void 0,
			ctaLabel: theme().heroCtaLabel || void 0,
			ctaHref: theme().heroCtaHref || void 0,
			backgroundImage: theme().heroBackgroundImage || void 0
		});
		$$renderer.push(`<!----> `);
		StorySection($$renderer, { story: theme().story || void 0 });
		$$renderer.push(`<!----> `);
		if (featuredProducts().length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<section class="py-16 px-4" style="background-color: #f9f9f9;"><div class="max-w-6xl mx-auto"><h2 class="text-2xl md:text-3xl font-bold mb-8 text-center" style="color: #1a1a1a;">${escape_html(theme().featuredTitle || "Featured Dishes")}</h2> <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"><!--[-->`);
			const each_array = ensure_array_like(featuredProducts());
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let product = each_array[$$index];
				ProductCard($$renderer, {
					id: String(product.id || ""),
					name: String(product.name || product.titleEn || product.title || ""),
					description: String(product.description || product.descriptionEn || ""),
					price: Number(product.price || product.salePrice || 0),
					image: String(product.image || product.images?.[0] || ""),
					isVegetarian: Boolean(product.isVegetarian),
					storeSlug: storeSlug()
				});
			}
			$$renderer.push(`<!--]--></div></div></section>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <section class="py-16 px-4" style="background-color: #ffffff;"><div class="max-w-6xl mx-auto"><div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"><div><h2 class="text-2xl md:text-3xl font-bold mb-4" style="color: #1a1a1a;">Visit Us</h2> <p class="text-sm mb-6" style="color: #666666;">Come experience the Brio difference. Fresh ingredients, warm atmosphere, and friendly service.</p> `);
		CafeInfo($$renderer, {
			phone: String(theme().contactPhone || ""),
			address: String(theme().contactAddress || ""),
			hours: String(theme().contactHours || "")
		});
		$$renderer.push(`<!----></div></div></div></section>`);
	});
}
//#endregion
//#region src/routes/store/[slug]/brio/+page.svelte
function _page($$renderer, $$props) {
	let { data } = $$props;
	_page$1($$renderer, { data });
}
//#endregion
export { _page as default };
