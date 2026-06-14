import { Queue } from 'bullmq';
import { createBullMQConnection } from './connection.js';
import type {
  NotificationEvent,
  NotificationPayloadMap,
} from './event-types.js';

const QUEUE_NAME = 'aegis-notifications';

// Lazy initialize the queue connection
let notificationQueue: Queue | null = null;

const getQueue = (): Queue => {
  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAME, {
      connection: createBullMQConnection() as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 3600 },
        removeOnFail: false, // keep failed jobs for debugging
      },
    });
  }
  return notificationQueue;
};

export const enqueueNotification = async <T extends NotificationEvent>(
  event: T,
  payload: NotificationPayloadMap[T]
): Promise<void> => {
  const queue = getQueue();
  await queue.add(event, payload, {
    jobId: `${event}:${payload.userId}:${Date.now()}`,
  });
};

export const closeNotificationQueue = async (): Promise<void> => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
};
