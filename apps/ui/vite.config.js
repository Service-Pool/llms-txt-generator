import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

if (!process.env.PORT) {
	throw new Error('PORT environment variable is required');
}

if (!process.env.PORT_PROXY) {
	throw new Error('PORT_PROXY environment variable is required');
}

const port = parseInt(process.env.PORT);
const portProxy = parseInt(process.env.PORT_PROXY);

// Plugin to stub server-side imports
/**
 * @type {import('vite').Plugin}
 */
const stubServerImports = {
	name: 'stub-server-imports',
	resolveId(id) {
		switch (true) {
			case id === '@nestjs/common':
			case id === 'class-validator':
			case id === 'robots-parser':
			case id.includes('common/validators'):
			case id.includes('validators/hostname.validator'):
			case id.includes('config/config.service'):
				return id;

			default:
				return null;
		}
	},
	load(id) {
		switch (true) {
			case id === '@nestjs/common':
				return `export const Injectable = () => () => {};`;

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

			case id.includes('validators/hostname.validator'):
				return `export class HostnameValidator { static validateHostnameRobotsAndSitemap = () => () => {}; }`;

			case id.includes('config/config.service'):
				return `export const HOSTNAME_VALIDATION = () => () => {};`;

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
		strictPort: true,
		allowedHosts: ['.svcpool.com'],
		watch: {
			usePolling: true,
			interval: 100
		},
		hmr: {
			// host: 'localhost',
			// port: port,
			clientPort: portProxy,
			overlay: true
		},
		fs: {
			allow: [
				'/app',
				'/api',
				path.resolve(__dirname, '..') // Allow access to parent directory (monorepo root)
			]
		}
	}
});
