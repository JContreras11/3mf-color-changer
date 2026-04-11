'use client';

import React from 'react';
import { withBasePath } from '@/utils/basePath';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type LoginInput = {
  password: string;
  username: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  status: AuthStatus;
  username: string | null;
};

type SessionResponse = {
  authenticated?: boolean;
  username?: string | null;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [username, setUsername] = React.useState<string | null>(null);

  const refreshSession = React.useCallback(async () => {
    try {
      const response = await fetch(withBasePath('/api/auth/session'), {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json()) as SessionResponse;

      if (!response.ok) {
        throw new Error('Could not verify session.');
      }

      if (payload.authenticated) {
        setStatus('authenticated');
        setUsername(payload.username || null);
        return;
      }

      setStatus('anonymous');
      setUsername(null);
    } catch {
      setStatus('anonymous');
      setUsername(null);
    }
  }, []);

  React.useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = React.useCallback(
    async ({ password, username }: LoginInput) => {
      const response = await fetch(withBasePath('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ password, username }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        username?: string | null;
      };

      if (!response.ok) {
        throw new Error(payload.error || 'Invalid username or password.');
      }

      setStatus('authenticated');
      setUsername(payload.username || username.trim());
    },
    []
  );

  const logout = React.useCallback(async () => {
    await fetch(withBasePath('/api/auth/logout'), {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => undefined);

    setStatus('anonymous');
    setUsername(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      logout,
      refreshSession,
      status,
      username,
    }),
    [login, logout, refreshSession, status, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
