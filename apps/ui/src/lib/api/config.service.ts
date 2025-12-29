import { env } from '$env/dynamic/public';

class AppConfigService {
	// API config
	public readonly api: {
		baseUrl: string;
		timeout: number;
	} = {
		baseUrl: String(env.PUBLIC_API_URL),
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT)
	};

	// Endpoints config
	public readonly endpoints = {
		auth: {
			login: '/auth/login',
			logout: '/auth/logout',
			status: '/auth/me'
		},
		generations: {
			base: '/api/generations',
			byId: (id: number) => `/api/generations/${id}`
		},
		stats: {
			host: (hostname: string) => `/api/stats/host?hostname=${encodeURIComponent(hostname)}`
		}
	};

	// HTTP client config
	public readonly http: {
		timeout: number;
		retries: number;
		retryDelay: number;
	} = {
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT),
		retries: 3,
		retryDelay: 1000
	};

	// Polling config
	public readonly polling = {
		interval: Number(env.PUBLIC_POLLING_INTERVAL),
		maxAttempts: Number(env.PUBLIC_POLLING_MAX_ATTEMPTS),
		timeout: (Number(env.PUBLIC_POLLING_INTERVAL)) * (Number(env.PUBLIC_POLLING_MAX_ATTEMPTS))
	};
}

export { AppConfigService };
