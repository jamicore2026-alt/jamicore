import * as server from '../entries/pages/store/_slug_/brio/menu/_catId_/_page.server.ts.js';

export const index = 13;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/store/_slug_/brio/menu/_catId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/store/[slug]/brio/menu/[catId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/13._Ppwjlmc.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BEwP5wNp.js"];
export const stylesheets = [];
export const fonts = [];
