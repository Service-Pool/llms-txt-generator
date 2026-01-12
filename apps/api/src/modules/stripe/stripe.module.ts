import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { GenerationRequest } from '../generations/entities/generation-request.entity';
import { Generation } from '../generations/entities/generation.entity';
import { QueueModule } from '../queue/queue.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([GenerationRequest, Generation]),
		QueueModule
	],
	controllers: [StripeController],
	providers: [StripeService],
	exports: [StripeService]
})
export class StripeModule { }
