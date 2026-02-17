import { Module } from '@nestjs/common';
import { ContentExtractionService } from './services/content-extraction.service';

@Module({
	providers: [
		ContentExtractionService
	],
	exports: [ContentExtractionService]
})

export class ContentModule { }
