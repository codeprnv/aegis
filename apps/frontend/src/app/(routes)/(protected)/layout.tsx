import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/server-fetch';
import { AuthHydrator } from '@/components/auth/AuthHydrator';

interface User {
  id: string;
  email: string;
  username: string;
  mobile?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  user: User;
}

/**
 * Server-side layout for protected routes.
 * Retrieves current user session via serverFetch and passes it to the client store via AuthHydrator.
 * Unauthenticated users are redirected to the logout route.
 *
 * @param {Object} props - Component properties.
 * @param {ReactNode} props.children - Protected child components.
 * @returns {Promise<JSX.Element>} The protected layout wrapper.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const result = await serverFetch<AuthResponse>('/auth/me');

  if (!result.success || !result.data?.user) {
    if (result.status === 401 || result.status === 403) {
      redirect('/api/auth/logout');
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-red-500 font-sans">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Service Unavailable</h2>
          <p className="text-sm opacity-80">
            {result.error ||
              'Failed to verify session status. Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthHydrator user={result.data.user}>
      <div className="bg-[#070b14] relative overflow-hidden font-sans min-h-screen">
        {children}
      </div>
    </AuthHydrator>
  );
}
