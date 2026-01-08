import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, Matches } from 'class-validator';
import { HostnameValidator } from '../../../validators/hostname.validator';

class CreateCalculationDtoRequest {
	@IsString()
	@Matches(HOSTNAME_VALIDATION.regex, {
		message: HOSTNAME_VALIDATION.message
	})
	@HostnameValidator.validateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
	})
	public hostname: string;
}

export { CreateCalculationDtoRequest };
