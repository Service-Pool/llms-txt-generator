import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GenerationsModule } from './generations/generations.module';
import { HttpModule } from './common/http.module';
import { Module } from '@nestjs/common';
import { QueueModule } from './queue/queue.module';
import { RobotsModule } from './common/robots.module';
import { SitemapModule } from './common/sitemap.module';
import { StatsModule } from './stats/stats.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketModule } from './websocket/websocket.module';

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
	]
})
export class AppModule {}
