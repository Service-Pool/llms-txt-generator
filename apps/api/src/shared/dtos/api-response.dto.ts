export interface ApiResponse<T> {
	code: number;
	message: T;
	error?: string;
}
