process.env.SERVICE_NAME = 'api-gateway';

import { apiGatewayEnvSchema } from '@aegis/types';
import dotenv from 'dotenv';
import helmet from 'helmet';

import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const env = apiGatewayEnvSchema.parse(process.env);

Object.freeze(env);

import { HTTP_HEADERS, HTTP_STATUS, logger } from '@aegis/common';
import { createServiceProxy } from '@aegis/gateway';
import {
  accessLogger,
  errorMiddleware,
  extractAuthContext,
  requestTracer,
  sanitizeHeaders,
} from '@aegis/middlewares';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import {
  GATEWAY_PROXY_CONFIG,
  GATEWAY_RATE_LIMIT_CONFIG,
  GATEWAY_ROUTES,
} from './config/index.js';
import { gatewayRequireAuth } from './middlewares/gatewayRequireAuth.js';
import { authRateLimiter, rateLimiter } from './utils/rate-limit.js';

const {
  HOST: host,
  API_GATEWAY_PORT: port,
  ORIGIN_HOST_1: origin,
  IAM_SERVICE_PORT: iamServicePort,
} = env;
const app = express();

// Trust reverse proxies to get the real client IP (e.g. from Cloudflare, Nginx, or AWS ALB)
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

app.use(requestTracer);
app.use(sanitizeHeaders);
app.use(accessLogger);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"], // No Flash/Java
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 Years
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny', // Prevent Clickjacking
    },
  })
);

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((item) => item.trim())
  : [origin];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', HTTP_HEADERS.AUTHORIZATION],
    exposedHeaders: [HTTP_HEADERS.CORRELATION_ID],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(extractAuthContext);

// General Rate Limiter - 50 request per 15 minutes
app.use(rateLimiter);

app.get(GATEWAY_ROUTES.HEALTH, (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
  });
});

// Readiness probe (stateless reverse proxy runtime check)
app.get(GATEWAY_ROUTES.READY, (req, res) => {
  res.json({ ready: true, uptime: process.uptime() });
});

// Liveness probe
app.get(GATEWAY_ROUTES.LIVE, (req, res) => {
  res.json({ alive: true });
});

// Version 1 API Router
const v1Router = express.Router();

// Auth Rate Limiter - DDoS protection (must be BEFORE proxy)
// Uses strict Regex to prevent bypasses via trailing slashes or varying capitalization
v1Router.use(GATEWAY_RATE_LIMIT_CONFIG.AUTH_ROUTE_REGEX, authRateLimiter);

// Perimeter Edge Auth Enforcement (SEC-02)
v1Router.use('/auth/change-password', gatewayRequireAuth);
v1Router.use('/auth/me', gatewayRequireAuth);
v1Router.use('/auth/sessions', gatewayRequireAuth);
v1Router.use(GATEWAY_ROUTES.ADMIN, gatewayRequireAuth);

v1Router.use(
  GATEWAY_ROUTES.AUTH,
  createServiceProxy({
    serviceName: GATEWAY_PROXY_CONFIG.IAM_SERVICE.name,
    serviceUrl: `${host}:${iamServicePort}`,
    timeout: GATEWAY_PROXY_CONFIG.IAM_SERVICE.timeoutMs,
    circuitBreaker: GATEWAY_PROXY_CONFIG.IAM_SERVICE.circuitBreaker,
    proxyReqPathResolver: (req) => {
      return `${GATEWAY_ROUTES.UPSTREAM_IAM_AUTH_PREFIX}${req.url}`;
    },
  })
);

v1Router.use(
  GATEWAY_ROUTES.ADMIN,
  createServiceProxy({
    serviceName: GATEWAY_PROXY_CONFIG.IAM_SERVICE.name,
    serviceUrl: `${host}:${iamServicePort}`,
    timeout: GATEWAY_PROXY_CONFIG.IAM_SERVICE.timeoutMs,
    circuitBreaker: GATEWAY_PROXY_CONFIG.IAM_SERVICE.circuitBreaker,
    proxyReqPathResolver: (req) => {
      return `${GATEWAY_ROUTES.UPSTREAM_IAM_ADMIN_PREFIX}${req.url}`;
    },
  })
);

// Mount v1 router
app.use(GATEWAY_ROUTES.V1_PREFIX, v1Router);

app.use(errorMiddleware);

const server = app.listen(port as number, '0.0.0.0', () => {
  logger.info(`Listening at ${host}:${port}`);
});
server.on('error', (err) => logger.error(err));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
