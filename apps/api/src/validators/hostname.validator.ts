import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import robotsParser from 'robots-parser';

const FETCH_TIMEOUT = 2000; // 2 seconds

/**
 * Fetch with timeout utility
 */
async function fetchWithTimeout(url: string): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, FETCH_TIMEOUT);

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

/**
 * Проверяет доступность robots.txt
 */
@ValidatorConstraint({ async: true })
class RobotsAccessibleValidator implements ValidatorConstraintInterface {
	public static validateRobotsAccessible(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RobotsAccessibleValidator
			});
		};
	}

	public async validate(hostname: string): Promise<boolean> {
		try {
			const robotsUrl = `${hostname}/robots.txt`;
			const response = await fetchWithTimeout(robotsUrl);
			return response.ok;
		} catch {
			// Network errors, timeouts - validation fails
			return false;
		}
	}
}

/**
 * Проверяет наличие sitemap в robots.txt
 */
@ValidatorConstraint({ async: true })
class RobotsSitemapExistsValidator implements ValidatorConstraintInterface {
	public static validateSitemapExists(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: RobotsSitemapExistsValidator
			});
		};
	}

	public async validate(hostname: string): Promise<boolean> {
		try {
			const robotsUrl = `${hostname}/robots.txt`;
			const response = await fetchWithTimeout(robotsUrl);

			if (!response.ok) {
				return false;
			}

			const robotsTxt = await response.text();
			const robots = robotsParser(robotsUrl, robotsTxt);
			const sitemaps = robots.getSitemaps();

			return sitemaps && sitemaps.length > 0;
		} catch {
			return false;
		}
	}
}

/**
 * Проверяет доступность sitemap из robots.txt
 */
@ValidatorConstraint({ async: true })
class SitemapAccessibleValidator implements ValidatorConstraintInterface {
	public static validateSitemapAccessible(validationOptions?: ValidationOptions) {
		return function (object: object, propertyName: string) {
			registerDecorator({
				target: object.constructor,
				propertyName,
				options: validationOptions,
				validator: SitemapAccessibleValidator
			});
		};
	}

	public async validate(hostname: string): Promise<boolean> {
		try {
			const robotsUrl = `${hostname}/robots.txt`;
			const response = await fetchWithTimeout(robotsUrl);

			if (!response.ok) {
				return false;
			}

			const robotsTxt = await response.text();
			const robots = robotsParser(robotsUrl, robotsTxt);
			const sitemaps = robots.getSitemaps();

			if (!sitemaps || sitemaps.length === 0) {
				return false;
			}

			// Проверяем доступность первого sitemap
			const sitemapResponse = await fetchWithTimeout(sitemaps[0]);
			return sitemapResponse.ok;
		} catch {
			return false;
		}
	}
}

export { RobotsAccessibleValidator, RobotsSitemapExistsValidator, SitemapAccessibleValidator };
