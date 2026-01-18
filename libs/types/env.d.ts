import 'NodeJS';
import z from 'zod';
import type ApiGatewayEnv from './env';

declare module 'NodeJS' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
  export interface ProcessEnv extends z.infer<typeof ApiGatewayEnv> {}
}
