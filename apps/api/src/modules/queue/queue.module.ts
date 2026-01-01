import { Generation } from '../generations/entities/generation.entity';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Queue Module
 * Provides queue services for job processing
 */
@Module({
	imports: [TypeOrmModule.forFeature([Generation])],
	providers: [QueueService],
	exports: [QueueService]
})
export class QueueModule {}
