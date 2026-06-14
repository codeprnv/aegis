'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, checkAuth, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!mounted || isInitializing || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-[#070b14] relative overflow-hidden font-sans min-h-screen">
      <BackgroundRippleEffect rows={13} cols={60} />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl mx-auto min-h-screen py-20">
        <CardSpotlight
          className="group w-[600px] rounded-3xl z-20 relative"
          color="rgba(16, 185, 129, 0.15)"
        >
          <div className="w-full h-full rounded-3xl bg-white/[0.04] backdrop-blur-3xl border border-white/[0.08] shadow-[0_0_60px_rgba(16,185,129,0.15)] p-8 relative z-20">
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="w-12 h-12 mb-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full text-emerald-400"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12L11 15L16 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-semibold text-white tracking-wide">
                Welcome to Aegis Dashboard
              </h1>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                <p className="text-sm text-slate-400 mb-1">Email</p>
                <p className="text-lg text-white">{user?.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                <p className="text-sm text-slate-400 mb-1">Username</p>
                <p className="text-lg text-white">{user?.username}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                <p className="text-sm text-slate-400 mb-1">Role</p>
                <p className="text-lg text-emerald-400 font-medium">
                  {user?.role}
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              className="w-full rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] py-6 text-sm font-medium text-white transition-all"
            >
              Logout
            </Button>
          </div>
        </CardSpotlight>
      </div>
    </div>
  );
}
