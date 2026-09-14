import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const resetPasswordTokenSchema = z.object({
  resetId: z.string().uuid('Invalid reset ID'),
  token: z.string().length(64, 'Invalid reset token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordTokenInput = z.infer<typeof resetPasswordTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
