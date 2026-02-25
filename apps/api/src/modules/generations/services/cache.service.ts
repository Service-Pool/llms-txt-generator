import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '@/config/config.service';

/**
 * Generic Redis cache service
 * TTL: 24 часа
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
	 * Паттерн "get or compute and cache" (Symfony-like)
	 * Пытается получить значение из кэша, если нет - вызывает callback и кэширует результат
	 *
	 * @param hashKey Ключ HASH в Redis
	 * @param field Поле в HASH (путь или '__description__')
	 * @param callback Функция для вычисления значения при cache miss (опционально)
	 * @returns Закэшированное или вычисленное значение, null если не найдено и нет callback
	 */
	public async get(hashKey: string, field: string, callback?: () => Promise<string>): Promise<string | null> {
		try {
			const cached = await this.redis.hget(hashKey, field);

			if (cached) {
				this.logger.debug(`Cache HIT for key=${hashKey}, field=${field}`);
				return cached;
			}

			if (!callback) {
				this.logger.debug(`Cache MISS for key=${hashKey}, field=${field} - no callback provided`);
				return null;
			}

			this.logger.debug(`Cache MISS for key=${hashKey}, field=${field} - computing...`);
			const computed = await callback();

			await this.redis.hset(hashKey, field, computed);
			await this.redis.expire(hashKey, this.TTL_SECONDS);

			this.logger.debug(`Cached computed value for key=${hashKey}, field=${field}`);

			return computed;
		} catch (error) {
			this.logger.error(`Error in get() for key=${hashKey}, field=${field}:`, error);
			// При ошибке кэша вычисляем значение если есть callback
			return callback ? callback() : null;
		}
	}

	/**
	 * Сохранить значение в кэш
	 */
	public async set(hashKey: string, field: string, value: string): Promise<void> {
		try {
			await this.redis.hset(hashKey, field, value);
			await this.redis.expire(hashKey, this.TTL_SECONDS);
			this.logger.debug(`Cached value for key=${hashKey}, field=${field}`);
		} catch (error) {
			this.logger.error(`Error in set() for key=${hashKey}, field=${field}:`, error);
		}
	}

	/**
	 * Очистить весь кэш (для тестирования)
	 */
	public async flushAll(): Promise<void> {
		await this.redis.flushdb();
		this.logger.warn('Cache flushed');
	}
}

export { CacheService };
