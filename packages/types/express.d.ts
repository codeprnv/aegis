import 'express';
import type { Logger } from 'pino';
import type { InternalTokenPayload } from '../auth/internal-token.js';
import type { TokenPayload } from '../auth/token-service.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: string;
        role: 'USER' | 'ADMIN';
        sessionId?: string;
      };
      user?: TokenPayload | InternalTokenPayload;
      log?: Logger;
      clientIp?: string;
    }
  }
}

declare module 'express' {
  export interface Request {
    auth?: {
      id: string;
      role: 'USER' | 'ADMIN';
      sessionId?: string;
    };
    user?: TokenPayload | InternalTokenPayload;
    log?: Logger;
    clientIp?: string;
  }
}
