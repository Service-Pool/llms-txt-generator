import { GenerationStatus } from '../enums/generation-status.enum';
import { Provider } from '../enums/provider.enum';

/**
 * DTO для Generation (используется в API ответах)
 */
export interface GenerationDto {
	id: number;
	hostname: string;
	provider: Provider;
	status: GenerationStatus;
	content: string | null;
	errorMessage: string | null;
	entriesCount: number | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * DTO для GenerationRequest
 */
export interface GenerationRequestDto {
	id: number;
	generationId: number;
	userId: number | null;
	sessionId: string;
	requestedAt: string;
	generation?: GenerationDto;
}

/**
 * DTO для списка генераций
 */
export interface GenerationsListDto {
	items: GenerationRequestDto[];
	total: number;
	page: number;
	limit: number;
}

/**
 * DTO для создания генерации
 */
export interface CreateGenerationDto {
	hostname: string;
	provider: Provider;
}
