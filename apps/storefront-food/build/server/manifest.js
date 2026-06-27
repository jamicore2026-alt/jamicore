const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.Bc8kcibM.js",app:"_app/immutable/entry/app.rwbHpM-q.js",imports:["_app/immutable/entry/start.Bc8kcibM.js","_app/immutable/chunks/DCl9l5Gr.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/entry/app.rwbHpM-q.js","_app/immutable/chunks/DCl9l5Gr.js","_app/immutable/chunks/Bx3qyQAF.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-utUFnQi2.js')),
			__memo(() => import('./chunks/1-CQNPd4bT.js')),
			__memo(() => import('./chunks/2-D6IQ8C3F.js')),
			__memo(() => import('./chunks/3-CuOVukSM.js')),
			__memo(() => import('./chunks/4-CKzsR6h5.js')),
			__memo(() => import('./chunks/5-CBvzHJHx.js')),
			__memo(() => import('./chunks/6-DGbjfyuG.js')),
			__memo(() => import('./chunks/7-D2pNF1p3.js')),
			__memo(() => import('./chunks/8-6iXaZy6U.js')),
			__memo(() => import('./chunks/9-S5dRVqJp.js')),
			__memo(() => import('./chunks/10-BXfl4KhD.js')),
			__memo(() => import('./chunks/11-Cn56snf2.js')),
			__memo(() => import('./chunks/12-Xm53JKUu.js')),
			__memo(() => import('./chunks/13-rysb_ziB.js')),
			__memo(() => import('./chunks/14-BEGvaH1e.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/[...path]",
				pattern: /^\/api(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BteWajle.js'))
			},
			{
				id: "/cart",
				pattern: /^\/cart\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/checkout",
				pattern: /^\/checkout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BvOwNfcd.js'))
			},
			{
				id: "/menu",
				pattern: /^\/menu\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/menu/[id]",
				pattern: /^\/menu\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/robots.txt",
				pattern: /^\/robots\.txt\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bsy_hTg2.js'))
			},
			{
				id: "/sitemap.xml",
				pattern: /^\/sitemap\.xml\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CSYBbwG7.js'))
			},
			{
				id: "/store/[slug]/brio",
				pattern: /^\/store\/([^/]+?)\/brio\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/cart",
				pattern: /^\/store\/([^/]+?)\/brio\/cart\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/checkout",
				pattern: /^\/store\/([^/]+?)\/brio\/checkout\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/contact",
				pattern: /^\/store\/([^/]+?)\/brio\/contact\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/menu",
				pattern: /^\/store\/([^/]+?)\/brio\/menu\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/menu/[catId]",
				pattern: /^\/store\/([^/]+?)\/brio\/menu\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"catId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/store/[slug]/brio/product/[prodId]",
				pattern: /^\/store\/([^/]+?)\/brio\/product\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"prodId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
