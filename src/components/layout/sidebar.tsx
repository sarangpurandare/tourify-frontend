'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { PlanFeatures } from '@/lib/auth';
import {
  LayoutDashboard,
  Compass,
  FileText,
  Users,
  MapPin,
  ScrollText,
  UserCog,
  LogOut,
  Target,
  CalendarCheck,
  Globe,
  Settings,
  Star,
  Lightbulb,
  IndianRupee,
  PenLine,
  Receipt,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: string[]; feature?: keyof PlanFeatures };
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
      { href: '/finances', label: 'Finances', icon: IndianRupee, roles: ['owner', 'admin', 'sales'] },
      { href: '/finances/invoices', label: 'Invoices', icon: Receipt, roles: ['owner', 'admin'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/documents', label: 'Documents', icon: FileText, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
    ],
  },
  {
    section: 'Engagement',
    items: [
      { href: '/reviews', label: 'Reviews', icon: Star, roles: ['owner', 'admin'], feature: 'reviews' },
    ],
  },
  {
    section: 'Website',
    items: [
      { href: '/website', label: 'Website', icon: Globe, roles: ['owner', 'admin'], feature: 'website_builder' },
      { href: '/blog', label: 'Blog', icon: PenLine, roles: ['owner', 'admin', 'ops', 'sales'] },
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
  {
    section: 'Feedback',
    items: [
      { href: '/feature-requests', label: 'Feature Requests', icon: Lightbulb, roles: ['owner', 'admin', 'ops', 'sales', 'viewer'] },
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
  const { user, features, logout } = useAuth();

  // Defense-in-depth: platform admins should never see the tenant sidebar.
  // The primary defense is the redirect in <AppShell>; this hides the
  // sidebar in the tiny window before the redirect fires (and protects us
  // if a future caller mounts <Sidebar /> outside of AppShell).
  const isPlatformAdmin = (user as unknown as { is_platform_admin?: boolean } | null)?.is_platform_admin === true;
  if (isPlatformAdmin) return null;

  return (
    <aside className="crm-sidebar">
      <div className="crm-sidebar-hd">
        {user?.organisation_logo_url ? (
          <img
            src={user.organisation_logo_url}
            alt={user.organisation_name || 'Logo'}
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div className="crm-sidebar-logo">{user?.organisation_name ? user.organisation_name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'T'}</div>
        )}
        <div className="crm-sidebar-brand">
          {user?.organisation_name || 'Tourify'}
          <small>CRM</small>
        </div>
      </div>

      <nav className="crm-sidebar-nav">
        {navSections.map((section, si) => {
          const visible = section.items.filter(item => {
            if (!user || !item.roles.includes(user.role)) return false;
            if (item.feature && (!features || !features[item.feature])) return false;
            return true;
          });
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
