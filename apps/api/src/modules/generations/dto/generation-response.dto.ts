import { Generation } from '../../generations/entities/generation.entity';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';
import { GenerationStatus } from '../../../enums/generation-status.enum';
import { Provider } from '../../../enums/provider.enum';

/**
 * DTO для Generation (используется в API ответах)
 */
class GenerationDtoResponse {
	constructor(
		public id: number,
		public hostname: string,
		public provider: Provider,
		public status: GenerationStatus,
		public output: string | null,
		public errors: string | null,
		public llmsEntriesCount: number | null,
		public urlsCount: number,
		public createdAt: string,
		public updatedAt: string
	) { }

	static fromEntity(entity: Generation): GenerationDtoResponse {
		if (!entity.calculation) {
			throw new Error('Generation must have a related Calculation loaded');
		}

		return new GenerationDtoResponse(
			entity.id,
			entity.calculation.hostname,
			entity.provider,
			entity.status,
			entity.output,
			entity.errors,
			entity.llmsEntriesCount,
			entity.calculation.urlsCount,
			entity.createdAt.toISOString(),
			entity.updatedAt.toISOString()
		);
	}

	static fromJSON(json: Record<string, unknown>): GenerationDtoResponse {
		return new GenerationDtoResponse(
			json.id as number,
			json.hostname as string,
			json.provider as Provider,
			json.status as GenerationStatus,
			json.output as string | null,
			json.errors as string | null,
			json.llmsEntriesCount as number | null,
			json.urlsCount as number,
			json.createdAt as string,
			json.updatedAt as string
		);
	}
}

/**
 * DTO для GenerationRequest
 */
class GenerationRequestDtoResponse {
	constructor(
		public id: number,
		public userId: number | null,
		public sessionId: string | null,
		public status: number,
		public paymentLink: string | null,
		public createdAt: string,
		public generation: GenerationDtoResponse
	) { }

	static fromEntity(entity: GenerationRequest): GenerationRequestDtoResponse {
		if (!entity.generation) {
			throw new Error('GenerationRequest must have a related Generation loaded');
		}

		return new GenerationRequestDtoResponse(
			entity.id,
			entity.userId,
			entity.sessionId,
			entity.status,
			entity.paymentLink,
			entity.createdAt.toISOString(),
			GenerationDtoResponse.fromEntity(entity.generation)
		);
	}

	static fromJSON(json: Record<string, unknown>): GenerationRequestDtoResponse {
		return new GenerationRequestDtoResponse(
			json.id as number,
			json.userId as number | null,
			json.sessionId as string | null,
			json.status as number,
			json.paymentLink as string | null,
			json.createdAt as string,
			GenerationDtoResponse.fromJSON(json.generation as Record<string, unknown>)
		);
	}
}

/**
 * DTO для списка GenerationRequest
 */
class GenerationRequestsListDtoResponse {
	constructor(
		public items: GenerationRequestDtoResponse[],
		public total: number,
		public page: number,
		public limit: number
	) { }

	static fromEntities(entities: GenerationRequest[], total: number, page: number, limit: number): GenerationRequestsListDtoResponse {
		return new GenerationRequestsListDtoResponse(
			entities.map(entity => GenerationRequestDtoResponse.fromEntity(entity)),
			total,
			page,
			limit
		);
	}

	static fromJSON(json: Record<string, unknown>): GenerationRequestsListDtoResponse {
		return new GenerationRequestsListDtoResponse(
			(json.items as Record<string, unknown>[]).map(item => GenerationRequestDtoResponse.fromJSON(item)),
			json.total as number,
			json.page as number,
			json.limit as number
		);
	}
}

/**
 * DTO для информации о цене
 */
class CalculateHostnamePriceDtoResponse {
	constructor(
		public provider: Provider,
		public value: number,
		public currency: string,
		public symbol: string
	) { }

	static fromData(provider: Provider, value: number, currency: string, symbol: string): CalculateHostnamePriceDtoResponse {
		return new CalculateHostnamePriceDtoResponse(provider, value, currency, symbol);
	}

	static fromJSON(json: Record<string, unknown>): CalculateHostnamePriceDtoResponse {
		return new CalculateHostnamePriceDtoResponse(
			json.provider as Provider,
			json.value as number,
			json.currency as string,
			json.symbol as string
		);
	}
}

export { GenerationDtoResponse, GenerationRequestDtoResponse, GenerationRequestsListDtoResponse, CalculateHostnamePriceDtoResponse };
