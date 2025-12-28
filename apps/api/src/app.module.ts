import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationsModule } from './generations/generations.module';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { GlobalHttpModule } from './common/http.module';
import { AuthModule } from './auth/auth.module';

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
		AuthModule,
		GenerationsModule
	]
})
export class AppModule {}
