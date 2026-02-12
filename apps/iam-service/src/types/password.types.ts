import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const resetPasswordTokenSchema = z.object({
  resetId: z.string().uuid('Invalid reset ID'),
  token: z.string().length(64, 'Invalid reset token'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordTokenInput = z.infer<typeof resetPasswordTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
