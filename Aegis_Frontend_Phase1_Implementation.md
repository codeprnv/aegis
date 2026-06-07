# Aegis Frontend — Phase 1 Implementation

## 1. `src/store/auth.store.ts`

```typescript
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

---

## 2. `src/lib/api.ts`

```typescript
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newAccessToken: string = data.accessToken;
        useAuthStore
          .getState()
          .setAuth(useAuthStore.getState().user!, newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. `src/lib/validations.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[^a-zA-Z0-9]/,
        'Password must contain at least one special character'
      ),
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and policy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
```

---

## 4. `src/app/(routes)/login/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginSchema } from '@/lib/validations';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchema) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      setAuth(res.data.user, res.data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || 'Invalid credentials. Please try again.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#020d1a] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        {/* Glassmorphic Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              className="w-10 h-10 mb-2"
              aria-label="Aegis logo"
            >
              <polygon
                points="20,2 38,12 38,28 20,38 2,28 2,12"
                stroke="url(#logoGrad)"
                strokeWidth="2"
                fill="none"
              />
              <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="url(#logoGrad)"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                A
              </text>
              <defs>
                <linearGradient
                  id="logoGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-wide">
              Aegis
            </h1>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* Email */}
            <div>
              <input
                {...register('email')}
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
              {errors.email && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <input
                {...register('password')}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
              {errors.password && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/60 cursor-pointer">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="w-4 h-4 rounded border-white/20 bg-transparent accent-cyan-400"
                />
                Remember Me
              </label>
              <Link
                href="/forgot-password"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Server Error */}
            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
```

---

## 5. `src/app/(routes)/register/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerSchema, type RegisterSchema } from '@/lib/validations';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchema) => {
    setServerError(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      router.push('/login?registered=true');
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#120a20] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        {/* Glassmorphic Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              className="w-10 h-10 mb-2"
              aria-label="Aegis logo"
            >
              <polygon
                points="20,2 38,12 38,28 20,38 2,28 2,12"
                stroke="url(#logoGrad2)"
                strokeWidth="2"
                fill="none"
              />
              <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="url(#logoGrad2)"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                A
              </text>
              <defs>
                <linearGradient
                  id="logoGrad2"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-wide">
              Create Account
            </h1>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Email */}
            <div>
              <input
                {...register('email')}
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
              {errors.email && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <input
                {...register('password')}
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
              {errors.password && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Confirm Password"
                autoComplete="new-password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 text-white/60 text-sm cursor-pointer">
                <input
                  {...register('agreeToTerms')}
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-transparent accent-purple-400"
                />
                I agree to the{' '}
                <Link
                  href="/terms"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Terms &amp; Policy
                </Link>
              </label>
              {errors.agreeToTerms && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.agreeToTerms.message}
                </p>
              )}
            </div>

            {/* Server Error */}
            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
```

---

## 6. `src/app/(routes)/forgot-password/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Link from 'next/link';
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from '@/lib/validations';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordSchema) => {
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#020d1a] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              className="w-10 h-10 mb-2"
              aria-label="Aegis logo"
            >
              <polygon
                points="20,2 38,12 38,28 20,38 2,28 2,12"
                stroke="url(#logoGrad3)"
                strokeWidth="2"
                fill="none"
              />
              <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="url(#logoGrad3)"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                A
              </text>
              <defs>
                <linearGradient
                  id="logoGrad3"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-wide">
              Reset Password
            </h1>
            {!submitted && (
              <p className="text-white/50 text-sm mt-2 text-center">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            )}
          </div>

          {submitted ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-white font-semibold">Check your inbox</p>
              <p className="text-white/50 text-sm">
                If an account exists for that email, a password reset link has
                been sent.
              </p>
              <Link
                href="/login"
                className="block w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold text-center hover:opacity-90 transition-all"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            /* Form State */
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <div>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email Address"
                  autoComplete="email"
                  className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
                {errors.email && (
                  <p className="mt-1 text-red-400 text-xs">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {serverError && (
                <p className="text-red-400 text-sm text-center">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-white/50 text-sm">
                Remembered it?{' '}
                <Link
                  href="/login"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
```

---

## 7. `src/app/(routes)/reset-password/page.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from '@/lib/validations';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordSchema) => {
    setServerError(null);
    if (!token) {
      setServerError(
        'Invalid or missing reset token. Please request a new link.'
      );
      return;
    }
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      router.push('/login?reset=success');
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ||
          'Reset failed. Your link may have expired. Please request a new one.'
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#020d1a] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              className="w-10 h-10 mb-2"
              aria-label="Aegis logo"
            >
              <polygon
                points="20,2 38,12 38,28 20,38 2,28 2,12"
                stroke="url(#logoGrad4)"
                strokeWidth="2"
                fill="none"
              />
              <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="url(#logoGrad4)"
                fontSize="14"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                A
              </text>
              <defs>
                <linearGradient
                  id="logoGrad4"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <h1 className="text-white text-2xl font-bold tracking-wide">
              New Password
            </h1>
            <p className="text-white/50 text-sm mt-2 text-center">
              Choose a strong password for your account.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {/* New Password */}
            <div>
              <input
                {...register('newPassword')}
                type="password"
                placeholder="New Password"
                autoComplete="new-password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
              {errors.newPassword && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Confirm New Password"
                autoComplete="new-password"
                className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-red-400 text-xs">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Server Error */}
            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Set New Password'}
            </button>

            <p className="text-center text-white/50 text-sm">
              <Link
                href="/login"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
```

---

## Verification Checklist

### 1. Validation Checks

- Submitting login with an invalid email format → "Please enter a valid email address" shown, no API call made
- Submitting register with no uppercase/number/special char → specific Zod message shown per rule
- Submitting register with mismatched passwords → "Passwords do not match" on `confirmPassword` field
- Submitting register without checking Terms → "You must accept the terms and policy" shown

### 2. Design Consistency

All four pages use identical:

- `bg-[#020d1a]` (login/forgot/reset) or `bg-[#120a20]` (register) dark background
- `bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl` glassmorphic card
- `bg-gradient-to-r from-cyan-400 to-purple-500` primary button
- `border-white/20` inputs with `focus:border-cyan-400` (or `focus:border-purple-400` on register)
- Same SVG hexagon Aegis logo with gradient

### 3. State Updates

After a successful mock login, `useAuthStore.getState()` returns:

```ts
{
  isAuthenticated: true,
  user: { id: "...", email: "...", role: "USER" },
  accessToken: "eyJ..."
}
```

After `logout()` is called:

```ts
{
  isAuthenticated: false,
  user: null,
  accessToken: null
}
```

### 4. Token Refresh Flow

- On 401 response → `api.ts` interceptor calls `POST /auth/refresh` automatically
- New access token stored in Zustand via `setAuth`
- Failed request is retried with new token
- If refresh also fails → `logout()` called, user redirected to `/login`
- Concurrent 401s are queued and replayed once refresh completes (no duplicate refresh calls)
