'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { api } from './api';
import type { StaffUser } from '@/types/staff';
import type { APIResponse } from '@/types/api';
import type { Session } from '@supabase/supabase-js';

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
  session: Session | null;
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

function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
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
  const [session, setSession] = useState<Session | null>(null);
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchStaffUser();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        fetchStaffUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStaffUser]);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
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
    // Set the session in supabase client so subsequent api calls have auth
    await supabase.auth.setSession({
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
    });
    setUser(result.data.user);
    setPlan('free');
  }

  async function loginWithTokens(accessToken: string, refreshToken: string) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
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
      setSession(null);
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
    setSession(null);
    setPlan(null);
    setFeatures(null);
    // Hard navigate to clear in-memory caches. Do NOT call
    // supabase.auth.signOut() — the admin's Supabase session
    // in another tab must stay intact.
    window.location.href = '/login';
  }

  async function logout() {
    if (isImpersonationActive()) {
      exitImpersonation();
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPlan(null);
    setFeatures(null);
    setImpersonating(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
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
