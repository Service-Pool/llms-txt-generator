import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { type FastifySessionObject } from '@fastify/session';
import { GenerationRequestService } from './services/generation-request.service';
import { CreateGenerationDtoRequest } from '../shared/dtos/generation-request.dto';
import { GenerationRequestsListDtoResponse, GenerationRequestDtoResponse } from '../shared/dtos/generation-response.dto';
import { Session } from '../common/decorators/session.decorator';
import { ResponseFactory } from '../common/utils/response.factory';

@Controller('api/generation-requests')
class GenerationRequestsController {
	constructor(private readonly generationRequestService: GenerationRequestService) {}

	@Get()
	public async list(
		@Session() session: FastifySessionObject,
		@Query('page') page: number = 1,
		@Query('limit') limit: number = 20
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestsListDtoResponse>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;

		const result = await this.generationRequestService.listUserGenerations(userId, sessionId, page, limit);

		return ResponseFactory.success(result);
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(
		@Body() createGenerationDto: CreateGenerationDtoRequest,
		@Session() session: FastifySessionObject,
		@Req() httpRequest: FastifyRequest
	): Promise<ReturnType<typeof ResponseFactory.success<GenerationRequestDtoResponse>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;

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
	public async delete(
		@Param('requestId') requestId: string,
		@Session() session: FastifySessionObject
	): Promise<ReturnType<typeof ResponseFactory.success<string>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;
		const id = parseInt(requestId);

		if (isNaN(id)) {
			throw new Error('Invalid request ID');
		}

		await this.generationRequestService.deleteRequest(id, userId, sessionId);

		return ResponseFactory.success('Generation request deleted');
	}
}

export { GenerationRequestsController };
