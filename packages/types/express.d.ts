import 'express';
import type { Logger } from 'pino';
import type { InternalTokenPayload } from '../auth/internal-token.js';
import type { TokenPayload } from '../auth/token-service.js';

declare module 'express' {
  export interface Request {
    auth?: {
      id: string;
      role: 'USER' | 'ADMIN';
    };
    user?: TokenPayload | InternalTokenPayload;
    log?: Logger;
  }
}
