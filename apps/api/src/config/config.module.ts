import { AppConfigService } from '@/config/config.service';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
	providers: [AppConfigService],
	exports: [AppConfigService]
})

export class AppConfigModule { }
