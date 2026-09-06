'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  resendVerificationAction,
  verifyEmailAction,
} from '../../../../actions/auth';
import { forgotPasswordSchema } from '../../../../lib/validations';

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

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState('');

  const [showResend, setShowResend] = useState(false);
  const [resendIsLoading, setResendIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const resendForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token.');
      return;
    }

    const verifyToken = async () => {
      const result = await verifyEmailAction(token);

      if (!result.success) {
        setStatus('error');
        setErrorMessage(
          result.error ||
            'Verification failed. The token may be invalid or expired.'
        );
        return;
      }

      setStatus('success');

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    };

    verifyToken();
  }, [token, router]);

  const onResend = async (data: z.infer<typeof forgotPasswordSchema>) => {
    setResendIsLoading(true);
    setResendStatus(null);
    const result = await resendVerificationAction({ email: data.email });
    setResendIsLoading(false);

    if (result.success) {
      setResendStatus({
        type: 'success',
        message: result.message || 'Verification email resent successfully.',
      });
    } else {
      setResendStatus({
        type: 'error',
        message: result.error || 'Failed to resend verification email.',
      });
    }
  };

  return (
    <>
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">
            Verifying Email
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Please wait while we verify your account...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">
            Email Verified!
          </h1>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Your account has been successfully verified. Redirecting to your
            dashboard...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">
            Verification Failed
          </h1>
          <p className="text-red-400 text-sm mb-6 leading-relaxed">
            {errorMessage}
          </p>

          {!showResend ? (
            <div className="space-y-4">
              <Button
                onClick={() => router.push('/login')}
                className="w-full rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
              >
                Go to Login
              </Button>
              <button
                onClick={() => setShowResend(true)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Didn't receive the email?
              </button>
            </div>
          ) : (
            <div className="text-left mt-6 pt-6 border-t border-white/10">
              <h2 className="text-lg font-medium text-white mb-2">
                Resend Verification Email
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Enter your email address to receive a new verification link.
              </p>

              {resendStatus && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${resendStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
                >
                  {resendStatus.message}
                </div>
              )}

              <Form {...resendForm}>
                <form
                  onSubmit={resendForm.handleSubmit(onResend)}
                  className="space-y-4"
                >
                  <FormField
                    control={resendForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Email address"
                            type="email"
                            disabled={resendIsLoading}
                            className="bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={resendIsLoading}
                      className="flex-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-all"
                    >
                      {resendIsLoading ? 'Sending...' : 'Resend'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowResend(false)}
                      className="px-6 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
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
            <VerifyEmailContent />
          </Suspense>
        </div>
      </CardSpotlight>
    </>
  );
}
