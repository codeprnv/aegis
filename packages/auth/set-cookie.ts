import { Response } from 'express';
import { AUTH_COOKIE_MAX_AGE_MS, DEFAULT_COOKIE_OPTIONS } from './cookies.js';

export interface CookieSetOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

export const setCookie = (
  cookieName: string,
  cookieValue: string,
  res: Response,
  options?: CookieSetOptions
) => {
  return res.cookie(cookieName, cookieValue, {
    httpOnly: options?.httpOnly ?? DEFAULT_COOKIE_OPTIONS.httpOnly,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite ?? DEFAULT_COOKIE_OPTIONS.sameSite,
    maxAge: options?.maxAge ?? AUTH_COOKIE_MAX_AGE_MS.ACCESS_TOKEN,
    path: options?.path ?? DEFAULT_COOKIE_OPTIONS.path,
  });
};
