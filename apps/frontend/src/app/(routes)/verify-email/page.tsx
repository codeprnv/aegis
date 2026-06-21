'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, Suspense } from 'react';
import { verifyEmailAction } from '../../../actions/auth';

import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { AuthFooter } from '@/components/layout/AuthFooter';
import { AuthHeader } from '@/components/layout/AuthHeader';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { Button } from '@/components/ui/Button';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

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
          result.error || 'Verification failed. The token may be invalid or expired.'
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

  return (
    <>
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">Verifying Email</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Please wait while we verify your account...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">Email Verified!</h1>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Your account has been successfully verified. Redirecting to your dashboard...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-4">Verification Failed</h1>
          <p className="text-red-400 text-sm mb-6 leading-relaxed">
            {errorMessage}
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
          >
            Go to Login
          </Button>
        </>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <AuthHeader />
      <div className="bg-[#070b14] relative overflow-hidden font-sans">
        <BackgroundRippleEffect rows={13} cols={60} />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
          <CardSpotlight className="group w-[440px] rounded-3xl z-20 relative" color="rgba(168,85,247,0.15)">
            <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(168,85,247,0.15)] p-8 relative z-20 text-center">
              <Suspense fallback={
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              }>
                <VerifyEmailContent />
              </Suspense>
            </div>
          </CardSpotlight>
        </div>
        <AuthFooter />
      </div>
    </>
  );
}
