import * as server from '../entries/pages/store/_slug_/brio/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/store/_slug_/brio/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/store/[slug]/brio/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.B75pzVTF.js","_app/immutable/chunks/BXxRxElI.js","_app/immutable/chunks/Bx3qyQAF.js","_app/immutable/chunks/DrLpmv6O.js","_app/immutable/chunks/DeYjleqT.js","_app/immutable/chunks/BShPHrbv.js","_app/immutable/chunks/KbyBEkFH.js","_app/immutable/chunks/BEwP5wNp.js"];
export const stylesheets = [];
export const fonts = [];
