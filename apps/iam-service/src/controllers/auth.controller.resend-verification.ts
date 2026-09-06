import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as resendVerificationService from '../services/resend-verification.service';

const resendVerificationSchema = z.object({
  email: z.email('Invalid email address'),
});

export const resendVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    await resendVerificationService.resendVerificationEmail(
      email.toLowerCase().trim()
    );

    res.status(200).json({
      success: true,
      message:
        'If a pending registration exists, a new verification email has been sent.',
    });
  } catch (error) {
    next(error);
  }
};
