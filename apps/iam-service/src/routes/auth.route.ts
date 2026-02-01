import express, { type Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router: Router = express.Router();

router.post('/register', authController.registerUserController);
router.post('/login', authController.loginUserController);
router.post('/refresh', authController.refreshTokenController);

export default router;
