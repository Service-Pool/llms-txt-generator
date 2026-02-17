import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

/**
 * Request Login Link Attributes
 */
class RequestLoginLinkAttributes {
	@ApiProperty({ description: 'Success message', example: 'Login link has been sent to your email' })
	message: string;

	static create(message: string): RequestLoginLinkAttributes {
		const attributes = new RequestLoginLinkAttributes();
		attributes.message = message;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): RequestLoginLinkAttributes {
		const attributes = new RequestLoginLinkAttributes();
		attributes.message = json.message as string;
		return attributes;
	}
}

class RequestLoginLinkResponseDto {
	@ApiProperty({ description: 'Request login link attributes', type: RequestLoginLinkAttributes })
	attributes: RequestLoginLinkAttributes;

	@ApiProperty({ description: 'HATEOAS navigation links', example: {} })
	_links: Record<string, never>;

	static create(message: string): RequestLoginLinkResponseDto {
		const dto = new RequestLoginLinkResponseDto();
		dto.attributes = RequestLoginLinkAttributes.create(message);
		dto._links = {};
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): RequestLoginLinkResponseDto {
		const dto = new RequestLoginLinkResponseDto();
		dto.attributes = RequestLoginLinkAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, never>;
		return dto;
	}
}

/**
 * Auth Login Attributes
 */
class AuthLoginAttributes {
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

	static create(user: User, redirectUrl: string, migratedCount: number): AuthLoginAttributes {
		const attributes = new AuthLoginAttributes();
		attributes.user = {
			id: user.id,
			email: user.email,
			createdAt: user.createdAt
		};
		attributes.redirectUrl = redirectUrl;
		attributes.migratedOrdersCount = migratedCount;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): AuthLoginAttributes {
		const attributes = new AuthLoginAttributes();
		const userData = json.user as Record<string, unknown>;
		attributes.user = {
			id: userData.id as number,
			email: userData.email as string,
			createdAt: new Date(userData.createdAt as string)
		};
		attributes.redirectUrl = json.redirectUrl as string;
		attributes.migratedOrdersCount = json.migratedOrdersCount as number;
		return attributes;
	}
}

class AuthLoginDtoResponse {
	@ApiProperty({ description: 'Auth login attributes', type: AuthLoginAttributes })
	attributes: AuthLoginAttributes;

	@ApiProperty({ description: 'HATEOAS navigation links', example: {} })
	_links: Record<string, never>;

	static fromEntity(user: User, redirectUrl: string, migratedCount: number): AuthLoginDtoResponse {
		const dto = new AuthLoginDtoResponse();
		dto.attributes = AuthLoginAttributes.create(user, redirectUrl, migratedCount);
		dto._links = {};
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): AuthLoginDtoResponse {
		const dto = new AuthLoginDtoResponse();
		dto.attributes = AuthLoginAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, never>;
		return dto;
	}
}

/**
 * Auth Logout Attributes
 */
class AuthLogoutAttributes {
	@ApiProperty({ description: 'Logout success message', example: 'Successfully logged out' })
	message: string;

	static create(message: string): AuthLogoutAttributes {
		const attributes = new AuthLogoutAttributes();
		attributes.message = message;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): AuthLogoutAttributes {
		const attributes = new AuthLogoutAttributes();
		attributes.message = json.message as string;
		return attributes;
	}
}

class AuthLogoutDtoResponse {
	@ApiProperty({ description: 'Auth logout attributes', type: AuthLogoutAttributes })
	attributes: AuthLogoutAttributes;

	@ApiProperty({ description: 'HATEOAS navigation links', example: {} })
	_links: Record<string, never>;

	static create(message: string): AuthLogoutDtoResponse {
		const dto = new AuthLogoutDtoResponse();
		dto.attributes = AuthLogoutAttributes.create(message);
		dto._links = {};
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): AuthLogoutDtoResponse {
		const dto = new AuthLogoutDtoResponse();
		dto.attributes = AuthLogoutAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, never>;
		return dto;
	}
}

/**
 * Auth Status Attributes
 */
class AuthStatusAttributes {
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

	static create(authenticated: boolean, sessionId: string, user?: User): AuthStatusAttributes {
		const attributes = new AuthStatusAttributes();
		attributes.authenticated = authenticated;
		attributes.sessionId = sessionId ?? null;
		attributes.user = user
			? { id: user.id, email: user.email, createdAt: user.createdAt }
			: null;
		return attributes;
	}

	static fromJSON(json: Record<string, unknown>): AuthStatusAttributes {
		const attributes = new AuthStatusAttributes();
		attributes.authenticated = json.authenticated as boolean;
		attributes.sessionId = json.sessionId as string | null;

		if (json.user) {
			const userData = json.user as Record<string, unknown>;
			attributes.user = {
				id: userData.id as number,
				email: userData.email as string,
				createdAt: new Date(userData.createdAt as string)
			};
		} else {
			attributes.user = null;
		}

		return attributes;
	}
}

class AuthStatusDtoResponse {
	@ApiProperty({ description: 'Auth status attributes', type: AuthStatusAttributes })
	attributes: AuthStatusAttributes;

	@ApiProperty({ description: 'HATEOAS navigation links', example: {} })
	_links: Record<string, never>;

	static fromEntity(authenticated: boolean, sessionId: string, user?: User): AuthStatusDtoResponse {
		const dto = new AuthStatusDtoResponse();
		dto.attributes = AuthStatusAttributes.create(authenticated, sessionId, user);
		dto._links = {};
		return dto;
	}

	static fromJSON(json: Record<string, unknown>): AuthStatusDtoResponse {
		const dto = new AuthStatusDtoResponse();
		dto.attributes = AuthStatusAttributes.fromJSON(json.attributes as Record<string, unknown>);
		dto._links = json._links as Record<string, never>;
		return dto;
	}
}

export {
	AuthLoginAttributes,
	RequestLoginLinkResponseDto,
	AuthLoginDtoResponse,
	AuthLogoutDtoResponse,
	AuthStatusDtoResponse
};
