import { z } from 'zod';

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format!'),
  password: z.string().min(8, 'Password must be at least 8 characters long!'),
});

export type LoginInput = z.infer<typeof loginSchema> & {
  userAgent?: string;
  ipAddress?: string;
};

// Register Schema
export const registerSchema = z.object({
  username: z.string().min(4, 'Username must be at least 4 characters long!'),
  email: z.string().email('Invalid email format!'),
  password: z.string().min(8, 'Password must be at least 8 characters long!'),
  mobile: z
    .string()
    .min(10, 'Mobile number must be at least 10 digits long!')
    .optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  username: z
    .string()
    .min(4, 'Username must be at least 4 characters long!')
    .optional(),
  email: z.string().email('Invalid email format!'), // Email is required
  mobile: z.string().min(10, 'Invalid mobile number!').optional(),
  newPassword: z
    .string()
    .min(8, 'New password should contain minimum 8 characters!'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
  mobile: string | null;
  role: string;
  accessToken?: string;
  refreshToken?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}
