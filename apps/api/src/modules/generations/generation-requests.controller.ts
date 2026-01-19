import { ApiResponse } from '../../utils/response/api-response';
import { CalculationsService } from '../calculations/calculations.service';
import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateGenerationDtoRequest, GenerationRequestIdDtoRequest } from './dto/generation-request.dto';
import { GenerationRequestService } from './services/generation-request.service';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse, PaymentLinkDtoResponse } from './dto/generation-response.dto';
import { MessageSuccess } from '../../utils/response/message-success';

@Controller('api/generation-requests')
class GenerationRequestsController {
	constructor(
		private readonly generationRequestService: GenerationRequestService,
		private readonly calculationsService: CalculationsService,
		private readonly apiResponse: ApiResponse
	) { }

	@Get()
	public async list(
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 20
	): Promise<ApiResponse<MessageSuccess<GenerationRequestsListDtoResponse>>> {
		const result = await this.generationRequestService.listUserGenerations(page, limit);
		return this.apiResponse.success(result);
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(@Body() createGenerationDto: CreateGenerationDtoRequest): Promise<ApiResponse<MessageSuccess<GenerationRequestDtoResponse>>> {
		// Calculation гарантированно существует благодаря CalculationValidator в DTO
		const calculation = await this.calculationsService.findByHostname(createGenerationDto.hostname);
		const response = await this.generationRequestService.findOrCreateGenerationRequest(
			calculation!.id,
			createGenerationDto.provider
		);

		return this.apiResponse.success(response);
	}

	@Delete(':requestId')
	public async delete(@Param() params: GenerationRequestIdDtoRequest): Promise<ApiResponse<MessageSuccess<string>>> {
		await this.generationRequestService.deleteRequest(params.requestId);
		return this.apiResponse.success('Generation request deleted');
	}

	@Get(':requestId/payment-link')
	public async createPaymentLink(@Param() params: GenerationRequestIdDtoRequest): Promise<ApiResponse<MessageSuccess<PaymentLinkDtoResponse>>> {
		const response = await this.generationRequestService.createPaymentLink(params.requestId);
		return this.apiResponse.success(response);
	}
}

export { GenerationRequestsController };
