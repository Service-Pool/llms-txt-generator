import type { RequestHandler } from '@sveltejs/kit';
import { configService } from '$lib/services/config.service';

export const GET: RequestHandler = () => {
	const baseUrl = configService.site.baseUrl;
	const currentDate = new Date().toISOString();

	// Use configService.routes to avoid duplication
	const routes = [
		{ url: configService.routes.home, priority: '1.0', changefreq: 'daily' },
		{ url: configService.routes.orders, priority: '0.8', changefreq: 'weekly' },
		{ url: configService.routes.contact, priority: '0.7', changefreq: 'monthly' },
		{ url: configService.routes.api, priority: '0.6', changefreq: 'monthly' },
		{ url: configService.routes.terms, priority: '0.4', changefreq: 'monthly' }
	];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `	<url>
		<loc>${baseUrl}${route.url}</loc>
		<lastmod>${currentDate}</lastmod>
		<changefreq>${route.changefreq}</changefreq>
		<priority>${route.priority}</priority>
	</url>`).join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
