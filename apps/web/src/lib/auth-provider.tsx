'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSession } from './api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (session) {
        setUser({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      const { logout } = await import('./api-client');
      await logout();
      setUser(null);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
