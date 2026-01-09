import { AppConfigService } from '../../config/config.service';
import { Calculation } from './entities/calculation.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceCalculator } from '../../utils/price.utils';
import { PriceModel, ProviderPrices } from './models/provider-prices.model';
import { Provider } from '../../enums/provider.enum';
import { Repository, DataSource } from 'typeorm';
import { RobotsService } from '../robots/robots.service';
import { SitemapService } from '../sitemap/sitemap.service';

@Injectable()
class CalculationsService {
	private readonly logger = new Logger(CalculationsService.name);

	public constructor(
		private readonly configService: AppConfigService,
		private readonly robotsService: RobotsService,
		private readonly sitemapService: SitemapService,
		private readonly dataSource: DataSource,
		@InjectRepository(Calculation) private readonly calculationRepository: Repository<Calculation>
	) { }

	public async findById(id: number): Promise<Calculation | null> {
		return this.calculationRepository.findOneBy({ id });
	}

	public async findByHostname(hostname: string): Promise<Calculation | null> {
		return this.calculationRepository.findOne({
			where: { hostname },
			order: { createdAt: 'DESC' }
		});
	}

	public async findOrCreateCalculation(hostname: string): Promise<{ calculation: Calculation; isNew: boolean }> {
		// Start transaction
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Check if calculation already exists
			const existing = await queryRunner.manager.findOne(Calculation, {
				where: { hostname },
				order: { createdAt: 'DESC' }
			});

			if (existing) {
				await queryRunner.commitTransaction();
				return { calculation: existing, isNew: false };
			}

			// Get sitemap URLs from robots.txt (or fallback to /sitemap.xml)
			const sitemapUrls = await this.robotsService.getSitemaps(hostname);

			let urlsCount = 0;

			// Count URLs
			for await (const _url of this.sitemapService.getUrlsStream(sitemapUrls)) {
				urlsCount++;
			}

			this.logger.log(`Analysis complete for ${hostname}: ${urlsCount} URLs found`);

			// Calculate pricing for all providers
			const prices: ProviderPrices[] = [];

			for (const provider of Object.values(Provider)) {
				const providerConfig = this.configService.providers[provider];
				const total = PriceCalculator.calculateEstimatedPrice(
					urlsCount,
					providerConfig.pricePerUrl,
					providerConfig.minPayment
				);

				const priceModel = new PriceModel(total, providerConfig.pricePerUrl);
				prices.push(new ProviderPrices(provider, priceModel));
			}

			// Create and save calculation
			const entity = queryRunner.manager.create(Calculation, {
				hostname,
				urlsCount,
				urlsCountPrecise: true,
				prices: prices,
				currency: this.configService.providers[Provider.GEMINI].priceCurrency
			});
			const calculation = await queryRunner.manager.save(entity);

			await queryRunner.commitTransaction();
			return { calculation, isNew: true };
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}

export { CalculationsService };
