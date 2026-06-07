'use client';

import React from 'react';
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

// 💡 MENTOR NOTE: Schema for resetting the password
const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    // 💡 MENTOR NOTE: Later we will connect this to your IAM service endpoint!
    console.log('Resetting password:', data);
  };

  return (
    <>
      <AuthHeader />
      <div className="bg-[#070b14] relative overflow-hidden font-sans">
        <BackgroundRippleEffect rows={13} cols={60} />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
          <CardSpotlight className="group w-[440px] rounded-3xl z-20 relative" color="rgba(168,85,247,0.15)">
            <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(168,85,247,0.15)] p-8 relative z-20">
              
              <div className="text-center mb-6 flex flex-col items-center">
                <div className="w-10 h-10 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                    <path d="M12 2L2 22H6.5L9.5 16H18L13 6L12 2Z" fill="currentColor"/>
                    <path d="M7.5 13C7.5 13 9 10 12 10C15 10 16.5 13 16.5 13C16.5 13 15 15 12 15C9 15 7.5 13 7.5 13Z" fill="#a855f7"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-wide">Set New Password</h1>
                <p className="text-sm text-slate-400 mt-2">Please create a strong new password</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="password" placeholder="New Password" {...field} className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20" />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1 relative z-20" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="password" placeholder="Confirm New Password" {...field} className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20" />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1 relative z-20" />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 py-6 text-sm font-medium text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transform hover:scale-[1.02] transition-all disabled:opacity-50 border-0"
                    >
                      {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="mt-6 text-center text-xs text-slate-300 relative z-20">
                <a href="/login" className="text-white hover:text-purple-300 transition-colors border-b border-white/30 hover:border-purple-300 pb-0.5">
                  Return to Login
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
