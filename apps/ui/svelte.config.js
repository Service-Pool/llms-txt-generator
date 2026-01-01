import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-node: Node.js server with API routes
		adapter: adapter({
			out: 'dist'
		}),
		alias: {
			'@api/shared': '../api/src/shared.ts'
		}
	}
};

export default config;
