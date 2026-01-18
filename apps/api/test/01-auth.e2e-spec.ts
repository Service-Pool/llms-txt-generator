import { ApiResponse } from '../src/utils/response/api-response';
import { AuthStatusDtoResponse } from '../src/modules/auth/dto/auth-response.dto';
import { createApp } from '../src/bootstrap/main';
import { DataSource } from 'typeorm';
import { HttpStatus } from '@nestjs/common';
import { initTestDatabase } from './test-setup';
import { MailService } from '../src/modules/auth/services/mail.service';
import { MessageSuccess } from '../src/utils/response/message-success';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ResponseCode } from '../src/enums/response-code.enum';
import { User } from '../src/modules/auth/entitites/user.entity';
import request from 'supertest';

describe('AuthController (e2e)', () => {
	let app: NestFastifyApplication;
	let dataSource: DataSource;
	let mockMailService: {
		sendLoginLink: jest.Mock;
		sentEmails: Array<{ email: string; query: string }>;
	};

	beforeAll(async () => {
		// Initialize test database connection
		dataSource = await initTestDatabase();

		// Create mock MailService
		mockMailService = {
			sendLoginLink: jest.fn(),
			sentEmails: []
		};

		// Mock implementation captures emails
		mockMailService.sendLoginLink.mockImplementation((email: string, query: string) => {
			mockMailService.sentEmails.push({ email, query });
			return Promise.resolve();
		});

		// Create app using production configuration
		app = await createApp();

		// Override MailService with mock
		const mailService = app.get(MailService);
		mailService.sendLoginLink = mockMailService.sendLoginLink;

		await app.init();
		await app.getHttpAdapter().getInstance().ready();
	});

	afterAll(async () => {
		await app.close();
		await dataSource.destroy();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockMailService.sentEmails = [];
	});

	describe('Email login flow', () => {
		const testEmail = 'test@example.com';

		it('should complete full login flow: request link -> receive email -> verify link -> logged in', async () => {
			// Step 1: Request login link
			const requestResponse = await request(app.getHttpServer())
				.post('/api/auth/request-login-link')
				.send({
					email: testEmail,
					redirectUrl: '/dashboard'
				})
				.expect(HttpStatus.OK);

			const requestApiResponse = ApiResponse.fromJSON(requestResponse.body as { code: ResponseCode; message: unknown });
			expect(requestApiResponse.getСode()).toBe(ResponseCode.SUCCESS);

			// Step 2: Verify email was sent
			expect(mockMailService.sendLoginLink).toHaveBeenCalledTimes(1);
			expect(mockMailService.sendLoginLink).toHaveBeenCalledWith(testEmail, expect.any(String));
			expect(mockMailService.sentEmails).toHaveLength(1);

			// Step 3: Extract encrypted credentials from "email"
			const sentEmail = mockMailService.sentEmails[0];
			expect(sentEmail.email).toBe(testEmail);
			const encryptedCreds = sentEmail.query;

			// Step 4: Verify login link with credentials
			const verifyResponse = await request(app.getHttpServer())
				.get('/api/auth/verify-login-link')
				.query({ crd: encryptedCreds })
				.expect(HttpStatus.OK);

			const verifyApiResponse = ApiResponse.fromJSON(verifyResponse.body as { code: ResponseCode; message: unknown });
			expect(verifyApiResponse.getСode()).toBe(ResponseCode.SUCCESS);

			// Extract session cookie
			const sessionCookie = verifyResponse.headers['set-cookie']?.[0] || '';
			expect(sessionCookie).toBeTruthy();

			// Step 5: Verify user is authenticated by checking /me endpoint
			const meResponse = await request(app.getHttpServer())
				.get('/api/auth/me')
				.set('Cookie', sessionCookie)
				.expect(HttpStatus.OK);

			const meApiResponse = ApiResponse.fromJSON(meResponse.body as { code: ResponseCode; message: unknown }, AuthStatusDtoResponse);
			expect(meApiResponse.getСode()).toBe(ResponseCode.SUCCESS);

			const meData = meApiResponse.getMessage() as MessageSuccess<AuthStatusDtoResponse>;
			expect(meData.data.authenticated).toBe(true);
			expect(meData.data.user?.email).toBe(testEmail);

			// Step 6: Verify user exists in database
			const user = await dataSource
				.getRepository(User)
				.findOne({ where: { email: testEmail } });

			expect(user).not.toBeNull();
			expect(user!.email).toBe(testEmail);
		});

		it('should reject invalid credentials', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/auth/verify-login-link')
				.query({ crd: 'invalid-encrypted-string' })
				.expect(HttpStatus.INTERNAL_SERVER_ERROR); // Decryption error caught by GlobalExceptionFilter

			const apiResponse = ApiResponse.fromJSON(response.body as { code: ResponseCode; message: unknown });
			expect(apiResponse.getСode()).toBe(ResponseCode.ERROR);
		});

		it('should reject missing credentials', async () => {
			const response = await request(app.getHttpServer())
				.get('/api/auth/verify-login-link')
				.expect(HttpStatus.OK);

			const apiResponse = ApiResponse.fromJSON(response.body as { code: ResponseCode; message: unknown });
			expect(apiResponse.getСode()).toBe(ResponseCode.ERROR);
		});
	});

	describe('Logout flow', () => {
		it('should logout authenticated user', async () => {
			// First, login
			await request(app.getHttpServer())
				.post('/api/auth/request-login-link')
				.send({ email: 'logout-test@example.com' })
				.expect(HttpStatus.OK);

			const encryptedCreds = mockMailService.sentEmails[0].query;

			const loginResponse = await request(app.getHttpServer())
				.get('/api/auth/verify-login-link')
				.query({ crd: encryptedCreds })
				.expect(HttpStatus.OK);

			const sessionCookie = loginResponse.headers['set-cookie']?.[0] || '';

			// Then, logout
			const logoutResponse = await request(app.getHttpServer())
				.post('/api/auth/logout')
				.set('Cookie', sessionCookie)
				.expect(HttpStatus.OK);

			const logoutApiResponse = ApiResponse.fromJSON(logoutResponse.body as { code: ResponseCode; message: unknown });
			expect(logoutApiResponse.getСode()).toBe(ResponseCode.SUCCESS);

			// Verify session is destroyed
			const meResponse = await request(app.getHttpServer())
				.get('/api/auth/me')
				.set('Cookie', sessionCookie)
				.expect(HttpStatus.OK);

			const meApiResponse = ApiResponse.fromJSON(meResponse.body as { code: ResponseCode; message: unknown }, AuthStatusDtoResponse);
			const meData = meApiResponse.getMessage() as MessageSuccess<AuthStatusDtoResponse>;
			expect(meData.data.authenticated).toBe(false);
		});
	});
});
