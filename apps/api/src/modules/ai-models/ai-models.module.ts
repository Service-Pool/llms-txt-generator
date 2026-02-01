import { Module } from '@nestjs/common';
import { AiModelsConfigService } from './services/ai-models-config.service';

@Module({
	providers: [AiModelsConfigService],
	exports: [AiModelsConfigService]
})

export class AiModelsModule { }
