'use client';

import { ReactNode, useEffect } from 'react';
import { useAuthStore, User } from '../../store/auth.store';

export interface AuthHydratorProps {
  user: User;
  children: ReactNode;
}

/**
 * Client component to hydrate the global Zustand auth store with server-fetched user data.
 * Sets the active user on mount and cleans up context on unmount.
 *
 * @param {AuthHydratorProps} props - Component properties.
 * @returns {JSX.Element} The passthrough children wrapper.
 */
export function AuthHydrator({ user, children }: AuthHydratorProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    setUser(user);

    return () => {
      clearUser();
    };
  }, [user, setUser, clearUser]);

  return <>{children}</>;
}
