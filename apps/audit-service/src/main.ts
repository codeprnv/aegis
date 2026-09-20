process.env.SERVICE_NAME = 'audit-service';

import { logger, SERVICE_NAMES } from '@aegis/common';
import { disconnectPrisma } from '@aegis/database';
import {
  accessLogger,
  errorMiddleware,
  requestTracer,
  requireInternalToken,
} from '@aegis/middlewares';
import express from 'express';
import { auditServerConfig } from './config/index.js';
import { checkHealth } from './health.js';
import auditRoutes from './routes/audit.routes.js';
import { startAnomalyWorker } from './workers/anomaly.worker.js';

const app = express();
const port = auditServerConfig.port;

app.use(requestTracer);
app.use(accessLogger);
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req, res) => {
  const status = await checkHealth();
  res.status(status.healthy ? 200 : 503).json(status);
});

// Perimeter edge defense: verify internal RS256 token from API Gateway
app.use('/internal', requireInternalToken(SERVICE_NAMES.AUDIT));

// Mount internal audit and device management routes
app.use('/internal/v1/audit', auditRoutes);

// Structured error handling middleware
app.use(errorMiddleware);

const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`Audit Service listening on port ${port}`);
});

// Start the BullMQ Anomaly Telemetry Worker
const anomalyWorker = startAnomalyWorker();

// Graceful Shutdown Handler
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down Audit Service gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await anomalyWorker.close();
      logger.info('Anomaly worker stopped.');
      await disconnectPrisma();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        'Error during graceful shutdown'
      );
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcefully exiting.');
    process.exit(1);
  }, auditServerConfig.shutdownTimeoutMs);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
