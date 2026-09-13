import { Queue } from 'bullmq';
import { createBullMQConnection } from './connection.js';
import type {
  NotificationEvent,
  NotificationPayloadMap,
  SecurityEvent,
  SecurityPayloadMap,
} from './event-types.js';

export const NOTIFICATION_QUEUE_NAME = 'aegis-notifications';
export const SECURITY_QUEUE_NAME = 'aegis-security-events';

// Lazy initialize the queue connection
let notificationQueue: Queue | null = null;
let securityQueue: Queue | null = null;

const getNotificationQueue = (): Queue => {
  if (!notificationQueue) {
    notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
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

const getSecurityQueue = (): Queue => {
  if (!securityQueue) {
    securityQueue = new Queue(SECURITY_QUEUE_NAME, {
      connection: createBullMQConnection() as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { age: 3600 },
        removeOnFail: false,
      },
    });
  }
  return securityQueue;
};

export const enqueueNotification = async <T extends NotificationEvent>(
  event: T,
  payload: NotificationPayloadMap[T]
): Promise<void> => {
  const queue = getNotificationQueue();
  await queue.add(event, payload, {
    jobId: `${event}:${payload.userId}:${Date.now()}`,
  });
};

export const enqueueSecurityEvent = async <T extends SecurityEvent>(
  event: T,
  payload: SecurityPayloadMap[T]
): Promise<void> => {
  const queue = getSecurityQueue();
  const eventId =
    'eventId' in payload && payload.eventId
      ? payload.eventId
      : `${event}:${'userId' in payload ? payload.userId : 'system'}:${Date.now()}`;

  await queue.add(event, payload, {
    jobId: eventId,
  });
};

export const closeQueues = async (): Promise<void> => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
  if (securityQueue) {
    await securityQueue.close();
    securityQueue = null;
  }
};

export const closeNotificationQueue = closeQueues;
export const closeSecurityQueue = closeQueues;
