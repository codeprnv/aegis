import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import { PrismaClient as NotificationPrismaClient } from '../../generated/prisma-notification/client.js';
import { PrismaClient } from '../../generated/prisma/client.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  notificationPrisma: NotificationPrismaClient | undefined;
  pgPool: Pool | undefined;
  notificationPgPool: Pool | undefined;
};

const POOL_CONFIG: PoolConfig = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/**
 * Initializes and returns the primary IAM Prisma Client.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString, ...POOL_CONFIG });
  pool.on('error', (err) => {
    console.error('Aegis IAM database pool idle client error: ', err.message);
  });
  globalForPrisma.pgPool = pool;
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
  const connectionString =
    process.env.NOTIFICATION_DATABASE_URL || url.toString();

  const pool = new Pool({ connectionString, ...POOL_CONFIG });
  pool.on('error', (err) => {
    console.error(
      'Aegis Notification database pool idle client error: ',
      err.message
    );
  });
  globalForPrisma.notificationPgPool = pool;
  const adapter = new PrismaPg(pool, { schema: 'notifications' });

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
    globalForPrisma.pgPool?.end(),
    globalForPrisma.notificationPgPool?.end(),
  ]);
}
