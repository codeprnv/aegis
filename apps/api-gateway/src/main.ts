process.env.SERVICE_NAME = 'api-gateway';

import { apiGatewayEnvSchema } from '@aegis/common';
import { id } from 'cls-rtracer';
import dotenv from 'dotenv';
import helmet from 'helmet';

dotenv.config({
  path: '../../../.env',
});

const env = apiGatewayEnvSchema.parse(process.env);

Object.freeze(env);

import {
  accessLogger,
  createServiceProxy,
  errorMiddleware,
  extractAuthContext,
  generateInternalToken,
  logger,
  requestTracer,
  sanitizeHeaders,
} from '@aegis/common';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'express-async-errors';
import proxy from 'express-http-proxy';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const {
  HOST: host,
  API_GATEWAY_PORT: port,
  ORIGIN_HOST_1: origin,
  // NODE_ENV: nodeEnv,
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
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Correlation-Id'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(extractAuthContext);
app.set('trust proxy', 1);

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
  legacyHeaders: true,
  keyGenerator: (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ipKeyGenerator(ip);
  },
});

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
  res.json({ ready: true });
});
// Liveness probe
app.get('/live', (req, res) => {
  res.json({ alive: true });
});

// // Proxy to Profile Service (Placeholder URL)
// const PROFILE_SERVICE_URL =
//   process.env.PROFILE_SERVICE_URL || 'http://localhost:3001';

// app.use(
//   '/users',
//   proxy(PROFILE_SERVICE_URL, {
//     proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
//       proxyReqOpts.headers['X-Correlation-Id'] = String(id() ?? '');
//       const payload = {
//         sub: srcReq.auth?.id || 'anonymous',
//         role: srcReq.auth?.role || 'guest',
//       };

//       const internalToken = generateInternalToken(payload);

//       if (proxyReqOpts.headers) {
//         proxyReqOpts.headers['Authorization'] = `Bearer ${internalToken}`;
//       }
//       return proxyReqOpts;
//     },
//   })
// );

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
