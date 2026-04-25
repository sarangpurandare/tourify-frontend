'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const screenNames: Record<string, string> = {
  dashboard: 'Home',
  trips: 'Trips',
  travellers: 'Travellers',
  departures: 'Departures',
  groups: 'Groups',
  documents: 'Documents',
  finance: 'Finance',
  staff: 'Staff',
  audit: 'Audit Log',
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: string[] = [];
  if (segments.length === 0) {
    crumbs.push('Home');
  } else {
    crumbs.push(screenNames[segments[0]] || segments[0]);
    if (segments.length > 1) {
      crumbs.push(segments.slice(1).join(' / '));
    }
  }

  return (
    <div className="crm-topbar">
      <div className="crm-topbar-crumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <span className="sep">
                <ChevronRight size={12} />
              </span>
            )}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
          </span>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button className="crm-btn ghost" title="Notifications" style={{ padding: '0 8px' }}>
        <Bell size={15} />
      </button>
      {user && (
        <button className="crm-btn ghost" onClick={logout} style={{ fontSize: '12.5px' }}>
          Sign out
        </button>
      )}
    </div>
  );
}
