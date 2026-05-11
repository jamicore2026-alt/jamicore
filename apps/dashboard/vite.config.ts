import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (/node_modules\/(svelte|@sveltejs\/kit|@tanstack\/svelte-query)/.test(id)) {
						return 'vendor';
					}
					if (/node_modules\/(bits-ui|vaul-svelte|svelte-sonner|sveltekit-superforms)/.test(id)) {
						return 'ui';
					}
					if (/node_modules\/chart\.js/.test(id)) {
						return 'charts';
					}
				},
			},
		},
	},
	ssr: {
		noExternal: ['@lucide/svelte'],
	},
	server: {
		port: 5174,
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				// SSE streams need keep-alive; do not buffer or timeout early
				configure: (proxy) => {
					proxy.on('proxyReq', (_proxyReq, req) => {
						if (req.headers.accept === 'text/event-stream') {
							/* eslint-disable @typescript-eslint/no-explicit-any */
							(_proxyReq as any).setTimeout(0);
							(_proxyReq as any).setSocketKeepAlive(true);
						}
					});
					proxy.on('error', (_err, _req, res) => {
						const response = res as { headersSent?: boolean; writeHead?: (code: number, headers: Record<string, string>) => void; end?: (data: string) => void };
						if (response && !response.headersSent && response.writeHead && response.end) {
							response.writeHead(502, { 'Content-Type': 'text/plain' });
							response.end('Proxy error');
						}
					});
				},
			},
			'/uploads': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			},
		},
	},
});