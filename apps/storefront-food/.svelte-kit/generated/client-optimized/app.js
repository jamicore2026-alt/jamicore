export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14')
];

export const server_loads = [0,2];

export const dictionary = {
		"/": [~3],
		"/cart": [4],
		"/checkout": [5],
		"/menu": [~6],
		"/menu/[id]": [~7],
		"/store/[slug]/brio": [~8,[2]],
		"/store/[slug]/brio/cart": [9,[2]],
		"/store/[slug]/brio/checkout": [10,[2]],
		"/store/[slug]/brio/contact": [11,[2]],
		"/store/[slug]/brio/menu": [~12,[2]],
		"/store/[slug]/brio/menu/[catId]": [~13,[2]],
		"/store/[slug]/brio/product/[prodId]": [~14,[2]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';