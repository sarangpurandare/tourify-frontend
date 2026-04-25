'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--crm-bg-canvas)',
          color: 'var(--crm-text-3)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid var(--crm-line)',
              borderTopColor: 'var(--crm-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }}
          />
          <div style={{ fontSize: 13 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="crm-app">
      <Sidebar />
      <div className="crm-main">
        <Header />
        <div className="crm-content">
          {children}
        </div>
      </div>
    </div>
  );
}
