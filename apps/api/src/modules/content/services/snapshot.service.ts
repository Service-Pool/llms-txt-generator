import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SnapshotUrl } from '../entities/snapshot-url.entity';
import { ContentExtractionService } from './content-extraction.service';
import { ContentStoreService } from './content-store.service';

@Injectable()
class SnapshotService {
	private readonly logger = new Logger(SnapshotService.name);

	constructor(
		@InjectRepository(SnapshotUrl)
		private readonly snapshotUrlRepository: Repository<SnapshotUrl>,
		private readonly contentExtractionService: ContentExtractionService,
		private readonly contentStoreService: ContentStoreService
	) { }

	/**
	 * Создаёт снапшоты для URLs (глобально, без привязки к orderId)
	 * Использует upsert: если snapshot с таким url+contentHash уже есть — пропускает
	 */
	public async createSnapshot(urls: string[], batchSize: number): Promise<number> {
		this.logger.log(`Creating snapshots for ${urls.length} URLs (batch size: ${batchSize})`);

		let successCount = 0;
		const errors: string[] = [];

		for (let i = 0; i < urls.length; i += batchSize) {
			const batch = urls.slice(i, i + batchSize);
			await Promise.all(batch.map(async (url) => {
				try {
					const { title, content } = await this.contentExtractionService.extractContent(url);
					const contentHash = this.contentExtractionService.calculateHash(content);

					// Проверка существования snapshot
					const existing = await this.snapshotUrlRepository.findOne({
						where: { url, contentHash }
					});

					if (!existing) {
						await this.contentStoreService.storeContent(contentHash, content);
						await this.snapshotUrlRepository.save({ url, title, contentHash });
						this.logger.debug(`Created snapshot for: ${url}`);
					} else {
						this.logger.debug(`Snapshot already exists for: ${url}`);
					}

					successCount++;
				} catch (error) {
					const errorMessage = `Failed to process ${url}: ${error instanceof Error ? error.message : String(error)}`;
					errors.push(errorMessage);
					this.logger.error(errorMessage);
				}
			}));
		}

		if (errors.length > 0) {
			this.logger.warn(`Snapshot creation completed with ${errors.length} errors`);
		}

		this.logger.log(`Snapshots created: ${successCount}/${urls.length} URLs processed`);

		return successCount;
	}

	/**
	 * Получает snapshots по списку URLs
	 * Возвращает Map: url -> SnapshotUrl
	 */
	public async getSnapshotsByUrls(urls: string[]): Promise<Map<string, SnapshotUrl>> {
		if (urls.length === 0) {
			return new Map();
		}

		const snapshots = await this.snapshotUrlRepository
			.createQueryBuilder('snapshot')
			.where('snapshot.url IN (:...urls)', { urls })
			.getMany();

		// Возвращаем Map для быстрого lookup
		const result = new Map<string, SnapshotUrl>();
		for (const snapshot of snapshots) {
			result.set(snapshot.url, snapshot);
		}

		return result;
	}
}

export { SnapshotService };
