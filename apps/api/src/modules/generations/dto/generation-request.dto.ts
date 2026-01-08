import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { Provider } from '../../../enums/provider.enum';
import { HostnameValidator } from '../../../validators/hostname.validator';
import { CalculationValidator } from '../../../validators/calculation.validator';

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

export { CreateGenerationDtoRequest };
