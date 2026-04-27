'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, getStoredTokens, setStoredTokens, clearStoredTokens } from './api';
import type { StaffUser } from '@/types/staff';
import type { APIResponse } from '@/types/api';

interface SignupPayload {
  org_name: string;
  name: string;
  email: string;
  password: string;
}

interface SignupResponse {
  data: {
    access_token: string;
    refresh_token: string;
    user: StaffUser;
  };
}

interface ConsumeImpersonationResponse {
  data: {
    access_token: string;
    refresh_token: string;
  };
}

export interface PlanFeatures {
  staff: number;
  travellers: number;
  trips: number;
  departures_per_month: number;
  storage_bytes: number;
  ai_credits_per_month: number;
  api_access: boolean;
  traveller_portal: boolean;
  reviews: boolean;
  website_builder: boolean;
}

export interface ImpersonationState {
  active: boolean;
}

interface AuthContextType {
  user: StaffUser | null;
  plan: string | null;
  features: PlanFeatures | null;
  loading: boolean;
  impersonating: ImpersonationState | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  loginAsImpersonator: (jwt: string) => Promise<void>;
  exitImpersonation: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const IMPERSONATION_TOKEN_KEY = 'tourify_imp_token';
const IMPERSONATION_FLAG_KEY = 'tourify_imp_active';

function isImpersonationActive(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(IMPERSONATION_FLAG_KEY) === 'true';
}

function setImpersonationSession(token: string) {
  sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
  sessionStorage.setItem(IMPERSONATION_FLAG_KEY, 'true');
}

function clearImpersonationSession() {
  sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
  sessionStorage.removeItem(IMPERSONATION_FLAG_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<ImpersonationState | null>(
    () => (typeof window !== 'undefined' && isImpersonationActive()) ? { active: true } : null,
  );

  const fetchStaffUser = useCallback(async () => {
    try {
      const res = await api.get<APIResponse<StaffUser & { plan?: string; features?: PlanFeatures }>>('/auth/me');
      setUser(res.data);
      setPlan(res.data.plan ?? 'free');
      setFeatures(res.data.features ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isImpersonationActive()) {
      setImpersonating({ active: true });
      fetchStaffUser();
      return;
    }

    const { access } = getStoredTokens();
    if (access) {
      fetchStaffUser();
    } else {
      setLoading(false);
    }
  }, [fetchStaffUser]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Login failed' } }));
        throw new Error(err.error?.message || 'Login failed');
      }
      const data = await res.json();
      setStoredTokens(data.access_token, data.refresh_token);
      await fetchStaffUser();
    } catch (e) {
      setLoading(false);
      throw e;
    }
  }

  async function signup(payload: SignupPayload) {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Signup failed' } }));
      throw new Error(err.error?.message || 'Signup failed');
    }
    const result: SignupResponse = await response.json();
    setStoredTokens(result.data.access_token, result.data.refresh_token);
    setUser(result.data.user);
    setPlan('free');
  }

  async function loginWithTokens(accessToken: string, refreshToken: string) {
    setStoredTokens(accessToken, refreshToken);
    setLoading(true);
    await fetchStaffUser();
  }

  async function loginAsImpersonator(jwt: string) {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/consume-impersonation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt }),
      });
      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: { message: 'Impersonation token invalid or expired' } }));
        throw new Error(err.error?.message || 'Impersonation token invalid or expired');
      }
      const result: ConsumeImpersonationResponse = await response.json();
      const accessToken = result.data.access_token;
      if (!accessToken) {
        throw new Error('Impersonation response missing access_token');
      }
      setImpersonationSession(accessToken);
      setImpersonating({ active: true });
      await fetchStaffUser();
    } catch (e) {
      setLoading(false);
      throw e;
    }
  }

  function exitImpersonation() {
    clearImpersonationSession();
    setImpersonating(null);
    setUser(null);
    setPlan(null);
    setFeatures(null);
    window.location.href = '/login';
  }

  async function logout() {
    if (isImpersonationActive()) {
      exitImpersonation();
      return;
    }
    clearStoredTokens();
    setUser(null);
    setPlan(null);
    setFeatures(null);
    setImpersonating(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        features,
        loading,
        impersonating,
        login,
        signup,
        loginWithTokens,
        loginAsImpersonator,
        exitImpersonation,
        logout,
        refreshUser: fetchStaffUser,
      }}
    >
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
