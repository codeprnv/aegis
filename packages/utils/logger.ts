import { id } from 'cls-rtracer';
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  mixin: () => {
    const correlationId = id();
    return {
      correlationId: correlationId || undefined,
      service: process.env.SERVICE_NAME || 'unknown',
    };
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});
