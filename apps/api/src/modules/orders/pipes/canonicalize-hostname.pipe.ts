import { Injectable, PipeTransform } from '@nestjs/common';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';

/**
 * Pipe that canonicalizes hostname before validation
 * Resolves redirects (e.g., shopify.com → www.shopify.com)
 */
@Injectable()
class CanonicalizeHostnamePipe implements PipeTransform {
	constructor(private readonly crawlersService: CrawlersService) { }

	async transform<T extends { hostname?: string }>(value: T): Promise<T> {
		if (value?.hostname) {
			value.hostname = await this.crawlersService.getCanonicalHostname(value.hostname);
		}
		return value;
	}
}

export { CanonicalizeHostnamePipe };
