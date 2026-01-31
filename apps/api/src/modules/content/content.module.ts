import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentStore } from './entities/content-store.entity';
import { SnapshotUrl } from './entities/snapshot-url.entity';
import { ContentExtractionService } from './services/content-extraction.service';
import { ContentStoreService } from './services/content-store.service';
import { SnapshotService } from './services/snapshot.service';

@Module({
	imports: [TypeOrmModule.forFeature([ContentStore, SnapshotUrl])],
	providers: [
		ContentExtractionService,
		ContentStoreService,
		SnapshotService
	],
	exports: [ContentExtractionService, ContentStoreService, SnapshotService]
})

export class ContentModule { }
