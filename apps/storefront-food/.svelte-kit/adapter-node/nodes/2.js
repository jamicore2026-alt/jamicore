import * as server from '../entries/pages/store/_slug_/brio/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/store/_slug_/brio/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/store/[slug]/brio/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.CpBoGGsF.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/Cuzl-u9B.js"];
export const stylesheets = [];
export const fonts = [];
