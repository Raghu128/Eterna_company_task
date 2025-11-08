import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.server.nodeEnv === 'development' ? 'debug' : 'info',
  transport:
    config.server.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

