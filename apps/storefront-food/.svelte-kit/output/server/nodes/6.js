import * as server from '../entries/pages/menu/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/menu/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/menu/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.B5vKkK0Y.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/Jf-R4JZ3.js","_app/immutable/chunks/BShPHrbv.js"];
export const stylesheets = [];
export const fonts = [];
