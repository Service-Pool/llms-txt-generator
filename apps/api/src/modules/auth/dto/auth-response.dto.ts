class VerifyLoginLinkResponseDto {
	constructor(
		public readonly id: number,
		public readonly email: string,
		public readonly createdAt: Date,
		public readonly redirectUrl: string
	) { };
}

class StatusResponseDto {
	constructor(
		public readonly id: number,
		public readonly email: string,
		public readonly createdAt: Date
	) { };
}

export { VerifyLoginLinkResponseDto, StatusResponseDto };
