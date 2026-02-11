import 'express';
import type { Logger } from 'pino';
import type { InternalTokenPayload } from '../auth/internal-token.ts';
import type { RefreshTokenPayload } from '../auth/refresh-token.ts';
import type { AccessTokenPayload } from '../auth/token-service.ts';

declare module 'express' {
  export interface Request {
    auth?: {
      id: string;
      role: 'USER' | 'ADMIN';
    };
    user?: RefreshTokenPayload | AccessTokenPayload | InternalTokenPayload;
    log?: Logger;
  }
}
