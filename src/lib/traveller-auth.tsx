'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import { travellerApi } from './traveller-api';
import type { TravellerProfile } from '@/types/portal';
import type { APIResponse } from '@/types/api';
import type { Session } from '@supabase/supabase-js';

interface TravellerAuthContextType {
  session: Session | null;
  traveller: TravellerProfile | null;
  profiles: TravellerProfile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TravellerAuthContext = createContext<TravellerAuthContextType | undefined>(undefined);

export function TravellerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [traveller, setTraveller] = useState<TravellerProfile | null>(null);
  const [profiles, setProfiles] = useState<TravellerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTravellerProfile = useCallback(async () => {
    try {
      const res = await travellerApi.get<APIResponse<TravellerProfile[]>>('/portal/me');
      const allProfiles = res.data ?? [];
      setProfiles(allProfiles);
      setTraveller(allProfiles[0] ?? null);
    } catch {
      setProfiles([]);
      setTraveller(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchTravellerProfile();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchTravellerProfile();
      } else {
        setProfiles([]);
        setTraveller(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchTravellerProfile]);

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function loginWithTokens(accessToken: string, refreshToken: string) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    setLoading(true);
    await fetchTravellerProfile();
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfiles([]);
    setTraveller(null);
    setSession(null);
  }

  return (
    <TravellerAuthContext.Provider value={{ session, traveller, profiles, loading, login, loginWithTokens, logout }}>
      {children}
    </TravellerAuthContext.Provider>
  );
}

export function useTravellerAuth() {
  const context = useContext(TravellerAuthContext);
  if (context === undefined) {
    throw new Error('useTravellerAuth must be used within a TravellerAuthProvider');
  }
  return context;
}
