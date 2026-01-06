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
		public content: string | null,
		public errorMessage: string | null,
		public entriesCount: number | null,
		public createdAt: string,
		public updatedAt: string
	) { }

	static fromEntity(entity: Generation): GenerationDtoResponse {
		return new GenerationDtoResponse(
			entity.id,
			entity.hostname,
			entity.provider,
			entity.status,
			entity.content,
			entity.errorMessage,
			entity.entriesCount,
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
			json.content as string | null,
			json.errorMessage as string | null,
			json.entriesCount as number | null,
			json.createdAt as string,
			json.updatedAt as string
		);
	}
}

/**
 * DTO для GenerationRequest (с развёрнутыми полями Generation)
 */
class GenerationRequestDtoResponse {
	constructor(
		public id: number,
		public generationId: number,
		public userId: number | null,
		public sessionId: string,
		public hostname: string,
		public provider: Provider,
		public status: GenerationStatus,
		public content: string | null,
		public errorMessage: string | null,
		public entriesCount: number | null,
		public requestedAt: string,
		public createdAt: string,
		public updatedAt: string
	) { }

	static fromEntity(entity: GenerationRequest): GenerationRequestDtoResponse {
		if (!entity.generation) {
			throw new Error('GenerationRequest must have a related Generation');
		}

		return new GenerationRequestDtoResponse(
			entity.id,
			entity.generationId,
			entity.userId,
			entity.sessionId || '',
			entity.generation.hostname,
			entity.generation.provider,
			entity.generation.status,
			entity.generation.content,
			entity.generation.errorMessage,
			entity.generation.entriesCount,
			entity.requestedAt.toISOString(),
			entity.generation.createdAt.toISOString(),
			entity.generation.updatedAt.toISOString()
		);
	}

	static fromJSON(json: Record<string, unknown>): GenerationRequestDtoResponse {
		return new GenerationRequestDtoResponse(
			json.id as number,
			json.generationId as number,
			json.userId as number | null,
			json.sessionId as string,
			json.hostname as string,
			json.provider as Provider,
			json.status as GenerationStatus,
			json.content as string | null,
			json.errorMessage as string | null,
			json.entriesCount as number | null,
			json.requestedAt as string,
			json.createdAt as string,
			json.updatedAt as string
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

/**
 * DTO для результата расчета цены hostname
 */
class CalculateHostnameDtoResponse {
	constructor(
		public hostname: string,
		public urlsCount: number,
		public isComplete: boolean,
		public prices: CalculateHostnamePriceDtoResponse[]
	) { }

	static fromData(hostname: string, urlsCount: number, isComplete: boolean, prices: CalculateHostnamePriceDtoResponse[]): CalculateHostnameDtoResponse {
		return new CalculateHostnameDtoResponse(hostname, urlsCount, isComplete, prices);
	}

	static fromJSON(json: Record<string, unknown>): CalculateHostnameDtoResponse {
		const prices = (json.prices as Array<Record<string, unknown>>).map(p =>
			CalculateHostnamePriceDtoResponse.fromJSON(p));
		return new CalculateHostnameDtoResponse(
			json.hostname as string,
			json.urlsCount as number,
			json.isComplete as boolean,
			prices
		);
	}
}

export { GenerationDtoResponse, GenerationRequestDtoResponse, GenerationRequestsListDtoResponse, CalculateHostnameDtoResponse, CalculateHostnamePriceDtoResponse };
