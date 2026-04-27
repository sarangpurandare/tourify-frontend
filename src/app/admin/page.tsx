'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Plan } from '@/types/admin';
import {
  LayoutDashboard,
  Building2,
  Users as UsersIcon,
  Compass,
  CalendarCheck,
  MapPin,
  Sparkles,
  Inbox,
  ArrowRight,
} from 'lucide-react';

interface MetricsPayload {
  orgs: {
    total: number;
    active: number;
    inactive: number;
    new_this_week: number;
    new_this_month: number;
  };
  by_plan: Record<Plan, number>;
  active_users_30d: number;
  totals: {
    travellers: number;
    trips: number;
    bookings: number;
    departures: number;
  };
  ai_credits_this_month: number;
  queues: {
    pending_upgrade_requests: number;
    pending_feature_requests: number;
  };
}

interface RecentSignup {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  created_at: string;
  owner_email: string | null;
}

const PLAN_COLOR: Record<Plan, string> = {
  free: 'var(--crm-text-3)',
  starter: 'var(--crm-blue, #0071e3)',
  pro: 'var(--crm-purple, #5856d6)',
  business: 'var(--crm-amber, #ff9f0a)',
};

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
}) {
  const content = (
    <div
      className="crm-card"
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: href ? 'pointer' : 'default',
        height: '100%',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--crm-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>{hint}</div>
      )}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
  return content;
}

export default function AdminOverviewPage() {
  const { data: metricsData, isLoading: mLoading, error: mError } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => api.get<APIResponse<MetricsPayload>>('/admin/metrics'),
    refetchInterval: 60_000,
  });
  const { data: signupsData } = useQuery({
    queryKey: ['admin-recent-signups'],
    queryFn: () => api.get<APIResponse<RecentSignup[]>>('/admin/recent-signups?limit=10'),
  });

  const metrics = metricsData?.data;
  const signups = signupsData?.data ?? [];

  const totalQueue = metrics
    ? metrics.queues.pending_upgrade_requests + metrics.queues.pending_feature_requests
    : 0;
  const queueHref =
    metrics && metrics.queues.pending_upgrade_requests > 0
      ? '/admin/upgrade-requests'
      : '/admin/feature-requests';

  const freeCount = metrics?.by_plan.free ?? 0;
  const paidCount = metrics
    ? (metrics.by_plan.starter ?? 0) + (metrics.by_plan.pro ?? 0) + (metrics.by_plan.business ?? 0)
    : 0;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, margin: '0 auto' }}>
      <div>
        <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LayoutDashboard size={20} style={{ color: 'var(--crm-text-3)' }} />
          Overview
        </h1>
        <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
          Platform-wide health for Tourify
        </div>
      </div>

      {mError && (
        <div className="crm-card" style={{ padding: 16, color: 'var(--crm-red, #d70015)', fontSize: 13 }}>
          Failed to load metrics: {(mError as Error).message}
        </div>
      )}

      {/* Top row — 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Total orgs"
          value={mLoading ? '—' : metrics?.orgs.total ?? 0}
          hint={
            mLoading
              ? null
              : <span><span style={{ color: 'var(--crm-green, #248a3d)' }}>+{metrics?.orgs.new_this_month ?? 0}</span> this month</span>
          }
          href="/admin/orgs"
        />
        <StatCard
          label="Active orgs"
          value={mLoading ? '—' : metrics?.orgs.active ?? 0}
          hint={
            mLoading
              ? null
              : `${metrics?.orgs.inactive ?? 0} paused`
          }
        />
        <StatCard
          label="Free vs paid"
          value={
            mLoading
              ? '—'
              : (
                <span>
                  {freeCount}<span style={{ color: 'var(--crm-text-3)', fontSize: 18, fontWeight: 400 }}> free</span>
                  <span style={{ color: 'var(--crm-text-4)', margin: '0 6px', fontSize: 18, fontWeight: 400 }}>·</span>
                  {paidCount}<span style={{ color: 'var(--crm-text-3)', fontSize: 18, fontWeight: 400 }}> paid</span>
                </span>
              )
          }
          hint={
            mLoading || !metrics
              ? null
              : `${metrics.active_users_30d} active users (30d)`
          }
        />
        <StatCard
          label="Pending queues"
          value={mLoading ? '—' : totalQueue}
          hint={
            mLoading || !metrics
              ? null
              : (
                <span>
                  {metrics.queues.pending_upgrade_requests} upgrade · {metrics.queues.pending_feature_requests} feature
                  <ArrowRight size={11} style={{ marginLeft: 6, verticalAlign: '-1px' }} />
                </span>
              )
          }
          href={queueHref}
        />
      </div>

      {/* Second row — plan distribution + platform totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="crm-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--crm-text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Plan distribution
          </div>
          {mLoading || !metrics ? (
            <div className="crm-dim" style={{ fontSize: 13 }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--crm-bg-active)' }}>
                {(['free', 'starter', 'pro', 'business'] as Plan[]).map((p) => {
                  const count = metrics.by_plan[p] ?? 0;
                  const pct = metrics.orgs.total > 0 ? (count / metrics.orgs.total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={p}
                      title={`${p}: ${count}`}
                      style={{ width: `${pct}%`, background: PLAN_COLOR[p] }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['free', 'starter', 'pro', 'business'] as Plan[]).map((p) => (
                  <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: PLAN_COLOR[p] }} />
                      <span style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'capitalize' }}>{p}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {metrics.by_plan[p] ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="crm-card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--crm-text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Platform totals
          </div>
          {mLoading || !metrics ? (
            <div className="crm-dim" style={{ fontSize: 13 }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Travellers', value: metrics.totals.travellers, icon: UsersIcon },
                { label: 'Trips', value: metrics.totals.trips, icon: Compass },
                { label: 'Bookings', value: metrics.totals.bookings, icon: CalendarCheck },
                { label: 'Departures', value: metrics.totals.departures, icon: MapPin },
              ].map((m) => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <m.icon size={12} style={{ color: 'var(--crm-text-3)' }} />
                    <span style={{ fontSize: 11, color: 'var(--crm-text-3)' }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Third row — AI credits this month (single big number) */}
      <div className="crm-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            background: 'color-mix(in oklab, var(--crm-purple, #5856d6) 15%, transparent)',
            color: 'var(--crm-purple, #5856d6)',
          }}
        >
          <Sparkles size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--crm-text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            AI credits this month
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {mLoading ? '—' : (metrics?.ai_credits_this_month ?? 0).toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--crm-text-4)' }}>
          aggregated across all customer orgs
        </div>
      </div>

      {/* Fourth row — recent signups */}
      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="crm-card-hd">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inbox size={15} style={{ color: 'var(--crm-text-3)' }} />
            Recent signups
          </h3>
          <Link href="/admin/orgs" className="crm-btn sm" style={{ display: 'inline-flex' }}>
            All orgs <ArrowRight size={12} />
          </Link>
        </div>
        {signups.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>No signups yet.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-2, var(--crm-bg-subtle))' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Org</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Owner</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Age</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <Link
                      href={`/admin/orgs/${s.id}`}
                      style={{ color: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <Building2 size={14} style={{ color: 'var(--crm-text-3)' }} />
                      {s.name}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `color-mix(in oklab, ${PLAN_COLOR[s.plan]} 15%, transparent)`,
                        color: PLAN_COLOR[s.plan],
                        textTransform: 'capitalize',
                      }}
                    >
                      {s.plan}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>
                    {s.owner_email ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--crm-text-3)', fontSize: 12 }}>
                    {ageLabel(s.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
