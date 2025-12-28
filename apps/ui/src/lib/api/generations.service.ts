import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import {
	GenerationStatus,
	ApiResponseModel,
	GenerationDto,
	GenerationsListDto,
	CreateGenerationDto
} from '@api/shared';

const configService = new AppConfigService();

export class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationDto): Promise<ApiResponseModel<GenerationDto>> {
		const response = await this.fetch<Record<string, unknown>>(configService.endpoints.generations.base, {
			method: 'POST',
			body: JSON.stringify(request)
		});

		return new ApiResponseModel(
			response.code,
			GenerationDto.fromJson(response.message),
			response.error
		);
	}

	public async findById(id: number): Promise<ApiResponseModel<GenerationDto>> {
		const response = await this.fetch<Record<string, unknown>>(configService.endpoints.generations.byId(id));

		return new ApiResponseModel(
			response.code,
			GenerationDto.fromJson(response.message),
			response.error
		);
	}

	public async list(page = 1, limit = 20): Promise<ApiResponseModel<GenerationsListDto>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		const response = await this.fetch<Record<string, unknown>>(`${configService.endpoints.generations.base}?${params}`);

		return new ApiResponseModel(
			response.code,
			GenerationsListDto.fromJson(response.message),
			response.error
		);
	}

	public async delete(id: number): Promise<ApiResponseModel<{ message: string }>> {
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
