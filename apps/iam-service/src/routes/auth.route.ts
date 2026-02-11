import { refreshRateLimiter, requireAccessToken } from '@aegis/middlewares';
import express, { type Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as passwordController from '../controllers/password.controller';

const router: Router = express.Router();

// Auth Routes
router.post('/register', authController.registerUserController);
router.post('/login', authController.loginUserController);
router.post(
  '/refresh',
  refreshRateLimiter,
  authController.refreshTokenController
);
router.post('/logout', requireAccessToken, authController.logoutController);

// Password management routes (unauthenticated)
router.post('/forgot-password', passwordController.forgotPasswordController);
router.post('/reset-password', passwordController.resetPasswordController);
router.post(
  '/reset-password-token',
  passwordController.resetPasswordTokenController
);

// Password management routes (authenticated)
router.post(
  '/change-password',
  requireAccessToken,
  passwordController.changePasswordController
);

export default router;
