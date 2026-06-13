import z from 'zod';

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
  INTERNAL_JWT_SECRET: z.coerce
    .string<string>()
    .min(32, 'INTERNAL_JWT_SECRET is required with min length 32'),
  PROFILE_SERVICE_URL: z.coerce
    .string<string>()
    .default('http://localhost:3001'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  IAM_SERVICE_PORT: z.coerce.number<number>().default(6000),
});

export const iamServiceEnvSchema = z.object({
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
  INTERNAL_JWT_SECRET: z.coerce
    .string<string>()
    .min(32, 'INTERNAL_JWT_SECRET is required with min length 32'),
  DATABASE_URL: z.coerce.string<string>(),
  REDIS_HOST: z.coerce.string<string>(),
  REDIS_PASSWORD: z.coerce.string<string>(),
  REDIS_PORT: z.coerce.number<number>(),
});

export type ApiGatewayEnv = z.infer<typeof apiGatewayEnvSchema>;
export type IamServiceEnv = z.infer<typeof iamServiceEnvSchema>;

export default { apiGatewayEnvSchema, iamServiceEnvSchema };
