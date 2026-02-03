import { IsNotEmpty, IsUrl } from 'class-validator';

class CreateCheckoutRequestDto {
	@IsUrl({ require_protocol: true, require_tld: false })
	@IsNotEmpty()
	successUrl: string;

	@IsUrl({ require_protocol: true, require_tld: false })
	@IsNotEmpty()
	cancelUrl: string;
}

export { CreateCheckoutRequestDto };
