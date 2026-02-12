import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateCheckoutRequestDto {
	@ApiProperty({ description: 'Success redirect URL after payment', example: 'https://example.com/success' })
	@IsUrl({ require_protocol: true, require_tld: false })
	@IsNotEmpty()
	successUrl: string;

	@ApiProperty({ description: 'Cancel redirect URL if payment cancelled', example: 'https://example.com/cancel' })
	@IsUrl({ require_protocol: true, require_tld: false })
	@IsNotEmpty()
	cancelUrl: string;
}

export { CreateCheckoutRequestDto };
