import { MessageSuccess } from '../../utils/response/message-success';
import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { GenerationRequestService } from './services/generation-request.service';
import { CreateGenerationDtoRequest } from './dto/generation-request.dto';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse } from './dto/generation-response.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { type FastifyRequest } from 'fastify';
import { CalculationsService } from '../calculations/calculations.service';

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
	public async create(
		@Body() createGenerationDto: CreateGenerationDtoRequest,
		@Req() httpRequest: FastifyRequest
	): Promise<ApiResponse<MessageSuccess<GenerationRequestDtoResponse>>> {
		// Save session to DB before creating generation (for FK constraint)
		await new Promise<void>((resolve, reject) => {
			httpRequest.session.save((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		// Calculation гарантированно существует благодаря CalculationValidator в DTO
		const calculation = await this.calculationsService.findByHostname(createGenerationDto.hostname);
		const response = await this.generationRequestService.findOrCreateGenerationRequest(
			calculation!.id,
			createGenerationDto.provider
		);

		return this.apiResponse.success(response);
	}

	@Delete(':requestId')
	public async delete(@Param('requestId') requestId: string): Promise<ApiResponse<MessageSuccess<string>>> {
		const id = parseInt(requestId);

		if (isNaN(id)) {
			throw new Error('Invalid request ID');
		}

		await this.generationRequestService.deleteRequest(id);
		return this.apiResponse.success('Generation request deleted');
	}
}

export { GenerationRequestsController };
