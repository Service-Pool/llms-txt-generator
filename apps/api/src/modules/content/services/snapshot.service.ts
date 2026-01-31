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
	 * Создаёт снапшот для заказа с параллельным извлечением контента (batchSize)
	 */
	async createSnapshot(orderId: number, urls: string[], batchSize: number): Promise<number> {
		this.logger.log(`Creating snapshot for order ${orderId} with ${urls.length} URLs (batch size: ${batchSize})`);

		let successCount = 0;
		const errors: string[] = [];

		for (let i = 0; i < urls.length; i += batchSize) {
			const batch = urls.slice(i, i + batchSize);
			await Promise.all(batch.map(async (url) => {
				try {
					const { title, content } = await this.contentExtractionService.extractContent(url);
					const contentHash = this.contentExtractionService.calculateHash(content);
					await this.contentStoreService.storeContent(contentHash, content);
					await this.snapshotUrlRepository.save({ orderId, url, title, contentHash });
					successCount++;
					this.logger.debug(`Processed URL ${successCount}/${urls.length}: ${url}`);
				} catch (error) {
					const errorMessage = `Failed to process ${url}: ${error instanceof Error ? error.message : String(error)}`;
					errors.push(errorMessage);
					this.logger.error(errorMessage);
				}
			}));
		}

		if (errors.length > 0) {
			this.logger.warn(`Snapshot for order ${orderId} completed with ${errors.length} errors`);
		}

		this.logger.log(`Snapshot created for order ${orderId}: ${successCount}/${urls.length} URLs processed`);

		return successCount;
	}

	/**
	 * Получает все URLs снапшота для заказа
	 */
	async getSnapshotUrls(orderId: number): Promise<SnapshotUrl[]> {
		return this.snapshotUrlRepository.find({
			where: { orderId },
			order: { createdAt: 'ASC' }
		});
	}

	/**
	 * Удаляет снапшот и уменьшает refCount в ContentStore
	 * Используется при отмене/удалении заказа
	 */
	async deleteSnapshot(orderId: number): Promise<void> {
		const snapshotUrls = await this.getSnapshotUrls(orderId);

		if (snapshotUrls.length === 0) {
			return;
		}

		// Извлекаем хеши для уменьшения refCount
		const hashes = snapshotUrls.map(snapshot => snapshot.contentHash);

		// Удаляем SnapshotUrls
		await this.snapshotUrlRepository.delete({ orderId });

		// Уменьшаем refCount в ContentStore
		await this.contentStoreService.decrementRefCount(hashes);

		this.logger.log(`Deleted snapshot for order ${orderId} (${snapshotUrls.length} URLs)`);
	}

	/**
	 * Получает общее количество уникального контента в снапшоте
	 * (по количеству уникальных хешей)
	 */
	async getUniqueContentCount(orderId: number): Promise<number> {
		const result: { count: string } = await this.snapshotUrlRepository
			.createQueryBuilder('snapshot')
			.select('COUNT(DISTINCT snapshot.contentHash)', 'count')
			.where('snapshot.orderId = :orderId', { orderId })
			.getRawOne();

		return parseInt(result.count, 10);
	}
}

export { SnapshotService };
