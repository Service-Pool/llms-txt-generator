import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { ValidateHostnameRobotsAndSitemap } from '../../common/validators/hostname.validator';
import { HOSTNAME_VALIDATION } from '../../config/config.service';
import { Provider } from '../enums/provider.enum';

/**
 * DTO для создания генерации
 */
class CreateGenerationDtoRequest {
	@IsString()
	@IsNotEmpty()
	@Matches(HOSTNAME_VALIDATION.regex, {
		message: HOSTNAME_VALIDATION.message
	})
	@ValidateHostnameRobotsAndSitemap({
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
