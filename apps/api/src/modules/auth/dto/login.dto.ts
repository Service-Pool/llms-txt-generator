import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class LoginDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsOptional()
	password?: string;
}

export { LoginDto };
