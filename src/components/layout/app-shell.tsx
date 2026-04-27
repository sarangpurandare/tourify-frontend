'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Platform admins should never land on the tenant CRM. Bounce them to
  // /admin so they get the SaaS-admin shell instead. Note: when an admin is
  // *impersonating* a tenant user, the JWT-derived user.is_platform_admin
  // flips to false (the impersonated user is not a platform admin), so this
  // redirect intentionally does not fire — the impersonation banner remains
  // visible and the admin stays inside the tenant view.
  const isPlatformAdmin = (user as unknown as { is_platform_admin?: boolean } | null)?.is_platform_admin === true;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (isPlatformAdmin) {
      router.replace('/admin');
    }
  }, [user, loading, router, isPlatformAdmin]);

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

  // Belt-and-braces: while the redirect to /admin is in flight, render
  // nothing rather than flashing the tenant CRM at a platform admin.
  if (isPlatformAdmin) return null;

  return (
    <div className="crm-app" style={{ height: '100%', minHeight: 0, flex: 1 }}>
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
