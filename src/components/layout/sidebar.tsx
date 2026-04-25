'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Compass,
  FileText,
  Users,
  Wallet,
  MapPin,
  ScrollText,
  UserCog,
  Search,
  LogOut,
  Target,
  CalendarCheck,
  Globe,
  Settings,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: string[] };
type NavSection = { section?: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Home', icon: LayoutDashboard, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
    ],
  },
  {
    section: 'Sales',
    items: [
      { href: '/leads', label: 'Leads', icon: Target, roles: ['owner', 'admin', 'ops', 'sales'] },
    ],
  },
  {
    section: 'People',
    items: [
      { href: '/travellers', label: 'Travellers', icon: Users, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
      { href: '/groups', label: 'Groups', icon: Users, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
    ],
  },
  {
    section: 'Trips',
    items: [
      { href: '/trips', label: 'Trips', icon: Compass, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
      { href: '/departures', label: 'Departures', icon: MapPin, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
      { href: '/bookings', label: 'Bookings', icon: CalendarCheck, roles: ['owner', 'admin', 'ops', 'sales'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/documents', label: 'Documents', icon: FileText, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
      { href: '/finance', label: 'Finance', icon: Wallet, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
    ],
  },
  {
    section: 'Website',
    items: [
      { href: '/website', label: 'Website', icon: Globe, roles: ['owner', 'admin'] },
    ],
  },
  {
    section: 'Admin',
    items: [
      { href: '/staff', label: 'Staff', icon: UserCog, roles: ['owner', 'admin'] },
      { href: '/audit', label: 'Audit Log', icon: ScrollText, roles: ['owner', 'admin'] },
      { href: '/settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin'] },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <aside className="crm-sidebar">
      <div className="crm-sidebar-hd">
        <div className="crm-sidebar-logo">{user?.organisation_name ? user.organisation_name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'BP'}</div>
        <div className="crm-sidebar-brand">
          {user?.organisation_name || 'Boarding Pass Tours'}
          <small>CRM</small>
        </div>
      </div>

      <div className="crm-sidebar-search">
        <Search size={14} />
        <span>Quick find</span>
        <kbd>⌘K</kbd>
      </div>

      <nav className="crm-sidebar-nav">
        {navSections.map((section, si) => {
          const visible = section.items.filter(item => user && item.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={si}>
              {section.section && <div className="crm-nav-section-label">{section.section}</div>}
              {visible.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href} className={`crm-nav-item ${isActive ? 'active' : ''}`}>
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="crm-sidebar-ft">
        {user && (
          <>
            <div className="crm-avatar">
              {getInitials(user.name)}
            </div>
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--crm-text-4)', textTransform: 'capitalize' }}>
                {user.role}
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
