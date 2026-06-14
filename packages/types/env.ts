import z from 'zod';

// Shared downstream service env fields
export const downstreamServiceBase = z.object({
  API_GATEWAY_PUBLIC_KEY_B64: z.string().min(1, 'API Gateway public key is required'),
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
  IAM_SERVICE_PORT: z.coerce.number<number>().default(6000),
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
});

export const notificationServiceEnvSchema = downstreamServiceBase.extend({
  RESEND_API_KEY: z.coerce.string<string>(),
  UPSTASH_REDIS_REST_URL: z.coerce.string<string>(),
  UPSTASH_REDIS_REST_TOKEN: z.coerce.string<string>(),
  FRONTEND_URL: z.coerce.string<string>().default('http://localhost:3000'),
});

// Future services placeholders
export const userServiceEnvSchema = downstreamServiceBase.extend({});
export const fileStorageServiceEnvSchema = downstreamServiceBase.extend({});
export const auditServiceEnvSchema = downstreamServiceBase.extend({});
export const rolesServiceEnvSchema = downstreamServiceBase.extend({});

export type ApiGatewayEnv = z.infer<typeof apiGatewayEnvSchema>;
export type IamServiceEnv = z.infer<typeof iamServiceEnvSchema>;
export type NotificationServiceEnv = z.infer<typeof notificationServiceEnvSchema>;

export default { 
  apiGatewayEnvSchema, 
  iamServiceEnvSchema, 
  notificationServiceEnvSchema,
  userServiceEnvSchema,
  fileStorageServiceEnvSchema,
  auditServiceEnvSchema,
  rolesServiceEnvSchema
};
