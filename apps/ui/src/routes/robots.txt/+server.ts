import type { RequestHandler } from '@sveltejs/kit';
import { configService } from '$lib/services/config.service';

export const GET: RequestHandler = () => {
	const baseUrl = configService.site.baseUrl;

	const robots = `User-agent: *
Allow: /
Disallow: /auth/

Sitemap: ${baseUrl}/sitemap.xml`;

	return new Response(robots, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=86400'
		}
	});
};
