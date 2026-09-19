import { Queue } from 'bullmq';
import { createBullMQConnection } from './connection.js';
import type {
  NotificationEvent,
  NotificationPayloadMap,
  SecurityEvent,
  SecurityPayloadMap,
} from './event-types.js';

export const NOTIFICATION_QUEUE_NAME = 'aegis-notifications';
export const SECURITY_TELEMETRY_QUEUE_NAME = 'aegis-security-telemetry';
export const SECURITY_REVOCATION_QUEUE_NAME = 'aegis-security-revocations';
export const SECURITY_QUEUE_NAME = SECURITY_REVOCATION_QUEUE_NAME;

// Lazy initialize the queue connections
let notificationQueue: Queue | null = null;
let securityTelemetryQueue: Queue | null = null;
let securityRevocationQueue: Queue | null = null;

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

const getSecurityTelemetryQueue = (): Queue => {
  if (!securityTelemetryQueue) {
    securityTelemetryQueue = new Queue(SECURITY_TELEMETRY_QUEUE_NAME, {
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
  return securityTelemetryQueue;
};

const getSecurityRevocationQueue = (): Queue => {
  if (!securityRevocationQueue) {
    securityRevocationQueue = new Queue(SECURITY_REVOCATION_QUEUE_NAME, {
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
  return securityRevocationQueue;
};

export const enqueueNotification = async <T extends NotificationEvent>(
  event: T,
  payload: NotificationPayloadMap[T]
): Promise<void> => {
  const queue = getNotificationQueue();
  const recipientId =
    ('userId' in payload && payload.userId) ||
    ('email' in payload && payload.email) ||
    'anon';

  await queue.add(event, payload, {
    jobId: `${event}:${recipientId}:${Date.now()}`,
  });
};

export const enqueueSecurityTelemetry = async <T extends SecurityEvent>(
  event: T,
  payload: SecurityPayloadMap[T]
): Promise<void> => {
  const queue = getSecurityTelemetryQueue();
  const eventId =
    'eventId' in payload && payload.eventId
      ? payload.eventId
      : `${event}:${'userId' in payload ? payload.userId : 'system'}:${Date.now()}`;

  await queue.add(event, payload, {
    jobId: eventId,
  });
};

export const enqueueSecurityRevocation = async <T extends SecurityEvent>(
  event: T,
  payload: SecurityPayloadMap[T]
): Promise<void> => {
  const queue = getSecurityRevocationQueue();
  const eventId =
    'eventId' in payload && payload.eventId
      ? payload.eventId
      : `${event}:${'userId' in payload ? payload.userId : 'system'}:${Date.now()}`;

  await queue.add(event, payload, {
    jobId: eventId,
  });
};

export const enqueueSecurityEvent = async <T extends SecurityEvent>(
  event: T,
  payload: SecurityPayloadMap[T]
): Promise<void> => {
  if (event === 'auth.session.revoke') {
    return enqueueSecurityRevocation(event, payload);
  }
  return enqueueSecurityTelemetry(event, payload);
};

export const closeQueues = async (): Promise<void> => {
  const closures: Promise<void>[] = [];
  if (notificationQueue) {
    closures.push(notificationQueue.close());
    notificationQueue = null;
  }
  if (securityTelemetryQueue) {
    closures.push(securityTelemetryQueue.close());
    securityTelemetryQueue = null;
  }
  if (securityRevocationQueue) {
    closures.push(securityRevocationQueue.close());
    securityRevocationQueue = null;
  }
  await Promise.all(closures);
};

export const closeNotificationQueue = closeQueues;
export const closeSecurityQueue = closeQueues;
