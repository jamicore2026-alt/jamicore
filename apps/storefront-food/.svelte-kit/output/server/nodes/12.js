import * as server from '../entries/pages/store/_slug_/brio/menu/_page.server.ts.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/store/_slug_/brio/menu/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/store/[slug]/brio/menu/+page.server.ts";
export const imports = ["_app/immutable/nodes/12.VLh1mdmU.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js"];
export const stylesheets = [];
export const fonts = [];
