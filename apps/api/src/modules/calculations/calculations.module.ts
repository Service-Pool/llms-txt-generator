import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Calculation } from './entities/calculation.entity';
import { CalculationsController } from './calculations.controller';
import { CalculationsService } from './calculations.service';
import { RobotsModule } from '../robots/robots.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { ApiResponse } from '../../utils/response/api-response';

@Module({
	imports: [
		TypeOrmModule.forFeature([Calculation]),
		RobotsModule,
		SitemapModule
	],
	controllers: [CalculationsController],
	providers: [
		ApiResponse,
		CalculationsService
	],
	exports: [CalculationsService]
})
class CalculationsModule { }

export { CalculationsModule };
