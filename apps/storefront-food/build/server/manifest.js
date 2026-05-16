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
		client: {start:"_app/immutable/entry/start.DUWwcLxi.js",app:"_app/immutable/entry/app.KrWC3jvc.js",imports:["_app/immutable/entry/start.DUWwcLxi.js","_app/immutable/chunks/GxhAm5dh.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/entry/app.KrWC3jvc.js","_app/immutable/chunks/GxhAm5dh.js","_app/immutable/chunks/Bx3qyQAF.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-D93tpTCJ.js')),
			__memo(() => import('./chunks/1-B6mEXfbP.js')),
			__memo(() => import('./chunks/2-Vp3vudln.js')),
			__memo(() => import('./chunks/3-B4rN_-rU.js')),
			__memo(() => import('./chunks/4-cb7Cs4wp.js')),
			__memo(() => import('./chunks/5-BXcwxsH6.js')),
			__memo(() => import('./chunks/6-DDlVQcIZ.js')),
			__memo(() => import('./chunks/7-BEeP-pA4.js')),
			__memo(() => import('./chunks/8-lQYtX3IC.js')),
			__memo(() => import('./chunks/9-BWTtI75O.js')),
			__memo(() => import('./chunks/10-BE8hGjWF.js')),
			__memo(() => import('./chunks/11-k4ePV6Bs.js')),
			__memo(() => import('./chunks/12-CjZ9AwC2.js')),
			__memo(() => import('./chunks/13-BmxEuJLc.js')),
			__memo(() => import('./chunks/14-kN1WSU1R.js'))
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
