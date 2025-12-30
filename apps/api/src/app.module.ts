import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GenerationsModule } from './generations/generations.module';
import { StatsModule } from './stats/stats.module';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { HttpModule } from './common/http.module';
import { RobotsModule } from './common/robots.module';
import { SitemapModule } from './common/sitemap.module';
import { AuthModule } from './auth/auth.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
	imports: [
		AppConfigModule,
		HttpModule,
		RobotsModule,
		SitemapModule,
		ConfigModule.forRoot({
			isGlobal: true,
			ignoreEnvFile: true
		}),
		EventEmitterModule.forRoot(),
		TypeOrmModule.forRootAsync({
			inject: [AppConfigService],
			useFactory: (configService: AppConfigService) => configService.typeorm
		}),
		AuthModule,
		GenerationsModule,
		StatsModule,
		WebSocketModule
	]
})
export class AppModule {}
