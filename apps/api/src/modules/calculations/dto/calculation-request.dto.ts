import { HOSTNAME_VALIDATION } from '../../../config/config.service';
import { IsString, Matches } from 'class-validator';
import { RobotsAccessibleValidator, RobotsSitemapExistsValidator, SitemapAccessibleValidator } from '../../../validators/hostname.validator';

class CreateCalculationDtoRequest {
	@IsString()
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
}

export { CreateCalculationDtoRequest };
