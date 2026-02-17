import { IsEmail, IsNotEmpty, IsUrl, IsString } from 'class-validator';

class RequestLoginLinkRequestDto {
	@IsEmail({}, { message: 'Invalid email' })
	email: string;

	@IsUrl({ require_protocol: true, require_tld: false })
	@IsNotEmpty()
	redirectUrl: string;
}

class LoginRequestDto {
	@IsString()
	crd: string; // encrypted credentials
}

export { RequestLoginLinkRequestDto, LoginRequestDto };
