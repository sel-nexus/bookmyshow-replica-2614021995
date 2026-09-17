'use client';

import { createContext, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { AuthUser } from './api';

interface AuthContextValue {
  mobile: string;
  token: string | null;
  user: AuthUser | null;
  setPendingMobile: (mobile: string) => void;
  completeAuthentication: (user: AuthUser, token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Keep the current auth flow state in memory without browser persistence. */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const value = useMemo(() => ({
    mobile,
    token,
    user,
    setPendingMobile: setMobile,
    completeAuthentication: (verifiedUser: AuthUser, verifiedToken: string): void => {
      setUser(verifiedUser);
      setToken(verifiedToken);
      setMobile(verifiedUser.mobile);
    },
  }), [mobile, token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the in-memory authentication state. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
