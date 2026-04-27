'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { AdminOrgDetail, AdminStaffUser, ImpersonationResponse, Plan } from '@/types/admin';
import {
  ArrowLeft,
  ChevronLeft,
  ExternalLink,
  Pause,
  Play,
  Save,
  Users as UsersIcon,
  HardDrive,
  MapPinned,
  Plane,
  CalendarRange,
} from 'lucide-react';

const PLANS: Plan[] = ['free', 'starter', 'pro', 'business'];

const PLAN_COLOR: Record<Plan, string> = {
  free: 'var(--crm-text-3)',
  starter: 'var(--crm-blue, #0071e3)',
  pro: 'var(--crm-purple, #5856d6)',
  business: 'var(--crm-amber, #ff9f0a)',
};

function PlanBadge({ plan }: { plan: Plan }) {
  const color = PLAN_COLOR[plan] ?? 'var(--crm-text-3)';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        color,
        textTransform: 'capitalize',
      }}
    >
      {plan}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          background: 'color-mix(in oklab, var(--crm-green, #248a3d) 15%, transparent)',
          color: 'var(--crm-green, #248a3d)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--crm-green, #248a3d)' }} />
        Active
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: 'color-mix(in oklab, var(--crm-red, #d70015) 15%, transparent)',
        color: 'var(--crm-red, #d70015)',
      }}
    >
      Paused
    </span>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--crm-bg-elev)',
        border: '1px solid var(--crm-hairline)',
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {value}
      </div>
    </div>
  );
}

export default function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: orgData, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['admin-org', id],
    queryFn: () => api.get<APIResponse<AdminOrgDetail>>(`/admin/orgs/${id}`),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-org-users', id],
    queryFn: () => api.get<APIResponse<AdminStaffUser[]>>(`/admin/orgs/${id}/users`),
  });

  const org = orgData?.data ?? null;
  const users = usersData?.data ?? [];

  const [planDraft, setPlanDraft] = useState<Plan>('free');

  // Sync draft with loaded org plan
  useEffect(() => {
    if (org?.plan) setPlanDraft(org.plan);
  }, [org?.plan]);

  const planMutation = useMutation({
    mutationFn: (plan: Plan) =>
      api.patch<APIResponse<AdminOrgDetail>>(`/admin/orgs/${id}`, { plan }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      toast.success(`Plan updated to ${res.data.plan}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update plan');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (is_active: boolean) =>
      api.patch<APIResponse<AdminOrgDetail>>(`/admin/orgs/${id}`, { is_active }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-org', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      toast.success(res.data.is_active ? 'Org reactivated' : 'Org paused');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post<APIResponse<ImpersonationResponse>>(`/admin/orgs/${id}/users/${userId}/impersonate`),
    onSuccess: (res) => {
      const url = res.data.login_url;
      if (!url) {
        toast.error('Impersonation token issued but no login URL returned.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Impersonation token issued — opened in new tab');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to issue impersonation token');
    },
  });

  function handleSavePlan() {
    if (!org || planDraft === org.plan) return;
    planMutation.mutate(planDraft);
  }

  function handleToggleStatus() {
    if (!org) return;
    if (org.is_active) {
      const ok = window.confirm(
        `Pause "${org.name}"? All users in this org will lose access until reactivated.`
      );
      if (!ok) return;
    }
    statusMutation.mutate(!org.is_active);
  }

  function handleImpersonate(u: AdminStaffUser) {
    if (!org) return;
    impersonateMutation.mutate(u.id);
  }

  // Loading state
  if (orgLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/orgs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-3)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ChevronLeft size={14} />
          All organisations
        </Link>
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span className="crm-dim" style={{ fontSize: 13 }}>Loading org…</span>
        </div>
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin/orgs" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-3)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ChevronLeft size={14} />
          All organisations
        </Link>
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--crm-red, #d70015)' }}>
            {(orgError as Error)?.message ?? 'Org not found'}
          </span>
        </div>
      </div>
    );
  }

  const usage = org.usage;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Back link */}
      <Link
        href="/admin/orgs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--crm-text-3)',
          fontSize: 13,
          textDecoration: 'none',
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={14} />
        All organisations
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="crm-page-title" style={{ margin: 0 }}>{org.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12, color: 'var(--crm-text-3)' }}>
              {org.slug}
            </span>
            <span style={{ color: 'var(--crm-text-4)' }}>·</span>
            <PlanBadge plan={org.plan} />
            <StatusPill active={org.is_active} />
            <span style={{ color: 'var(--crm-text-4)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>Created {formatDate(org.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Plan + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Plan management */}
        <div className="crm-card" style={{ padding: 18 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Plan</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--crm-text-3)', marginBottom: 14 }}>
            Change the subscription tier for this organisation.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={planDraft}
              onChange={e => setPlanDraft(e.target.value as Plan)}
              disabled={planMutation.isPending}
              style={{
                flex: 1,
                height: 32,
                padding: '0 10px',
                background: 'var(--crm-bg-elev)',
                color: 'var(--crm-text)',
                border: '1px solid var(--crm-hairline)',
                borderRadius: 6,
                fontSize: 13,
                textTransform: 'capitalize',
                font: 'inherit',
              }}
            >
              {PLANS.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <button
              className="crm-btn primary"
              onClick={handleSavePlan}
              disabled={planMutation.isPending || planDraft === org.plan}
              style={{ gap: 6, opacity: (planMutation.isPending || planDraft === org.plan) ? 0.5 : 1 }}
            >
              <Save size={14} />
              {planMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="crm-card" style={{ padding: 18 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Status</h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--crm-text-3)', marginBottom: 14 }}>
            {org.is_active
              ? 'Pausing will block all users in this org from accessing the CRM.'
              : 'Reactivate to restore access for all users.'}
          </p>
          <button
            className={org.is_active ? 'crm-btn' : 'crm-btn primary'}
            onClick={handleToggleStatus}
            disabled={statusMutation.isPending}
            style={{
              gap: 6,
              opacity: statusMutation.isPending ? 0.5 : 1,
              color: org.is_active ? 'var(--crm-red, #d70015)' : undefined,
              borderColor: org.is_active ? 'var(--crm-red, #d70015)' : undefined,
            }}
          >
            {org.is_active ? <Pause size={14} /> : <Play size={14} />}
            {statusMutation.isPending
              ? 'Working…'
              : org.is_active
                ? 'Pause organisation'
                : 'Reactivate organisation'}
          </button>
        </div>
      </div>

      {/* Usage */}
      <div className="crm-card" style={{ padding: 18 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Usage</h3>
        {!usage ? (
          <span className="crm-dim" style={{ fontSize: 12 }}>No usage data available.</span>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <MetricTile icon={<UsersIcon size={12} />} label="Staff" value={usage.staff_count ?? 0} />
            <MetricTile icon={<UsersIcon size={12} />} label="Travellers" value={usage.traveller_count ?? 0} />
            <MetricTile icon={<Plane size={12} />} label="Trips" value={usage.trip_count ?? 0} />
            <MetricTile icon={<CalendarRange size={12} />} label="Departures (mo)" value={usage.departure_month_count ?? 0} />
            <MetricTile icon={<HardDrive size={12} />} label="Storage" value={formatBytes(usage.storage_bytes)} />
          </div>
        )}
      </div>

      {/* Users */}
      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--crm-hairline)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Users</h3>
            <span className="crm-dim" style={{ fontSize: 12 }}>
              {usersLoading ? 'Loading…' : `${users.length} member${users.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--crm-text-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPinned size={11} /> Impersonation opens a new tab — use incognito for safety.
          </span>
        </div>
        {usersLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>No staff users in this org.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Joined</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const pending = impersonateMutation.isPending && impersonateMutation.variables === u.id;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-2)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', textTransform: 'capitalize' }}>{u.role}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusPill active={u.is_active} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        className="crm-btn sm"
                        onClick={() => handleImpersonate(u)}
                        disabled={pending || !u.is_active}
                        style={{ gap: 4, opacity: (pending || !u.is_active) ? 0.5 : 1 }}
                        title={u.is_active ? 'Issue impersonation token and open in new tab' : 'User is inactive'}
                      >
                        <ExternalLink size={12} />
                        {pending ? 'Issuing…' : 'Impersonate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
