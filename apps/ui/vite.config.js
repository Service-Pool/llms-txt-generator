import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

if (!process.env.PORT) {
	throw new Error('PORT environment variable is required');
}

const port = parseInt(process.env.PORT);

// Plugin to stub server-side imports
/**
 * @type {import('vite').Plugin}
 */
const stubServerImports = {
	name: 'stub-server-imports',
	resolveId(id) {
		switch (true) {
			case id === 'class-validator':
			case id === 'robots-parser':
			case id.includes('common/validators'):
				return id;
			default:
				return null;
		}
	},
	load(id) {
		switch (true) {
			case id === 'class-validator': {
				// Все популярные декораторы class-validator
				const decorators = [
					'IsString', 'IsNotEmpty', 'IsEnum', 'Matches', 'IsInt', 'IsNumber',
					'IsBoolean', 'IsArray', 'IsObject', 'IsDate', 'IsEmail', 'IsUrl',
					'MinLength', 'MaxLength', 'Min', 'Max', 'IsOptional', 'ValidateNested',
					'IsIn', 'IsNotIn', 'ArrayMinSize', 'ArrayMaxSize', 'IsDefined',
					'Equals', 'NotEquals', 'IsEmpty', 'IsPositive', 'IsNegative'
				];
				const exports = decorators.map(name => `export const ${name} = () => () => {};`).join('\n');
				return exports;
			}
			case id.includes('common/validators'):
				return `export const ValidateHostnameRobotsAndSitemap = () => () => {};`;
			case id === 'robots-parser':
				return `export default () => ({});`;
			default:
				return null;
		}
	}
};

export default defineConfig({
	plugins: [stubServerImports, sveltekit()],
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
