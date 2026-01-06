import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { HostnameValidator } from '../../../validators/hostname.validator';

/**
 * DTO для анализа hostname
 */
class AnalyzeHostnameDtoRequest {
	@IsString()
	@IsNotEmpty()
	@Matches(HOSTNAME_VALIDATION.regex, {
		message: HOSTNAME_VALIDATION.message
	})
	@HostnameValidator.validateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
	})
	public hostname: string;

	constructor(hostname: string) {
		this.hostname = hostname;
	}
}

export { AnalyzeHostnameDtoRequest };
