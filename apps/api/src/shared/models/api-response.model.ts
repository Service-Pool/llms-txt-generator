class ApiResponseModel<T> {
	constructor(
		public code: number,
		public message: T,
		public error?: string
	) {}
}

export { ApiResponseModel };
