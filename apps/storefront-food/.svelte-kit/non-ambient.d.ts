
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/cart" | "/checkout" | "/menu" | "/menu/[id]" | "/store" | "/store/[slug]" | "/store/[slug]/brio" | "/store/[slug]/brio/cart" | "/store/[slug]/brio/checkout" | "/store/[slug]/brio/contact" | "/store/[slug]/brio/menu" | "/store/[slug]/brio/menu/[catId]" | "/store/[slug]/brio/product" | "/store/[slug]/brio/product/[prodId]";
		RouteParams(): {
			"/menu/[id]": { id: string };
			"/store/[slug]": { slug: string };
			"/store/[slug]/brio": { slug: string };
			"/store/[slug]/brio/cart": { slug: string };
			"/store/[slug]/brio/checkout": { slug: string };
			"/store/[slug]/brio/contact": { slug: string };
			"/store/[slug]/brio/menu": { slug: string };
			"/store/[slug]/brio/menu/[catId]": { slug: string; catId: string };
			"/store/[slug]/brio/product": { slug: string };
			"/store/[slug]/brio/product/[prodId]": { slug: string; prodId: string }
		};
		LayoutParams(): {
			"/": { id?: string; slug?: string; catId?: string; prodId?: string };
			"/cart": Record<string, never>;
			"/checkout": Record<string, never>;
			"/menu": { id?: string };
			"/menu/[id]": { id: string };
			"/store": { slug?: string; catId?: string; prodId?: string };
			"/store/[slug]": { slug: string; catId?: string; prodId?: string };
			"/store/[slug]/brio": { slug: string; catId?: string; prodId?: string };
			"/store/[slug]/brio/cart": { slug: string };
			"/store/[slug]/brio/checkout": { slug: string };
			"/store/[slug]/brio/contact": { slug: string };
			"/store/[slug]/brio/menu": { slug: string; catId?: string };
			"/store/[slug]/brio/menu/[catId]": { slug: string; catId: string };
			"/store/[slug]/brio/product": { slug: string; prodId?: string };
			"/store/[slug]/brio/product/[prodId]": { slug: string; prodId: string }
		};
		Pathname(): "/" | "/cart" | "/checkout" | "/menu" | `/menu/${string}` & {} | `/store/${string}/brio` & {} | `/store/${string}/brio/cart` & {} | `/store/${string}/brio/checkout` & {} | `/store/${string}/brio/contact` & {} | `/store/${string}/brio/menu` & {} | `/store/${string}/brio/menu/${string}` & {} | `/store/${string}/brio/product/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}