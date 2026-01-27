import 'express';
import type { InternalTokenPayload } from '../auth/internal-token.ts';
import type { Logger } from 'pino';

declare module 'express' {
  export interface Request {
    auth?: {
      id: string;
      role: 'user' | 'admin';
    };
    user?: InternalTokenPayload;
    log?: Logger
  }
}
