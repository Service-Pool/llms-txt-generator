import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

if (!process.env.PORT) {
	throw new Error('PORT environment variable is required');
}

const port = parseInt(process.env.PORT);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		extensions: ['.js', '.ts', '.json']
	},
	server: {
		host: '0.0.0.0',
		port: port,
		allowedHosts: ['.svcpool.com'], // Разрешить все поддомены svcpool.com
		watch: {
			usePolling: true,
			interval: 100
		},
		hmr: {
			host: 'localhost',
			port: port,
			overlay: true
		},
		fs: {
			// /app - working directory in Docker container where UI app is mounted
			// /api/shared - shared folder from API mounted in Docker container
			allow: ['/app', '/api']
		}
	}
});
