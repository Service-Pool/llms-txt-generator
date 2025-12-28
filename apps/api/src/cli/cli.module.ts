import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { GlobalHttpModule } from '../common/http.module';
import { QueueModule } from '../queue/queue.module';
import { GenerationsModule } from '../generations/generations.module';
import { GenerationWorkerCommand } from './commands/generation-worker.command';

@Module({
	imports: [
		AppConfigModule,
		GlobalHttpModule,
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		}),
		QueueModule,
		GenerationsModule
	],
	providers: [GenerationWorkerCommand]
})
export class CliModule {}
