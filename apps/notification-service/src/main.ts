process.env.SERVICE_NAME = 'notification-service';

import { logger } from '@aegis/common';
import express from 'express';
import { checkHealth } from './health';
import { startEmailWorker } from './workers/email.worker';

const app = express();
const port = process.env.NOTIFICATION_SERVICE_PORT || 6001;

app.use(express.json());

// Basic health check endpoint
app.get('/health', async (req, res) => {
  const status = await checkHealth();
  res.status(status.healthy ? 200 : 503).json(status);
});

// Future: Bull Board dashboard can be mounted here
// app.use('/admin/queues', serverAdapter.getRouter());

const server = app.listen(port, () => {
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
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
