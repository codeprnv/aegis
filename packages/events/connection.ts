import { Redis } from 'ioredis';

export const createBullMQConnection = () => (
    new Redis(process.env.UPSTASH_REDIS_URL as string, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: {}
    })
)