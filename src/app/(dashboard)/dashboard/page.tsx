'use client';

import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Departure } from '@/types/departure';
import type { TripMaster } from '@/types/trip';
import type { StaffUser } from '@/types/staff';
import type { Traveller } from '@/types/traveller';
import Link from 'next/link';
import {
  Compass,
  Users,
  Map,
  UserCheck,
  ChevronRight,
  Aperture,
  MessageCircle,
  Globe,
} from 'lucide-react';

/* ── helpers ───────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const rest = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${day} · ${rest}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const month = s.toLocaleDateString('en-GB', { month: 'short' });
  return `${sDay}–${eDay} ${month}`;
}

const ROLE_GRADIENTS: Record<string, string> = {
  admin: 'linear-gradient(135deg, #ff9f0a, #d93775)',
  ops: 'linear-gradient(135deg, #248a3d, #007d8a)',
  sales: 'linear-gradient(135deg, #5856d6, #0071e3)',
  viewer: 'linear-gradient(135deg, #8e8e93, #636366)',
};

const leadSources = [
  { name: 'Instagram', icon: Aperture, count: '—', pct: 0 },
  { name: 'WhatsApp', icon: MessageCircle, count: '—', pct: 0 },
  { name: 'Website', icon: Globe, count: '—', pct: 0 },
  { name: 'Referral', icon: Users, count: '—', pct: 0 },
];

/* ── component ─────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: depsData, isLoading: depsLoading } = useQuery({
    queryKey: ['dashboard-departures'],
    queryFn: () => api.get<APIResponse<Departure[]>>('/departures?per_page=100'),
  });

  const { data: travData, isLoading: travLoading } = useQuery({
    queryKey: ['dashboard-travellers'],
    queryFn: () => api.get<APIResponse<Traveller[]>>('/travellers?per_page=1'),
  });

  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: () => api.get<APIResponse<TripMaster[]>>('/trips?per_page=1'),
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['dashboard-staff'],
    queryFn: () => api.get<APIResponse<StaffUser[]>>('/staff'),
  });

  const allDepartures = depsData?.data ?? [];
  const upcomingDepartures = allDepartures
    .filter((d) => daysUntil(d.start_date) > 0)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const displayDepartures = upcomingDepartures.slice(0, 3);

  const totalTravellers = travData?.meta?.total ?? 0;
  const totalTrips = tripsData?.meta?.total ?? 0;
  const totalStaff = staffData?.data?.length ?? 0;
  const staffList = staffData?.data ?? [];

  const nextDep = upcomingDepartures[0];
  const nextDepLabel = nextDep
    ? `next: ${nextDep.trip_name ?? 'Departure'} in ${daysUntil(nextDep.start_date)}d`
    : 'none scheduled';

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const anyLoading = depsLoading || travLoading || tripsLoading || staffLoading;

  const kpis = [
    {
      label: 'Upcoming departures',
      value: String(upcomingDepartures.length),
      sub: nextDepLabel,
      icon: Compass,
      color: 'var(--crm-accent)',
      bg: 'var(--crm-accent-bg)',
      href: '/departures',
    },
    {
      label: 'Travellers',
      value: String(totalTravellers),
      sub: 'total in database',
      icon: UserCheck,
      color: 'var(--crm-accent)',
      bg: 'var(--crm-accent-bg)',
      href: '/travellers',
    },
    {
      label: 'Active trips',
      value: String(totalTrips),
      sub: 'trip templates',
      icon: Map,
      color: 'var(--crm-green)',
      bg: 'var(--crm-green-bg)',
      href: '/trips',
    },
    {
      label: 'Team members',
      value: String(totalStaff),
      sub: `${staffList.filter((s) => s.is_active).length} active`,
      icon: Users,
      color: 'var(--crm-green)',
      bg: 'var(--crm-green-bg)',
      href: '/staff',
    },
  ];

  return (
    <div style={{ padding: '32px 36px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* ── Hero ──────────────────────────────────── */}
      <header style={{ marginBottom: 32 }}>
        <p className="crm-eyebrow" style={{ marginBottom: 6 }}>
          {formatDate()}
        </p>
        <h1 className="crm-display" style={{ marginBottom: 6 }}>
          {getGreeting()}, {firstName}.
        </h1>
        {anyLoading ? (
          <p className="crm-caption" style={{ fontSize: 14 }}>Loading your dashboard…</p>
        ) : (
          <p className="crm-caption" style={{ fontSize: 14 }}>
            {upcomingDepartures.length > 0
              ? `${upcomingDepartures.length} upcoming departure${upcomingDepartures.length !== 1 ? 's' : ''} on the horizon.`
              : 'No upcoming departures. Create a trip and add a departure to get started.'}
          </p>
        )}
      </header>

      {/* ── KPI row ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="crm-card crm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="crm-eyebrow">{k.label}</span>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: k.bg,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon size={14} style={{ color: k.color }} />
                  </span>
                </div>
                <span className="crm-title-1 crm-tabular">{anyLoading ? '…' : k.value}</span>
                <span className="crm-caption">{k.sub}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Main grid: 2fr 1fr ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── Left column ──────────────────────────── */}
        <div className="crm-stack crm-gap-16">
          {/* Departures */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3>Upcoming Departures</h3>
              <Link href="/departures" className="crm-btn ghost sm" style={{ textDecoration: 'none' }}>
                View all
              </Link>
            </div>
            {depsLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading departures…</span>
              </div>
            ) : displayDepartures.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--crm-text-3)', marginBottom: 8 }}>
                  No upcoming departures yet
                </p>
                <Link href="/departures" className="crm-btn sm primary" style={{ textDecoration: 'none' }}>
                  Create departure
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(displayDepartures.length, 3)}, 1fr)`, gap: 1 }}>
                {displayDepartures.map((dep) => {
                  const filled = dep.confirmed_count ?? 0;
                  const total = dep.capacity ?? 1;
                  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
                  const barColor = pct >= 80 ? 'green' : pct >= 50 ? 'amber' : '';
                  const days = daysUntil(dep.start_date);
                  const statusColor = dep.status === 'open' ? 'green' : dep.status === 'waitlisted' ? 'amber' : 'blue';
                  return (
                    <Link
                      key={dep.id}
                      href={`/departures/${dep.id}`}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        borderRight: '1px solid var(--crm-hairline)',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`crm-pill ${statusColor}`}>
                          <span className="dot" />
                          {dep.status}
                        </span>
                        <span className="crm-caption crm-tabular">{days}d</span>
                      </div>
                      <div className="crm-stack" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.005em' }}>
                          {dep.trip_name ?? 'Unnamed Trip'}
                        </span>
                        <span className="crm-caption">{formatDateRange(dep.start_date, dep.end_date)}</span>
                      </div>
                      <div className="crm-stack" style={{ gap: 4 }}>
                        <div className={`crm-progress ${barColor}`}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="crm-caption crm-tabular">
                          {filled}/{total} filled
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3>Quick Actions</h3>
            </div>
            <div>
              {[
                { title: 'Add a traveller', sub: 'Create a new traveller profile', href: '/travellers', action: 'Go' },
                { title: 'Create a trip', sub: 'Set up a new trip template with itinerary', href: '/trips', action: 'Go' },
                { title: 'Add a departure', sub: 'Schedule a departure for an existing trip', href: '/departures', action: 'Go' },
                { title: 'Manage staff', sub: 'View and manage team members and roles', href: '/staff', action: 'Go' },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="crm-row"
                  style={{
                    gridTemplateColumns: '1fr auto',
                    padding: '10px 20px',
                    minHeight: 52,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div className="crm-stack" style={{ gap: 2 }}>
                    <span className="crm-title-3" style={{ fontWeight: 500, fontSize: 13.5 }}>
                      {item.title}
                    </span>
                    <span className="crm-caption">{item.sub}</span>
                  </div>
                  <button className="crm-btn sm ghost">
                    {item.action}
                    <ChevronRight size={12} />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ─────────────────────────── */}
        <div className="crm-stack crm-gap-16">
          {/* Lead sources placeholder */}
          <div className="crm-card crm-card-pad">
            <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14 }}>
              Lead Sources
            </h3>
            <div className="crm-stack crm-gap-14">
              {leadSources.map((src) => {
                const Icon = src.icon;
                return (
                  <div key={src.name} className="crm-stack" style={{ gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5 }}>{src.name}</span>
                      <span className="crm-caption crm-tabular" style={{ marginLeft: 'auto' }}>
                        {src.count}
                      </span>
                    </div>
                    <div className="crm-progress">
                      <span style={{ width: `${src.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="crm-caption" style={{ marginTop: 12, fontStyle: 'italic' }}>
              Lead tracking available in a future update
            </p>
          </div>

          {/* Team */}
          <div className="crm-card crm-card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }}>
                Team
              </h3>
              <Link href="/staff" className="crm-btn ghost sm" style={{ textDecoration: 'none' }}>
                Manage
              </Link>
            </div>
            {staffLoading ? (
              <span className="crm-caption">Loading…</span>
            ) : staffList.length === 0 ? (
              <span className="crm-caption">No staff members found</span>
            ) : (
              <div className="crm-stack crm-gap-10">
                {staffList.filter((m) => m.is_active).map((m) => {
                  const initials = m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className="crm-avatar"
                        style={{ background: ROLE_GRADIENTS[m.role] ?? ROLE_GRADIENTS.viewer }}
                      >
                        {initials}
                      </span>
                      <div className="crm-stack" style={{ gap: 1 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</span>
                        <span className="crm-caption" style={{ textTransform: 'capitalize' }}>{m.role}</span>
                      </div>
                      <span
                        style={{
                          marginLeft: 'auto',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: m.is_active ? 'var(--crm-green)' : 'var(--crm-text-3)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
