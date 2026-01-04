import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { AuthModule } from '../modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GenerationsModule } from '../modules/generations/generations.module';
import { HttpModule } from '../modules/http/http.module';
import { Module } from '@nestjs/common';
import { QueueModule } from '../modules/queue/queue.module';
import { ApiResponse } from '../utils/response/api-response';
import { RobotsModule } from '../modules/robots/robots.module';
import { SitemapModule } from '../modules/sitemap/sitemap.module';
import { StatsModule } from '../modules/stats/stats.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketModule } from '../modules/websocket/websocket.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		EventEmitterModule.forRoot({
			global: true
		}),
		AppConfigModule,
		HttpModule,
		RobotsModule,
		SitemapModule,
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		}),
		QueueModule,
		AuthModule,
		GenerationsModule,
		StatsModule,
		WebSocketModule
	],
	providers: [ApiResponse],
	exports: [ApiResponse]
})
export class AppModule { }
