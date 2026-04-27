'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Building2,
  ArrowUpCircle,
  Lightbulb,
  Palette,
  ScrollText,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

type AdminNavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const adminNav: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orgs', label: 'Organisations', icon: Building2 },
  { href: '/admin/upgrade-requests', label: 'Upgrade Requests', icon: ArrowUpCircle },
  { href: '/admin/feature-requests', label: 'Feature Requests', icon: Lightbulb },
  { href: '/admin/templates', label: 'Templates', icon: Palette },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <aside className="crm-sidebar" style={{ background: 'var(--crm-bg-sidebar)' }}>
      <div className="crm-sidebar-hd">
        <div
          className="crm-sidebar-logo"
          style={{
            background: 'linear-gradient(135deg, var(--crm-purple, #5856d6) 0%, color-mix(in oklab, var(--crm-purple, #5856d6) 70%, #000) 100%)',
          }}
        >
          <ShieldCheck size={14} style={{ color: '#fff' }} />
        </div>
        <div className="crm-sidebar-brand">
          Tourify
          <small>SaaS Admin</small>
        </div>
      </div>

      <nav className="crm-sidebar-nav">
        <div className="crm-nav-section-label">Platform</div>
        {adminNav.map((item) => {
          // /admin must only highlight on exact match — otherwise every
          // sub-route would also activate it. All others can use prefix
          // matching to keep nested pages highlighted.
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className={`crm-nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="crm-sidebar-ft">
        {user && (
          <>
            <div
              className="crm-avatar"
              style={{
                background: 'linear-gradient(135deg, var(--crm-purple, #5856d6), #d93775)',
              }}
            >
              {getInitials(user.name)}
            </div>
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--crm-text-4)', textTransform: 'capitalize' }}>
                Platform admin
              </div>
            </div>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              title="Sign out"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 'var(--crm-radius-sm)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <LogOut size={15} style={{ color: 'var(--crm-text-3)' }} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
