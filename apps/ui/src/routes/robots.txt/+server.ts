import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
	const robots = `User-agent: *
Allow: /
Disallow: /auth/

Sitemap: /sitemap.xml`;

	return new Response(robots, {
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'max-age=86400'
		}
	});
};
