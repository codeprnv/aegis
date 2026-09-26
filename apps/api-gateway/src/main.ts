process.env.SERVICE_NAME = 'api-gateway';

import crypto from 'node:crypto';
import net from 'node:net';
import path from 'path';
import { apiGatewayEnvSchema } from '@aegis/types';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const env = apiGatewayEnvSchema.parse(process.env);

Object.freeze(env);

import { HTTP_HEADERS, logger } from '@aegis/common';
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
import {
  auditRateLimiter,
  authRateLimiter,
  probeRateLimiter,
  rateLimiter,
} from './utils/rate-limit.js';

const {
  HOST: host,
  API_GATEWAY_PORT: defaultPort,
  ORIGIN_HOST_1: origin,
  IAM_SERVICE_PORT: iamServicePort,
  AUDIT_SERVICE_PORT: auditServicePort,
  AUDIT_HOST: auditHost,
  EDGE_INGRESS_SECRET: edgeIngressSecret,
} = env;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultPort;
const app = express();

// Trust private/loopback/linklocal upstream proxies (Render router, Docker bridge, localhost).
// Express strips all private proxy IPs from X-Forwarded-For and selects the first public routable IP.
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

app.use(requestTracer);

/**
 * Hardened Edge Telemetry Verification Middleware.
 * Cryptographically verifies that incoming client IP headers originated from the
 * authenticated Vercel BFF, defending against DoS attacks, replay attacks, and timing side-channels.
 */
app.use((req, _res, next) => {
  try {
    const edgeSecret = edgeIngressSecret || process.env.EDGE_INGRESS_SECRET;
    if (!edgeSecret) {
      return next();
    }

    const rawSignature = req.headers[HTTP_HEADERS.AEGIS_SIGNATURE];
    const signatureHeader = Array.isArray(rawSignature)
      ? rawSignature[0]
      : rawSignature;

    const rawRealIp = req.headers[HTTP_HEADERS.REAL_IP];
    const realIpHeader = Array.isArray(rawRealIp) ? rawRealIp[0] : rawRealIp;

    if (
      typeof signatureHeader !== 'string' ||
      typeof realIpHeader !== 'string' ||
      signatureHeader.length === 0 ||
      signatureHeader.length > 256 ||
      realIpHeader.length === 0 ||
      realIpHeader.length > 64
    ) {
      return next();
    }

    const dotIndex = signatureHeader.indexOf('.');
    if (dotIndex <= 0) {
      return next();
    }

    const timestampStr = signatureHeader.substring(0, dotIndex);
    const receivedSig = signatureHeader.substring(dotIndex + 1);
    const timestamp = parseInt(timestampStr, 10);

    if (Number.isNaN(timestamp) || Math.abs(Date.now() - timestamp) > 60000) {
      return next();
    }

    if (receivedSig.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(receivedSig)) {
      return next();
    }

    const trimmedRealIp = realIpHeader.trim();
    if (net.isIP(trimmedRealIp) === 0) {
      return next();
    }

    const expectedSig = crypto
      .createHmac('sha256', edgeSecret)
      .update(`${trimmedRealIp}:${timestampStr}`)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedSig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (
      receivedBuf.byteLength === 32 &&
      expectedBuf.byteLength === 32 &&
      crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      req.clientIp = trimmedRealIp;
    }
  } catch (err) {
    logger.error({ err }, 'Edge telemetry verification error');
  }

  next();
});

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
    allowedHeaders: [
      'Content-Type',
      HTTP_HEADERS.AUTHORIZATION,
      HTTP_HEADERS.CORRELATION_ID,
      'X-Forwarded-For',
      'X-Real-IP',
      HTTP_HEADERS.AEGIS_SIGNATURE,
    ],
    exposedHeaders: [HTTP_HEADERS.CORRELATION_ID],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(extractAuthContext);

// Public infrastructure probes (protected by dedicated probe rate limiter: 60 req/min)
app.get('/', probeRateLimiter, (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

app.get(GATEWAY_ROUTES.HEALTH, probeRateLimiter, (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
  });
});

// Readiness probe (stateless reverse proxy runtime check)
app.get(GATEWAY_ROUTES.READY, probeRateLimiter, (_req, res) => {
  res.json({ ready: true, uptime: process.uptime() });
});

// Liveness probe
app.get(GATEWAY_ROUTES.LIVE, probeRateLimiter, (_req, res) => {
  res.json({ alive: true });
});

// General Rate Limiter - 50 requests per 15 minutes (protects all API routes)
app.use(rateLimiter);

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

// Mount Audit Service Proxy with Edge Rate Limiting & Auth
v1Router.use(GATEWAY_ROUTES.AUDIT, auditRateLimiter);
v1Router.use(GATEWAY_ROUTES.AUDIT, gatewayRequireAuth);

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

v1Router.use(
  GATEWAY_ROUTES.AUDIT,
  createServiceProxy({
    serviceName: GATEWAY_PROXY_CONFIG.AUDIT_SERVICE.name,
    serviceUrl: `${auditHost}:${auditServicePort}`,
    timeout: GATEWAY_PROXY_CONFIG.AUDIT_SERVICE.timeoutMs,
    circuitBreaker: GATEWAY_PROXY_CONFIG.AUDIT_SERVICE.circuitBreaker,
    proxyReqPathResolver: (req) => {
      return `${GATEWAY_ROUTES.UPSTREAM_AUDIT_PREFIX}${req.url}`;
    },
  })
);

// Mount v1 router
app.use(GATEWAY_ROUTES.V1_PREFIX, v1Router);

app.use(errorMiddleware);

const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`Listening at http://0.0.0.0:${port}`);
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
