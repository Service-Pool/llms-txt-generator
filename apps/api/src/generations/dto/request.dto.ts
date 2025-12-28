import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { Provider } from '../../config/config.service';
import { ValidateHostnameRobotsAndSitemap } from '../../common/validators/hostname.validator';

class CreateGenerationDto {
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
}

export { CreateGenerationDto };
