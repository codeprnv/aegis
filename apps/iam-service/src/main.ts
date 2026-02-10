process.env.SERVICE_NAME = 'iam-service';

import { logger } from '@aegis/common';
import { iamServiceEnvSchema } from '@aegis/types';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});
const env = iamServiceEnvSchema.parse(process.env);
Object.freeze(env);

import { disconnectPrisma, prisma } from '@aegis/database';
import {
  accessLogger,
  errorMiddleware,
  requestTracer,
  requireInternalToken,
  sanitizeHeaders,
} from '@aegis/middlewares';
import express from 'express';
import 'express-async-errors';
import { startSessionCleanupJob } from './jobs/sessionCleanup';
import authRoutes from './routes/auth.route';

const port = env.IAM_SERVICE_PORT;
const host = env.HOST;
const app = express();

app.use(requestTracer); // Add correlation ID
app.use(sanitizeHeaders); // Clean headers
app.use(accessLogger); // Log requests

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'iam-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness probe - Database connection check
app.get('/ready', async (req, res) => {
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

app.use('/internal', requireInternalToken('iam-service'));
app.get('/internal/auth/health', (req, res) => {
  res.send({ message: 'Welcome to iam-service!' });
});

// Auth routes
app.use('/internal/auth', authRoutes);

// Error middleware
app.use(errorMiddleware);

const server = app.listen(port, () => {
  logger.info(`Listening at ${host}:${port}`);
});
server.on('error', (err) => logger.error(err));
startSessionCleanupJob();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectPrisma();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectPrisma();
  server.close(() => {
    process.exit(0);
  });
});
