import * as server from '../entries/pages/store/_slug_/brio/product/_prodId_/_page.server.ts.js';

export const index = 14;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/store/_slug_/brio/product/_prodId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/store/[slug]/brio/product/[prodId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/14.CTlzBt90.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/DemLrGmB.js","_app/immutable/chunks/BShPHrbv.js"];
export const stylesheets = [];
export const fonts = [];
