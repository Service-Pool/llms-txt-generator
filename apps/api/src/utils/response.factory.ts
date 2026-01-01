/**
 * Response Factory
 * Provides standardized JSON response methods for NestJS controllers
 */
export class ResponseFactory {
	/**
	 * Send a successful response
	 */
	public static success<T>(message: T): { code: number; message: T } {
		return {
			code: 201,
			message
		};
	}

	/**
	 * Send an unauthorized (401) response
	 */
	public static unauthorized(message: string = 'Not authenticated'): { code: number; message: string } {
		return {
			code: 401,
			message
		};
	}

	/**
	 * Send a forbidden (403) response
	 */
	public static forbidden(message: string = 'Access denied'): { code: number; error: string } {
		return {
			code: 403,
			error: message
		};
	}

	/**
	 * Send a not found (404) response
	 */
	public static notFound(message: string = 'Resource not found'): { code: number; error: string } {
		return {
			code: 404,
			error: message
		};
	}

	/**
	 * Send a generic error response
	 */
	public static error(message: string): { code: number; error: string } {
		return {
			code: 501,
			error: message
		};
	}

	/**
	 * Send an internal server error (500) response
	 */
	public static internalError(message: string = 'Internal server error'): { code: number; error: string } {
		return {
			code: 502,
			error: message
		};
	}
}
