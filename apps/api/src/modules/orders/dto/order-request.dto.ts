import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '../../../validators/host.validator';
import { Validate } from 'class-validator';

class CreateOrderRequestDto {
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
	@Validate(SitemapAccessibleValidator)
	@Validate(RobotsAccessibleValidator)
	hostname: string;
}

class StartOrderRequestDto {
	@IsString()
	@IsNotEmpty()
	modelId: string;
}

export { CreateOrderRequestDto, StartOrderRequestDto };
