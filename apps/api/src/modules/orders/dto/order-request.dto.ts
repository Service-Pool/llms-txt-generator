import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '../../../validators/host.validator';
import { OrderHasOutputValidator } from '../../../validators/order.validator';
import { AiModelValidator } from '../../../validators/ai-model.validator';
import { Validate } from 'class-validator';

class CreateOrderRequestDto {
	@ApiProperty({
		description: 'Website hostname or URL to process',
		example: 'https://example.com',
		format: 'url'
	})
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
	@Validate(SitemapAccessibleValidator)
	@Validate(RobotsAccessibleValidator)
	hostname: string;
}

class CalculateOrderRequestDto {
	@ApiProperty({
		description: 'AI model identifier for price calculation',
		example: 'gpt-4'
	})
	@IsString()
	@IsNotEmpty()
	@Validate(AiModelValidator)
	modelId: string;
}

class DownloadOrderRequestDto {
	@ApiProperty({
		description: 'Order ID for download',
		example: 123
	})
	@Validate(OrderHasOutputValidator)
	id: number;
}

export { CreateOrderRequestDto, CalculateOrderRequestDto, DownloadOrderRequestDto };
