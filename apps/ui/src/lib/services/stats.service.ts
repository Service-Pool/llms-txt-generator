import { HttpClient } from './api.service';
import { configService } from './config.service';
import { StatsResponseDto, type ApiResponse } from '@api/shared';

/**
 * Stats API Service
 * Handles statistics retrieval
 */
class StatsService extends HttpClient {
	/**
	 * Get completed orders count
	 */
	async getCompleted(): Promise<ApiResponse<StatsResponseDto>> {
		return this.fetch(configService.endpoints.stats.completed, StatsResponseDto);
	}
}

// Singleton instance
export const statsService = new StatsService();
