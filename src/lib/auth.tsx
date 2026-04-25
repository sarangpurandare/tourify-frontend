'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { api } from './api';
import type { StaffUser } from '@/types/staff';
import type { APIResponse } from '@/types/api';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDev: (staffId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffUser = useCallback(async () => {
    try {
      if (DEV_BYPASS) {
        const staffId = localStorage.getItem('dev_staff_id');
        if (!staffId) { setUser(null); setLoading(false); return; }
        const { data } = await supabase
          .from('staff_users')
          .select('id, supabase_auth_id, organisation_id, name, email, phone, role, is_active, created_at, updated_at, organisations(name)')
          .eq('id', staffId)
          .eq('is_active', true)
          .single();
        if (data) {
          const org = data.organisations as unknown as { name: string } | null;
          setUser({
            ...data,
            organisation_name: org?.name,
          } as unknown as StaffUser);
        } else {
          localStorage.removeItem('dev_staff_id');
          setUser(null);
        }
      } else {
        const res = await api.get<APIResponse<StaffUser>>('/auth/me');
        setUser(res.data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_BYPASS) {
      const savedId = localStorage.getItem('dev_staff_id');
      if (savedId) {
        fetchStaffUser();
      } else {
        setLoading(false);
      }
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
        fetchStaffUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStaffUser]);

  async function login(email: string, password: string) {
    if (DEV_BYPASS) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function loginAsDev(staffId: string) {
    localStorage.setItem('dev_staff_id', staffId);
    setLoading(true);
    await fetchStaffUser();
  }

  async function logout() {
    if (DEV_BYPASS) {
      localStorage.removeItem('dev_staff_id');
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, login, loginAsDev, logout }}>
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
