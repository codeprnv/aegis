import { NextFunction, Request, Response } from 'express';
const jwt = require('jsonwebtoken');

export const extractAuthContext = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies['access_token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      id: string;
      role: 'user' | 'admin';
    };

    req.auth = {
      id: decodedToken.id,
      role: decodedToken.role,
    };
  } catch (error) {
    return next();
  }
  next();
};
