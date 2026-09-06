'use client';

import { AuthFooter } from '@/components/layout/AuthFooter';
import { AuthHeader } from '@/components/layout/AuthHeader';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { ReactNode } from 'react';

/**
 * Shared layout for all authentication pages.
 * Provides the base Cyberpunk theme chrome (background, header, footer, ripple effect).
 * Note: Does not include CardSpotlight or blur orbs as those are page-specific.
 *
 * @param {Object} props - Component properties.
 * @param {ReactNode} props.children - Child components to render within the layout.
 * @returns {JSX.Element} The authentication layout wrapper.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#070b14] relative overflow-hidden font-sans">
      <BackgroundRippleEffect rows={13} cols={60} />
      <AuthHeader />
      <div className="relative z-10 flex items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
        {children}
      </div>
      <AuthFooter />
    </div>
  );
}
