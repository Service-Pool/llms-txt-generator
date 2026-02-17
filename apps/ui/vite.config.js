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
			case id === '@nestjs/swagger':
			case id === 'class-validator':
				return id;

			default:
				return null;
		}
	},
	load(id) {
		switch (true) {
			case id === '@nestjs/common':
				return `export const Injectable = () => () => {};`;

			case id === '@nestjs/swagger': {
				// Декораторы для OpenAPI/Swagger
				const swaggerDecorators = [
					'ApiProperty', 'ApiPropertyOptional', 'ApiTags', 'ApiOperation',
					'ApiResponse', 'ApiParam', 'ApiQuery', 'ApiBody', 'ApiBasicAuth',
					'ApiBearerAuth', 'ApiCookieAuth', 'ApiOAuth2', 'ApiSecurity',
					'ApiConsumes', 'ApiProduces', 'ApiBadRequestResponse',
					'ApiUnauthorizedResponse', 'ApiForbiddenResponse', 'ApiNotFoundResponse',
					'ApiConflictResponse', 'ApiInternalServerErrorResponse', 'ApiExtraModels'
				];
				const decoratorExports = swaggerDecorators.map(name => `export const ${name} = () => () => {};`).join('\n');
				const functionExports = `export const getSchemaPath = (cls) => \`#/components/schemas/\${cls.name}\`;`;
				return decoratorExports + '\n' + functionExports;
			}

			case id === 'class-validator': {
				// Все популярные декораторы class-validator
				const decorators = [
					'IsString', 'IsNotEmpty', 'IsEnum', 'Matches', 'IsInt', 'IsNumber',
					'IsBoolean', 'IsArray', 'IsObject', 'IsDate', 'IsEmail', 'IsUrl',
					'MinLength', 'MaxLength', 'Min', 'Max', 'IsOptional', 'ValidateNested',
					'IsIn', 'IsNotIn', 'ArrayMinSize', 'ArrayMaxSize', 'IsDefined',
					'Equals', 'NotEquals', 'IsEmpty', 'IsPositive', 'IsNegative', 'Validate',
					'ValidatorConstraint'
				];
				const exports = decorators.map(name => `export const ${name} = () => () => {};`).join('\n');
				return exports;
			}

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
	build: {
		sourcemap: true
	},
	esbuild: {
		sourcemap: true
	},
	css: {
		devSourcemap: true
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
