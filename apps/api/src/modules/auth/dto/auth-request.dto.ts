import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

class LoginDtoRequest {
	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	password: string;
}

class RequestLoginLinkRequestDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsOptional()
	redirectUrl?: string;
}

export { LoginDtoRequest, RequestLoginLinkRequestDto };
