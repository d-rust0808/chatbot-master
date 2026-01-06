/**
 * Winston logger configuration
 * 
 * WHY: Centralized logging với levels và formats
 * - Structured logging cho production
 * - Different formats cho dev vs prod
 * - Error tracking ready
 */

import winston from 'winston';
import { config } from './config';

// Custom format cho development (readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Custom format cho production (JSON)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: config.isDevelopment ? devFormat : prodFormat,
  defaultMeta: { service: 'chatbot-backend' },
  transports: [
    // Console output (always)
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    // File output (production only)
    ...(config.isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});

// Handle uncaught exceptions và unhandled rejections
if (config.isProduction) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}

