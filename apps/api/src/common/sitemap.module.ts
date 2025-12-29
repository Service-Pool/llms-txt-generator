import { Module, Global } from '@nestjs/common';
import { SitemapService } from './services/sitemap.service';

@Global()
@Module({
	providers: [SitemapService],
	exports: [SitemapService]
})
export class SitemapModule {}
