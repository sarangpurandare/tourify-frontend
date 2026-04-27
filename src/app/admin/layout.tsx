'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Read the flag loosely so the file remains independent of any one type
  // version — backend now exposes is_platform_admin from /auth/me directly.
  const isPlatformAdmin = (user as unknown as { is_platform_admin?: boolean } | null)?.is_platform_admin === true;

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--crm-bg-canvas)',
          color: 'var(--crm-text-3)',
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

  if (!user) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--crm-bg-canvas)',
          color: 'var(--crm-text-3)',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <ShieldAlert size={36} style={{ color: 'var(--crm-text-4)', marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 8 }}>
            Sign in required
          </h1>
          <Link href="/login" className="crm-btn primary" style={{ display: 'inline-flex' }}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--crm-bg-canvas)',
          color: 'var(--crm-text-3)',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <ShieldAlert size={36} style={{ color: 'var(--crm-red)', marginBottom: 12 }} />
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 6 }}>
            403 — Platform admin access required
          </h1>
          <p style={{ fontSize: 13, marginBottom: 20 }}>
            This area is restricted to platform administrators of Tourify.
          </p>
          <Link href="/dashboard" className="crm-btn primary" style={{ display: 'inline-flex' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated platform admin: render the dedicated admin shell.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ImpersonationBanner />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div className="crm-app" style={{ height: '100%', minHeight: 0, flex: 1 }}>
          <AdminSidebar />
          <div className="crm-main">
            {/* Distinct top bar identifies this as the SaaS Admin surface,
                not the tenant CRM. Purple accent + the "Platform" pill make
                impersonation context obvious to the operator. */}
            <header
              className="crm-topbar"
              style={{
                background: 'linear-gradient(180deg, color-mix(in oklab, var(--crm-purple, #5856d6) 10%, var(--crm-bg)) 0%, var(--crm-bg) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} style={{ color: 'var(--crm-purple, #5856d6)' }} />
                <strong style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--crm-text)' }}>
                  Tourify Admin
                </strong>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    background: 'color-mix(in oklab, var(--crm-purple, #5856d6) 15%, transparent)',
                    color: 'var(--crm-purple, #5856d6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Platform
                </span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, color: 'var(--crm-text-3)' }}>
                {user.email}
              </span>
            </header>
            <div className="crm-content">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
