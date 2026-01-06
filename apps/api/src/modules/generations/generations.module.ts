import { ContentExtractorService } from './services/content-extractor.service';
import { CurrentUserService } from '../auth/services/current-user.service';
import { GeminiService } from './services/llm/gemini.service';
import { Generation } from './entities/generation.entity';
import { GenerationJobHandler } from '../queue/handlers/generation-job.handler';
import { GenerationRequest } from './entities/generation-request.entity';
import { GenerationRequestsController } from './generation-requests.controller';
import { GenerationRequestService } from './services/generation-request.service';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './services/generations.service';
import { Module } from '@nestjs/common';
import { OllamaService } from './services/llm/ollama.service';
import { QueueModule } from '../queue/queue.module';
import { RobotsModule } from '../robots/robots.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { ApiResponse } from '../../utils/response/api-response';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entitites/user.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([Generation, GenerationRequest, User]),
		QueueModule,
		RobotsModule,
		SitemapModule
	],
	controllers: [GenerationsController, GenerationRequestsController],
	providers: [
		GenerationsService,
		GenerationRequestService,
		GenerationJobHandler,
		ContentExtractorService,
		OllamaService,
		GeminiService,
		CurrentUserService,
		ApiResponse
	],
	exports: [GenerationsService, GenerationRequestService, GenerationJobHandler]
})
export class GenerationsModule { }
