'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { TravellerAuthProvider, useTravellerAuth } from '@/lib/traveller-auth';
import { Home, Map, FileText, User, LogOut } from 'lucide-react';

const bottomNavItems = [
  { href: '/t', label: 'Home', icon: Home },
  { href: '/t/trips', label: 'Trips', icon: Map },
  { href: '/t/documents', label: 'Documents', icon: FileText },
  { href: '/t/profile', label: 'Profile', icon: User },
];

function PortalShell({ children }: { children: React.ReactNode }) {
  const { traveller, loading, logout } = useTravellerAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth pages don't need protection
  const isAuthPage = pathname.startsWith('/t/login') || pathname.startsWith('/t/invite');

  useEffect(() => {
    if (!loading && !traveller && !isAuthPage) {
      router.push('/t/login');
    }
  }, [traveller, loading, isAuthPage, router]);

  // Auth pages render without the shell
  if (isAuthPage) {
    return <>{children}</>;
  }

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
          <div style={{ fontSize: 13 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!traveller) return null;

  const displayName = traveller.preferred_name || traveller.full_legal_name;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--crm-bg-canvas)', fontFamily: 'var(--font-sans)' }}>
      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--crm-bg)',
          borderBottom: '1px solid var(--crm-line)',
          padding: '0 16px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/t" style={{ textDecoration: 'none', fontSize: 18, fontWeight: 700, color: 'var(--crm-accent)', letterSpacing: '-0.02em' }}>
          Tourify
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>{displayName}</span>
          <button
            onClick={async () => { await logout(); router.push('/t/login'); }}
            title="Sign out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 'var(--crm-radius-sm)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--crm-text-3)',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* Desktop side nav */}
        <nav
          className="portal-desktop-nav"
          style={{
            width: 220,
            borderRight: '1px solid var(--crm-line)',
            background: 'var(--crm-bg)',
            padding: '16px 8px',
            display: 'none',
          }}
        >
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/t' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--crm-radius-sm)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--crm-accent)' : 'var(--crm-text-2)',
                  background: isActive ? 'var(--crm-accent-bg)' : 'transparent',
                  marginBottom: 2,
                  transition: 'background 0.15s',
                }}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content area */}
        <main style={{ flex: 1, paddingBottom: 80, overflow: 'auto' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="portal-mobile-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--crm-bg)',
          borderTop: '1px solid var(--crm-line)',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '8px 0 env(safe-area-inset-bottom, 8px)',
        }}
      >
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/t' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 12px',
                textDecoration: 'none',
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--crm-accent)' : 'var(--crm-text-3)',
              }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 769px) {
          .portal-desktop-nav { display: block !important; }
          .portal-mobile-nav { display: none !important; }
          main { padding-bottom: 0 !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function TravellerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <TravellerAuthProvider>
      <PortalShell>{children}</PortalShell>
    </TravellerAuthProvider>
  );
}
