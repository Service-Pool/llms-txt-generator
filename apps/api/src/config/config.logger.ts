import { inspect } from 'util';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogLevel } from '../enums/log-level.enum';

class LoggerFactory {
	private readonly fileFormat: winston.Logform.Format;
	private readonly consoleFormat: winston.Logform.Format;

	public constructor() {
		// Для файлов - без цветов
		this.fileFormat = winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			winston.format.errors({ stack: true }),
			winston.format.printf(this.consoleFormatter)
		);

		// Для консоли - с цветами
		this.consoleFormat = winston.format.combine(
			winston.format.timestamp({ format: 'HH:mm:ss' }),
			winston.format.colorize(),
			winston.format.printf(this.consoleFormatter)
		);
	}

	private consoleFormatter = (info: winston.Logform.TransformableInfo): string => {
		const ctx = Reflect.get(info, 'context');
		const context = ctx && typeof ctx === 'string' ? `[${ctx}] ` : '';

		const timestamp = typeof info.timestamp === 'string'
			? info.timestamp
			: '';

		const message = typeof info.message === 'string'
			? info.message
			: '';

		// Handle stack - can be string (standard Error.stack) or object/array (custom errors)
		const stack = info.stack
			? `\n${typeof info.stack === 'string' ? info.stack : inspect(info.stack, { depth: null })}`
			: '';

		return `${timestamp} ${info.level} ${context}${message}${stack}`;
	};

	public create() {
		const mode = process.env.APP_MODE;
		const transports: winston.transport[] = [];

		// В тестовом режиме не выводим логи в консоль (только в файлы)
		if (mode !== 'test') {
			transports.push(new winston.transports.Console({
				format: this.consoleFormat,
				level: LogLevel.DEBUG
			}));
		}

		// Файловые логи всегда активны
		transports.push(
			new DailyRotateFile({
				filename: 'var/logs/%DATE%-app.log',
				datePattern: 'YYYY-MM-DD',
				maxSize: '20m',
				maxFiles: '4d',
				format: this.fileFormat,
				level: LogLevel.DEBUG
			}),
			new DailyRotateFile({
				filename: 'var/logs/%DATE%-error.log',
				datePattern: 'YYYY-MM-DD',
				maxSize: '20m',
				maxFiles: '4d',
				format: this.fileFormat,
				level: LogLevel.ERROR
			})
		);

		return WinstonModule.createLogger({
			transports,
			level: mode === 'production' ? LogLevel.INFO : LogLevel.DEBUG
		});
	}
}

export const createWinstonLogger = () => new LoggerFactory().create();
