import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import robotsParser from 'robots-parser';

@ValidatorConstraint({ async: true })
class HostnameValidator implements ValidatorConstraintInterface {
	private static readonly FETCH_TIMEOUT = 2000; // 2 seconds

	public static validateHostnameRobotsAndSitemap(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				constraints: [],
				validator: HostnameValidator
			});
		};
	}

	public async validate(hostname: string): Promise<boolean> {
		try {
			// Проверка robots.txt и получение sitemaps
			const sitemapUrls = await this.getRobotsAndSitemaps(hostname);

			// Проверка доступности первого sitemap
			await this.checkSitemapAccessible(sitemapUrls[0]);

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get sitemap URLs from robots.txt
	 */
	private async getRobotsAndSitemaps(hostname: string): Promise<string[]> {
		const robotsUrl = `${hostname}/robots.txt`;
		const response = await this.fetchWithTimeout(robotsUrl);

		if (!response.ok) {
			throw new Error(`robots.txt returned status ${response.status}`);
		}

		const robotsTxt = await response.text();
		const robots = robotsParser(robotsUrl, robotsTxt);

		// Получаем sitemaps через библиотеку
		const sitemaps = robots.getSitemaps();

		if (!sitemaps || sitemaps.length === 0) {
			throw new Error('No sitemap found in robots.txt');
		}

		return sitemaps;
	}

	/**
	 * Check if sitemap URL is accessible
	 */
	private async checkSitemapAccessible(sitemapUrl: string): Promise<boolean> {
		const sitemapResponse = await this.fetchWithTimeout(sitemapUrl);

		if (!sitemapResponse.ok) {
			throw new Error(`Sitemap returned status ${sitemapResponse.status}`);
		}

		return true;
	}

	/**
	 * Fetch with timeout
	 */
	private async fetchWithTimeout(url: string): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, HostnameValidator.FETCH_TIMEOUT);

		try {
			const response = await fetch(url, {
				signal: controller.signal,
				redirect: 'follow'
			});

			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new Error('Request timeout');
				}

				throw new Error(`Network error: ${error.message}`);
			}

			throw error;
		}
	}
}

export { HostnameValidator };
