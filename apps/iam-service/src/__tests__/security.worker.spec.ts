import { prisma, redis } from '@aegis/database';
import { SECURITY_REVOCATION_QUEUE_NAME, SecurityEvent } from '@aegis/events';
import { Worker } from 'bullmq';
import { startSecurityWorker } from '../workers/security.worker';

let capturedProcessor: ((job: any) => Promise<void>) | null = null;

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((queueName, processor, options) => {
      capturedProcessor = processor;
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('@aegis/database', () => ({
  prisma: {
    session: {
      updateMany: jest.fn(),
    },
  },
  redis: {
    setex: jest.fn(),
  },
}));

jest.mock('@aegis/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@aegis/events', () => ({
  SECURITY_REVOCATION_QUEUE_NAME: 'aegis-security-revocations',
  SecurityEvent: {
    AUTH_SESSION_REVOKE: 'auth.session.revoke',
  },
  createBullMQConnection: jest.fn().mockReturnValue({}),
}));

describe('Security Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProcessor = null;
  });

  it('should instantiate a BullMQ Worker on the security queue', () => {
    const worker = startSecurityWorker();

    expect(Worker).toHaveBeenCalledWith(
      SECURITY_REVOCATION_QUEUE_NAME,
      expect.any(Function),
      expect.objectContaining({ concurrency: 5 })
    );
    expect(worker).toBeDefined();
  });

  it('should process AUTH_SESSION_REVOKE by updating database and edge Redis cache', async () => {
    startSecurityWorker();
    expect(capturedProcessor).not.toBeNull();

    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (redis.setex as jest.Mock).mockResolvedValue('OK');

    const mockJob = {
      id: 'job-revoke-1',
      name: SecurityEvent.AUTH_SESSION_REVOKE,
      data: {
        userId: 'user-xyz',
        sessionId: 'session-xyz',
        reason: 'Impossible travel anomaly detected',
        timestamp: Date.now(),
      },
    };

    await capturedProcessor!(mockJob);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session-xyz',
        userId: 'user-xyz',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
        revokedReason: 'Impossible travel anomaly detected',
      },
    });

    expect(redis.setex).toHaveBeenCalledWith(
      'aegis:revoked:session:session-xyz',
      960,
      'revoked'
    );
  });

  it('should skip processing and log warning if userId or sessionId is missing', async () => {
    startSecurityWorker();

    const invalidJob = {
      id: 'job-invalid-1',
      name: SecurityEvent.AUTH_SESSION_REVOKE,
      data: {
        userId: '',
        sessionId: '',
      },
    };

    await capturedProcessor!(invalidJob);

    expect(prisma.session.updateMany).not.toHaveBeenCalled();
    expect(redis.setex).not.toHaveBeenCalled();
  });
});
