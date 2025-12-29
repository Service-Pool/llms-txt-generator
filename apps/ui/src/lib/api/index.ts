export { AppConfigService } from './config.service';
export { HttpClient, ApiError } from './http.client';
export { AuthService } from './auth.service';
export { GenerationsService } from './generations.service';
export { StatsService } from './stats.service';

export type { LoginRequest, User, AuthStatusResponse, LoginResponse } from './auth.service';

// Singleton instances
import { AuthService } from './auth.service';
import { GenerationsService } from './generations.service';
import { StatsService } from './stats.service';

export const authService = new AuthService();
export const generationsService = new GenerationsService();
export const statsService = new StatsService();
