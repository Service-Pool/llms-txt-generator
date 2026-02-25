import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/config/config.service';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
class MailService {
	private readonly logger = new Logger(MailService.name);
	private readonly transporter: Transporter;

	constructor(private readonly configService: AppConfigService) {
		this.transporter = nodemailer.createTransport({
			host: this.configService.smtp.host,
			port: this.configService.smtp.port,
			secure: false, // true for 465, false for other ports
			auth: {
				user: this.configService.smtp.user,
				pass: this.configService.smtp.password
			}
		});
	}

	public async sendLoginLink(email: string, redirectUrl: string, encryptedQuery: string): Promise<void> {
		const url = new URL(redirectUrl);
		url.searchParams.set('crd', encryptedQuery);
		const loginLink = url.toString();

		const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.button {
			display: inline-block;
			padding: 12px 24px;
			background-color: #2563eb;
			color: #ffffff;
			text-decoration: none;
			border-radius: 6px;
			margin: 20px 0;
		}
		.footer { margin-top: 30px; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<h2>Sign in to LLM Text Generator</h2>
		<p>Click the button below to sign in to your account:</p>
		<a href="${loginLink}" class="button">Sign In</a>
		<p>Or copy and paste this link into your browser:</p>
		<p style="word-break: break-all; color: #2563eb;">${loginLink}</p>
		<div class="footer">
			<p>This link will expire in ${this.configService.loginLink.expiryMinutes} minutes.</p>
			<p>If you didn't request this email, you can safely ignore it.</p>
		</div>
	</div>
</body>
</html>
		`.trim();

		try {
			await this.transporter.sendMail({
				from: `"LLM Text Generator" <${this.configService.smtp.user}>`,
				to: email,
				subject: 'Sign in to LLM Text Generator',
				html
			});

			this.logger.log(`Login link sent to ${email}`);
		} catch (error) {
			this.logger.error(`Failed to send login link to ${email}:`, error);
			throw new Error('Failed to send login link email');
		}
	}
}

export { MailService };
