import { type ApiResponseModel } from '@api/shared';
import { HttpClient } from './http.client';
import { AppConfigService } from './config.service';

const configService = new AppConfigService();

// Auth-specific types
export interface LoginRequest {
	username: string;
	password: string | null;
}

export interface User {
	id: number;
	username?: string;
	email: string;
}

export interface AuthStatusResponse {
	authenticated: boolean;
	sessionId?: string;
	user?: User;
}

export interface LoginResponse {
	user: User;
	migratedRequests: number;
}

export class AuthService extends HttpClient {
	public async login(credentials: LoginRequest): Promise<ApiResponseModel<LoginResponse>> {
		return this.fetch<LoginResponse>(configService.endpoints.auth.login, {
			method: 'POST',
			body: JSON.stringify(credentials)
		});
	}

	public async logout(): Promise<ApiResponseModel<{ message: string }>> {
		return this.fetch<{ message: string }>(configService.endpoints.auth.logout, {
			method: 'POST'
		});
	}

	public async getStatus(): Promise<ApiResponseModel<AuthStatusResponse>> {
		return this.fetch<AuthStatusResponse>(configService.endpoints.auth.status);
	}
}
