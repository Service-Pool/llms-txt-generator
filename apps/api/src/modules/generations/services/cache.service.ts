import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../../../config/config.service';

/**
 * Сервис для кэширования результатов генерации в Redis
 * TTL: 24 часа (как указано в PRD)
 */
@Injectable()
class CacheService implements OnModuleInit {
	private readonly logger = new Logger(CacheService.name);
	private redis: Redis;
	private readonly TTL_SECONDS = 60 * 60 * 24; // 24 часа

	constructor(private readonly configService: AppConfigService) { }

	onModuleInit() {
		this.redis = new Redis({
			host: this.configService.redis.host,
			port: this.configService.redis.port,
			// password: this.configService.redis.password,
			// db: this.configService.redis.db,
			maxRetriesPerRequest: 3,
			retryStrategy: (times: number) => {
				const delay = Math.min(times * 50, 2000);
				return delay;
			}
		});

		this.redis.on('connect', () => {
			this.logger.log('Connected to Redis');
		});

		this.redis.on('error', (error) => {
			this.logger.error('Redis connection error:', error);
		});
	}

	/**
	 * Получить кэшированное саммари
	 * @param modelId ID модели (для изоляции кэша разных моделей)
	 * @param contentHash Hash контента
	 * @returns Кэшированное саммари или null
	 */
	async getCachedSummary(
		modelId: number,
		contentHash: string
	): Promise<string | null> {
		try {
			const key = this.buildCacheKey(modelId, contentHash);
			const cached = await this.redis.get(key);

			if (cached) {
				this.logger.debug(`Cache HIT for model=${modelId}, hash=${contentHash.substring(0, 8)}...`);
			} else {
				this.logger.debug(`Cache MISS for model=${modelId}, hash=${contentHash.substring(0, 8)}...`);
			}

			return cached;
		} catch (error) {
			this.logger.error('Error getting cached summary:', error);
			return null; // Не бросаем ошибку, просто возвращаем null (кэш - это не критично)
		}
	}

	/**
	 * Сохранить саммари в кэш
	 * @param modelId ID модели
	 * @param contentHash Hash контента
	 * @param summary Сгенерированное саммари
	 */
	async setCachedSummary(
		modelId: number,
		contentHash: string,
		summary: string
	): Promise<void> {
		try {
			const key = this.buildCacheKey(modelId, contentHash);
			await this.redis.setex(key, this.TTL_SECONDS, summary);

			this.logger.debug(`Cached summary for model=${modelId}, hash=${contentHash.substring(0, 8)}... (TTL: ${this.TTL_SECONDS}s)`);
		} catch (error) {
			this.logger.error('Error setting cached summary:', error);
			// Не бросаем ошибку - кэш не критичен
		}
	}

	/**
	 * Получить кэшированное описание сайта
	 * @param modelId ID модели
	 * @param orderHash Hash заказа (для изоляции)
	 * @returns Кэшированное описание или null
	 */
	async getCachedDescription(
		modelId: number,
		orderHash: string
	): Promise<string | null> {
		try {
			const key = this.buildDescriptionCacheKey(modelId, orderHash);
			const cached = await this.redis.get(key);

			if (cached) {
				this.logger.debug(`Description cache HIT for model=${modelId}, order=${orderHash.substring(0, 8)}...`);
			} else {
				this.logger.debug(`Description cache MISS for model=${modelId}, order=${orderHash.substring(0, 8)}...`);
			}

			return cached;
		} catch (error) {
			this.logger.error('Error getting cached description:', error);
			return null;
		}
	}

	/**
	 * Сохранить описание сайта в кэш
	 * @param modelId ID модели
	 * @param orderHash Hash заказа
	 * @param description Сгенерированное описание
	 */
	async setCachedDescription(
		modelId: number,
		orderHash: string,
		description: string
	): Promise<void> {
		try {
			const key = this.buildDescriptionCacheKey(modelId, orderHash);
			await this.redis.setex(key, this.TTL_SECONDS, description);

			this.logger.debug(`Cached description for model=${modelId}, order=${orderHash.substring(0, 8)}... (TTL: ${this.TTL_SECONDS}s)`);
		} catch (error) {
			this.logger.error('Error setting cached description:', error);
		}
	}

	/**
	 * Построить ключ кэша для саммари
	 */
	private buildCacheKey(modelId: number, contentHash: string): string {
		return `summary:model:${modelId}:content:${contentHash}`;
	}

	/**
	 * Построить ключ кэша для описания
	 */
	private buildDescriptionCacheKey(modelId: number, orderHash: string): string {
		return `description:model:${modelId}:order:${orderHash}`;
	}

	/**
	 * Очистить весь кэш (для тестирования)
	 */
	async flushAll(): Promise<void> {
		await this.redis.flushdb();
		this.logger.warn('Cache flushed');
	}
}

export { CacheService };
