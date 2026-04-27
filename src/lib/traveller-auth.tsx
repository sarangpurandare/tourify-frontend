'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { travellerApi, getTravellerTokens, setTravellerTokens, clearTravellerTokens } from './traveller-api';
import type { TravellerProfile } from '@/types/portal';
import type { APIResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

interface TravellerAuthContextType {
  traveller: TravellerProfile | null;
  profiles: TravellerProfile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TravellerAuthContext = createContext<TravellerAuthContextType | undefined>(undefined);

export function TravellerAuthProvider({ children }: { children: ReactNode }) {
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
    const { access } = getTravellerTokens();
    if (access) {
      fetchTravellerProfile();
    } else {
      setLoading(false);
    }
  }, [fetchTravellerProfile]);

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
      setTravellerTokens(data.access_token, data.refresh_token);
      await fetchTravellerProfile();
    } catch (e) {
      setLoading(false);
      throw e;
    }
  }

  async function loginWithTokens(accessToken: string, refreshToken: string) {
    setTravellerTokens(accessToken, refreshToken);
    setLoading(true);
    await fetchTravellerProfile();
  }

  async function logout() {
    clearTravellerTokens();
    setProfiles([]);
    setTraveller(null);
  }

  return (
    <TravellerAuthContext.Provider value={{ traveller, profiles, loading, login, loginWithTokens, logout }}>
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
