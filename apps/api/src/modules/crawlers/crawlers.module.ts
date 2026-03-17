import { Module } from '@nestjs/common';
import { CrawlersService } from '@/modules/crawlers/services/crawlers.service';
import { SitemapParserService } from '@/modules/crawlers/services/sitemap-parser.service';

@Module({
	providers: [CrawlersService, SitemapParserService],
	exports: [CrawlersService]
})

export class CrawlersModule { }
