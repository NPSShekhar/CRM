import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/index.js';
import { UserRole } from '../types/index.js';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  agentId?: string | null;
  team?: { id: string; name: string } | null;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserSession | undefined>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('crm_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('crm_user', JSON.stringify(res.data));
          }
        } catch {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email: string, password: string): Promise<UserSession | undefined> => {
    const res = await authApi.login({ email, password });
    if (res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('crm_token', res.data.token);
      localStorage.setItem('crm_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
