import { Module } from '@nestjs/common';
import { AiModelsConfigService } from '@/modules/ai-models/services/ai-models-config.service';
import { AiModelConfigRepository } from '@/modules/ai-models/repositories/ai-model-config.repository';

@Module({
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
