import fs from 'fs';
import path from 'path';
import winston from 'winston';

const logsDir = path.join(__dirname, '..', '..', 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const logLevel = process.env.LOG_LEVEL || 'info';

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
);

const consoleFormat =
  nodeEnv === 'production'
    ? winston.format.combine(baseFormat, winston.format.json())
    : winston.format.combine(
        baseFormat,
        winston.format.colorize(),
        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const { timestamp, level, message, ...meta } = info;
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaString}`;
        }),
      );

export const logger = winston.createLogger({
  level: logLevel,
  format: baseFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

export const withRequestContext = (
  requestId?: string,
  correlationId?: string,
): winston.Logger => {
  if (!requestId && !correlationId) return logger;
  return logger.child({ requestId, correlationId });
};

export const httpLoggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

process.on('uncaughtException', (err: Error) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});
