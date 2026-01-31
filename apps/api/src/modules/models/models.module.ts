import { Module } from '@nestjs/common';
import { ModelsConfigService } from './services/models-config.service';

@Module({
	providers: [ModelsConfigService],
	exports: [ModelsConfigService]
})
export class ModelsModule { }
