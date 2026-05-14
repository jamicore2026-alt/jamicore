import * as server from '../entries/pages/menu/_id_/_page.server.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/menu/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/menu/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/7.BItTlPxj.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/DemLrGmB.js"];
export const stylesheets = [];
export const fonts = [];
