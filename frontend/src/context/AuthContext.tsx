import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data) {
        setUser(res.data.data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, pass: string, rememberMe: boolean = false) => {
    const res = await api.post('/auth/login', { email, password: pass, rememberMe });
    if (res.data?.data?.accessToken) {
      localStorage.setItem('yc_token', res.data.data.accessToken);
      if (rememberMe) {
        localStorage.setItem('yc_remember_email', email);
        localStorage.setItem('yc_remember_me', 'true');
      } else {
        localStorage.removeItem('yc_remember_email');
        localStorage.removeItem('yc_remember_me');
      }
      setUser(res.data.data.user);
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.post('/auth/register', { name, email, password: pass });
    if (res.data?.data?.accessToken) {
      localStorage.setItem('yc_token', res.data.data.accessToken);
      setUser(res.data.data.user);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('yc_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
