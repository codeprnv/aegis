import { pinoHttp } from 'pino-http';
import { logger } from '../../utils/logger.js';

export const accessLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return 'request completed';
  },
  customErrorMessage: (req, res, err) => {
    return 'request failed';
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        path: req.originalUrl || req.url,
        ip: req.ip || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
