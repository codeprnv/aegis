import 'express';

declare module 'express' {
  export interface Request {
    auth?: {
      id: string;
      role: 'user' | 'admin';
    };
  }
}
