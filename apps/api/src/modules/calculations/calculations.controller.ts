import { MessageSuccess } from '../../utils/response/message-success';
import { MessageError } from '../../utils/response/message-error';
import { Controller, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CalculationsService } from './calculations.service';
import { CreateCalculationDtoRequest } from './dto/calculation-request.dto';
import { CalculationDtoResponse } from './dto/calculation-response.dto';
import { ApiResponse } from '../../utils/response/api-response';
import { ResponseCode } from '../../enums/response-code.enum';

@Controller('api/calculations')
class CalculationsController {
	constructor(
		private readonly calculationsService: CalculationsService,
		private readonly apiResponse: ApiResponse
	) { }

	@Post()
	@HttpCode(HttpStatus.OK)
	public async create(@Query() query: CreateCalculationDtoRequest): Promise<ApiResponse<MessageSuccess<CalculationDtoResponse> | MessageError>> {
		try {
			const { calculation } = await this.calculationsService.findOrCreateCalculation(query.hostname);
			const response = CalculationDtoResponse.fromEntity(calculation);
			return this.apiResponse.success(response);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to create calculation';
			return this.apiResponse.error(ResponseCode.ERROR, message);
		}
	}
}

export { CalculationsController };
