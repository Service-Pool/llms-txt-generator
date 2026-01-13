import { User } from '../entitites/user.entity';

/**
 * DTO: Успешный ответ на login
 */
class AuthLoginDtoResponse {
	constructor(
		public readonly user: { id: number; email: string },
		public readonly migratedRequests: number
	) { }

	static fromEntity(userEntity: User, migratedRequests: number): AuthLoginDtoResponse {
		return new AuthLoginDtoResponse(
			{ id: userEntity.id, email: userEntity.email },
			migratedRequests
		);
	}

	static fromJSON(json: Record<string, unknown>): AuthLoginDtoResponse {
		return new AuthLoginDtoResponse(
			json.user as { id: number; email: string },
			json.migratedRequests as number
		);
	}
}

/**
 * DTO: Успешный ответ на logout
 */
class AuthLogoutDtoResponse {
	constructor(public readonly message: string) { }

	static fromEntity(message: string): AuthLogoutDtoResponse {
		return new AuthLogoutDtoResponse(message);
	}

	static fromJSON(json: Record<string, unknown>): AuthLogoutDtoResponse {
		return new AuthLogoutDtoResponse(json.message as string);
	}
}

/**
 * DTO: Ответ на /me
 */
class AuthStatusDtoResponse {
	constructor(
		public readonly authenticated: boolean,
		public readonly sessionId?: string,
		public readonly user?: { id: number; email: string }
	) { }

	static fromEntity(authenticated: boolean, sessionId?: string, user?: { id: number; email: string }): AuthStatusDtoResponse {
		return new AuthStatusDtoResponse(authenticated, sessionId, user);
	}

	static fromJSON(json: Record<string, unknown>): AuthStatusDtoResponse {
		return new AuthStatusDtoResponse(
			json.authenticated as boolean,
			json.sessionId as string | undefined,
			json.user as { id: number; email: string } | undefined
		);
	}
}

export { AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse };
