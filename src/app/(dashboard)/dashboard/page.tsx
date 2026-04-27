'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { TripMaster } from '@/types/trip';
import type { StaffUser } from '@/types/staff';
import type { Traveller } from '@/types/traveller';
import Link from 'next/link';
import {
  Compass,
  Users,
  Map,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  ChevronDown,
  ChevronRight,
  Activity,
  IndianRupee,
  ListChecks,
  Tag,
  Mail,
  Receipt,
  Wallet,
  Briefcase,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────── */

interface DepartureReadiness {
  id: string;
  trip_name: string;
  start_date: string;
  end_date: string;
  status: string;
  live_status: string;
  current_day: number | null;
  capacity: number;
  confirmed_count: number;
  days_until: number;
  trip_leader_id: string | null;
  trip_leader_name: string | null;
  trip_type?: string;
  client_name?: string;
  quote_status?: string;
  readiness: {
    bookings_pct: number;
    payments_pct: number;
    checklist_pct: number;
    documents_pct: number;
    vendors_confirmed_pct: number;
    rooms_assigned_pct: number;
    leader_assigned: boolean;
    overall_pct: number;
  };
}

interface Alert {
  type: string;
  severity: string;
  message: string;
  departure_id?: string;
  departure_name?: string;
  count?: number;
  amount_cents?: number;
}

interface PaymentDue {
  booking_id: string;
  traveller_name: string;
  departure_name: string;
  amount_cents: number;
  currency: string;
  scheduled_date: string;
  is_overdue: boolean;
}

interface OpsSummary {
  departures: DepartureReadiness[];
  alerts: Alert[];
  payments_due_this_week: PaymentDue[];
  summary: {
    total_upcoming: number;
    departures_this_month: number;
    total_revenue_cents: number;
    total_collected_cents: number;
    collection_pct: number;
    in_progress_trips: number;
  };
}

/* ── Helpers ──────────────────────────────────────────── */

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

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(cents: number): string {
  return inr.format(cents / 100);
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString('en-GB', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-GB', { month: 'short' });
  if (sMonth === eMonth) return `${sDay}–${eDay} ${sMonth}`;
  return `${sDay} ${sMonth} – ${eDay} ${eMonth}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function readinessColor(pct: number): string {
  if (pct >= 80) return 'var(--crm-green)';
  if (pct >= 50) return 'var(--crm-amber)';
  return 'var(--crm-red)';
}

function readinessClass(pct: number): string {
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'amber';
  return 'red';
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const isPrivateTrip = (d: DepartureReadiness) => d.trip_type === 'private';

function quoteStatusPill(status?: string): { label: string; color: string } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'amber' };
    case 'sent':
      return { label: 'Sent', color: 'blue' };
    case 'accepted':
      return { label: 'Accepted', color: 'green' };
    case 'rejected':
      return { label: 'Rejected', color: 'pink' };
    case 'expired':
      return { label: 'Expired', color: 'gray' };
    default:
      return { label: status ?? 'Unknown', color: 'blue' };
  }
}

/* ── Component ────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  /* ── Data fetching ── */

  const { data: opsData, isLoading: opsLoading } = useQuery({
    queryKey: ['dashboard-ops'],
    queryFn: () => api.get<APIResponse<OpsSummary>>('/dashboard/ops'),
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

  const ops = opsData?.data;
  const totalTravellers = travData?.meta?.total ?? 0;
  const totalTrips = tripsData?.meta?.total ?? 0;
  const totalStaff = staffData?.data?.length ?? 0;
  const staffList = staffData?.data ?? [];

  const departures = ops?.departures ?? [];
  const groupDeps = departures.filter(d => !isPrivateTrip(d));
  const privateDeps = departures.filter(d => isPrivateTrip(d));
  const alerts = [...(ops?.alerts ?? [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
  const paymentsDue = ops?.payments_due_this_week ?? [];
  const summary = ops?.summary;

  const nextDep = departures[0];
  const nextDepLabel = nextDep
    ? `next: ${nextDep.trip_name ?? 'Departure'} in ${nextDep.days_until}d`
    : 'none scheduled';

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const anyLoading = opsLoading || travLoading || tripsLoading || staffLoading;

  /* ── KPIs ── */

  const kpis = [
    {
      label: 'Upcoming departures',
      value: String(summary?.total_upcoming ?? departures.length),
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
    {
      label: 'Revenue collected',
      value: summary ? formatCurrency(summary.total_collected_cents) : '--',
      sub: summary ? `of ${formatCurrency(summary.total_revenue_cents)}` : '',
      icon: IndianRupee,
      color: summary && summary.collection_pct >= 70 ? 'var(--crm-green)' : 'var(--crm-amber)',
      bg: summary && summary.collection_pct >= 70 ? 'var(--crm-green-bg)' : 'var(--crm-amber-bg)',
      href: '/finances',
      pct: summary?.collection_pct ?? 0,
    },
    {
      label: 'In progress',
      value: String(summary?.in_progress_trips ?? 0),
      sub: 'trips currently live',
      icon: Activity,
      color: 'var(--crm-purple)',
      bg: 'var(--crm-purple-bg)',
      href: '/departures',
    },
  ];

  /* ── Alerts ── */

  const visibleAlerts = alertsExpanded ? alerts : alerts.slice(0, 5);
  const hasMoreAlerts = alerts.length > 5;

  const paymentTotal = paymentsDue.reduce((sum, p) => sum + p.amount_cents, 0);

  /* ── Quick Links ── */

  const quickLinks = [
    { label: 'Manage Vendors', href: '/vendors', icon: Building2 },
    { label: 'Promo Codes', href: '/settings/promo-codes', icon: Tag },
    { label: 'Email Templates', href: '/settings/email-templates', icon: Mail },
    { label: 'Checklists', href: '/settings/checklists', icon: ListChecks },
    { label: 'Invoices', href: '/finances/invoices', icon: Receipt },
    { label: 'Finances', href: '/finances', icon: Wallet },
  ];

  /* ── Readiness segments config ── */

  const readinessSegments = [
    { key: 'payments_pct' as const, label: 'Payments', color: 'var(--crm-accent)' },
    { key: 'checklist_pct' as const, label: 'Checklist', color: 'var(--crm-green)' },
    { key: 'bookings_pct' as const, label: 'Bookings', color: 'var(--crm-purple)' },
    { key: 'documents_pct' as const, label: 'Documents', color: 'var(--crm-amber)' },
    { key: 'vendors_confirmed_pct' as const, label: 'Vendors', color: 'var(--crm-teal)' },
    { key: 'rooms_assigned_pct' as const, label: 'Rooms', color: 'var(--crm-pink)' },
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
          <p className="crm-caption" style={{ fontSize: 14 }}>Loading your command center...</p>
        ) : (
          <p className="crm-caption" style={{ fontSize: 14 }}>
            {departures.length > 0
              ? `${departures.length} upcoming departure${departures.length !== 1 ? 's' : ''} on the horizon${alerts.length > 0 ? ` · ${alerts.length} item${alerts.length !== 1 ? 's' : ''} need attention` : ''}.`
              : 'No upcoming departures. Create a trip and add a departure to get started.'}
          </p>
        )}
      </header>

      {/* ── Row 1: KPI row ────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                className="crm-card crm-card-pad"
                style={{ display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}
              >
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
                <span
                  className="crm-tabular"
                  style={{ fontSize: k.label === 'Revenue collected' ? 18 : 24, fontWeight: 600, letterSpacing: '-0.018em' }}
                >
                  {anyLoading ? '...' : k.value}
                </span>
                {/* Revenue collected card gets a progress bar */}
                {'pct' in k && k.pct !== undefined && !anyLoading ? (
                  <div className="crm-stack" style={{ gap: 4 }}>
                    <div className={`crm-progress ${readinessClass(k.pct)}`}>
                      <span style={{ width: `${k.pct}%` }} />
                    </div>
                    <span className="crm-caption">{k.sub} ({k.pct}%)</span>
                  </div>
                ) : (
                  <span className="crm-caption">{k.sub}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Row 2: Alerts Panel ───────────────────── */}
      <div className="crm-card" style={{ marginBottom: 20 }}>
        <div className="crm-card-hd">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} style={{ color: alerts.length > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }} />
            Attention Required
            {alerts.length > 0 && (
              <span
                className="crm-pill amber"
                style={{ fontSize: 11, marginLeft: 4 }}
              >
                {alerts.length} item{alerts.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
        </div>
        {opsLoading ? (
          <div style={{ padding: '20px 20px', textAlign: 'center' }}>
            <span className="crm-caption">Loading alerts...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--crm-green-bg)',
            }}
          >
            <CheckCircle size={16} style={{ color: 'var(--crm-green)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--crm-green)' }}>
              All clear — everything is on track
            </span>
          </div>
        ) : (
          <div>
            {visibleAlerts.map((alert, i) => {
              const severityIcon =
                alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🔵';
              const isHigh = alert.severity === 'high';
              return (
                <div
                  key={`${alert.type}-${alert.departure_id ?? ''}-${i}`}
                  style={{
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: i < visibleAlerts.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                    background: isHigh ? 'var(--crm-red-bg)' : undefined,
                    fontSize: 13.5,
                  }}
                >
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{severityIcon}</span>
                  <span style={{ flex: 1, fontWeight: isHigh ? 500 : 400 }}>
                    {alert.message}
                  </span>
                  {alert.departure_id && (
                    <Link
                      href={`/departures/${alert.departure_id}`}
                      className="crm-btn ghost sm"
                      style={{ textDecoration: 'none', flexShrink: 0 }}
                    >
                      View
                      <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
            {hasMoreAlerts && (
              <button
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="crm-btn ghost sm"
                style={{
                  width: '100%',
                  padding: '8px 20px',
                  justifyContent: 'center',
                  borderTop: '1px solid var(--crm-hairline)',
                  borderRadius: 0,
                }}
              >
                {alertsExpanded ? 'Show fewer' : `Show all ${alerts.length} alerts`}
                <ChevronDown
                  size={12}
                  style={{
                    transform: alertsExpanded ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Row 3: Two-column layout ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start', marginBottom: 20 }}>
        {/* ── Left: Departure Readiness ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Group Tours ── */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Compass size={15} style={{ color: 'var(--crm-accent)' }} />
                Group Tours
                {!opsLoading && (
                  <span className="crm-pill blue" style={{ fontSize: 11, marginLeft: 2 }}>
                    {groupDeps.length}
                  </span>
                )}
              </h3>
              <Link href="/departures" className="crm-btn ghost sm" style={{ textDecoration: 'none' }}>
                View all
              </Link>
            </div>
            {opsLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading departures...</span>
              </div>
            ) : groupDeps.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--crm-text-4)' }}>
                  No group tours upcoming
                </p>
              </div>
            ) : (
              <div>
                {groupDeps.map((dep, idx) => {
                  const r = dep.readiness;
                  const overallColor = readinessColor(r.overall_pct);
                  const isLive = dep.live_status === 'in_progress';

                  /* Warnings */
                  const warnings: string[] = [];
                  if (!r.leader_assigned) warnings.push('No leader');
                  if (r.documents_pct < 100) {
                    const pendingDocs = Math.round((1 - r.documents_pct / 100) * dep.capacity);
                    if (pendingDocs > 0) warnings.push(`${pendingDocs} docs pending`);
                  }
                  if (r.vendors_confirmed_pct < 100) warnings.push('Vendors unconfirmed');

                  /* Status pill color */
                  const statusColor =
                    dep.status === 'open'
                      ? 'green'
                      : dep.status === 'filling_fast' || dep.status === 'waitlisted'
                        ? 'amber'
                        : dep.status === 'sold_out'
                          ? 'red'
                          : 'blue';

                  return (
                    <Link
                      key={dep.id}
                      href={`/departures/${dep.id}`}
                      style={{
                        display: 'block',
                        padding: '14px 20px',
                        borderBottom: idx < groupDeps.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--crm-bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Top row: name, status, countdown */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.005em', flex: 1 }}>
                          {dep.trip_name ?? 'Unnamed Trip'}
                        </span>
                        {isLive && (
                          <span
                            className="crm-pill red"
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              animation: 'pulse 2s infinite',
                            }}
                          >
                            <span className="dot" />
                            LIVE Day {dep.current_day}
                          </span>
                        )}
                        <span className={`crm-pill ${statusColor}`}>
                          <span className="dot" />
                          {dep.status.replace(/_/g, ' ')}
                        </span>
                        <span
                          className="crm-pill blue crm-tabular"
                          style={{ fontSize: 11, fontWeight: 600 }}
                        >
                          {dep.days_until <= 0 ? 'Today' : `${dep.days_until}d`}
                        </span>
                      </div>

                      {/* Dates + capacity row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: 10,
                          fontSize: 12,
                          color: 'var(--crm-text-3)',
                        }}
                      >
                        <span>{formatDateRange(dep.start_date, dep.end_date)}</span>
                        <span>
                          {dep.confirmed_count}/{dep.capacity} booked
                        </span>
                        {dep.trip_leader_name && (
                          <span>Leader: {dep.trip_leader_name}</span>
                        )}
                      </div>

                      {/* Readiness bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: warnings.length > 0 ? 8 : 0 }}>
                        {/* Multi-segment bar */}
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            gap: 2,
                            height: 6,
                            borderRadius: 3,
                            overflow: 'hidden',
                            background: 'var(--crm-bg-hover)',
                          }}
                        >
                          {readinessSegments.map((seg) => {
                            const val = r[seg.key];
                            return (
                              <div
                                key={seg.key}
                                title={`${seg.label}: ${val}%`}
                                style={{
                                  flex: 1,
                                  position: 'relative',
                                  background: 'var(--crm-bg-hover)',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${val}%`,
                                    background: seg.color,
                                    borderRadius: 2,
                                    transition: 'width 0.3s',
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {/* Overall % */}
                        <span
                          className="crm-tabular"
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: overallColor,
                            minWidth: 40,
                            textAlign: 'right',
                          }}
                        >
                          {r.overall_pct}%
                        </span>
                      </div>

                      {/* Segment legend (compact) */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginBottom: warnings.length > 0 ? 6 : 0,
                          marginTop: 4,
                        }}
                      >
                        {readinessSegments.map((seg) => {
                          const val = r[seg.key];
                          return (
                            <span
                              key={seg.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 11,
                                color: 'var(--crm-text-3)',
                              }}
                            >
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 2,
                                  background: seg.color,
                                  flexShrink: 0,
                                }}
                              />
                              {seg.label} {val}%
                            </span>
                          );
                        })}
                      </div>

                      {/* Warning tags */}
                      {warnings.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {warnings.map((w) => (
                            <span
                              key={w}
                              className="crm-pill amber"
                              style={{ fontSize: 10.5 }}
                            >
                              <AlertTriangle size={10} />
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Private Trips Pipeline ── */}
          <div className="crm-card">
            <div className="crm-card-hd">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={15} style={{ color: 'var(--crm-purple)' }} />
                Private Trips
                {!opsLoading && (
                  <span className="crm-pill purple" style={{ fontSize: 11, marginLeft: 2 }}>
                    {privateDeps.length}
                  </span>
                )}
              </h3>
            </div>
            {opsLoading ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <span className="crm-caption">Loading...</span>
              </div>
            ) : privateDeps.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--crm-text-4)' }}>
                  No private trips in pipeline
                </p>
              </div>
            ) : (
              <div>
                {privateDeps.map((dep, idx) => {
                  const r = dep.readiness;
                  const qs = quoteStatusPill(dep.quote_status);
                  const paymentsColor = readinessColor(r.payments_pct);
                  const checklistColor = readinessColor(r.checklist_pct);

                  return (
                    <Link
                      key={dep.id}
                      href={`/departures/${dep.id}`}
                      style={{
                        display: 'block',
                        padding: '14px 20px',
                        borderBottom: idx < privateDeps.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--crm-bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Top row: client name + quote status + countdown */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.005em', flex: 1 }}>
                          {dep.client_name ?? 'Unknown Client'}
                        </span>
                        <span className={`crm-pill ${qs.color}`}>
                          {qs.label}
                        </span>
                        <span
                          className="crm-pill blue crm-tabular"
                          style={{ fontSize: 11, fontWeight: 600 }}
                        >
                          {dep.days_until <= 0 ? 'Today' : `${dep.days_until}d`}
                        </span>
                      </div>

                      {/* Trip name + dates */}
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--crm-text-3)',
                          marginBottom: 10,
                        }}
                      >
                        {dep.trip_name ?? 'Unnamed Trip'} &middot; {formatDateRange(dep.start_date, dep.end_date)}
                      </div>

                      {/* Simplified readiness: payments + checklist */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        {/* Payments bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--crm-text-3)' }}>
                            <span>Payments</span>
                            <span className="crm-tabular" style={{ fontWeight: 600, color: paymentsColor }}>{r.payments_pct}%</span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              borderRadius: 3,
                              background: 'var(--crm-bg-hover)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${r.payments_pct}%`,
                                background: paymentsColor,
                                borderRadius: 3,
                                transition: 'width 0.3s',
                              }}
                            />
                          </div>
                        </div>
                        {/* Checklist bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--crm-text-3)' }}>
                            <span>Checklist</span>
                            <span className="crm-tabular" style={{ fontWeight: 600, color: checklistColor }}>{r.checklist_pct}%</span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              borderRadius: 3,
                              background: 'var(--crm-bg-hover)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${r.checklist_pct}%`,
                                background: checklistColor,
                                borderRadius: 3,
                                transition: 'width 0.3s',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Payments Due This Week ── */}
        <div className="crm-card">
          <div className="crm-card-hd">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} style={{ color: 'var(--crm-text-3)' }} />
              Payments Due
            </h3>
          </div>
          {opsLoading ? (
            <div style={{ padding: '20px 20px', textAlign: 'center' }}>
              <span className="crm-caption">Loading...</span>
            </div>
          ) : paymentsDue.length === 0 ? (
            <div
              style={{
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <DollarSign size={20} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
              <p className="crm-caption">No payments due this week</p>
            </div>
          ) : (
            <div>
              {paymentsDue.map((p, idx) => (
                <div
                  key={`${p.booking_id}-${idx}`}
                  style={{
                    padding: '10px 16px',
                    borderBottom: idx < paymentsDue.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                    background: p.is_overdue ? 'var(--crm-red-bg)' : undefined,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontWeight: 500, color: p.is_overdue ? 'var(--crm-red)' : undefined }}>
                      {p.traveller_name}
                    </span>
                    <span
                      className="crm-tabular"
                      style={{
                        fontWeight: 600,
                        color: p.is_overdue ? 'var(--crm-red)' : undefined,
                      }}
                    >
                      {formatCurrency(p.amount_cents)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span className="crm-caption" style={{ fontSize: 11 }}>
                      {p.departure_name}
                    </span>
                    <span
                      className="crm-caption crm-tabular"
                      style={{
                        fontSize: 11,
                        color: p.is_overdue ? 'var(--crm-red)' : undefined,
                        fontWeight: p.is_overdue ? 600 : undefined,
                      }}
                    >
                      {p.is_overdue ? 'OVERDUE' : formatShortDate(p.scheduled_date)}
                    </span>
                  </div>
                </div>
              ))}
              {/* Total */}
              <div
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--crm-hairline)',
                  background: 'var(--crm-bg-hover)',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>Total</span>
                <span className="crm-tabular" style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatCurrency(paymentTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Quick Links ────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
        }}
      >
        {quickLinks.map((ql) => {
          const Icon = ql.icon;
          return (
            <Link
              key={ql.label}
              href={ql.href}
              className="crm-card crm-card-pad"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '12px 14px',
              }}
            >
              <Icon size={15} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{ql.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
