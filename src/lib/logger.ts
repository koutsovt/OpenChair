/**
 * Structured logger — pino.
 *
 * - Development: pretty-printed via pino-pretty (human-readable)
 * - Production: JSON to stdout (Railway picks this up automatically)
 *
 * Level is controlled by LOG_LEVEL env var (default: 'info').
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info({ bookingId }, 'booking created');
 *   log.error({ err, phone }, 'SMS send failed');
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const level = process.env.LOG_LEVEL ?? 'info';

export const log = pino({
  level,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:HH:MM:ss',
          },
        },
      }
    : {
        // JSON to stdout — Railway captures and indexes structured logs natively.
        // No transport wrapper needed; pino writes JSON by default.
        formatters: {
          level(label) {
            return { level: label };
          },
        },
      }),
});
