/* Setting up minimal express server for mocking the auth service */

import {
  errorMiddleware,
  extractAuthContext,
  requireAuth,
  requireRole,
} from '@aegis/common';

import type { Request, Response } from 'express';
const express = require('express');
const cookieParser = require('cookie-parser');

export const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Verify if the request has a valid auth token and extract the user info (non-blocking)
  app.use(extractAuthContext);

  /* Test Routes */

  /* 1. Authenticated user route */
  app.get('/me', requireAuth, (req: Request, res: Response) => {
    res.status(200).json({
      id: req.auth?.id,
      role: req.auth?.role,
    });
  });

  /* 2. Admin-only route */
  app.get(
    '/admin',
    requireAuth,
    requireRole('admin'),
    (_req: Request, res: Response) => {
      res.sendStatus(200);
    }
  );

  app.use(errorMiddleware);

  return app;
};
