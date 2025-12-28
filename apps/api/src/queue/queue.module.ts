import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { Generation } from '../generations/entities/generation.entity';

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
