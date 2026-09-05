'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────
// Inactivity logout config (must match backend INACTIVITY_LIMIT_DAYS)
// ─────────────────────────────────────────────────────────────
const INACTIVITY_LIMIT_MS = 10 * 24 * 60 * 60 * 1000; // 10 days in ms
const LAST_ACTIVITY_KEY = 'lastActivity';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  shopName: string;
  logoUrl?: string;
  brandLogoUrl?: string;
  appIconUrl?: string;
  signatureUrl?: string;
  invoiceSettings?: any;
  subscriptionPlan: string;
  phoneNumber?: string;
  address?: string;
  gender?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (phoneNumber: string, otp: string, deviceId?: string) => Promise<{ needsEmailVerification?: boolean }>;
  googleSignIn: (userData: { googleId: string; email: string; firstName: string; lastName: string; isEcomCustomer?: boolean }) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Helpers: record and check last activity
// ─────────────────────────────────────────────────────────────
function recordActivity() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch { /* SSR guard */ }
}

function isInactive(): boolean {
  try {
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!last) return false; // No record yet → don't force logout
    return Date.now() - parseInt(last, 10) > INACTIVITY_LIMIT_MS;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Logout helper — defined early so checkAuth can call it
  const performLogout = useCallback((role?: string) => {
    const isCustomer = role === 'CUSTOMER' || user?.role === 'CUSTOMER';
    const isAdmin = role === 'SUPER_ADMIN' || role === 'ECOM_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ECOM_ADMIN';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('deviceId');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    if (isCustomer) {
      router.replace('/');
    } else if (isAdmin) {
      router.replace('/admin-login');
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // ── Frontend inactivity guard ──
      // If the user hasn't been active for 10+ days, logout immediately
      // without even hitting the server (fast UX, less server load)
      if (isInactive()) {
        performLogout();
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      recordActivity(); // Refresh the activity timestamp on successful auth check
    } catch (error: any) {
      console.error('Check auth failed:', error);

      const status = error.response?.status;
      const code = error.response?.data?.code;

      // Handle any auth failure (401 = expired/invalid token, was previously 403 for JWT errors)
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('deviceId');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setUser(null);
        if (code === 'SESSION_EXPIRED') {
          console.info('[Auth] Session expired due to inactivity.');
        } else if (code === 'TOKEN_EXPIRED') {
          console.info('[Auth] JWT token expired — cleared session.');
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [performLogout]);

  useEffect(() => {
    checkAuth();
  }, []);

  // ── Activity tracker: update lastActivity on user interactions ──
  useEffect(() => {
    if (!user) return;
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    // Throttle: update at most once every 5 minutes
    let lastWrite = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 5 * 60 * 1000) {
        lastWrite = now;
        recordActivity();
      }
    };
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, [user]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.deviceId) {
      localStorage.setItem('deviceId', response.data.deviceId);
    }
    recordActivity(); // Mark activity on login

    setUser(response.data.user);

    // Role-based redirect
    const role = response.data.user.role;
    if (role === 'SUPER_ADMIN' || role === 'ECOM_ADMIN') {
      router.replace('/admin');
    } else if (role === 'CUSTOMER') {
      router.replace('/account');
    } else {
      router.replace('/dashboard');
    }
  };

  const loginWithOtp = async (phoneNumber: string, otp: string, deviceId?: string) => {
    const response = await apiClient.post('/auth/otp/verify', { phoneNumber, otp, deviceId });

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.deviceId) {
      localStorage.setItem('deviceId', response.data.deviceId);
    }
    recordActivity(); // Mark activity on login

    setUser(response.data.user);

    return response.data;
  };

  const googleSignIn = async (userData: { googleId: string; email: string; firstName: string; lastName: string; isEcomCustomer?: boolean }) => {
    const response = await apiClient.post('/auth/google/callback', userData);

    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    recordActivity(); // Mark activity on login

    setUser(response.data.user);

    if (userData.isEcomCustomer) {
      return response.data;
    }

    if (response.data.needsPassword) {
      router.replace('/setup-password');
    } else {
      router.replace('/dashboard');
    }
  };

  const logout = () => performLogout();

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithOtp,
        googleSignIn,
        logout,
        updateUser,
        isAuthenticated: !!user,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
