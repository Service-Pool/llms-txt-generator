import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { GenerationRequestService } from './services/generation-request.service';
import { CreateGenerationDtoRequest } from '../shared/dtos/generation-request.dto';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse } from '../shared/dtos/generation-response.dto';
import { ResponseFactory } from '../common/utils/response.factory';
import { CurrentUserService } from '../common/services/current-user.service';

@Controller('api/generation-requests')
class GenerationRequestsController {
	constructor(
		private readonly generationRequestService: GenerationRequestService,
		private readonly currentUserService: CurrentUserService
	) {}

	@Get()
	public async list(
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 20
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestsListDtoResponse>>> {
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();

		const result = await this.generationRequestService.listUserGenerations(userId, sessionId, page, limit);

		return ResponseFactory.success(result);
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(
		@Body() createGenerationDto: CreateGenerationDtoRequest,
		@Req() httpRequest: FastifyRequest
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestDtoResponse>>> {
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();

		// Save session to DB before creating generation (for FK constraint)
		await new Promise<void>((resolve, reject) => {
			httpRequest.session.save((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		const result = await this.generationRequestService.findOrCreateGenerationRequest(
			createGenerationDto.hostname,
			createGenerationDto.provider,
			userId,
			sessionId
		);

		// Attach the generation object to the generationRequest for DTO conversion
		result.generationRequest.generation = result.generation;

		const response = GenerationRequestDtoResponse.fromEntity(result.generationRequest);
		return ResponseFactory.success(response);
	}

	@Delete(':requestId')
	public async delete(@Param('requestId') requestId: string): Promise<ReturnType<typeof ResponseFactory.success<string>>> {
		const userId = this.currentUserService.getUserId();
		const sessionId = this.currentUserService.getSessionId();
		const id = parseInt(requestId);

		if (isNaN(id)) {
			throw new Error('Invalid request ID');
		}

		await this.generationRequestService.deleteRequest(id, userId, sessionId);

		return ResponseFactory.success('Generation request deleted');
	}
}

export { GenerationRequestsController };
