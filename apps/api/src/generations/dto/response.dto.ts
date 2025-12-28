import { GenerationRequest } from '../entities/generation-request.entity';

class GenerationsListDto {
	public constructor(public readonly items: GenerationRequest[], public readonly total: number, public readonly page: number, public readonly limit: number) {

	}
}

export { GenerationsListDto };
