import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@/config/config.service';
import { QueueConfig } from '@/modules/queue/entities/queue-config.entity';

/**
 * In-memory repository for Queue configurations
 * Implements repository pattern while loading data from config file
 *
 * This allows the application to work as if QueueConfig is a database entity,
 * making future migration to database storage seamless.
 */
@Injectable()
class QueueConfigRepository {
	private queues: QueueConfig[] = [];

	constructor(private readonly configService: AppConfigService) {
		this.loadFromConfig();
	}

	/**
	 * Load queues from config file
	 */
	private loadFromConfig(): void {
		this.queues = this.configService.queueConfig;
	}

	/**
	 * Find all queues
	 */
	findAll(): QueueConfig[] {
		return [...this.queues];
	}

	/**
	 * Find queue by name
	 */
	findByName(name: string): QueueConfig | null {
		const queue = this.queues.find(q => q.name === name);
		return queue || null;
	}

	/**
	 * Find queues by type
	 */
	findByType(type: 'local' | 'cloud'): QueueConfig[] {
		return this.queues.filter(q => q.type === type);
	}

	/**
	 * Count all queues
	 */
	count(): number {
		return this.queues.length;
	}

	/**
	 * Reload queues from config (useful for hot-reload in development)
	 */
	reload(): void {
		this.loadFromConfig();
	}
}

export { QueueConfigRepository };
