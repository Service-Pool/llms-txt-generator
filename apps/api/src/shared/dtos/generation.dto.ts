import { IsString, IsNotEmpty, IsEnum, Matches } from 'class-validator';
import { ValidateHostnameRobotsAndSitemap } from '../../common/validators/hostname.validator';
import { GenerationStatus } from '../enums/generation-status.enum';
import { Provider } from '../enums/provider.enum';
import { Generation } from '../../generations/entities/generation.entity';
import { GenerationRequest } from '../../generations/entities/generation-request.entity';

/**
 * DTO для Generation (используется в API ответах)
 */
class GenerationDto {
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

	static fromEntity(entity: Generation): GenerationDto {
		return new GenerationDto(
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

	static fromJson(json: Record<string, unknown>): GenerationDto {
		return new GenerationDto(
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
class GenerationRequestDto {
	constructor(
		public id: number,
		public generationId: number,
		public userId: number | null,
		public sessionId: string,
		public requestedAt: string,
		public generation?: GenerationDto
	) {}

	static fromEntity(entity: GenerationRequest): GenerationRequestDto {
		return new GenerationRequestDto(
			entity.id,
			entity.generationId,
			entity.userId,
			entity.sessionId || '',
			entity.requestedAt.toISOString(),
			entity.generation ? GenerationDto.fromEntity(entity.generation) : undefined
		);
	}

	static fromJson(json: Record<string, unknown>): GenerationRequestDto {
		return new GenerationRequestDto(
			json.id as number,
			json.generationId as number,
			json.userId as number | null,
			json.sessionId as string,
			json.requestedAt as string,
			json.generation ? GenerationDto.fromJson(json.generation as Record<string, unknown>) : undefined
		);
	}
}

/**
 * DTO для списка генераций
 */
class GenerationsListDto {
	constructor(
		public items: GenerationRequestDto[],
		public total: number,
		public page: number,
		public limit: number
	) {}

	static fromEntities(entities: GenerationRequest[], total: number, page: number, limit: number): GenerationsListDto {
		return new GenerationsListDto(
			entities.map(entity => GenerationRequestDto.fromEntity(entity)),
			total,
			page,
			limit
		);
	}

	static fromJson(json: Record<string, unknown>): GenerationsListDto {
		return new GenerationsListDto(
			(json.items as Record<string, unknown>[]).map(item => GenerationRequestDto.fromJson(item)),
			json.total as number,
			json.page as number,
			json.limit as number
		);
	}
}

/**
 * DTO для создания генерации
 */
class CreateGenerationDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
		message: 'Hostname must be a valid domain with protocol (http:// or https://) without path, query or trailing slash'
	})
	@ValidateHostnameRobotsAndSitemap({
		message: 'Hostname must have accessible robots.txt with sitemap reference'
	})
	public hostname: string;

	@IsEnum(Provider)
	@IsNotEmpty()
	public provider: Provider;

	constructor(hostname: string, provider: Provider) {
		this.hostname = hostname;
		this.provider = provider;
	}
}

export { GenerationDto, GenerationRequestDto, GenerationsListDto, CreateGenerationDto };
