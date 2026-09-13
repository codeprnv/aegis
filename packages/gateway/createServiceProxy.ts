import { id } from 'cls-rtracer';
import { NextFunction, Request, Response } from 'express';
import proxy from 'express-http-proxy';
import CircuitBreaker from 'opossum';
import {
  AUTH_ROLES,
  SENTINEL_USERS,
  generateInternalToken,
  type InternalTokenPayload,
} from '@aegis/auth';
import { HTTP_HEADERS, HTTP_STATUS, logger } from '@aegis/common';
import { GATEWAY_ERROR_CODES, PROXY_DEFAULTS } from './constants.js';

interface ServiceProxyOptions {
  serviceName: string; // Target service name for internal token audience
  serviceUrl: string; // Target service base URL
  timeout?: number; // Request timeout in milliseconds (default: 5000ms)
  circuitBreaker?: {
    enabled: boolean;
    errorThreshold?: number;
    resetTimeout?: number;
  };
  proxyReqPathResolver?: (req: Request) => Promise<string> | string;
}

/**
 * Creates an HTTP proxy middleware configured with circuit breaker protection,
 * correlation ID propagation, and short-lived internal JWT authentication.
 *
 * @param options Configuration options for proxy and circuit breaker
 * @returns Express middleware function
 */
export const createServiceProxy = (options: ServiceProxyOptions) => {
  const {
    serviceName,
    serviceUrl,
    timeout = PROXY_DEFAULTS.TIMEOUT_MS,
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
      proxyReqOpts.headers[HTTP_HEADERS.CORRELATION_ID] = String(id() ?? '');

      // Generate the internal token with user context (including active sessionId)
      const payload: Omit<InternalTokenPayload, 'aud'> = {
        sub: srcReq.auth?.id || SENTINEL_USERS.ANONYMOUS,
        role: srcReq.auth?.role || AUTH_ROLES.GUEST,
        ...(srcReq.auth?.sessionId ? { sessionId: srcReq.auth.sessionId } : {}),
      };
      try {
        const internalToken = generateInternalToken(payload, serviceName);
        proxyReqOpts.headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${internalToken}`;
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
      errorThresholdPercentage:
        circuitBreaker.errorThreshold ??
        PROXY_DEFAULTS.CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENT,
      resetTimeout:
        circuitBreaker.resetTimeout ??
        PROXY_DEFAULTS.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
    }
  );

  return (req: Request, res: Response, next: NextFunction) => {
    breaker.fire(req, res, next).catch((err) => {
      // Avoid "headers already sent" error if partial response was written
      if (res.headersSent) {
        return;
      }

      if (err.code === 'ETIMEDOUT') {
        res.status(HTTP_STATUS.GATEWAY_TIMEOUT).json({
          status: 'error',
          statusCode: HTTP_STATUS.GATEWAY_TIMEOUT,
          error: `Gateway Timeout: ${serviceName} did not respond within ${timeout}ms`,
          code: GATEWAY_ERROR_CODES.GATEWAY_TIMEOUT,
          details: err.message,
        });
        return;
      }

      res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
        status: 'error',
        statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
        error: `${serviceName} is temporarily unavailable. Please try again later.`,
        code:
          err.code === 'EOPEN'
            ? GATEWAY_ERROR_CODES.CIRCUIT_OPEN
            : GATEWAY_ERROR_CODES.SERVICE_UNAVAILABLE,
        details: err.message,
      });
    });
  };
};
