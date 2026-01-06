import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import {
	ApiResponse,
	GenerationDtoResponse,
	GenerationRequestDtoResponse,
	GenerationRequestsListDtoResponse,
	CreateGenerationDtoRequest,
	MessageSuccess
} from '@api/shared';

const configService = new AppConfigService();

class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationDtoRequest): Promise<ApiResponse<MessageSuccess<GenerationRequestDtoResponse>>> {
		return this.fetch(
			configService.endpoints.generationRequests.base,
			{
				method: 'POST',
				body: JSON.stringify(request)
			},
			GenerationRequestDtoResponse
		);
	}

	public async findById(id: number): Promise<ApiResponse<MessageSuccess<GenerationDtoResponse>>> {
		return this.fetch(configService.endpoints.generations.byId(id), undefined, GenerationDtoResponse);
	}

	public async list(page = 1, limit = 20): Promise<ApiResponse<MessageSuccess<GenerationRequestsListDtoResponse>>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.fetch(`${configService.endpoints.generationRequests.base}?${params}`, undefined, GenerationRequestsListDtoResponse);
	}

	public async delete(id: number): Promise<ApiResponse<MessageSuccess<void>>> {
		return this.fetch(configService.endpoints.generationRequests.byId(id), {
			method: 'DELETE'
		});
	}
}
export { GenerationsService };
