process.env.SERVICE_NAME = 'notification-service';

import { logger, SERVICE_NAMES } from '@aegis/common';
import express from 'express';
import { NOTIFICATION_SERVER_CONFIG } from './config/index.js';
import { checkHealth } from './health';
import { startEmailWorker } from './workers/email.worker';

const app = express();
const port =
  process.env.NOTIFICATION_SERVICE_PORT || NOTIFICATION_SERVER_CONFIG.PORT;

app.use(express.json());

// Basic health check endpoint
app.get('/health', async (req, res) => {
  const status = await checkHealth();
  res.status(status.healthy ? 200 : 503).json(status);
});

// Future: Bull Board dashboard can be mounted here
// app.use('/admin/queues', serverAdapter.getRouter());

const server = app.listen(port as number, '0.0.0.0', () => {
  logger.info(`Notification Service listening on port ${port}`);
});

// Start the BullMQ worker
const emailWorker = startEmailWorker();

// Graceful Shutdown
const shutdown = async () => {
  logger.info(`Shutting down Notification Service ...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await emailWorker.close();
    logger.info('Email worker closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error(
      'Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, NOTIFICATION_SERVER_CONFIG.SHUTDOWN_TIMEOUT_MS);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
