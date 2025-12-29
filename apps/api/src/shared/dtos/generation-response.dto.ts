import { GenerationStatus } from '../enums/generation-status.enum';
import { Provider } from '../enums/provider.enum';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';

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
	) {}

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

	static fromJson(json: Record<string, unknown>): GenerationDtoResponse {
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
 * DTO для GenerationRequest
 */
class GenerationRequestDtoResponse {
	constructor(
		public id: number,
		public generationId: number,
		public userId: number | null,
		public sessionId: string,
		public requestedAt: string,
		public generation?: GenerationDtoResponse
	) {}

	static fromEntity(entity: GenerationRequest): GenerationRequestDtoResponse {
		return new GenerationRequestDtoResponse(
			entity.id,
			entity.generationId,
			entity.userId,
			entity.sessionId || '',
			entity.requestedAt.toISOString(),
			entity.generation ? GenerationDtoResponse.fromEntity(entity.generation) : undefined
		);
	}

	static fromJson(json: Record<string, unknown>): GenerationRequestDtoResponse {
		return new GenerationRequestDtoResponse(
			json.id as number,
			json.generationId as number,
			json.userId as number | null,
			json.sessionId as string,
			json.requestedAt as string,
			json.generation ? GenerationDtoResponse.fromJson(json.generation as Record<string, unknown>) : undefined
		);
	}
}

/**
 * DTO для списка генераций
 */
class GenerationsListDtoResponse {
	constructor(
		public items: GenerationRequestDtoResponse[],
		public total: number,
		public page: number,
		public limit: number
	) {}

	static fromEntities(entities: GenerationRequest[], total: number, page: number, limit: number): GenerationsListDtoResponse {
		return new GenerationsListDtoResponse(
			entities.map(entity => GenerationRequestDtoResponse.fromEntity(entity)),
			total,
			page,
			limit
		);
	}

	static fromJson(json: Record<string, unknown>): GenerationsListDtoResponse {
		return new GenerationsListDtoResponse(
			(json.items as Record<string, unknown>[]).map(item => GenerationRequestDtoResponse.fromJson(item)),
			json.total as number,
			json.page as number,
			json.limit as number
		);
	}
}

/**
 * DTO для результата анализа hostname
 */
class AnalyzeHostnameDtoResponse {
	constructor(
		public hostname: string,
		public urlsCount: number
	) {}

	static fromData(hostname: string, urlsCount: number): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(hostname, urlsCount);
	}

	static fromJson(json: Record<string, unknown>): AnalyzeHostnameDtoResponse {
		return new AnalyzeHostnameDtoResponse(
			json.hostname as string,
			json.urlsCount as number
		);
	}
}

export { GenerationDtoResponse, GenerationRequestDtoResponse, GenerationsListDtoResponse, AnalyzeHostnameDtoResponse };
