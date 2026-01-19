import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, IsNotEmpty, IsEnum, Matches, IsInt, Min } from 'class-validator';
import { Provider } from '../../../enums/provider.enum';
import { HostnameValidator } from '../../../validators/hostname.validator';
import { CalculationValidator } from '../../../validators/calculation.validator';
import { GenerationRequestValidator } from '../../../validators/generation-request.validator';
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
	@HostnameValidator.validateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
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
	public requestId: number;

	constructor(requestId: number) {
		this.requestId = requestId;
	}
}

export { CreateGenerationDtoRequest, GenerationRequestIdDtoRequest };
