import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { GenerationRequestService } from './services/generation-request.service';
import { CreateGenerationDtoRequest, CalculateHostnameDtoRequest } from './dto/generation-request.dto';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse, CalculateHostnameDtoResponse } from './dto/generation-response.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';
import { type FastifyRequest } from 'fastify';

@Controller('api/generation-requests')
class GenerationRequestsController {
	constructor(
		private readonly generationRequestService: GenerationRequestService,
		private readonly apiResponse: ApiResponse
	) { }

	@Get('calculate')
	public async calculate(@Query() query: CalculateHostnameDtoRequest): Promise<ApiResponse<MessageSuccess<CalculateHostnameDtoResponse> | MessageError>> {
		try {
			const result = await this.generationRequestService.calculateHostname(query.hostname);
			return this.apiResponse.success(result);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to calculate hostname price';
			return this.apiResponse.error(ResponseCode.ERROR, message);
		}
	}

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

		const result = await this.generationRequestService.findOrCreateGenerationRequest(
			createGenerationDto.hostname,
			createGenerationDto.provider
		);

		// Attach the generation object to the generationRequest for DTO conversion
		result.generationRequest.generation = result.generation;

		const response = GenerationRequestDtoResponse.fromEntity(result.generationRequest);
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
