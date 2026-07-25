'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { getSession, logout as apiLogout, setSessionToken, clearCsrfToken } from './api-client';
import { useQueryClient } from '@tanstack/react-query';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  allowedRoles?: string[];
  activeRole?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (_role: string) => Promise<void>;
  /**
   * Set the authenticated user directly from a login/register response.
   * Unlike refresh(), this does NOT make an additional API call,
   * and the user is available immediately — no race condition with navigation.
   */
  loginAs: (_user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
  switchWorkspace: async () => {},
  loginAs: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

const AUTH_CHANNEL = 'evora-auth';
const AUTH_STORAGE_VERSION_KEY = 'evora_auth_version';
const CURRENT_AUTH_VERSION = 2;

function broadcast(event: string, payload?: Record<string, unknown>) {
  try {
    const bc = new BroadcastChannel(AUTH_CHANNEL);
    bc.postMessage({ event, payload, timestamp: Date.now() });
    bc.close();
  } catch {
    // BroadcastChannel not supported (e.g. older browsers)
  }
}

function migrateOldStorage() {
  try {
    const storedVersion = parseInt(localStorage.getItem(AUTH_STORAGE_VERSION_KEY) || '0', 10);
    if (storedVersion < CURRENT_AUTH_VERSION) {
      // Remove legacy auth keys from localStorage and sessionStorage
      const legacyKeys = [
        'evora_user', 'evora_token', 'evora_role', 'evora_session',
        'session_token', 'user', 'csrf_token',
      ];
      for (const key of legacyKeys) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
      localStorage.setItem(AUTH_STORAGE_VERSION_KEY, String(CURRENT_AUTH_VERSION));
    }
  } catch {
    // Storage not available
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Migrate old storage on mount
  useEffect(() => {
    migrateOldStorage();
  }, []);

  const clearAllUserState = useCallback(() => {
    setUser(null);
    setSessionToken(null);
    clearCsrfToken();
    // Clear all user-specific React Query caches
    queryClient.clear();
    // Broadcast to other tabs
    broadcast('LOGGED_OUT');
  }, [queryClient]);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (session) {
        setUser({
          id: session.id,
          name: session.name,
          email: session.email,
          role: session.role,
          allowedRoles: (session as any).allowedRoles,
          activeRole: (session as any).activeRole,
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

  // BroadcastChannel listener for cross-tab auth sync
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(AUTH_CHANNEL);
      channelRef.current.onmessage = (event) => {
        const { event: eventType, payload } = event.data || {};
        switch (eventType) {
          case 'LOGGED_OUT':
          case 'SESSION_EXPIRED':
            clearAllUserState();
            break;
          case 'LOGGED_IN':
            // Refresh session data when another tab logs in
            refresh();
            break;
          case 'WORKSPACE_CHANGED':
            if (payload?.userId === user?.id) {
              refresh();
            }
            break;
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [clearAllUserState, refresh, user?.id]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
      clearAllUserState();
    } catch {
      // Even if server call fails, clear client state
      clearAllUserState();
    }
  }, [clearAllUserState]);

  const switchWorkspace = useCallback(async (role: string) => {
    try {
      const { api } = await import('./api-client');
      const result = await api.post<{ user: AuthUser }>('/auth/active-role', { role });
      if (result.user) {
        setUser({
          ...result.user,
          allowedRoles: (result.user as any).allowedRoles,
          activeRole: (result.user as any).activeRole,
        });
        // Clear query cache so data refreshes with new role context
        queryClient.clear();
        // Broadcast to other tabs
        broadcast('WORKSPACE_CHANGED', { userId: result.user.id });
      }
    } catch {
      // Workspace switch failed
    }
  }, [queryClient]);

  /**
   * Set the authenticated user directly from a login/register response.
   * This avoids the race condition between refresh() (which queues async state updates)
   * and router.replace() (which navigates immediately), and eliminates an extra API call.
   */
  const loginAs = useCallback((authUser: AuthUser) => {
    // flushSync ensures React commits the state update BEFORE navigation happens.
    // Without this, router.replace() in the login page would navigate before
    // the AuthContext value updates, causing AuthGuard to see stale null user.
    flushSync(() => {
      setUser(authUser);
      setLoading(false);
    });
    broadcast('LOGGED_IN');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut, switchWorkspace, loginAs }}>
      {children}
    </AuthContext.Provider>
  );
}
