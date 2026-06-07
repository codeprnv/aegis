'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../../../lib/api';
import { RegisterFormData, registerSchema } from '../../../lib/validations';

import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { AuthFooter } from '@/components/layout/AuthFooter';
import { AuthHeader } from '@/components/layout/AuthHeader';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState('');

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false, // 💡 Checkboxes use booleans instead of strings
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError('');
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      });
      router.push('/login?registered=true'); // Send them to login after successful registration
    } catch (err: any) {
      setApiError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  };

  return (
    <>
      <AuthHeader />
      <div className="bg-[#070b14] relative overflow-hidden font-sans">
        <BackgroundRippleEffect rows={13} cols={60} />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 flex items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
          {/* Shield Image */}
          <div
            className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-0 pointer-events-none opacity-100 mix-blend-screen"
            style={{
              maskImage: 'radial-gradient(circle, black 50%, transparent 70%)',
              WebkitMaskImage:
                'radial-gradient(circle, black 50%, transparent 70%)',
            }}
          >
            <img
              src="/purple-shield.png"
              alt="Aegis Shield"
              className="w-full h-full object-cover mix-blend-screen"
            />
          </div>

          {/* Glass Card */}
          <CardSpotlight
            className="group w-[440px] rounded-3xl z-20 relative"
            color="rgba(168,85,247,0.15)"
          >
            <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(168,85,247,0.15)] p-8 relative z-20">
              <div className="text-center mb-6 flex flex-col items-center">
                {/* Logo */}
                <div className="w-10 h-10 mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full text-white"
                  >
                    <path
                      d="M12 2L2 22H6.5L9.5 16H18L13 6L12 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M7.5 13C7.5 13 9 10 12 10C15 10 16.5 13 16.5 13C16.5 13 15 15 12 15C9 15 7.5 13 7.5 13Z"
                      fill="#a855f7"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-wide">
                  Create Account
                </h1>
              </div>

              {apiError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                  {apiError}
                </div>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Email Address"
                            {...field}
                            className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1 relative z-20" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Password"
                            {...field}
                            className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20"
                          />
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
                          <Input
                            type="password"
                            placeholder="Confirm Password"
                            {...field}
                            className="bg-white/[0.05] border-white/[0.1] rounded-xl px-4 py-6 text-sm text-white placeholder-slate-400 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 focus-visible:bg-white/[0.08] transition-all relative z-20"
                          />
                        </FormControl>
                        <FormMessage className="text-xs text-red-400 ml-1 relative z-20" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2 pb-1 relative z-20">
                    <FormField
                      control={form.control}
                      name="agreeToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0 cursor-pointer group">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                              I agree to the{' '}
                              <a
                                href="/terms"
                                className="text-purple-400 hover:text-purple-300 border-b border-purple-400/30 hover:border-purple-300 pb-0.5"
                              >
                                Terms & Policy
                              </a>
                            </span>
                            <FormMessage className="text-xs text-red-400 pt-1" />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2 relative z-20">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full rounded-full bg-linear-to-r from-purple-500 to-cyan-400 py-6 text-sm font-medium text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transform hover:scale-[1.02] transition-all disabled:opacity-50 border-0"
                    >
                      {form.formState.isSubmitting
                        ? 'Creating account...'
                        : 'Register'}
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="mt-6 text-center text-xs text-slate-300 relative z-20">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="text-white hover:text-purple-300 transition-colors border-b border-white/30 hover:border-purple-300 pb-0.5"
                >
                  Login
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
