'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, createUser, verifyPassword } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, displayName: string, role: User['role']) => Promise<boolean>;
  logout: () => void;
  getCurrentUser: () => User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'aih_current_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage on mount
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const verifiedUser = verifyPassword(email, password);
      if (verifiedUser) {
        setUser(verifiedUser);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(verifiedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    displayName: string, 
    role: User['role']
  ): Promise<boolean> => {
    try {
      const newUser = createUser({
        email,
        password,
        displayName,
        role
      });
      setUser(newUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const getCurrentUser = (): User | null => {
    return user;
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}