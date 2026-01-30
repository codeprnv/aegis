import { id } from 'cls-rtracer';
import { NextFunction, Request, Response } from 'express';
import proxy from 'express-http-proxy';
import CircuitBreaker from 'opossum';
import { generateInternalToken } from '../auth/internal-token.js';

interface ServiceProxyOptions {
  serviceName: string; //name of internal token audience
  serviceUrl: string; // target service url
  timeout?: number; // timeout for the request (default: 5000ms)
  circuitBreaker?: {
    enabled: boolean;
    errorThreshold?: number;
    resetTimeout?: number;
  };
}

export const createServiceProxy = (options: ServiceProxyOptions) => {
  const {
    serviceName,
    serviceUrl,
    timeout = 5000,
    circuitBreaker = { enabled: true },
  } = options;

  // Proxy middleware
  const proxyMiddleware = proxy(serviceUrl, {
    timeout,
    proxyReqBodyDecorator: (proxyReqOpts, srcReq) => {
      // Add correlation id
      proxyReqOpts.headers['X-Correlation-Id'] = String(id() ?? '');

      // Generate the internal token with user context
      const payload = {
        sub: srcReq.auth?.id || 'anonymous',
        role: srcReq.auth?.role || 'guest',
      };

      const internalToken = generateInternalToken(payload, serviceName);
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers['Authorization'] = `Bearer ${internalToken}`;
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

  // Fallback when circuit is open
  breaker.fallback(() => ({
    error: `${serviceName} is temporarily unavailable. Please try again later.`,
    code: 'SERVICE_UNAVAILABLE',
  }));
  return (req: Request, res: Response, next: NextFunction) => {
    breaker.fire(req, res, next).catch((err) => {
      res.status(503).json({
        error: `${serviceName} is temporarily unavailable. Please try again later.`,
        code: 'CIRCUIT_OPEN',
      });
    });
  };
};
