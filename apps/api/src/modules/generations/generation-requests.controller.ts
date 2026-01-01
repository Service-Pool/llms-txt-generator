import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { CreateGenerationDtoRequest } from './dto/generation-request.dto';
import { GenerationRequestService } from './services/generation-request.service';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse } from './dto/generation-response.dto';
import { ResponseFactory } from '../../utils/response.factory';
import { type FastifyRequest } from 'fastify';

@Controller('api/generation-requests')
class GenerationRequestsController {
	constructor(private readonly generationRequestService: GenerationRequestService) {}

	@Get()
	public async list(
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 20
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestsListDtoResponse>>> {
		const result = await this.generationRequestService.listUserGenerations(page, limit);
		return ResponseFactory.success(result);
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(
		@Body() createGenerationDto: CreateGenerationDtoRequest,
		@Req() httpRequest: FastifyRequest
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestDtoResponse>>> {
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
		return ResponseFactory.success(response);
	}

	@Delete(':requestId')
	public async delete(@Param('requestId') requestId: string): Promise<ReturnType<typeof ResponseFactory.success<string>>> {
		const id = parseInt(requestId);

		if (isNaN(id)) {
			throw new Error('Invalid request ID');
		}

		await this.generationRequestService.deleteRequest(id);
		return ResponseFactory.success('Generation request deleted');
	}
}

export { GenerationRequestsController };
