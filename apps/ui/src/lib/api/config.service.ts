import { env } from '$env/dynamic/public';

class AppConfigService {
	// API config
	public readonly api: { baseUrl: string; timeout: number } = {
		baseUrl: String(env.PUBLIC_API_URL),
		timeout: Number(env.PUBLIC_HTTP_TIMEOUT)
	};

	// Stripe config
	public readonly stripe: { paymentMethod: 'checkout' | 'elements' } = {
		paymentMethod: (String(env.PUBLIC_STRIPE_PAYMENT_METHOD)) as 'checkout' | 'elements'
	};

	// Endpoints config
	public readonly endpoints = {
		auth: {
			requestLoginLink: '/api/auth/request-login-link',
			verifyLoginLink: '/api/auth/verify-login-link',
			logout: '/api/auth/logout',
			status: '/api/auth/me'
		},
		generations: {
			byId: (id: number) => `/api/generations/${id}`
		},
		generationRequests: {
			base: '/api/generation-requests',
			byId: (id: number) => `/api/generation-requests/${id}`,
			paymentLink: (id: number) => `/api/generation-requests/${id}/payment-link`,
			paymentIntent: (id: number) => `/api/generation-requests/${id}/payment-intent`
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

// Singleton instance
const configService = new AppConfigService();

export { configService };
