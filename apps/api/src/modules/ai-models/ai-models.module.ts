import { Module } from '@nestjs/common';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { AiModelConfigRepository } from '@/modules/ai-models/repositories/ai-model-config.repository';
import { AiModelsController } from '@/modules/ai-models/controllers/ai-models.controller';

@Module({
	controllers: [AiModelsController],
	providers: [
		AiModelConfigRepository,
		AiModelsConfigService
	],
	exports: [
		AiModelConfigRepository,
		AiModelsConfigService
	]
})

export class AiModelsModule { }
