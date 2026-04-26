import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';

import { API_BASE } from '../lib/api';
const USER_KEY = 'opsmind_user';
const TOKEN_KEY = 'opsmind_token';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => void;
  getToken: () => string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (stored && token) {
      // Validate token hasn't expired by checking the exp claim
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(stored));
        } else {
          // Token expired — clear storage
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * Login calls the real backend. Role is NEVER taken from user input —
   * it comes exclusively from the server's JWT response.
   */
  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error ?? 'Login failed' };
      }

      // Role comes from server — not from any client-side input
      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(TOKEN_KEY, data.token);
      return {};

    } catch {
      return { error: 'Cannot connect to server. Please try again.' };
    }
  };

  const loginWithGoogle = async (): Promise<{ error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch(`${API_BASE}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error ?? 'Google Login verification failed' };
      }

      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(TOKEN_KEY, data.token);
      return {};

    } catch (err: any) {
      console.error('Google Auth Error:', err);
      // Determine if error is user-cancelled or other
      if (err.code === 'auth/popup-closed-by-user') {
        return { error: 'Sign in was cancelled.' };
      }
      return { error: 'Failed to connect to Google or Server.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, getToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
