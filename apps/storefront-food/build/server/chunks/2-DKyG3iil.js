//#region src/routes/store/[slug]/brio/+layout.server.ts
var API_BASE = process.env.API_BASE_URL || "http://localhost:3000";
var load = async ({ params, fetch, url }) => {
	const { slug } = params;
	const host = url.hostname;
	const storeDomain = host.split(".")[0] !== "localhost" ? host.split(".")[0] : slug;
	let store = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/store`, { headers: { "X-Store-Domain": storeDomain } });
		if (res.ok) {
			const data = await res.json();
			store = data.store ?? data;
		}
	} catch {}
	let theme = null;
	try {
		const res = await fetch(`${API_BASE}/api/v1/public/stores/${storeDomain}/theme`);
		if (res.ok) theme = (await res.json()).theme;
	} catch {}
	return {
		store,
		theme: theme || {},
		slug: storeDomain
	};
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
	__proto__: null,
	load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-CldIf82V.js')).default;
const server_id = "src/routes/store/[slug]/brio/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.CpBoGGsF.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/Cuzl-u9B.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-DKyG3iil.js.map
