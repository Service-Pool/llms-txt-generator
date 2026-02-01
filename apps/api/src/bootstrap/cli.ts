import { CommandFactory } from 'nest-commander';
import { CliModule } from '../cli/cli.module';
import { createWinstonLogger } from '../config/config.logger';

async function bootstrap() {
	await CommandFactory.run(CliModule, {
		logger: createWinstonLogger()
	});
}

bootstrap().catch((err) => {
	const logger = createWinstonLogger();
	const error = err instanceof Error ? err : new Error(String(err));
	logger.error('Failed to run CLI command', error.stack || error.message);
	process.exit(1);
});
