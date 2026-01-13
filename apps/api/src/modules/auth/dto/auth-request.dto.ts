import { IsString, IsNotEmpty } from 'class-validator';

class LoginDtoRequest {
	@IsString()
	@IsNotEmpty()
	email: string;

	@IsString()
	password: string;
}

export { LoginDtoRequest };
