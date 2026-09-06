'use client';

import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { Button } from '@/components/ui/Button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  forgotPasswordAction,
  resetPasswordAction,
} from '../../../../actions/auth';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../../lib/validations';

const otpResetSchema = z
  .object({
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  })
  .and(resetPasswordSchema);

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type OtpResetFormValues = z.infer<typeof otpResetSchema>;

function ForgotPasswordContent() {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<OtpResetFormValues>({
    resolver: zodResolver(otpResetSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  const onEmailSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setErrorMessage('');

    const result = await forgotPasswordAction({ email: data.email });

    setIsLoading(false);
    if (result.success) {
      setEmail(data.email);
      setStage(2);
      setSuccessMessage(result.message || 'OTP sent to your email.');
    } else {
      setErrorMessage(result.error || 'Failed to send OTP.');
    }
  };

  const onOtpSubmit = async (data: OtpResetFormValues) => {
    setIsLoading(true);
    setErrorMessage('');

    const result = await resetPasswordAction({
      email,
      otp: data.otp,
      newPassword: data.newPassword,
    });

    setIsLoading(false);
    if (result.success) {
      setStage(1);
      setSuccessMessage('');
      router.push('/login?reset=success');
    } else {
      setErrorMessage(result.error || 'Failed to reset password.');
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wide mb-2">
          {stage === 1 ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="text-slate-400 text-sm">
          {stage === 1
            ? 'Enter your email to receive a reset code.'
            : 'Enter the 6-digit code and your new password.'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-left">
          {errorMessage}
        </div>
      )}

      {successMessage && stage === 2 && (
        <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-left">
          {successMessage}
        </div>
      )}

      {stage === 1 && (
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            className="space-y-4"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="text-left">
                  <FormControl>
                    <Input
                      placeholder="Email address"
                      type="email"
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] mt-2"
            >
              {isLoading ? 'Sending Code...' : 'Send Reset Code'}
            </Button>

            <div className="mt-6 text-sm text-slate-400">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Log in
              </button>
            </div>
          </form>
        </Form>
      )}

      {stage === 2 && (
        <Form {...otpForm}>
          <form
            onSubmit={otpForm.handleSubmit(onOtpSubmit)}
            className="space-y-4 text-left"
          >
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="6-digit OTP"
                      maxLength={6}
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50 tracking-widest text-center"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={otpForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="New Password"
                      type="password"
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={otpForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Confirm New Password"
                      type="password"
                      disabled={isLoading}
                      className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] mt-2"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="mt-6 text-sm text-center text-slate-400">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Back to email input
              </button>
            </div>
          </form>
        </Form>
      )}
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

      <CardSpotlight
        className="group w-[440px] rounded-3xl z-20 relative"
        color="rgba(168,85,247,0.15)"
      >
        <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(168,85,247,0.15)] p-8 relative z-20 text-center">
          <Suspense
            fallback={
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ForgotPasswordContent />
          </Suspense>
        </div>
      </CardSpotlight>
    </>
  );
}
