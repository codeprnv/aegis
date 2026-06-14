import { requireInternalToken } from '@aegis/middlewares';
import express, { type Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as passwordController from '../controllers/password.controller';
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  resetPasswordRateLimiter,
} from '../middlewares/rateLimiter';

const router: Router = express.Router();

// Auth Routes
router.post(
  '/register',
  registerRateLimiter,
  authController.registerUserController
);
router.post('/login', loginRateLimiter, authController.loginUserController);
router.post(
  '/refresh',
  refreshRateLimiter,
  authController.refreshTokenController
);
router.post('/logout', requireInternalToken('iam-service'), authController.logoutController);
router.get('/me', requireInternalToken('iam-service'), authController.getMeController);
router.get('/verify-email', authController.verifyEmailController);

// Password management routes (unauthenticated)
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  passwordController.forgotPasswordController
);
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  passwordController.resetPasswordController
);
router.post(
  '/reset-password-token',
  resetPasswordRateLimiter,
  passwordController.resetPasswordTokenController
);

// Password management routes (authenticated)
router.post(
  '/change-password',
  requireInternalToken('iam-service'),
  passwordController.changePasswordController
);

export default router;
