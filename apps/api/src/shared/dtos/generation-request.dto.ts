import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { ValidateHostnameRobotsAndSitemap } from '../../common/validators/hostname.validator';
import { Provider } from '../enums/provider.enum';

/**
 * DTO для создания генерации
 */
class CreateGenerationDtoRequest {
	@IsString()
	@IsNotEmpty()
	@Matches(/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
		message: 'Hostname must be a valid domain with protocol (http:// or https://) without path, query or trailing slash'
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

/**
 * DTO для анализа hostname
 */
class AnalyzeHostnameDtoRequest {
	@IsString()
	@IsNotEmpty()
	@Matches(/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
		message: 'Hostname must be a valid domain with protocol (http:// or https://) without path, query or trailing slash'
	})
	@ValidateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
	})
	public hostname: string;

	constructor(hostname: string) {
		this.hostname = hostname;
	}
}

export { CreateGenerationDtoRequest, AnalyzeHostnameDtoRequest };
