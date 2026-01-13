import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Get, Post, Param, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationDtoResponse, GenerationRequestDtoResponse } from './dto/generation-response.dto';
import { GenerationRequest } from './entities/generation-request.entity';
import { GenerationRequestUpdateEvent } from '../websocket/websocket.events';
import { GenerationsService } from './services/generations.service';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';

@Controller('api/generations')
class GenerationsController {
	constructor(
		private readonly generationsService: GenerationsService,
		@InjectRepository(GenerationRequest) private readonly generationRequestRepository: Repository<GenerationRequest>,
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
	public async testEvent(@Param('id') id: string): Promise<ApiResponse<MessageSuccess<{ message: string }>>> {
		const generationId = parseInt(id);

		// Load the generation request to emit realistic event
		const generationRequest = await this.generationRequestRepository.findOne({
			where: { generation: { id: generationId } },
			relations: ['generation', 'generation.calculation']
		});

		if (!generationRequest) {
			throw new NotFoundException('Generation request not found');
		}

		// Emit test progress event
		const progressDto = GenerationRequestDtoResponse.fromEntity(generationRequest);
		this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(
			progressDto,
			5 // processedUrls
		));

		// Emit test completion event
		setTimeout(() => {
			const completedDto = GenerationRequestDtoResponse.fromEntity(generationRequest);
			this.eventEmitter.emit('generation.request.update', new GenerationRequestUpdateEvent(completedDto));
		}, 2000);

		return this.apiResponse.success({ message: 'Test events emitted' });
	}
}

export { GenerationsController };
