process.env.SERVICE_NAME = 'api-gateway';

import { apiGatewayEnvSchema } from '@aegis/types';
// import { id } from 'cls-rtracer';
import dotenv from 'dotenv';
import helmet from 'helmet';

import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const env = apiGatewayEnvSchema.parse(process.env);

Object.freeze(env);

import { createServiceProxy, logger } from '@aegis/common';
import { prisma } from '@aegis/database';
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
import { authRateLimiter, rateLimiter } from './utils/rate-limit';

const {
  HOST: host,
  API_GATEWAY_PORT: port,
  ORIGIN_HOST_1: origin,
  // NODE_ENV: nodeEnv,
  IAM_SERVICE_PORT: iamServicePort,
} = env;
const app = express();

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

app.use(
  cors({
    origin: [origin],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'authorization'],
    exposedHeaders: ['X-Correlation-Id'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(extractAuthContext);
app.set('trust proxy', 1);

// General Rate Limiter - 50 request per 15 minutes
app.use(rateLimiter);

app.get('/gateway-health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
  });
});
// Readiness probe (check downstream services)
app.get('/ready', async (req, res) => {
  // Add checks for database, cache, or downstream services
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (_error) {
    res.status(503).json({ ready: false, error: 'Database connection failed' });
  }
});
// Liveness probe
app.get('/live', (req, res) => {
  res.json({ alive: true });
});

// Auth Rate Limiter - 5 requests per 15 minutes (must be BEFORE proxy)
// Uses strict Regex to prevent bypasses via trailing slashes or varying capitalization
app.use(/^\/auth\/(login|register|reset-password|forgot-password)\/?$/i, authRateLimiter);

app.use(
  '/auth',
  createServiceProxy({
    serviceName: 'iam-service',
    serviceUrl: `${host}:${iamServicePort}`,
    timeout: 5000,
    circuitBreaker: {
      enabled: true,
      resetTimeout: 20000,
      errorThreshold: 75,
    },
    proxyReqPathResolver: (req) => {
      return `/internal/auth${req.url}`;
    },
  })
);

app.use(errorMiddleware);

const server = app.listen(port, () => {
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
