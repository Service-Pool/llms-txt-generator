import { env } from '$env/dynamic/public';

class AppConfigService {
	// API config
	public readonly api: { baseUrl: string; timeout: number } = {
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
			byId: (id: number) => `/api/generations/${id}`
		},
		generationRequests: {
			base: '/api/generation-requests',
			byId: (id: number) => `/api/generation-requests/${id}`
		},
		calculate: {
			host: (hostname: string) => `/api/calculations?hostname=${encodeURIComponent(hostname)}`
		}
	};

	// WebSocket config
	public readonly websocket = {
		path: String(env.PUBLIC_SOCKET_PATH),
		get url(): string {
			const baseUrl = String(env.PUBLIC_API_URL);

			// If baseUrl is empty, use current window location
			if (!baseUrl) {
				const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
				return `${protocol}//${window.location.host}/ws`;
			}

			// Convert http(s) to ws(s)
			const wsUrl = baseUrl.replace(/^http/, 'ws');
			return `${wsUrl}${this.path}`;
		}
	};

	// HTTP client config
	public readonly http: { timeout: number; retries: number; retryDelay: number } = {
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT),
		retries: 3,
		retryDelay: 1000
	};
}

export { AppConfigService };
