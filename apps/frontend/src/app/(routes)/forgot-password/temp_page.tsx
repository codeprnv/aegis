'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthHeader } from '@/components/layout/AuthHeader';
import { AuthFooter } from '@/components/layout/AuthFooter';
import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

// 💡 MENTOR NOTE: A simple schema just for the email!
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    // 💡 MENTOR NOTE: Later we will connect this to your IAM service endpoint!
    console.log('Requesting reset for:', data);
    setIsSubmitted(true);
  };

  return (
    <>
      <AuthHeader />
      <div className="bg-[#070b14] relative overflow-hidden font-sans">
        <BackgroundRippleEffect rows={13} cols={60} />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
          <CardSpotlight className="group w-[440px] rounded-3xl z-20 relative" color="rgba(0,255,255,0.15)">
            <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(0,255,255,0.15)] p-8 relative z-20">
              
              <div className="text-center mb-6 flex flex-col items-center">
                <div className="w-10 h-10 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                    <path d="M12 2L2 22H6.5L9.5 16H18L13 6L12 2Z" fill="currentColor"/>
                    <path d="M7.5 13C7.5 13 9 10 12 10C15 10 16.5 13 16.5 13C16.5 13 15 15 12 15C9 15 7.5 13 7.5 13Z" fill="#22d3ee"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-wide">Reset Password</h1>
                <p className="text-sm text-slate-400 mt-2">Enter your email to receive a reset link</p>
              </div>

              {!isSubmitted ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Email Address" {...field} className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20" />
                          </FormControl>
                          <FormMessage className="text-xs text-red-400 ml-1 relative z-20" />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 py-6 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transform hover:scale-[1.02] transition-all disabled:opacity-50 border-0"
                    >
                      {form.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                </Form>
              ) : (
                <div className="text-center py-4 relative z-20">
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/50">
                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm text-slate-300">If an account exists for that email, we've sent a password reset link.</p>
                </div>
              )}

              <div className="mt-6 text-center text-xs text-slate-300 relative z-20">
                Remember your password?{' '}
                <a href="/login" className="text-white hover:text-cyan-300 transition-colors border-b border-white/30 hover:border-cyan-300 pb-0.5">
                  Back to Login
                </a>
              </div>
            </div>
          </CardSpotlight>
        </div>
        <AuthFooter />
      </div>
    </>
  );
}
