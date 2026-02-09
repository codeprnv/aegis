import { Response } from 'express';

export const clearCookie = (
  cookieName: string,
  res: Response,
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
) => {
  return res.clearCookie(cookieName, {
    httpOnly: options?.httpOnly ?? true,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
    sameSite: options?.sameSite ?? 'strict',
  });
};
