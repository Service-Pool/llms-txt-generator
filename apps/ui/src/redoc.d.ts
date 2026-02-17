import type { RedocRawOptions } from 'redoc/typings/services/RedocNormalizedOptions';

declare global {
	interface Window {
		Redoc?: {
			init: (specUrl: string, options: RedocRawOptions, container: HTMLElement) => Promise<void>;
		};
	}
}

export { };
