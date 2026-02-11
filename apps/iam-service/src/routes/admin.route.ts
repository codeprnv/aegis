import { requireAccessToken, requireRole } from '@aegis/middlewares';
import express, { type Router } from 'express';
import * as passwordController from '../controllers/password.controller';

const router: Router = express.Router();

// Admin password management routes (authenticated)
router.post(
  '/admin/users/:userId/reset-password',
  requireAccessToken,
  requireRole('ADMIN'),
  passwordController.adminResetPasswordController
);

export default router;
