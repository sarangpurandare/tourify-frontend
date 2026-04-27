'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { FeatureRequestStatus, FeatureRequestWithMeta } from '@/types/feature-request';
import { ChevronUp, MessageSquare, Lightbulb } from 'lucide-react';

type StatusFilter = '' | FeatureRequestStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'shipped', label: 'Shipped' },
];

const STATUSES: { key: FeatureRequestStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'shipped', label: 'Shipped' },
];

const STATUS_COLOR: Record<FeatureRequestStatus, string> = {
  requested: 'var(--crm-text-3)',
  in_progress: 'var(--crm-amber, #ff9f0a)',
  shipped: 'var(--crm-green, #248a3d)',
};

function StatusDot({ status }: { status: FeatureRequestStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
        verticalAlign: 'middle',
      }}
    />
  );
}

export default function AdminFeatureRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-feature-requests', statusFilter],
    queryFn: () => {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      return api.get<APIResponse<FeatureRequestWithMeta[]>>(`/admin/feature-requests${qs}`);
    },
  });

  const items = useMemo(() => data?.data ?? [], [data]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeatureRequestStatus }) =>
      api.patch<APIResponse<FeatureRequestWithMeta>>(`/admin/feature-requests/${id}`, { status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      const label = STATUSES.find(s => s.key === res.data.status)?.label ?? res.data.status;
      toast.success(`Status set to ${label}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={20} style={{ color: 'var(--crm-text-3)' }} />
            Feature Requests
          </h1>
          <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${items.length} total across all orgs`}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--crm-hairline)' }}>
        {TABS.map(t => {
          const active = statusFilter === t.key;
          return (
            <button
              key={t.key || 'all'}
              onClick={() => setStatusFilter(t.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--crm-text)' : 'var(--crm-text-3)',
                borderBottom: active ? '2px solid var(--crm-accent, #0071e3)' : '2px solid transparent',
                cursor: 'pointer',
                font: 'inherit',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--crm-red, #d70015)' }}>
              Failed to load feature requests: {(error as Error).message}
            </span>
          </div>
        ) : isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>
              {statusFilter ? 'No feature requests match this filter.' : 'No feature requests yet.'}
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Votes</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comments</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted by</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(fr => {
                const pending = statusMutation.isPending && statusMutation.variables?.id === fr.id;
                return (
                  <tr
                    key={fr.id}
                    onClick={() => router.push(`/admin/feature-requests/${fr.id}`)}
                    style={{
                      borderBottom: '1px solid var(--crm-hairline)',
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--crm-bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 500, maxWidth: 380 }}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {fr.title}
                      </div>
                      {fr.description && (
                        <div className="crm-dim" style={{ fontSize: 12, fontWeight: 400, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {fr.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-2)' }}>
                        <ChevronUp size={12} strokeWidth={2.5} />
                        {fr.vote_count}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-2)' }}>
                        <MessageSquare size={11} />
                        {fr.comment_count}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13 }}>{fr.submitted_by_name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--crm-text-3)' }}>{fr.submitted_by_org_name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>
                      {formatDate(fr.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <select
                        value={fr.status}
                        onChange={e => statusMutation.mutate({ id: fr.id, status: e.target.value as FeatureRequestStatus })}
                        disabled={pending}
                        style={{
                          height: 28,
                          padding: '0 8px',
                          background: 'var(--crm-bg-elev)',
                          color: 'var(--crm-text)',
                          border: '1px solid var(--crm-hairline)',
                          borderRadius: 6,
                          fontSize: 12.5,
                          font: 'inherit',
                          opacity: pending ? 0.6 : 1,
                        }}
                      >
                        {STATUSES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                        <StatusDot status={fr.status} />
                      </span>
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
