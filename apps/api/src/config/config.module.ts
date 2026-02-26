import { AppConfigService } from '@/config/config.service';
import { ConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true })],
	providers: [AppConfigService],
	exports: [AppConfigService]
})

export class AppConfigModule { }
