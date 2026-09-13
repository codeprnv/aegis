import { Response } from 'express';
import { DEFAULT_COOKIE_OPTIONS } from './cookies.js';

export interface CookieClearOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
}

export const clearCookie = (
  cookieName: string,
  res: Response,
  options?: CookieClearOptions
) => {
  return res.clearCookie(cookieName, {
    httpOnly: options?.httpOnly ?? DEFAULT_COOKIE_OPTIONS.httpOnly,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite ?? DEFAULT_COOKIE_OPTIONS.sameSite,
    path: options?.path ?? DEFAULT_COOKIE_OPTIONS.path,
  });
};
