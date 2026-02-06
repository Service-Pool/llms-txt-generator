import { HttpClient } from './api.service';
import { configService } from './config.service';
import {
	ApiResponse,
	AuthLoginDtoResponse,
	AuthLogoutDtoResponse,
	AuthStatusDtoResponse,
	RequestLoginLinkRequestDto,
	RequestLoginLinkResponseDto
} from '@api/shared';

class AuthService extends HttpClient {
	/**
	 * Request a magic login link sent to email
	 */
	public async loginLinkRequest(email: string, redirectUrl: string): Promise<ApiResponse<RequestLoginLinkResponseDto>> {
		const dto: RequestLoginLinkRequestDto = { email, redirectUrl };
		return this.fetch(
			configService.endpoints.auth.loginLinkRequest,
			RequestLoginLinkResponseDto,
			{
				method: 'POST',
				body: JSON.stringify(dto)
			}
		);
	}

	/**
	 * Verify login link with encrypted credentials
	 */
	public async login(crd: string): Promise<ApiResponse<AuthLoginDtoResponse>> {
		return this.fetch(
			`${configService.endpoints.auth.login}?crd=${encodeURIComponent(crd)}`,
			AuthLoginDtoResponse,
			{
				method: 'GET'
			}
		);
	}

	/**
	 * Logout current user
	 */
	public async logout(): Promise<ApiResponse<AuthLogoutDtoResponse>> {
		return this.fetch(
			configService.endpoints.auth.logout,
			AuthLogoutDtoResponse,
			{
				method: 'POST'
			}
		);
	}

	/**
	 * Get current authentication status
	 */
	public async getStatus(fetchFn?: typeof fetch): Promise<ApiResponse<AuthStatusDtoResponse>> {
		return this.fetch(
			configService.endpoints.auth.status,
			AuthStatusDtoResponse,
			undefined,
			fetchFn
		);
	}
}

const authService = new AuthService();

export { authService, AuthService };
