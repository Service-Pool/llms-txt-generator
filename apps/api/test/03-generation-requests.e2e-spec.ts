import { ApiResponse } from '../src/utils/response/api-response';
import { createApp } from '../src/bootstrap/main';
import { DataSource } from 'typeorm';
import { GenerationRequest } from '../src/modules/generations/entities/generation-request.entity';
import { GenerationRequestDtoResponse } from '../src/modules/generations/dto/generation-response.dto';
import { HttpStatus } from '@nestjs/common';
import { initTestDatabase } from './test-setup';
import { MessageSuccess } from '../src/utils/response/message-success';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Provider } from '../src/enums/provider.enum';
import { ResponseCode } from '../src/enums/response-code.enum';
import fixtures from './fixtures/generation-requests.fixtures.json';
import request from 'supertest';

// Mock global fetch for external HTTP calls (robots.txt, sitemap)
const mockFetch = jest.fn();
global.fetch = mockFetch;

interface GenerationRequestFixture {
	name: string;
	description: string;
	input: {
		hostname: string;
		provider: Provider;
	};
	auth: 'anonymous' | 'authenticated';
	expected: {
		status: number;
		paymentLink?: string | null;
		paymentLinkPattern?: string;
		generation: {
			provider: Provider;
			status: string;
		};
	};
}

const testCases = fixtures.generationRequests as GenerationRequestFixture[];

describe('GenerationRequestsController (e2e)', () => {
	let app: NestFastifyApplication;
	let dataSource: DataSource;
	let authenticatedCookie: string;
	let anonymousCookie: string;

	beforeAll(async () => {
		// Initialize test database connection for setup/assertions
		dataSource = await initTestDatabase();

		// Create app using the same function as production
		app = await createApp();

		await app.init();
		await app.getHttpAdapter().getInstance().ready();

		// Create sessions via real HTTP requests - let the app create them
		const anonymousResponse = await request(app.getHttpServer())
			.get('/api/auth/me')
			.expect(200);
		anonymousCookie = anonymousResponse.headers['set-cookie']?.[0] || '';

		// TODO: authenticated session requires login flow
		authenticatedCookie = anonymousCookie; // For now use anonymous
	});

	afterAll(async () => {
		await app.close();
		await dataSource.destroy();
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock external HTTP calls
		mockFetch.mockImplementation((url: string) => {
			if (url.endsWith('/robots.txt')) {
				return Promise.resolve({
					ok: true,
					text: () => Promise.resolve(`User-agent: *\nAllow: /\nSitemap: ${url.replace('/robots.txt', '/sitemap.xml')}`)
				});
			}
			if (url.endsWith('/sitemap.xml')) {
				return Promise.resolve({
					ok: true,
					text: () => Promise.resolve('<?xml version="1.0"?><urlset></urlset>')
				});
			}
			return Promise.resolve({ ok: false, status: 404 });
		});
	});

	describe('POST /api/generation-requests - fixture-based tests', () => {
		it.each(testCases)(
			'$name: $description',
			async (fixture: GenerationRequestFixture) => {
				const cookie = fixture.auth === 'authenticated'
					? authenticatedCookie
					: anonymousCookie;

				const response = await request(app.getHttpServer())
					.post('/api/generation-requests')
					.set('Cookie', cookie)
					.send({
						hostname: fixture.input.hostname,
						provider: fixture.input.provider
					})
					.expect(HttpStatus.ACCEPTED);

				// Deserialize response using DTO
				const apiResponse = ApiResponse.fromJSON<GenerationRequestDtoResponse>(response.body as { code: ResponseCode; message: unknown }, GenerationRequestDtoResponse);
				expect(apiResponse.getСode()).toBe(ResponseCode.SUCCESS);

				const message = apiResponse.getMessage() as MessageSuccess<GenerationRequestDtoResponse>;
				const data = message.data;

				expect(data.status).toBe(fixture.expected.status);
				expect(data.generation.provider).toBe(fixture.expected.generation.provider);
				expect(data.generation.status).toBe(fixture.expected.generation.status);

				// Verify DB
				const savedRequest = await dataSource
					.getRepository(GenerationRequest)
					.findOne({
						where: { id: data.id },
						relations: ['generation']
					}) as GenerationRequest;

				expect(savedRequest).not.toBeNull();
				expect(savedRequest.status).toBe(fixture.expected.status);
			}
		);
	});

	describe('POST /api/generation-requests - validation', () => {
		it('should reject request for non-existent calculation', async () => {
			const response = await request(app.getHttpServer())
				.post('/api/generation-requests')
				.set('Cookie', anonymousCookie)
				.send({
					hostname: 'https://non-existent-hostname.com',
					provider: Provider.OLLAMA
				})
				.expect(HttpStatus.BAD_REQUEST);

			// Deserialize error response using DTO
			const apiResponse = ApiResponse.fromJSON(response.body as { code: ResponseCode; message: unknown });
			expect(apiResponse.getСode()).toBe(ResponseCode.INVALID);
		});

		it('should reject invalid provider', async () => {
			await request(app.getHttpServer())
				.post('/api/generation-requests')
				.set('Cookie', anonymousCookie)
				.send({
					hostname: 'https://example.com',
					provider: 'invalid-provider'
				})
				.expect(HttpStatus.BAD_REQUEST);
		});
	});
});
