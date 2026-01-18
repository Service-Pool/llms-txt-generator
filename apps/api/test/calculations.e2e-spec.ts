import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { initTestDatabase, cleanupTables } from './test-setup';
import { CalculationsModule } from '../src/modules/calculations/calculations.module';
import { AppConfigModule } from '../src/config/config.module';
import { RobotsService } from '../src/modules/robots/robots.service';
import { SitemapService } from '../src/modules/sitemap/sitemap.service';
import { Calculation } from '../src/modules/calculations/entities/calculation.entity';
import { Generation } from '../src/modules/generations/entities/generation.entity';
import { GenerationRequest } from '../src/modules/generations/entities/generation-request.entity';
import { User } from '../src/modules/auth/entitites/user.entity';
import { Session } from '../src/modules/auth/entitites/session.entity';
import { PriceModel } from '../src/modules/calculations/models/provider-prices.model';
import { Provider } from '../src/enums/provider.enum';
import fixtures from './fixtures/calculations.fixtures.json';

// Mock global fetch for HostnameValidator
const mockFetch = jest.fn();
global.fetch = mockFetch;

interface CalculationFixture {
	name: string;
	description: string;
	input: {
		hostname: string;
	};
	mocks: {
		sitemapUrls: string[];
		pageUrls?: string[];
		pageUrlsCount?: number;
	};
	expected: {
		hostname: string;
		urlsCount: number;
		urlsCountPrecise: boolean;
		prices: Array<{
			provider: Provider;
			price: PriceModel;
		}>;
	};
}

const testCases = fixtures.calculations as CalculationFixture[];

describe('CalculationsController (e2e)', () => {
	let app: INestApplication<App>;
	let dataSource: DataSource;

	// Mock implementations
	const mockRobotsService = {
		getSitemaps: jest.fn()
	};

	const mockSitemapService = {
		getUrlsStream: jest.fn()
	};

	beforeAll(async () => {
		// Initialize test database
		dataSource = await initTestDatabase();

		// Clean all tables once before test suite starts
		await cleanupTables(dataSource, ['calculations', 'generation_requests', 'generations', 'sessions', 'users']);

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					isGlobal: true,
					ignoreEnvFile: true
				}),
				EventEmitterModule.forRoot({ global: true }),
				AppConfigModule,
				TypeOrmModule.forRoot({
					type: 'mysql',
					host: process.env.DB_HOST,
					port: parseInt(process.env.DB_PORT || '3306'),
					username: process.env.DB_USER,
					password: process.env.DB_PASSWORD,
					database: process.env.DB_NAME,
					entities: [Calculation, Generation, GenerationRequest, User, Session],
					synchronize: true
				}),
				CalculationsModule
			]
		})
			.overrideProvider(RobotsService)
			.useValue(mockRobotsService)
			.overrideProvider(SitemapService)
			.useValue(mockSitemapService)
			.compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		await app.init();
	});

	afterAll(async () => {
		await app.close();
		await dataSource.destroy();
	});

	beforeEach(() => {
		// Reset mocks before each test (but keep data in DB)
		jest.clearAllMocks();

		// Setup default fetch mock for HostnameValidator
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

	/**
	 * Helper to generate URLs for fixtures with pageUrlsCount
	 */
	function generateUrls(hostname: string, count: number): string[] {
		return Array.from({ length: count }, (_, i) => `${hostname}/page-${i + 1}`);
	}

	/**
	 * Setup mocks for a specific fixture
	 */
	function setupMocksForFixture(fixture: CalculationFixture): void {
		const { hostname } = fixture.input;
		const { sitemapUrls, pageUrls, pageUrlsCount } = fixture.mocks;

		// Mock robots service
		mockRobotsService.getSitemaps.mockResolvedValue(sitemapUrls);

		// Mock sitemap service - determine URLs to yield
		const urlsToYield = pageUrls ?? generateUrls(hostname, pageUrlsCount ?? 0);

		mockSitemapService.getUrlsStream.mockImplementation(function* () {
			for (const url of urlsToYield) {
				yield url;
			}
		});
	}

	describe('POST /api/calculations - fixture-based tests', () => {
		it.each(testCases)(
			'$name: $description',
			async (fixture: CalculationFixture) => {
				// Arrange
				setupMocksForFixture(fixture);

				// Act - make the request
				await request(app.getHttpServer())
					.post('/api/calculations')
					.query({ hostname: fixture.input.hostname })
					.expect(200);

				// Assert - verify database state (black box: only check final result)
				const savedCalculation = await dataSource
					.getRepository(Calculation)
					.findOneBy({ hostname: fixture.expected.hostname });

				expect(savedCalculation).not.toBeNull();
				expect(savedCalculation!.hostname).toBe(fixture.expected.hostname);
				expect(savedCalculation!.urlsCount).toBe(fixture.expected.urlsCount);
				expect(savedCalculation!.urlsCountPrecise).toBe(fixture.expected.urlsCountPrecise);

				// Verify prices array
				expect(savedCalculation!.prices).toBeInstanceOf(Array);
				expect(savedCalculation!.prices.length).toBe(fixture.expected.prices.length);

				// Check each expected price
				for (const expectedPrice of fixture.expected.prices) {
					const actualPrice = savedCalculation!.prices.find(p => p.provider === expectedPrice.provider);

					expect(actualPrice).toBeDefined();
					expect(actualPrice!.price.total).toBeCloseTo(expectedPrice.price.total, 2);
					expect(actualPrice!.price.perUrl).toBeCloseTo(expectedPrice.price.perUrl, 6);
				}
			}
		);
	});

	describe('POST /api/calculations - caching behavior', () => {
		it('should use cached calculation (no external service calls for existing hostname)', async () => {
			const fixture = testCases[0];
			// Record already exists from previous fixture test

			// Request for existing hostname
			await request(app.getHttpServer())
				.post('/api/calculations')
				.query({ hostname: fixture.input.hostname })
				.expect(200);

			// Verify only ONE record in database
			const allCalculations = await dataSource
				.getRepository(Calculation)
				.findBy({ hostname: fixture.input.hostname });

			expect(allCalculations.length).toBe(1);

			// Verify external services were NOT called (used cache)
			expect(mockRobotsService.getSitemaps).toHaveBeenCalledTimes(0);
			expect(mockSitemapService.getUrlsStream).toHaveBeenCalledTimes(0);
		});
	});

	describe('POST /api/calculations - validation', () => {
		it('should reject invalid hostname format with 400 and create no new DB records', async () => {
			const countBefore = await dataSource.getRepository(Calculation).count();

			const invalidHostnames = [
				'not-a-url',
				'ftp://invalid.com',
				'https://example.com/path',
				'https://example.com?query=1'
			];

			for (const hostname of invalidHostnames) {
				await request(app.getHttpServer())
					.post('/api/calculations')
					.query({ hostname })
					.expect(400);
			}

			// Verify no NEW records created in database
			const countAfter = await dataSource.getRepository(Calculation).count();
			expect(countAfter).toBe(countBefore);
		});
	});
});
