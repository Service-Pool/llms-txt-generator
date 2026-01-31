import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { CrawlersService } from '../modules/crawlers/services/crawlers.service';

@Injectable()
@ValidatorConstraint({ async: true })
class RobotsAccessibleValidator implements ValidatorConstraintInterface {
	constructor(private readonly crawlersService: CrawlersService) { }

	async validate(hostname: string): Promise<boolean> {
		return this.crawlersService.checkRobotsTxt(hostname);
	}

	defaultMessage(args: ValidationArguments): string {
		return `No accessible robots.txt at ${args.value}`;
	}
}

@Injectable()
@ValidatorConstraint({ async: true })
class SitemapAccessibleValidator implements ValidatorConstraintInterface {
	constructor(private readonly crawlersService: CrawlersService) { }

	async validate(hostname: string): Promise<boolean> {
		return this.crawlersService.checkSitemapXml(hostname);
	}

	defaultMessage(args: ValidationArguments): string {
		return `No accessible sitemap found in robots.txt at ${args.value}`;
	}
}

export { RobotsAccessibleValidator, SitemapAccessibleValidator };
