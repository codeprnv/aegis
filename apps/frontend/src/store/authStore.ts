import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  checkAuth: async () => {
    try {
      const response = await api.get(`/auth/me?t=${Date.now()}`);
      set({
        user: response.data.user,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },

  login: async (email, password) => {
    // This will be implemented in the next step, using the API client
    console.log('Logging in...', email);
  },

  register: async (username, email, password) => {
    // This will be implemented in the next step, using the API client
    console.log('Registering...', username, email);
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
