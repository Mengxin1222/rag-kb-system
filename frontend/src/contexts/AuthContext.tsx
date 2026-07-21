import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserInfo } from '../types';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  login: (user: UserInfo, token: string, remember: boolean) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        localStorage.clear();
        sessionStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((u: UserInfo, t: string, remember: boolean) => {
    setUser(u);
    setToken(t);
    if (remember) {
      localStorage.setItem('auth_user', JSON.stringify(u));
      localStorage.setItem('auth_token', t);
    } else {
      sessionStorage.setItem('auth_user', JSON.stringify(u));
      sessionStorage.setItem('auth_token', t);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
