import 'NodeJS';
import type { ApiGatewayEnv, IamServiceEnv } from './env';

declare module 'NodeJS' {
  export interface ProcessEnv extends ApiGatewayEnv, IamServiceEnv {}
}
