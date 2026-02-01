import { id } from 'cls-rtracer';
import { NextFunction, Request, Response } from 'express';
import proxy from 'express-http-proxy';
import CircuitBreaker from 'opossum';
import { generateInternalToken } from '../auth/internal-token.js';
import { logger } from '../utils/logger.js';

interface ServiceProxyOptions {
  serviceName: string; //name of internal token audience
  serviceUrl: string; // target service url
  timeout?: number; // timeout for the request (default: 5000ms)
  circuitBreaker?: {
    enabled: boolean;
    errorThreshold?: number;
    resetTimeout?: number;
  };
  proxyReqPathResolver?: (req: Request) => Promise<string> | string;
}

export const createServiceProxy = (options: ServiceProxyOptions) => {
  const {
    serviceName,
    serviceUrl,
    timeout = 5000,
    circuitBreaker = { enabled: true },
    proxyReqPathResolver,
  } = options;

  // Proxy middleware
  const proxyMiddleware = proxy(serviceUrl, {
    timeout,
    proxyReqPathResolver,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Add correlation id
      if (!proxyReqOpts.headers) {
        proxyReqOpts.headers = {};
      }
      proxyReqOpts.headers['X-Correlation-Id'] = String(id() ?? '');

      // Generate the internal token with user context
      const payload = {
        sub: srcReq.auth?.id || 'anonymous',
        role: srcReq.auth?.role || 'guest',
      };
      try {
        const internalToken = generateInternalToken(payload, serviceName);
        proxyReqOpts.headers['authorization'] = `Bearer ${internalToken}`;
      } catch (error) {
        logger.error(
          { error, serviceName },
          'Failed to generate internal token'
        );
        throw error; // Fail the request if token cannot be generated
      }

      return proxyReqOpts;
    },
  });

  if (!circuitBreaker.enabled) {
    return proxyMiddleware;
  }

  const breaker = new CircuitBreaker(
    (req: Request, res: Response, next: NextFunction) => {
      return new Promise((resolve, reject) => {
        // Listen for response completion to resolve the circuit breaker action
        res.once('finish', () => resolve(undefined));
        res.once('close', () => resolve(undefined));

        proxyMiddleware(
          req as Parameters<typeof proxyMiddleware>[0],
          res,
          (err) => {
            if (err) reject(err);
            else resolve(undefined);
          }
        );
      });
    },
    {
      timeout,
      errorThresholdPercentage: circuitBreaker.errorThreshold ?? 50,
      resetTimeout: circuitBreaker.resetTimeout ?? 30000,
    }
  );

  return (req: Request, res: Response, next: NextFunction) => {
    breaker.fire(req, res, next).catch((err) => {
      // Avoid "headers already sent" error if partial response was written
      if (res.headersSent) {
        return;
      }
      res.status(503).json({
        error: `${serviceName} is temporarily unavailable. Please try again later.`,
        code: err.code === 'EOPEN' ? 'CIRCUIT_OPEN' : 'SERVICE_UNAVAILABLE',
        details: err.message,
      });
    });
  };
};
