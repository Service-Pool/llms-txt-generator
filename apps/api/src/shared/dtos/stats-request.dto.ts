import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ValidateHostnameRobotsAndSitemap } from '../../common/validators/hostname.validator';
import { HOSTNAME_VALIDATION } from '../../config/config.service';

/**
 * DTO для анализа hostname
 */
class AnalyzeHostnameDtoRequest {
	@IsString()
	@IsNotEmpty()
	@Matches(HOSTNAME_VALIDATION.regex, {
		message: HOSTNAME_VALIDATION.message
	})
	@ValidateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
	})
	public hostname: string;

	constructor(hostname: string) {
		this.hostname = hostname;
	}
}

export { AnalyzeHostnameDtoRequest };
