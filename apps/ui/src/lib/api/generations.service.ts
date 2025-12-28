import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { Provider, GenerationStatus, type ApiResponse } from '@api/shared';

const configService = new AppConfigService();

// Generation-specific types
export interface Generation {
	id: number;
	hostname: string;
	provider: Provider;
	status: GenerationStatus;
	content: string | null;
	errorMessage: string | null;
	entriesCount: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface GenerationRequest {
	id: number;
	generationId: number;
	userId: number | null;
	sessionId: string;
	requestedAt: string;
	generation?: Generation;
}

export interface GenerationsListDto {
	items: GenerationRequest[];
	total: number;
	page: number;
	limit: number;
}

export interface CreateGenerationRequest {
	hostname: string;
	provider: Provider;
}

export class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationRequest): Promise<ApiResponse<Generation>> {
		return this.fetch<Generation>(configService.endpoints.generations.base, {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	public async findById(id: number): Promise<ApiResponse<Generation>> {
		return this.fetch<Generation>(configService.endpoints.generations.byId(id));
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

	public async pollUntilComplete(
		id: number,
		onProgress?: (generation: Generation) => void
	): Promise<Generation> {
		const interval = configService.polling.interval;
		const maxAttempts = configService.polling.maxAttempts;
		let attempts = 0;

		return new Promise<Generation>((resolve, reject) => {
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
