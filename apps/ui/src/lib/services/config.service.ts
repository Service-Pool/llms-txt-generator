import { env } from '$env/dynamic/public';

class ConfigService {
	// API config
	public readonly api: { baseUrl: string } = {
		baseUrl: env.PUBLIC_API_URL
	};

	// HTTP client config
	public readonly http: { timeout: number } = {
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT)
	};

	// Endpoints config - centralized route definitions
	public readonly endpoints = {
		orders: {
			base: '/api/orders',
			byId: (id: number) => `/api/orders/${id}`,
			calculate: (id: number) => `/api/orders/${id}/calculate`,
			run: (id: number) => `/api/orders/${id}/run`,
			download: (id: number) => `/api/orders/${id}/download`
		},
		stats: {
			completed: '/api/stats/completed'
		},
		auth: {
			loginLinkRequest: '/api/auth/login-link-request',
			login: '/api/auth/login',
			logout: '/api/auth/logout',
			status: '/api/auth/me'
		}
	};

	// UI Routes config - centralized route definitions for frontend
	public readonly routes = {
		home: '/',
		about: '/about',
		orders: '/orders',
		orderById: (id: number) => `/orders/${id}`,
		auth: {
			request: '/auth/request',
			verify: '/auth/verify'
		}
	};

	// WebSocket config
	public readonly websocket = {
		path: env.PUBLIC_SOCKET_PATH,
		get url(): string {
			const baseUrl = env.PUBLIC_API_URL;

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
}

// Singleton instance
export const configService = new ConfigService();
