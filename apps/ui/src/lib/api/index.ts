export { AppConfigService } from './config.service';
export { HttpClient, ApiError } from './http.client';
export { AuthService } from './auth.service';
export { GenerationsService } from './generations.service';

export type { LoginRequest, User, AuthStatusResponse, LoginResponse } from './auth.service';
export type { Generation, GenerationRequest, GenerationsListDto, CreateGenerationRequest } from './generations.service';

// Singleton instances
import { AuthService } from './auth.service';
import { GenerationsService } from './generations.service';

export const authService = new AuthService();
export const generationsService = new GenerationsService();
