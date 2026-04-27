'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { AdminUpgradeRequest, Plan, UpgradeRequestStatus } from '@/types/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight, Check, X, Inbox } from 'lucide-react';

type StatusFilter = '' | UpgradeRequestStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied', label: 'Denied' },
  { key: '', label: 'All' },
];

const PLAN_COLOR: Record<Plan, string> = {
  free: 'var(--crm-text-3)',
  starter: 'var(--crm-blue, #0071e3)',
  pro: 'var(--crm-purple, #5856d6)',
  business: 'var(--crm-amber, #ff9f0a)',
};

const STATUS_COLOR: Record<UpgradeRequestStatus, string> = {
  pending: 'var(--crm-amber, #ff9f0a)',
  approved: 'var(--crm-green, #248a3d)',
  denied: 'var(--crm-red, #d70015)',
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

function StatusBadge({ status }: { status: UpgradeRequestStatus }) {
  const color = STATUS_COLOR[status];
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
      {status}
    </span>
  );
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export default function AdminUpgradeRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Deny dialog state
  const [denyTarget, setDenyTarget] = useState<AdminUpgradeRequest | null>(null);
  const [denyReason, setDenyReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-upgrade-requests', statusFilter],
    queryFn: () => {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      return api.get<APIResponse<AdminUpgradeRequest[]>>(`/admin/upgrade-requests${qs}`);
    },
  });

  const items = useMemo(() => data?.data ?? [], [data]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post<APIResponse<unknown>>(`/admin/upgrade-requests/${id}/approve`, {}),
    onSuccess: (_res, id) => {
      const item = items.find(i => i.id === id);
      queryClient.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] });
      if (item) {
        queryClient.invalidateQueries({ queryKey: ['admin-org', item.organisation_id] });
        toast.success(`Approved — ${item.org_name} upgraded to ${item.target_plan}`);
      } else {
        toast.success('Upgrade approved');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve upgrade request');
    },
  });

  const denyMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<APIResponse<unknown>>(`/admin/upgrade-requests/${id}/deny`, reason ? { reason } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
      setDenyTarget(null);
      setDenyReason('');
      toast.success('Upgrade request denied');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deny upgrade request');
    },
  });

  function handleApprove(req: AdminUpgradeRequest) {
    const ok = window.confirm(
      `Upgrade ${req.org_name} from ${req.current_plan} to ${req.target_plan}?\n\n` +
      `This will change the organisation's plan immediately and write an audit entry.`
    );
    if (!ok) return;
    approveMutation.mutate(req.id);
  }

  function openDeny(req: AdminUpgradeRequest) {
    setDenyTarget(req);
    setDenyReason('');
  }

  function handleDenySubmit() {
    if (!denyTarget) return;
    denyMutation.mutate({ id: denyTarget.id, reason: denyReason.trim() });
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Inbox size={20} style={{ color: 'var(--crm-text-3)' }} />
            Upgrade Requests
          </h1>
          <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${items.length} ${statusFilter || 'total'}`}
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
              Failed to load upgrade requests: {(error as Error).message}
            </span>
          </div>
        ) : isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>
              {statusFilter === 'pending'
                ? 'No pending upgrade requests'
                : statusFilter === ''
                  ? 'No upgrade requests yet.'
                  : `No ${statusFilter} upgrade requests.`}
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-subtle)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Organisation</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requester</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plan</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(req => {
                const expanded = expandedId === req.id;
                const isPending = req.status === 'pending';
                const approving = approveMutation.isPending && approveMutation.variables === req.id;
                const denying = denyMutation.isPending && denyMutation.variables?.id === req.id;
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/admin/orgs/${req.organisation_id}`}
                        style={{ color: 'var(--crm-text)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {req.org_name || <span className="crm-dim">unknown</span>}
                      </Link>
                      {req.org_slug && (
                        <div style={{ fontSize: 11, color: 'var(--crm-text-3)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
                          {req.org_slug}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13 }}>{req.requester_name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--crm-text-3)' }}>{req.requester_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <PlanBadge plan={req.current_plan} />
                        <ArrowRight size={12} style={{ color: 'var(--crm-text-4)' }} />
                        <PlanBadge plan={req.target_plan} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                      {req.message ? (
                        <div
                          onClick={() => setExpandedId(expanded ? null : req.id)}
                          style={{
                            cursor: 'pointer',
                            color: 'var(--crm-text-2)',
                            fontSize: 12.5,
                            lineHeight: 1.4,
                            display: expanded ? 'block' : '-webkit-box',
                            WebkitLineClamp: expanded ? undefined : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: expanded ? 'pre-wrap' : undefined,
                          }}
                          title={expanded ? 'Click to collapse' : 'Click to expand'}
                        >
                          {req.message}
                        </div>
                      ) : (
                        <span className="crm-dim" style={{ fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={req.status} />
                      {!isPending && req.handled_at && (
                        <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 3 }}>
                          {req.handled_by_name ? `by ${req.handled_by_name}` : ''} {relativeTime(req.handled_at)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>
                      <div>{relativeTime(req.created_at)}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>{formatDate(req.created_at)}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isPending ? (
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="crm-btn primary sm"
                            onClick={() => handleApprove(req)}
                            disabled={approving || denying}
                            style={{
                              gap: 4,
                              background: 'var(--crm-green, #248a3d)',
                              borderColor: 'var(--crm-green, #248a3d)',
                              opacity: (approving || denying) ? 0.6 : 1,
                            }}
                          >
                            <Check size={12} />
                            {approving ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            className="crm-btn sm"
                            onClick={() => openDeny(req)}
                            disabled={approving || denying}
                            style={{
                              gap: 4,
                              color: 'var(--crm-red, #d70015)',
                              borderColor: 'var(--crm-red, #d70015)',
                              opacity: (approving || denying) ? 0.6 : 1,
                            }}
                          >
                            <X size={12} />
                            {denying ? 'Denying…' : 'Deny'}
                          </button>
                        </div>
                      ) : (
                        <span className="crm-dim" style={{ fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Deny dialog */}
      <Dialog open={!!denyTarget} onOpenChange={(open) => { if (!open) setDenyTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Deny upgrade request</DialogTitle>
            <DialogDescription>
              {denyTarget && (
                <>
                  Deny <strong>{denyTarget.org_name}</strong>&apos;s request to upgrade from{' '}
                  <strong>{denyTarget.current_plan}</strong> to <strong>{denyTarget.target_plan}</strong>?
                  Optionally include a reason for the audit log.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-3">
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Optional reason (saved to audit log)"
              rows={4}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'var(--crm-bg-elev)',
                color: 'var(--crm-text)',
                border: '1px solid var(--crm-hairline)',
                borderRadius: 6,
                fontSize: 13,
                font: 'inherit',
                resize: 'vertical',
                minHeight: 80,
                boxSizing: 'border-box',
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              className="crm-btn"
              onClick={() => setDenyTarget(null)}
              disabled={denyMutation.isPending}
            >
              Cancel
            </button>
            <button
              className="crm-btn"
              onClick={handleDenySubmit}
              disabled={denyMutation.isPending}
              style={{
                color: 'var(--crm-red, #d70015)',
                borderColor: 'var(--crm-red, #d70015)',
              }}
            >
              {denyMutation.isPending ? 'Denying…' : 'Deny request'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
