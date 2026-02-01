import { Module } from '@nestjs/common';
import { CrawlersService } from './services/crawlers.service';

@Module({
	providers: [CrawlersService],
	exports: [CrawlersService]
})

export class CrawlersModule { }
