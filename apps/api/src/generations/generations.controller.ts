import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GenerationDtoResponse } from '../shared/dtos/generation-response.dto';
import { GenerationProgressEvent, GenerationStatusEvent } from '../shared';
import { GenerationsService } from './services/generations.service';
import { GenerationStatus } from '../shared/enums/generation-status.enum';
import { ResponseFactory } from '../common/utils/response.factory';

@Controller('api/generations')
class GenerationsController {
	constructor(
		private readonly generationsService: GenerationsService,
		private readonly eventEmitter: EventEmitter2
	) {}

	@Get(':id')
	public async getOne(@Param('id') id: string): Promise<ReturnType<typeof ResponseFactory.success<GenerationDtoResponse>> | ReturnType<typeof ResponseFactory.notFound>> {
		const generation = await this.generationsService.findByIdAndUser(parseInt(id));

		if (!generation) {
			return ResponseFactory.notFound('Generation not found');
		}

		return ResponseFactory.success(GenerationDtoResponse.fromEntity(generation));
	}

	@Post(':id/test-event')
	@HttpCode(HttpStatus.OK)
	public testEvent(@Param('id') id: string): ReturnType<typeof ResponseFactory.success<{ message: string }>> {
		const generationId = parseInt(id);

		// Emit test progress event
		this.eventEmitter.emit('generation.progress', new GenerationProgressEvent(
			generationId,
			GenerationStatus.ACTIVE,
			5,
			10
		));

		// Emit test status event
		setTimeout(() => {
			this.eventEmitter.emit('generation.status', new GenerationStatusEvent(
				generationId,
				GenerationStatus.COMPLETED,
				'# Test\n\nTest content',
				undefined,
				10
			));
		}, 2000);

		return ResponseFactory.success({ message: 'Test events emitted' });
	}
}

export { GenerationsController };
