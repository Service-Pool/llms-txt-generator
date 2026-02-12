import { ApiProperty } from '@nestjs/swagger';

/**
 * Stats Response DTO
 * Returns completed orders count
 */
export class StatsResponseDto {
	@ApiProperty({ description: 'Number of completed orders', example: 42 })
	count: number;

	/**
	 * Create StatsResponseDto from plain object
	 */
	static fromJSON(json: Record<string, unknown>): StatsResponseDto {
		const dto = new StatsResponseDto();
		dto.count = json.count as number;
		return dto;
	}

	/**
	 * Create StatsResponseDto instance
	 */
	static create(count: number): StatsResponseDto {
		const dto = new StatsResponseDto();
		dto.count = count;
		return dto;
	}
}
