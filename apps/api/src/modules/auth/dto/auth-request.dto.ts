import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

class LoginDtoRequest {
	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	password: string;
}

class RequestMagicLinkRequestDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;
}

export { LoginDtoRequest, RequestMagicLinkRequestDto };
