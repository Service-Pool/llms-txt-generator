import { HttpClient } from './http.client';
import { configService } from './config.service';
import { ApiResponse, AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, RequestLoginLinkRequestDto, RequestLoginLinkResponseDto, MessageSuccess } from '@api/shared';

class AuthService extends HttpClient {
	public async requestLoginLink(email: string, redirectUrl?: string): Promise<ApiResponse<MessageSuccess<RequestLoginLinkResponseDto>>> {
		const dto: RequestLoginLinkRequestDto = { email, redirectUrl };
		return this.fetch(configService.endpoints.auth.requestLoginLink, RequestLoginLinkResponseDto, {
			method: 'POST',
			body: JSON.stringify(dto)
		});
	}

	public async verifyLoginLink(crd: string): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse>>> {
		return this.fetch(`${configService.endpoints.auth.verifyLoginLink}?crd=${encodeURIComponent(crd)}`, AuthLoginDtoResponse, {
			method: 'GET'
		});
	}

	public async logout(): Promise<ApiResponse<MessageSuccess<AuthLogoutDtoResponse>>> {
		return this.fetch(configService.endpoints.auth.logout, AuthLogoutDtoResponse, {
			method: 'POST'
		});
	}

	public async getStatus(): Promise<ApiResponse<MessageSuccess<AuthStatusDtoResponse>>> {
		return this.fetch(configService.endpoints.auth.status, AuthStatusDtoResponse);
	}
}

const authService = new AuthService();

export { authService };
