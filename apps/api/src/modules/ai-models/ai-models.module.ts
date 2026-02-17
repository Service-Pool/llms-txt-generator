import { Module } from '@nestjs/common';
import { AiModelsConfigService } from './services/ai-models-config.service';
import { AiModelConfigRepository } from './repositories/ai-model-config.repository';

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
