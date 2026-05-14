import { S as attr, _ as derived, m as attr_class, w as escape_html, x as stringify, y as ensure_array_like } from "../../../chunks/vendor.js";
import { t as Search } from "../../../chunks/search.js";
//#region src/routes/menu/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		const items = derived(() => data.items || []);
		const categories = derived(() => data.categories || []);
		const activeCategory = derived(() => data.category);
		const searchQuery = derived(() => data.search || "");
		let localSearch = searchQuery();
		$$renderer.push(`<div class="space-y-6"><div class="flex flex-col sm:flex-row gap-3"><form class="relative flex-1">`);
		Search($$renderer, { class: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" });
		$$renderer.push(`<!----> <input type="text" placeholder="Search dishes..." class="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"${attr("value", localSearch)}/></form></div> <div class="flex gap-2 overflow-x-auto pb-2"><button${attr_class(`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${stringify(activeCategory() ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200" : "bg-orange-600 text-white")}`)}>All</button> <!--[-->`);
		const each_array = ensure_array_like(categories());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let cat = each_array[$$index];
			$$renderer.push(`<button${attr_class(`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${stringify(activeCategory() === cat.id ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")}`)}>${escape_html(cat.nameEn || cat.name)}</button>`);
		}
		$$renderer.push(`<!--]--></div> `);
		if (items().length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="text-center py-16"><p class="text-neutral-500 text-lg">No dishes found</p> `);
			if (searchQuery()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="text-sm text-neutral-400 mt-1">Try a different search term</p>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><!--[-->`);
			const each_array_1 = ensure_array_like(items());
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let item = each_array_1[$$index_1];
				$$renderer.push(`<div class="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all"><a${attr("href", `/menu/${item.id}`)} class="block relative aspect-video bg-neutral-100">`);
				if (item.images?.[0]) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<img${attr("src", item.images[0])}${attr("alt", item.titleEn)} class="w-full h-full object-cover"/>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<div class="w-full h-full flex items-center justify-center text-4xl">🍽️</div>`);
				}
				$$renderer.push(`<!--]--> `);
				if (item.isVegetarian) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="absolute top-2 left-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Veg</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (item.spicyLevel) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="absolute top-2 right-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">${escape_html("🌶️".repeat(item.spicyLevel))}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></a> <div class="p-4"><a${attr("href", `/menu/${item.id}`)}><h3 class="font-semibold mb-1 hover:text-orange-600 transition-colors">${escape_html(item.titleEn)}</h3></a> <p class="text-sm text-neutral-500 line-clamp-2 mb-3">${escape_html(item.descriptionEn || "")}</p> <div class="flex items-center justify-between"><div><span class="font-bold text-lg">$${escape_html(Number(item.salePrice).toFixed(2))}</span> `);
				if (item.purchasePrice && item.purchasePrice !== item.salePrice) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="text-sm text-neutral-400 line-through ml-1">$${escape_html(Number(item.purchasePrice).toFixed(2))}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <button class="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 active:scale-95 transition-all">Add</button></div></div></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
