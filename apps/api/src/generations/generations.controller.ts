import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { type FastifySessionObject } from '@fastify/session';
import { GenerationsService } from './services/generations.service';
import { CreateGenerationDto } from './dto/request.dto';
import { GenerationsListDto } from './dto/response.dto';
import { Session } from '../common/decorators/session.decorator';
import { ApiResponseDto } from '../common/dto/api-response';
import { Generation } from './entities/generation.entity';

@Controller('api/generations')
class GenerationsController {
	constructor(private readonly generationsService: GenerationsService) {}

	@Get()
	public async list(@Session() session: FastifySessionObject, @Query('page') page: number = 1, @Query('limit') limit: number = 20): Promise<ReturnType<typeof ApiResponseDto.success<GenerationsListDto>>> {
		const userId = session.userId || null;
		const sessionId = session.sessionId;

		const result = await this.generationsService.listUserGenerations(userId, sessionId, page, limit);

		return ApiResponseDto.success(result);
	}

	@Get(':id')
	public async getOne(@Param('id') id: string): Promise<ReturnType<typeof ApiResponseDto.success<Generation>> | ReturnType<typeof ApiResponseDto.notFound>> {
		const generation = await this.generationsService.findById(parseInt(id));

		if (!generation) {
			return ApiResponseDto.notFound('Generation not found');
		}

		return ApiResponseDto.success(generation);
	}

	@Post()
	@HttpCode(HttpStatus.ACCEPTED)
	public async create(@Body() createGenerationDto: CreateGenerationDto, @Session() session: FastifySessionObject, @Req() request: FastifyRequest): Promise<ReturnType<typeof ApiResponseDto.success<Generation>>> {
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

		return ApiResponseDto.success(generation);
	}

	@Delete(':id')
	public async delete(@Param('id') id: string): Promise<ReturnType<typeof ApiResponseDto.success<{ message: string }>>> {
		await this.generationsService.delete(parseInt(id));

		return ApiResponseDto.success({ message: 'Generation deleted' });
	}
}

export { GenerationsController };
