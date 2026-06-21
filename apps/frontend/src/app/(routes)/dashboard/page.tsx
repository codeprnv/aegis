import { CardSpotlight } from '@/components/aceternity/card-spotlight';
import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';
import { redirect } from 'next/navigation';
import { serverFetch } from '../../../lib/server-fetch';
import { LogoutButton } from './LogoutButton';

// No 'use client' — this is a Server Component!

interface User {
  id: string;
  email: string;
  username: string;
  mobile?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export default async function DashboardPage() {
  // Fetch user data directly on the server — no loading spinners needed!
  const result = await serverFetch<{ success: boolean; user: User }>('/auth/me');

  if (!result.success || !result.data?.user) {
    if (result.status === 401 || result.status === 403) {
      redirect('/api/auth/logout');
    }
    
    // For 500s or other errors, render a fallback UI to prevent infinite redirect loops
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Dashboard</h1>
          <p className="text-red-400">{result.error || 'An unexpected error occurred.'}</p>
        </div>
      </div>
    );
  }

  const user = result.data.user;

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
                <p className="text-lg text-white">{user.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                <p className="text-sm text-slate-400 mb-1">Username</p>
                <p className="text-lg text-white">{user.username}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.1]">
                <p className="text-sm text-slate-400 mb-1">Role</p>
                <p className="text-lg text-emerald-400 font-medium">
                  {user.role}
                </p>
              </div>
            </div>

            {/* Logout is a client component that calls the logoutAction */}
            <LogoutButton />
          </div>
        </CardSpotlight>
      </div>
    </div>
  );
}
