import { requireInternalToken, requireRole } from '@aegis/middlewares';
import express, { type Router } from 'express';
import * as passwordController from '../controllers/password.controller';

const router: Router = express.Router();

// Admin password management routes
router.post(
  '/users/:userId/reset-password',
  requireInternalToken('iam-service'),
  requireRole('ADMIN'),
  passwordController.adminResetPasswordController
);

export default router;
