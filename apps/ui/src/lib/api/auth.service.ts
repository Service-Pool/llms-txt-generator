import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponse, AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, RequestMagicLinkRequestDto, RequestMagicLinkResponseDto, MessageSuccess } from '@api/shared';

const configService = new AppConfigService();

class AuthService extends HttpClient {
	public async requestMagicLink(email: string): Promise<ApiResponse<MessageSuccess<RequestMagicLinkResponseDto>>> {
		const dto: RequestMagicLinkRequestDto = { email };
		return this.fetch(configService.endpoints.auth.requestMagicLink, {
			method: 'POST',
			body: JSON.stringify(dto)
		}, RequestMagicLinkResponseDto);
	}

	public async verifyMagicLink(token: string): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse>>> {
		return this.fetch(`${configService.endpoints.auth.verifyMagicLink}?token=${encodeURIComponent(token)}`, {
			method: 'GET'
		}, AuthLoginDtoResponse);
	}

	public async logout(): Promise<ApiResponse<MessageSuccess<AuthLogoutDtoResponse>>> {
		return this.fetch(configService.endpoints.auth.logout, {
			method: 'POST'
		}, AuthLogoutDtoResponse);
	}

	public async getStatus(): Promise<ApiResponse<MessageSuccess<AuthStatusDtoResponse>>> {
		return this.fetch(configService.endpoints.auth.status, undefined, AuthStatusDtoResponse);
	}
}

export { AuthService };
