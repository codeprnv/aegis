/**
 * BullMQ worker configuration for notification background workers.
 */
export const NOTIFICATION_WORKER_CONFIG = {
  CONCURRENCY: 5,
  DRAIN_DELAY_SECONDS: 60,
} as const;
