import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '../../../validators/host.validator';
import { OrderHasOutputValidator } from '../../../validators/order.validator';
import { AiModelValidator } from '../../../validators/ai-model.validator';
import { Validate } from 'class-validator';

class CreateOrderRequestDto {
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
	@Validate(SitemapAccessibleValidator)
	@Validate(RobotsAccessibleValidator)
	hostname: string;
}

class CalculateOrderRequestDto {
	@IsString()
	@IsNotEmpty()
	@Validate(AiModelValidator)
	modelId: string;
}

class DownloadOrderRequestDto {
	@Validate(OrderHasOutputValidator)
	id: number;
}

export { CreateOrderRequestDto, CalculateOrderRequestDto, DownloadOrderRequestDto };
