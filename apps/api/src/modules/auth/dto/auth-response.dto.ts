import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

class RequestLoginLinkResponseDto {
	@ApiProperty({ description: 'Success message', example: 'Login link has been sent to your email' })
	message: string;

	public static create(message: string): RequestLoginLinkResponseDto {
		const dto = new RequestLoginLinkResponseDto();
		dto.message = message;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): RequestLoginLinkResponseDto {
		const dto = new RequestLoginLinkResponseDto();
		dto.message = json.message as string;
		return dto;
	}
}

class AuthLoginDtoResponse {
	@ApiProperty({
		description: 'User information',
		example: {
			id: 123,
			email: 'user@example.com',
			createdAt: '2024-01-01T00:00:00Z'
		}
	})
	user: {
		id: number;
		email: string;
		createdAt: Date;
	};

	@ApiProperty({ description: 'Redirect URL after successful login', example: 'https://example.com/dashboard' })
	redirectUrl: string;

	@ApiProperty({ description: 'Number of orders migrated to user account', example: 2 })
	migratedOrdersCount: number;

	public static fromEntity(user: User, redirectUrl: string, migratedCount: number): AuthLoginDtoResponse {
		const dto = new AuthLoginDtoResponse();
		dto.user = {
			id: user.id,
			email: user.email,
			createdAt: user.createdAt
		};
		dto.redirectUrl = redirectUrl;
		dto.migratedOrdersCount = migratedCount;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): AuthLoginDtoResponse {
		const dto = new AuthLoginDtoResponse();
		const userData = json.user as Record<string, unknown>;
		dto.user = {
			id: userData.id as number,
			email: userData.email as string,
			createdAt: new Date(userData.createdAt as string)
		};
		dto.redirectUrl = json.redirectUrl as string;
		dto.migratedOrdersCount = json.migratedOrdersCount as number;
		return dto;
	}
}

class AuthLogoutDtoResponse {
	@ApiProperty({ description: 'Logout success message', example: 'Successfully logged out' })
	message: string;

	public static create(message: string): AuthLogoutDtoResponse {
		const dto = new AuthLogoutDtoResponse();
		dto.message = message;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): AuthLogoutDtoResponse {
		const dto = new AuthLogoutDtoResponse();
		dto.message = json.message as string;
		return dto;
	}
}

class AuthStatusDtoResponse {
	@ApiProperty({ description: 'Whether user is authenticated', example: true })
	authenticated: boolean;

	@ApiProperty({ description: 'Session ID', example: 'sess_abc123', nullable: true })
	sessionId: string | null;

	@ApiProperty({
		description: 'User information if authenticated',
		nullable: true,
		example: {
			id: 123,
			email: 'user@example.com',
			createdAt: '2024-01-01T00:00:00Z'
		}
	})
	user: {
		id: number;
		email: string;
		createdAt: Date;
	} | null;

	public static fromEntity(authenticated: boolean, sessionId: string, user?: User): AuthStatusDtoResponse {
		const dto = new AuthStatusDtoResponse();
		dto.authenticated = authenticated;
		dto.sessionId = sessionId ?? null;
		dto.user = user
			? { id: user.id, email: user.email, createdAt: user.createdAt }
			: null;
		return dto;
	}

	public static fromJSON(json: Record<string, unknown>): AuthStatusDtoResponse {
		const dto = new AuthStatusDtoResponse();
		dto.authenticated = json.authenticated as boolean;
		dto.sessionId = json.sessionId as string | null;

		if (json.user) {
			const userData = json.user as Record<string, unknown>;
			dto.user = {
				id: userData.id as number,
				email: userData.email as string,
				createdAt: new Date(userData.createdAt as string)
			};
		} else {
			dto.user = null;
		}

		return dto;
	}
}

export {
	RequestLoginLinkResponseDto,
	AuthLoginDtoResponse,
	AuthLogoutDtoResponse,
	AuthStatusDtoResponse
};
