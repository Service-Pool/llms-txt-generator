import { ClsService } from 'nestjs-cls';
import { GenerationRequest } from '../modules/generations/entities/generation-request.entity';
import { GenerationStatus } from '../enums/generation-status.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JobUtils } from '../utils/job.utils';
import { GenerationRequestStatus } from '../enums/generation-request-status.enum';
import { QueueService } from '../modules/queue/queue.service';
import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Repository } from 'typeorm';
import { StripeService } from '../modules/stripe/stripe.service';
import { type UserClsStore } from '../modules/auth/models/user-context.model';

/**
 * Проверяет, что GenerationRequest существует и принадлежит текущему пользователю
 */
@ValidatorConstraint({ async: true })
@Injectable()
class RefundOwnershipValidator implements ValidatorConstraintInterface {
	constructor(
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly cls: ClsService<UserClsStore>
	) { }

	public static validateOwnership(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RefundOwnershipValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { id: requestId }
		});

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		const userId = this.cls.get('userId');
		const sessionId = this.cls.get('sessionId');

		return userId
			? generationRequest.userId === userId
			: generationRequest.sessionId === sessionId;
	}
}

/**
 * Проверяет, что Generation в статусе FAILED
 */
@ValidatorConstraint({ async: true })
@Injectable()
class RefundFailedStatusValidator implements ValidatorConstraintInterface {
	constructor(@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>) { }

	public static validateFailedStatus(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RefundFailedStatusValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { id: requestId },
			relations: ['generation']
		});

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		return generationRequest.generation.status === GenerationStatus.FAILED;
	}
}

/**
 * Проверяет, что GenerationRequest был оплачен
 */
@ValidatorConstraint({ async: true })
@Injectable()
class RefundPaidValidator implements ValidatorConstraintInterface {
	constructor(
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly stripeService: StripeService
	) { }

	public static validatePaid(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RefundPaidValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOneBy({ id: requestId });

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		// Проверяем что есть payment link или client secret
		const paymentLinkOrSecret = generationRequest.checkoutSessionUrl || generationRequest.paymentIntentClientSecret;
		if (!paymentLinkOrSecret) {
			return false; // Нет платежа вообще
		}

		// Получить Payment ID и проверить реальный статус в Stripe
		const paymentId = this.stripeService.extractPaymentId(paymentLinkOrSecret);
		if (!paymentId) {
			return false;
		}

		const { status, paymentIntent } = await this.stripeService.getGenerationRequestStatus(paymentId);

		// Проверяем что платёж успешно проведён в Stripe
		// Для Checkout Session проверяем через paymentIntent, для Payment Intent - напрямую
		if (paymentIntent) {
			return paymentIntent.status === 'succeeded' && paymentIntent.amount > 0;
		}

		// Если status вернулся как ACCEPTED - значит платёж успешен
		return status === GenerationRequestStatus.ACCEPTED.value;
	}
}

/**
 * Проверяет, что возврат еще не был выполнен
 */
@ValidatorConstraint({ async: true })
@Injectable()
class RefundNotRefundedValidator implements ValidatorConstraintInterface {
	constructor(
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly stripeService: StripeService
	) { }

	public static validateNotRefunded(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RefundNotRefundedValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOneBy({ id: requestId });

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		// Проверяем статус в базе
		if (generationRequest.status === GenerationRequestStatus.REFUNDED.value) {
			return false;
		}

		// Проверяем в Stripe - может возврат был сделан, но статус в базе не обновился
		const paymentLinkOrSecret = generationRequest.checkoutSessionUrl || generationRequest.paymentIntentClientSecret;
		if (!paymentLinkOrSecret) {
			return true; // Нет платежа - нет и возврата
		}

		const paymentId = this.stripeService.extractPaymentId(paymentLinkOrSecret);
		if (!paymentId) {
			return true;
		}

		// Для Checkout Session нужно сначала получить Payment Intent ID
		let paymentIntentId = paymentId;
		if (paymentId.startsWith('cs_')) {
			const { paymentIntent } = await this.stripeService.getGenerationRequestStatus(paymentId);
			if (!paymentIntent) {
				return true;
			}
			paymentIntentId = paymentIntent.id;
		}

		// Проверяем наличие успешных refunds в Stripe
		const hasRefund = await this.stripeService.hasSuccessfulRefund(paymentIntentId);
		return !hasRefund;
	}
}

/**
 * Проверяет, что job удален из очереди (все retry исчерпаны)
 */
@ValidatorConstraint({ async: true })
@Injectable()
class RefundJobRemovedValidator implements ValidatorConstraintInterface {
	constructor(
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
		private readonly queueService: QueueService
	) { }

	public static validateJobRemoved(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RefundJobRemovedValidator
			});
		};
	}

	public async validate(requestId: number): Promise<boolean> {
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { id: requestId },
			relations: ['generation']
		});

		if (!generationRequest) {
			return true; // Пропускаем проверку, за существование отвечает другой валидатор
		}

		const jobId = JobUtils.generateId(generationRequest.generation.id);
		const jobExists = await this.queueService.jobExists(jobId);

		return !jobExists;
	}
}

export {
	RefundOwnershipValidator,
	RefundFailedStatusValidator,
	RefundPaidValidator,
	RefundNotRefundedValidator,
	RefundJobRemovedValidator
};
