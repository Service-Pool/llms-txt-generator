class ApiResponse<T> {
	constructor(
		public code: number,
		public message: T,
		public error?: string
	) {}
}

export { ApiResponse };
