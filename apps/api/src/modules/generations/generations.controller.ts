import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GenerationDtoResponse } from './dto/generation-response.dto';
import { GenerationProgressEvent, GenerationStatusEvent } from '../websocket/websocket.events';
import { GenerationsService } from './services/generations.service';
import { GenerationStatus } from '../../enums/generation-status.enum';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';

@Controller('api/generations')
class GenerationsController {
	constructor(
		private readonly generationsService: GenerationsService,
		private readonly eventEmitter: EventEmitter2,
		private readonly apiResponse: ApiResponse
	) { }

	@Get(':id')
	public async getOne(@Param('id') id: number): Promise<ApiResponse<MessageSuccess<GenerationDtoResponse> | MessageError>> {
		const generation = await this.generationsService.findById(id);

		if (!generation) {
			return this.apiResponse.error(ResponseCode.ERROR, 'Generation not found');
		}

		return this.apiResponse.success(GenerationDtoResponse.fromEntity(generation));
	}

	@Post(':id/test-event')
	@HttpCode(HttpStatus.OK)
	public testEvent(@Param('id') id: string): ApiResponse<MessageSuccess<{ message: string }>> {
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

		return this.apiResponse.success({ message: 'Test events emitted' });
	}
}

export { GenerationsController };
