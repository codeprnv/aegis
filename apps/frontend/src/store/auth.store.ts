import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  username: string;
  mobile?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

/**
 * Zustand store for managing client-side authentication state.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
