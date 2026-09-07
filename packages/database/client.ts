import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaClient as NotificationPrismaClient } from '../../generated/prisma-notification/client.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  notificationPrisma: NotificationPrismaClient | undefined;
};

/**
 * Initializes and returns the primary IAM Prisma Client.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

/**
 * Initializes and returns the dedicated Notification Service Prisma Client,
 * targeting the isolated "notifications" schema namespace.
 */
function createNotificationPrismaClient(): NotificationPrismaClient {
  const baseConnectionString = process.env.DATABASE_URL;

  if (!baseConnectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = new URL(baseConnectionString);
  url.searchParams.set('schema', 'notifications');
  const connectionString = process.env.NOTIFICATION_DATABASE_URL || url.toString();

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new NotificationPrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export const notificationPrisma =
  globalForPrisma.notificationPrisma ?? createNotificationPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.notificationPrisma = notificationPrisma;
}

/**
 * Gracefully disconnects all active Prisma client connections.
 */
export async function disconnectPrisma(): Promise<void> {
  await Promise.all([
    prisma.$disconnect(),
    notificationPrisma.$disconnect(),
  ]);
}
