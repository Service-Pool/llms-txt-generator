import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { type FastifySessionObject } from '@fastify/session';
import { GenerationsService } from './services/generations.service';
import { CreateGenerationDtoRequest } from '../shared/dtos/generation-request.dto';
import { GenerationsListDtoResponse, GenerationDtoResponse } from '../shared/dtos/generation-response.dto';
import { Session } from '../common/decorators/session.decorator';
import { ResponseFactory } from '../common/utils/response.factory';

@Controller('api/generations')
class GenerationsController {
	constructor(private readonly generationsService: GenerationsService) {}

	@Get()
	public async list(@Session() session: FastifySessionObject, @Query('page') page: number = 1, @Query('limit') limit: number = 20): Promise<ReturnType<typeof ResponseFactory.success<GenerationsListDtoResponse>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;

		const result = await this.generationsService.listUserGenerations(userId, sessionId, page, limit);

		return ResponseFactory.success(result);
	}

	@Get(':id')
	public async getOne(@Param('id') id: string): Promise<ReturnType<typeof ResponseFactory.success<CreateGenerationDtoRequest>> | ReturnType<typeof ResponseFactory.notFound>> {
		const generation = await this.generationsService.findById(parseInt(id));

		if (!generation) {
			return ResponseFactory.notFound('Generation not found');
		}

		return ResponseFactory.success(GenerationDtoResponse.fromEntity(generation));
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(@Body() createGenerationDto: CreateGenerationDtoRequest, @Session() session: FastifySessionObject, @Req() request: FastifyRequest): Promise<ReturnType<typeof ResponseFactory.success<GenerationDtoResponse>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;

		// Save session to DB before creating generation (for FK constraint)
		await new Promise<void>((resolve, reject) => {
			request.session.save((err) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve();
			});
		});

		const generation = await this.generationsService.findOrCreateGenerationRequest(
			createGenerationDto.hostname,
			createGenerationDto.provider,
			userId,
			sessionId
		);

		return ResponseFactory.success(GenerationDtoResponse.fromEntity(generation));
	}

	@Delete(':id')
	public async delete(@Param('id') id: string): Promise<ReturnType<typeof ResponseFactory.success<{ message: string }>>> {
		await this.generationsService.delete(parseInt(id));

		return ResponseFactory.success({ message: 'Generation deleted' });
	}
}

export { GenerationsController };
