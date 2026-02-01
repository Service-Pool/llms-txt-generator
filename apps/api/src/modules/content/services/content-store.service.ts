import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContentStore } from '../entities/content-store.entity';

@Injectable()
class ContentStoreService {
	private readonly logger = new Logger(ContentStoreService.name);

	constructor(@InjectRepository(ContentStore)
	private readonly contentStoreRepository: Repository<ContentStore>) { }

	/**
	 * Сохраняет контент с дедупликацией по хешу
	 * - Если контент уже существует: увеличивает refCount
	 * - Если новый: создаёт запись с refCount=1
	 * Возвращает hash
	 */
	public async storeContent(contentHash: string, rawContent: string): Promise<string> {
		const existing = await this.contentStoreRepository.findOne({
			where: { contentHash }
		});

		if (existing) {
			// Контент уже существует - увеличиваем refCount и обновляем lastAccessedAt
			await this.contentStoreRepository.update(contentHash, {
				refCount: existing.refCount + 1,
				lastAccessedAt: new Date()
			});

			this.logger.debug(`Content hash ${contentHash} already exists, incremented refCount to ${existing.refCount + 1}`);
		} else {
			// Новый контент - создаём запись
			await this.contentStoreRepository.save({
				contentHash,
				rawContent,
				refCount: 1,
				lastAccessedAt: new Date()
			});

			this.logger.debug(`Stored new content with hash ${contentHash}`);
		}

		return contentHash;
	}

	/**
	 * Получает контент по хешу
	 * Обновляет lastAccessedAt при каждом доступе
	 */
	public async getContent(contentHash: string): Promise<string> {
		const content = await this.contentStoreRepository.findOne({
			where: { contentHash }
		});

		if (!content) {
			throw new NotFoundException(`Content with hash ${contentHash} not found`);
		}

		// Обновляем время последнего доступа
		await this.contentStoreRepository.update(contentHash, {
			lastAccessedAt: new Date()
		});

		return content.rawContent;
	}

	/**
	 * Уменьшает refCount для массива хешей
	 * Используется при очистке после завершения генерации
	 * Если refCount становится 0 - запись остаётся для потенциального переиспользования
	 * (удаляется только cron-задачей по расписанию)
	 */
	public async decrementRefCount(hashes: string[]): Promise<void> {
		if (hashes.length === 0) {
			return;
		}

		const contents = await this.contentStoreRepository.find({
			where: { contentHash: In(hashes) }
		});

		for (const content of contents) {
			const newRefCount = Math.max(0, content.refCount - 1);

			await this.contentStoreRepository.update(content.contentHash, {
				refCount: newRefCount
			});

			this.logger.debug(`Decremented refCount for ${content.contentHash} to ${newRefCount}`);
		}
	}

	/**
	 * Получает количество записей с нулевым refCount
	 * Используется для статистики и мониторинга
	 */
	public async getUnusedContentCount(): Promise<number> {
		return this.contentStoreRepository.count({
			where: { refCount: 0 }
		});
	}

	/**
	 * Удаляет неиспользуемый контент старше указанного количества дней
	 * Используется в cron-задаче для очистки
	 */
	public async cleanupOldContent(daysOld: number = 30): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		const result = await this.contentStoreRepository
			.createQueryBuilder()
			.delete()
			.where('refCount = 0')
			.andWhere('lastAccessedAt < :cutoffDate', { cutoffDate })
			.execute();

		this.logger.log(`Cleaned up ${result.affected || 0} unused content records older than ${daysOld} days`);

		return result.affected || 0;
	}
}

export { ContentStoreService };
