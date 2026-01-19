import { NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

interface AuthenticatedUser {
	email: string;
	sessionCookie: string;
}

interface MockMailService {
	sendLoginLink?: jest.Mock;
	sentEmails: Array<{ email: string; query: string }>;
}

/**
 * Helper class for managing authentication in tests
 */
class AuthHelper {
	private static globalUser: AuthenticatedUser | null = null;

	/**
	 * Create and authenticate a new user for testing
	 * @param app - NestFastify application instance
	 * @param mockMailService - Mock mail service to capture login links
	 * @param email - User email (default: 'authenticated-user@test.com')
	 * @returns Authenticated user with session cookie
	 */
	static async createAuthenticatedUser(
		app: NestFastifyApplication,
		mockMailService: MockMailService,
		email: string = 'authenticated-user@test.com'
	): Promise<AuthenticatedUser> {
		// Clear previous emails
		mockMailService.sentEmails = [];

		// Request login link
		await request(app.getHttpServer())
			.post('/api/auth/request-login-link')
			.send({ email, redirectUrl: '/dashboard' })
			.expect(HttpStatus.OK);

		// Get encrypted credentials from mock email
		const encryptedCreds = mockMailService.sentEmails[0].query;

		// Verify login link and get session
		const verifyResponse = await request(app.getHttpServer())
			.get('/api/auth/verify-login-link')
			.query({ crd: encryptedCreds })
			.expect(HttpStatus.OK);

		const sessionCookie = verifyResponse.headers['set-cookie']?.[0] || '';

		return {
			email,
			sessionCookie
		};
	}

	/**
	 * Login a test user and store session globally for other tests
	 * @param app - NestFastify application instance
	 * @param mockMailService - Mock mail service to capture login links
	 * @param email - User email (default: 'global-test-user@example.com')
	 * @returns Authenticated user with session cookie
	 */
	static async loginTestUser(
		app: NestFastifyApplication,
		mockMailService: MockMailService,
		email: string = 'global-test-user@example.com'
	): Promise<AuthenticatedUser> {
		if (this.globalUser?.email === email) {
			return this.globalUser;
		}

		// Request login link
		await request(app.getHttpServer())
			.post('/api/auth/request-login-link')
			.send({ email })
			.expect(HttpStatus.OK);

		// Get encrypted credentials from mock email
		const sentEmail = mockMailService.sentEmails.find(e => e.email === email);
		if (!sentEmail) {
			throw new Error(`No email sent to ${email}`);
		}

		const encryptedCreds = sentEmail.query;

		// Verify login link and get session
		const verifyResponse = await request(app.getHttpServer())
			.get('/api/auth/verify-login-link')
			.query({ crd: encryptedCreds })
			.expect(HttpStatus.OK);

		const sessionCookie = verifyResponse.headers['set-cookie']?.[0] || '';

		if (!sessionCookie) {
			throw new Error('No session cookie received');
		}

		this.globalUser = { email, sessionCookie };
		return this.globalUser;
	}

	/**
	 * Get the global authenticated user
	 * @returns Global authenticated user or null if not logged in
	 */
	static getAuthenticatedUser(): AuthenticatedUser | null {
		return this.globalUser;
	}

	/**
	 * Reset the global authenticated user (useful for cleanup)
	 */
	static resetAuthenticatedUser(): void {
		this.globalUser = null;
	}
}

export { type AuthenticatedUser, AuthHelper };
