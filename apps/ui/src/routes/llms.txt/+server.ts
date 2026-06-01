import type { RequestHandler } from '@sveltejs/kit';
import { configService } from '$lib/services/config.service';

export const GET: RequestHandler = () => {
	const baseUrl = configService.site.baseUrl;

	const content = `# LLMs.txt Generator

> AI-powered service that crawls websites and generates optimized llms.txt files. Supports flat and clustered generation strategies. Free tier available, no registration required.

## Service

- [Home — New Order](${baseUrl}/): Start generating an llms.txt file by entering a website URL. Supports free and paid AI models.
- [My Orders](${baseUrl}/orders): View and manage previously submitted generation orders with real-time status updates.
- [API Documentation](${baseUrl}/api): REST API reference for programmatic llms.txt generation. Includes authentication, endpoints, and examples.
- [Terms of Service](${baseUrl}/terms): Usage terms, pricing model, and refund policy.
- [Contact](${baseUrl}/contact): Support and feedback form.

## About

LLMs.txt Generator crawls a target website, extracts page content, and uses large language models to produce structured llms.txt files following the [llms-txt specification](https://llmstxt.org). Two strategies are available:

- **Flat**: one summary per page, simple linear format
- **Clustered**: pages grouped by semantic similarity into sections, each with its own .md file — follows the hierarchical agent-oriented documentation structure described by Jeremy Howard

Supported AI models include free-tier options (page limit applies) and unlimited paid models. Processing a large documentation site like docs.stripe.com (4,000+ pages) takes under an hour.
`;

	return new Response(content, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600, s-maxage=3600'
		}
	});
};
