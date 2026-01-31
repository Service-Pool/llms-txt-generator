import { IsNotEmpty, IsUrl } from 'class-validator';

class CreateCheckoutRequestDto {
	@IsUrl({ require_protocol: true })
	@IsNotEmpty()
	successUrl: string;

	@IsUrl({ require_protocol: true })
	@IsNotEmpty()
	cancelUrl: string;
}

export { CreateCheckoutRequestDto };
