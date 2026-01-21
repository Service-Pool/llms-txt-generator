import { CalculationsModule } from '../calculations/calculations.module';
import { ClsModule } from 'nestjs-cls';
import { ContentExtractorService } from './services/content-extractor.service';
import { GeminiService } from './services/llm/gemini.service';
import { Generation } from './entities/generation.entity';
import { GenerationJobHandler } from '../queue/handlers/generation-job.handler';
import { GenerationRequest } from './entities/generation-request.entity';
import { GenerationRequestsController } from './generation-requests.controller';
import { GenerationRequestService } from './services/generation-request.service';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './services/generations.service';
import { Module } from '@nestjs/common';
import { OllamaService } from './services/llm/ollama.service';
import { QueueModule } from '../queue/queue.module';
import { RobotsModule } from '../robots/robots.module';
import { SitemapModule } from '../sitemap/sitemap.module';
import { StripeModule } from '../stripe/stripe.module';
import { ApiResponse } from '../../utils/response/api-response';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entitites/user.entity';
import { NoCheckoutSessionExistsValidator, NoPaymentIntentExistsValidator } from '../../validators/payment-method.validator';
import { RefundOwnershipValidator, RefundFailedStatusValidator, RefundPaidValidator, RefundNotRefundedValidator, RefundJobRemovedValidator } from '../../validators/refund.validator';
import { GenerationRequestValidator, GenerationRequestOwnershipValidator } from '../../validators/generation-request.validator';

@Module({
	imports: [
		TypeOrmModule.forFeature([Generation, GenerationRequest, User]),
		ClsModule,
		CalculationsModule,
		QueueModule,
		RobotsModule,
		SitemapModule,
		StripeModule
	],
	controllers: [GenerationsController, GenerationRequestsController],
	providers: [
		GenerationsService,
		GenerationRequestService,
		GenerationJobHandler,
		ContentExtractorService,
		OllamaService,
		GeminiService,
		ApiResponse,
		NoCheckoutSessionExistsValidator,
		NoPaymentIntentExistsValidator,
		GenerationRequestValidator,
		GenerationRequestOwnershipValidator,
		RefundOwnershipValidator,
		RefundFailedStatusValidator,
		RefundPaidValidator,
		RefundNotRefundedValidator,
		RefundJobRemovedValidator
	],
	exports: [GenerationsService, GenerationRequestService, GenerationJobHandler]
})
export class GenerationsModule { }
