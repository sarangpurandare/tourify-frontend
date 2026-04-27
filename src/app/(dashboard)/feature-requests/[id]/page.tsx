'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type {
  FeatureRequestDetail,
  FeatureRequestComment,
  FeatureRequestWithMeta,
  FeatureRequestStatus,
  ToggleVoteResponse,
} from '@/types/feature-request';
import { ArrowLeft, ChevronUp, Send } from 'lucide-react';

const STATUSES: { key: FeatureRequestStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'shipped', label: 'Shipped' },
];

const STATUS_COLOR: Record<string, string> = {
  requested: 'var(--crm-text-3)',
  in_progress: 'var(--crm-amber, #ff9f0a)',
  shipped: 'var(--crm-green, #248a3d)',
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--crm-text-3)';
  const label = STATUSES.find(s => s.key === status)?.label ?? status;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: 11.5,
        fontWeight: 600,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        color,
      }}
    >
      {label}
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

export default function FeatureRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPlatformAdmin = (user as unknown as { is_platform_admin?: boolean } | null)?.is_platform_admin === true;

  const [commentBody, setCommentBody] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-request', id],
    queryFn: () => api.get<APIResponse<FeatureRequestDetail>>(`/feature-requests/${id}`),
  });

  const fr = data?.data?.feature_request ?? null;
  const comments: FeatureRequestComment[] = data?.data?.comments ?? [];

  const voteMutation = useMutation({
    mutationFn: () => api.post<APIResponse<ToggleVoteResponse>>(`/feature-requests/${id}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-request', id] });
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to vote');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) =>
      api.post<APIResponse<FeatureRequestComment>>(`/feature-requests/${id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-request', id] });
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      setCommentBody('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to post comment');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: FeatureRequestStatus) =>
      api.patch<APIResponse<FeatureRequestWithMeta>>(`/admin/feature-requests/${id}`, { status }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['feature-request', id] });
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success(`Status set to ${STATUSES.find(s => s.key === res.data.status)?.label ?? res.data.status}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  function handleSubmitComment() {
    const body = commentBody.trim();
    if (!body) return;
    commentMutation.mutate(body);
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
        <Link href="/feature-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-3)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> All feature requests
        </Link>
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
        </div>
      </div>
    );
  }

  if (error || !fr) {
    return (
      <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
        <Link href="/feature-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-3)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> All feature requests
        </Link>
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--crm-red, #d70015)' }}>
            {(error as Error)?.message ?? 'Feature request not found'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Link
        href="/feature-requests"
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
        <ArrowLeft size={14} /> All feature requests
      </Link>

      {/* Header card */}
      <div className="crm-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Vote */}
          <button
            onClick={() => voteMutation.mutate()}
            disabled={voteMutation.isPending}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 60,
              padding: '10px 8px',
              borderRadius: 8,
              border: fr.has_voted ? '1px solid var(--crm-accent, #0071e3)' : '1px solid var(--crm-hairline)',
              background: fr.has_voted ? 'color-mix(in oklab, var(--crm-accent, #0071e3) 12%, transparent)' : 'var(--crm-bg-elev)',
              color: fr.has_voted ? 'var(--crm-accent, #0071e3)' : 'var(--crm-text-2)',
              cursor: 'pointer',
              font: 'inherit',
            }}
            title={fr.has_voted ? 'Remove your vote' : 'Vote for this'}
          >
            <ChevronUp size={16} strokeWidth={2.5} />
            <span style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fr.vote_count}
            </span>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h1 className="crm-page-title" style={{ margin: 0, fontSize: 20 }}>{fr.title}</h1>
              {isPlatformAdmin ? (
                <select
                  value={fr.status}
                  onChange={e => statusMutation.mutate(e.target.value as FeatureRequestStatus)}
                  disabled={statusMutation.isPending}
                  style={{
                    height: 30,
                    padding: '0 8px',
                    background: 'var(--crm-bg-elev)',
                    color: 'var(--crm-text)',
                    border: '1px solid var(--crm-hairline)',
                    borderRadius: 6,
                    fontSize: 12.5,
                    font: 'inherit',
                  }}
                  title="Update status (super admin)"
                >
                  {STATUSES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <StatusPill status={fr.status} />
              )}
            </div>
            <div className="crm-caption" style={{ fontSize: 12, marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>
                Submitted by <strong>{fr.submitted_by_name || 'Unknown'}</strong>
                {fr.submitted_by_org_name ? <> at <strong>{fr.submitted_by_org_name}</strong></> : null}
              </span>
              <span>·</span>
              <span>{formatDate(fr.created_at)}</span>
              {fr.shipped_at && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--crm-green, #248a3d)' }}>Shipped {formatDate(fr.shipped_at)}</span>
                </>
              )}
            </div>
            {fr.description && (
              <div style={{ marginTop: 14, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--crm-text-2)' }}>
                {fr.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--crm-hairline)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            Discussion <span className="crm-dim" style={{ fontWeight: 400 }}>({comments.length})</span>
          </h3>
        </div>
        <div style={{ padding: '4px 18px' }}>
          {comments.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <span className="crm-dim" style={{ fontSize: 13 }}>No comments yet. Start the discussion below.</span>
            </div>
          ) : (
            <div>
              {comments.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: i < comments.length - 1 ? '1px solid var(--crm-hairline)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.staff_name || 'Unknown'}</span>
                    {c.org_name && (
                      <span className="crm-caption" style={{ fontSize: 11.5 }}>at {c.org_name}</span>
                    )}
                    <span className="crm-caption" style={{ fontSize: 11.5, marginLeft: 'auto' }}>{relativeTime(c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--crm-text-2)' }}>
                    {c.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-subtle, transparent)' }}>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
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
              minHeight: 64,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              className="crm-btn primary"
              onClick={handleSubmitComment}
              disabled={commentMutation.isPending || !commentBody.trim()}
              style={{ gap: 6 }}
            >
              <Send size={13} />
              {commentMutation.isPending ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
