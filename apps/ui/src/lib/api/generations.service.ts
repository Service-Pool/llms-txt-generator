import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import {
	ApiResponseModel,
	GenerationDtoResponse,
	GenerationRequestDtoResponse,
	GenerationRequestsListDtoResponse,
	CreateGenerationDtoRequest
} from '@api/shared';

const configService = new AppConfigService();

export class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationDtoRequest): Promise<ApiResponseModel<GenerationRequestDtoResponse>> {
		const response = await this.fetch<Record<string, unknown>>(configService.endpoints.generationRequests.base, {
			method: 'POST',
			body: JSON.stringify(request)
		});

		return new ApiResponseModel(
			response.code,
			GenerationRequestDtoResponse.fromJson(response.message),
			response.error
		);
	}

	public async findById(id: number): Promise<ApiResponseModel<GenerationDtoResponse>> {
		const response = await this.fetch<Record<string, unknown>>(configService.endpoints.generations.byId(id));

		return new ApiResponseModel(
			response.code,
			GenerationDtoResponse.fromJson(response.message),
			response.error
		);
	}

	public async list(page = 1, limit = 20): Promise<ApiResponseModel<GenerationRequestsListDtoResponse>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		const response = await this.fetch<Record<string, unknown>>(`${configService.endpoints.generationRequests.base}?${params}`);

		return new ApiResponseModel(
			response.code,
			GenerationRequestsListDtoResponse.fromJson(response.message),
			response.error
		);
	}

	public async delete(id: number): Promise<ApiResponseModel<string>> {
		return this.fetch<string>(configService.endpoints.generationRequests.byId(id), {
			method: 'DELETE'
		});
	}
}
