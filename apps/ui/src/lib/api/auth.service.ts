import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';
import { ApiResponse, AuthLoginDtoResponse, AuthLogoutDtoResponse, AuthStatusDtoResponse, LoginDtoRequest, MessageSuccess } from '@api/shared';

const configService = new AppConfigService();

class AuthService extends HttpClient {
	public async login(credentials: LoginDtoRequest): Promise<ApiResponse<MessageSuccess<AuthLoginDtoResponse>>> {
		return this.fetch(configService.endpoints.auth.login, {
			method: 'POST',
			body: JSON.stringify(credentials)
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
