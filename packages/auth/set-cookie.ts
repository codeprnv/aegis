import { Response } from 'express';
export const setCookie = (
  cookieName: string,
  cookieValue: string,
  res: Response,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  }
) => {
  return res.cookie(cookieName, cookieValue, {
    httpOnly: options?.httpOnly || true,
    secure: options?.secure || process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite || 'strict',
    maxAge: options?.maxAge || 15 * 60 * 1000,
  });
};
