import { HttpClient } from './http.client';
import { configService } from './config.service';
import {
	ApiResponse,
	GenerationDtoResponse,
	GenerationRequestDtoResponse,
	GenerationRequestsListDtoResponse,
	CreateGenerationDtoRequest,
	PaymentLinkDtoResponse,
	PaymentIntentDtoResponse,
	MessageSuccess
} from '@api/shared';

class GenerationsService extends HttpClient {
	public async create(request: CreateGenerationDtoRequest): Promise<ApiResponse<MessageSuccess<GenerationRequestDtoResponse>>> {
		return this.fetch(configService.endpoints.generationRequests.base, GenerationRequestDtoResponse, {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	public async findById(id: number): Promise<ApiResponse<MessageSuccess<GenerationDtoResponse>>> {
		return this.fetch(configService.endpoints.generations.byId(id), GenerationDtoResponse);
	}

	public async list(page = 1, limit = 20): Promise<ApiResponse<MessageSuccess<GenerationRequestsListDtoResponse>>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.fetch(`${configService.endpoints.generationRequests.base}?${params}`, GenerationRequestsListDtoResponse);
	}

	public async refreshOne(requestId: number): Promise<ApiResponse<MessageSuccess<GenerationRequestsListDtoResponse>>> {
		const params = new URLSearchParams({
			generationRequestId: requestId.toString(),
			page: '1',
			limit: '1'
		});
		return this.fetch(`${configService.endpoints.generationRequests.base}?${params}`, GenerationRequestsListDtoResponse);
	}

	public async delete(id: number): Promise<ApiResponse<MessageSuccess<void>>> {
		return this.fetch(configService.endpoints.generationRequests.byId(id), undefined, {
			method: 'DELETE'
		});
	}

	public async getPaymentLink(requestId: number): Promise<ApiResponse<MessageSuccess<PaymentLinkDtoResponse>>> {
		return this.fetch(configService.endpoints.generationRequests.paymentLink(requestId), PaymentLinkDtoResponse);
	}

	public async getPaymentIntent(requestId: number): Promise<ApiResponse<MessageSuccess<PaymentIntentDtoResponse>>> {
		return this.fetch(configService.endpoints.generationRequests.paymentIntent(requestId), PaymentIntentDtoResponse);
	}
}

const generationsService = new GenerationsService();

export { generationsService };
