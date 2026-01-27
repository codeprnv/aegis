import z from 'zod';

export const apiGatewayEnvSchema = z.object({
  API_GATEWAY_PORT: z.coerce.number<number>().default(8080),
  HOST: z.coerce.string<string>().default('http://localhost'),
  ORIGIN_HOST_1: z.coerce.string<string>().default('http://localhost:3000'),
  JWT_SECRET: z.coerce
    .string<string>()
    .min(5, 'JWT_SECRET is required with min length 5'),
  INTERNAL_JWT_SECRET: z.coerce
    .string<string>()
    .min(5, 'INTERNAL_JWT_SECRET is required with min length 5'),
  PROFILE_SERVICE_URL: z.coerce
    .string<string>()
    .default('http://localhost:3001'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type ApiGatewayEnv = z.infer<typeof apiGatewayEnvSchema>;

export default apiGatewayEnvSchema;
