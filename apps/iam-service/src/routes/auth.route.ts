import express, { type Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router: Router = express.Router();

// POST /auth/register - Register a new user
router.post('/register', authController.registerUserController);

// POST /auth/login - Login a user
router.post('/login', authController.loginUserController);

export default router;
