import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './services/generations.service';
import { QueueModule } from '../queue/queue.module';
import { ContentExtractorService } from './services/content-extractor.service';
import { GenerationJobHandler } from '../queue/handlers/generation-job.handler';
import { OllamaService } from './services/llm/ollama.service';
import { GeminiService } from './services/llm/gemini.service';
import { Generation } from './entities/generation.entity';
import { GenerationRequest } from './entities/generation-request.entity';
import { User } from '../auth/entitites/user.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Generation, GenerationRequest, User]),
		QueueModule
	],
	controllers: [GenerationsController],
	providers: [
		GenerationsService,
		GenerationJobHandler,
		ContentExtractorService,
		OllamaService,
		GeminiService
	],
	exports: [GenerationsService, GenerationJobHandler]
})
export class GenerationsModule {}
