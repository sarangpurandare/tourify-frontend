'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { FeatureRequestWithMeta, ToggleVoteResponse } from '@/types/feature-request';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, ChevronUp, MessageSquare, Lightbulb } from 'lucide-react';

type StatusFilter = '' | 'requested' | 'in_progress' | 'shipped';

const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  in_progress: 'In Progress',
  shipped: 'Shipped',
};

const STATUS_COLOR: Record<string, string> = {
  requested: 'var(--crm-text-3)',
  in_progress: 'var(--crm-amber, #ff9f0a)',
  shipped: 'var(--crm-green, #248a3d)',
};

const TABS: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'shipped', label: 'Shipped' },
];

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--crm-text-3)';
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
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function FeatureRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['feature-requests', statusFilter],
    queryFn: () => {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      return api.get<APIResponse<FeatureRequestWithMeta[]>>(`/feature-requests${qs}`);
    },
  });

  const items = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post<APIResponse<FeatureRequestWithMeta>>('/feature-requests', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      toast.success('Feature request created');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create feature request');
    },
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => api.post<APIResponse<ToggleVoteResponse>>(`/feature-requests/${id}/vote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to vote');
    },
  });

  function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    createMutation.mutate({
      title,
      description: newDescription.trim() ? newDescription.trim() : undefined,
    });
  }

  function handleVote(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    voteMutation.mutate(id);
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={20} /> Feature Requests
          </h1>
          <p className="crm-caption" style={{ margin: '4px 0 0 0' }}>
            Public roadmap. See what others are asking for, vote for what matters, comment, and submit ideas.
          </p>
        </div>
        <button className="crm-btn primary" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> New request
        </button>
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

      {isLoading ? (
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="crm-card" style={{ padding: 40, textAlign: 'center' }}>
          <span className="crm-dim" style={{ fontSize: 13 }}>
            No feature requests {statusFilter ? `with status "${STATUS_LABEL[statusFilter] ?? statusFilter}"` : 'yet'}. Be the first to submit one.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(fr => (
            <Link
              key={fr.id}
              href={`/feature-requests/${fr.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="crm-card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'background 0.1s',
                  cursor: 'pointer',
                }}
              >
                {/* Vote button */}
                <button
                  onClick={(e) => handleVote(e, fr.id)}
                  disabled={voteMutation.isPending}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 52,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: fr.has_voted ? '1px solid var(--crm-accent, #0071e3)' : '1px solid var(--crm-hairline)',
                    background: fr.has_voted ? 'color-mix(in oklab, var(--crm-accent, #0071e3) 12%, transparent)' : 'var(--crm-bg-elev)',
                    color: fr.has_voted ? 'var(--crm-accent, #0071e3)' : 'var(--crm-text-2)',
                    cursor: 'pointer',
                    font: 'inherit',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                  title={fr.has_voted ? 'Remove your vote' : 'Vote for this'}
                >
                  <ChevronUp size={14} strokeWidth={2.5} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fr.vote_count}
                  </span>
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{fr.title}</span>
                    <StatusPill status={fr.status} />
                  </div>
                  {fr.description && (
                    <div className="crm-dim" style={{ fontSize: 12.5, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {fr.description}
                    </div>
                  )}
                  <div className="crm-caption" style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                      Submitted by <strong>{fr.submitted_by_name || 'Unknown'}</strong>
                      {fr.submitted_by_org_name ? <> at <strong>{fr.submitted_by_org_name}</strong></> : null}
                    </span>
                    <span>·</span>
                    <span>{formatDate(fr.created_at)}</span>
                    <span>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MessageSquare size={11} /> {fr.comment_count}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New feature request</DialogTitle>
            <DialogDescription>Tell us what you&apos;d love to see in Tourify.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="A short, clear summary"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What problem does this solve? Who would benefit?"
                rows={5}
                className="crm-input"
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
                  minHeight: 96,
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              className="crm-btn primary"
              onClick={handleCreate}
              disabled={createMutation.isPending || !newTitle.trim()}
            >
              {createMutation.isPending ? 'Submitting…' : 'Submit request'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
