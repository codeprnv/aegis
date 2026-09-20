import z from 'zod';

// Shared downstream service env fields
export const downstreamServiceBase = z.object({
  API_GATEWAY_PUBLIC_KEY_B64: z
    .string()
    .min(1, 'API Gateway public key is required'),
});

export const apiGatewayEnvSchema = z.object({
  API_GATEWAY_PORT: z.coerce.number<number>().default(8080),
  HOST: z.coerce.string<string>().default('http://localhost'),
  ORIGIN_HOST_1: z.coerce.string<string>().default('http://localhost:3000'),
  JWT_SECRET: z.coerce
    .string<string>()
    .min(32, 'JWT_SECRET is required with min length 32'),
  JWT_REFRESH_SECRET: z.coerce
    .string<string>()
    .min(32, 'JWT_REFRESH_SECRET should be min length 32')
    .optional(),
  INTERNAL_JWT_PRIVATE_KEY_B64: z.coerce
    .string<string>()
    .min(1, 'INTERNAL_JWT_PRIVATE_KEY_B64 is required'),
  PROFILE_SERVICE_URL: z.coerce
    .string<string>()
    .default('http://localhost:3001'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  ALLOWED_ORIGINS: z.coerce.string<string>().default('http://localhost:3000'),
  IAM_SERVICE_PORT: z.coerce.number<number>().default(6000),
  AUDIT_SERVICE_PORT: z.coerce.number<number>().default(6004),
  AUDIT_HOST: z.coerce.string<string>().default('http://localhost'),
});

export const iamServiceEnvSchema = downstreamServiceBase.extend({
  IAM_SERVICE_PORT: z.coerce.number<number>().default(6000),
  HOST: z.coerce.string<string>().default('http://localhost'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  JWT_SECRET: z.coerce
    .string<string>()
    .min(32, 'JWT_SECRET is required with min length 32'),
  JWT_REFRESH_SECRET: z.coerce
    .string<string>()
    .min(32, 'JWT_REFRESH_SECRET should be min length 32')
    .optional(),
  DATABASE_URL: z.coerce.string<string>(),
  UPSTASH_REDIS_REST_URL: z.coerce.string<string>(),
  UPSTASH_REDIS_REST_TOKEN: z.coerce.string<string>(),
  UPSTASH_REDIS_URL: z.coerce.string<string>().optional(),
});

export const notificationServiceEnvSchema = downstreamServiceBase.extend({
  NOTIFICATION_SERVICE_PORT: z.coerce.number<number>().default(6001),
  RESEND_API_KEY: z.coerce.string<string>(),
  RESEND_FROM_EMAIL: z.coerce
    .string<string>()
    .default('Aegis Security <noreply@codeprnv.org>'),
  UPSTASH_REDIS_REST_URL: z.coerce.string<string>(),
  UPSTASH_REDIS_REST_TOKEN: z.coerce.string<string>(),
  UPSTASH_REDIS_URL: z.coerce.string<string>().optional(),
  FRONTEND_URL: z.coerce.string<string>().default('http://localhost:3000'),
});

// Future services placeholders
export const userServiceEnvSchema = downstreamServiceBase.extend({});
export const fileStorageServiceEnvSchema = downstreamServiceBase.extend({});
export const auditServiceEnvSchema = downstreamServiceBase.extend({
  AUDIT_SERVICE_PORT: z.coerce.number<number>().default(6004),
  DATABASE_URL: z.coerce.string<string>().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.coerce.string<string>().optional(),
  UPSTASH_REDIS_URL: z.coerce.string<string>().optional(),
  IPIFY_API_KEY: z.coerce.string<string>().optional(),
  MAXMIND_DB_PATH: z.coerce.string<string>().optional(),
  IPINFO_TOKEN: z.coerce.string<string>().optional(),
});
export const rolesServiceEnvSchema = downstreamServiceBase.extend({});

export type ApiGatewayEnv = z.infer<typeof apiGatewayEnvSchema>;
export type IamServiceEnv = z.infer<typeof iamServiceEnvSchema>;
export type NotificationServiceEnv = z.infer<
  typeof notificationServiceEnvSchema
>;
export type AuditServiceEnv = z.infer<typeof auditServiceEnvSchema>;

export default {
  apiGatewayEnvSchema,
  iamServiceEnvSchema,
  notificationServiceEnvSchema,
  userServiceEnvSchema,
  fileStorageServiceEnvSchema,
  auditServiceEnvSchema,
  rolesServiceEnvSchema,
};
