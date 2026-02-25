import { IsString, IsNotEmpty, IsUrl, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RobotsAccessibleValidator, SitemapAccessibleValidator } from '@/validators/host.validator';
import { OrderHasOutputValidator, OrderCanBeDeletedValidator } from '@/validators/order.validator';
import { AiModelValidator } from '@/validators/ai-model.validator';
import { Validate } from 'class-validator';
import { Type } from 'class-transformer';

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
	@Type(() => Number)
	@IsInt()
	@Validate(OrderHasOutputValidator)
	id: number;
}

class DeleteOrderRequestDto {
	@ApiProperty({
		description: 'Order ID to delete',
		example: 123
	})
	@Type(() => Number)
	@IsInt()
	@Validate(OrderCanBeDeletedValidator)
	id: number;
}

export { CreateOrderRequestDto, CalculateOrderRequestDto, DownloadOrderRequestDto, DeleteOrderRequestDto };
