import { inspect } from 'util';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogLevel } from '@/enums/log-level.enum';

class LoggerFactory {
	private readonly fileFormat: winston.Logform.Format;
	private readonly consoleFormat: winston.Logform.Format;
	private readonly mode: string = process.env.APP_MODE;

	public constructor() {
		this.fileFormat = winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
			winston.format.errors({ stack: true }),
			winston.format.printf(this.fileFormatter)
		);

		this.consoleFormat = winston.format.combine(
			winston.format.timestamp({ format: 'HH:mm:ss' }),
			winston.format.colorize(),
			winston.format.printf(this.consoleFormatter)
		);
	}

	public createAppLogger() {
		const transports: winston.transport[] = [];

		if (this.mode !== 'test') {
			transports.push(new winston.transports.Console({
				format: this.consoleFormat,
				level: LogLevel.DEBUG
			}));
		}

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
			level: this.mode === 'production' ? LogLevel.INFO : LogLevel.DEBUG
		});
	}

	public createLlmLogger() {
		return winston.createLogger({
			transports: [
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.timestamp({ format: 'HH:mm:ss' }),
						winston.format.colorize(),
						winston.format.printf((info) => {
							const ctx = Reflect.get(info, 'context');
							const context = ctx && typeof ctx === 'string' ? `[${ctx}] ` : '';
							const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '';
							const message = typeof info.message === 'string' ? info.message : '';
							return `${timestamp} ${info.level} ${context}${message}`;
						})
					),
					level: this.mode === 'production' ? LogLevel.INFO : LogLevel.DEBUG
				}),
				new DailyRotateFile({
					filename: 'var/logs/%DATE%-llm.log',
					datePattern: 'YYYY-MM-DD',
					maxSize: '20m',
					maxFiles: '2d',
					format: winston.format.combine(
						winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
						winston.format.errors({ stack: true }),
						winston.format.printf((info) => {
							const ctx = Reflect.get(info, 'context');
							const context = ctx && typeof ctx === 'string' ? `[${ctx}] ` : '';
							const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '';
							const message = typeof info.message === 'string' ? info.message : '';
							const stack = info.stack ? `\n${inspect(info.stack, { depth: null })}` : '';
							return `${timestamp} ${info.level} ${context}${message}${stack}`;
						})
					),
					level: this.mode === 'production' ? LogLevel.INFO : LogLevel.DEBUG
				})
			],
			level: this.mode === 'production' ? LogLevel.INFO : LogLevel.DEBUG
		});
	}

	private fileFormatter = (info: winston.Logform.TransformableInfo): string => {
		const ctx = Reflect.get(info, 'context');
		const context = ctx && typeof ctx === 'string' ? `[${ctx}] ` : '';

		const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '';
		const message = typeof info.message === 'string' ? info.message : '';
		const stack = info.stack
			? `\n${typeof info.stack === 'string' ? info.stack : inspect(info.stack, { depth: null })}`
			: '';

		return `${timestamp} ${info.level} ${context}${message}${stack}`;
	};

	private consoleFormatter = (info: winston.Logform.TransformableInfo): string => {
		const ctx = Reflect.get(info, 'context');
		const context = ctx && typeof ctx === 'string' ? `[${ctx}] ` : '';

		const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '';
		const message = typeof info.message === 'string' ? info.message : '';
		const stack = info.stack
			? `\n${typeof info.stack === 'string' ? info.stack : inspect(info.stack, { depth: null })}`
			: '';

		return `${timestamp} ${info.level} ${context}${message}${stack}`;
	};
}

const factory = new LoggerFactory();
const createWinstonLogger = () => factory.createAppLogger();
const llmLogger = factory.createLlmLogger();

export { createWinstonLogger, llmLogger };
