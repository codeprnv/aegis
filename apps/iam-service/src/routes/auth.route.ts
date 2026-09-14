import { requireInternalToken } from '@aegis/middlewares';
import express, { type Router } from 'express';
import * as authController from '../controllers/auth.controller';
import * as resendController from '../controllers/auth.controller.resend-verification';
import * as passwordController from '../controllers/password.controller';
import * as sessionController from '../controllers/session.controller';
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  resetPasswordRateLimiter,
} from '../middlewares/rateLimiter';
import { requireAuth } from '../middlewares/requireAuth.js';

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
router.post(
  '/logout',
  requireInternalToken('iam-service'),
  authController.logoutController
);
router.get(
  '/me',
  requireInternalToken('iam-service'),
  requireAuth,
  authController.getMeController
);
router.get('/verify-email', authController.verifyEmailController);
router.post(
  '/resend-verification',
  registerRateLimiter,
  resendController.resendVerificationController
);

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
  requireAuth,
  passwordController.changePasswordController
);

// Session management routes (authenticated)
router.get(
  '/sessions',
  requireInternalToken('iam-service'),
  requireAuth,
  sessionController.listSessionsHandler
);
router.delete(
  '/sessions/:sessionId',
  requireInternalToken('iam-service'),
  requireAuth,
  sessionController.revokeSessionHandler
);
router.delete(
  '/sessions',
  requireInternalToken('iam-service'),
  requireAuth,
  sessionController.revokeAllOtherSessionsHandler
);

export default router;
