import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import {
	GenerationStatus,
	type ApiResponse,
	type GenerationDto,
	type GenerationsListDto,
	type CreateGenerationDto
} from '@api/shared';

const configService = new AppConfigService();

export class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationDto): Promise<ApiResponse<GenerationDto>> {
		return this.fetch<GenerationDto>(configService.endpoints.generations.base, {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	public async findById(id: number): Promise<ApiResponse<GenerationDto>> {
		return this.fetch<GenerationDto>(configService.endpoints.generations.byId(id));
	}

	public async list(page = 1, limit = 20): Promise<ApiResponse<GenerationsListDto>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.fetch<GenerationsListDto>(`${configService.endpoints.generations.base}?${params}`);
	}

	public async delete(id: number): Promise<ApiResponse<{ message: string }>> {
		return this.fetch<{ message: string }>(configService.endpoints.generations.byId(id), {
			method: 'DELETE'
		});
	}

	public async pollUntilComplete(id: number, onProgress?: (generation: GenerationDto) => void): Promise<GenerationDto> {
		const interval = configService.polling.interval;
		const maxAttempts = configService.polling.maxAttempts;
		let attempts = 0;

		return new Promise<GenerationDto>((resolve, reject) => {
			const poll = async (): Promise<void> => {
				try {
					attempts++;

					if (attempts > maxAttempts) {
						reject(new Error('Polling timeout: max attempts reached'));
						return;
					}

					const response = await this.findById(id);

					if (!response.message) {
						reject(new Error(response.error || 'Failed to fetch generation'));
						return;
					}

					const generation = response.message;

					if (onProgress) {
						onProgress(generation);
					}

					if (generation.status === GenerationStatus.COMPLETED) {
						resolve(generation);
						return;
					}

					if (generation.status === GenerationStatus.FAILED) {
						reject(new Error(generation.errorMessage || 'Generation failed'));
						return;
					}

					setTimeout(() => {
						void poll();
					}, interval);
				} catch (error) {
					reject(error instanceof Error ? error : new Error('Unknown error during polling'));
				}
			};

			void poll();
		});
	}
}
