import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, IsNotEmpty, IsEnum, Matches, IsInt, Min } from 'class-validator';
import { Provider } from '../../../enums/provider.enum';
import { RobotsAccessibleValidator, RobotsSitemapExistsValidator, SitemapAccessibleValidator } from '../../../validators/hostname.validator';
import { CalculationValidator } from '../../../validators/calculation.validator';
import { GenerationRequestValidator, GenerationRequestOwnershipValidator } from '../../../validators/generation-request.validator';
import { NoCheckoutSessionExistsValidator, NoPaymentIntentExistsValidator } from '../../../validators/payment-method.validator';
import { RefundOwnershipValidator, RefundFailedStatusValidator, RefundPaidValidator, RefundNotRefundedValidator, RefundJobRemovedValidator } from '../../../validators/refund.validator';
import { Type } from 'class-transformer';

/**
 * DTO для создания генерации
 */
class CreateGenerationDtoRequest {
	@IsString()
	@IsNotEmpty()
	@CalculationValidator.validateCalculationExists({
		message: 'Calculation for this hostname does not exist. Please create it first via POST /api/calculations'
	})
	@Matches(HOSTNAME_VALIDATION.regex, {
		message: HOSTNAME_VALIDATION.message
	})
	@RobotsAccessibleValidator.validateRobotsAccessible({
		message: 'robots.txt is not accessible'
	})
	@RobotsSitemapExistsValidator.validateSitemapExists({
		message: 'No sitemap found in robots.txt'
	})
	@SitemapAccessibleValidator.validateSitemapAccessible({
		message: 'Sitemap is not accessible'
	})
	public hostname: string;

	@IsEnum(Provider)
	@IsNotEmpty()
	public provider: Provider;

	constructor(hostname: string, provider: Provider) {
		this.hostname = hostname;
		this.provider = provider;
	}
}

/**
 * DTO для параметра requestId
 */
class GenerationRequestIdDtoRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@GenerationRequestValidator.validateGenerationRequestExists({
		message: 'Generation request not found'
	})
	@GenerationRequestOwnershipValidator.validateOwnership({
		message: 'Generation request does not belong to you'
	})
	public requestId: number;

	constructor(requestId: number) {
		this.requestId = requestId;
	}
}

/**
 * DTO для создания Checkout Session (payment-link)
 */
class CreatePaymentLinkDtoRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@GenerationRequestValidator.validateGenerationRequestExists({
		message: 'Generation request not found'
	})
	@GenerationRequestOwnershipValidator.validateOwnership({
		message: 'Generation request does not belong to you'
	})
	@NoPaymentIntentExistsValidator.validateNoPaymentIntentExists({
		message: 'Payment Intent already exists for this request. Cannot create Checkout Session.'
	})
	public requestId: number;

	constructor(requestId: number) {
		this.requestId = requestId;
	}
}

/**
 * DTO для создания Payment Intent (payment-intent)
 */
class CreatePaymentIntentDtoRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@GenerationRequestValidator.validateGenerationRequestExists({
		message: 'Generation request not found'
	})
	@GenerationRequestOwnershipValidator.validateOwnership({
		message: 'Generation request does not belong to you'
	})
	@NoCheckoutSessionExistsValidator.validateNoCheckoutSessionExists({
		message: 'Checkout session already exists for this request. Cannot create Payment Intent.'
	})
	public requestId: number;

	constructor(requestId: number) {
		this.requestId = requestId;
	}
}

/**
 * DTO для возврата средств (refund)
 */
class RefundGenerationRequestDtoRequest {
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@GenerationRequestValidator.validateGenerationRequestExists({
		message: 'Generation request not found'
	})
	@RefundOwnershipValidator.validateOwnership({
		message: 'Generation request does not belong to you'
	})
	@RefundFailedStatusValidator.validateFailedStatus({
		message: 'Can only refund failed generations'
	})
	@RefundPaidValidator.validatePaid({
		message: 'Generation request was not paid'
	})
	@RefundNotRefundedValidator.validateNotRefunded({
		message: 'Generation request was already refunded'
	})
	@RefundJobRemovedValidator.validateJobRemoved({
		message: 'Cannot refund: job is still in queue (retrying)'
	})
	public requestId: number;

	constructor(requestId: number) {
		this.requestId = requestId;
	}
}

export { CreateGenerationDtoRequest, GenerationRequestIdDtoRequest, CreatePaymentLinkDtoRequest, CreatePaymentIntentDtoRequest, RefundGenerationRequestDtoRequest };
