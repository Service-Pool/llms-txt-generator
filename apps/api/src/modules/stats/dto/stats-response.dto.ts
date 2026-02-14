import { ApiProperty } from '@nestjs/swagger';

/**
 * Stats Attributes
 */
class StatsAttributes {
	@ApiProperty({ description: 'Number of completed orders', example: 42 })
	count: number;

	static create(count: number): StatsAttributes {
		const attributes = new StatsAttributes();
		attributes.count = count;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): StatsAttributes {
		const attributes = new StatsAttributes();
		attributes.count = json.count as number;
		return attributes;
	}
}

/**
 * Stats Response DTO
 * Returns completed orders count
 */
class StatsResponseDto {
	@ApiProperty({ description: 'Statistics data', type: StatsAttributes })
	attributes: StatsAttributes;

	@ApiProperty({
		description: 'HATEOAS navigation links',
		example: {}
	})
	_links: Record<string, never>;

	static create(count: number): StatsResponseDto {
		const dto = new StatsResponseDto();
		dto.attributes = StatsAttributes.create(count);
		dto._links = {};
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): StatsResponseDto {
		const dto = new StatsResponseDto();
		dto.attributes = StatsAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, never>;
		return dto;
	}
}

export { StatsResponseDto };
