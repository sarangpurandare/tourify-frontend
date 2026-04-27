'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { APIResponse } from '@/types/api';
import type {
  DepartureChecklistItem,
  ChecklistSummary,
  TravellerChecklistSummary,
} from '@/types/checklist';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ListChecks,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Settings2,
  User,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Helpers ──────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'var(--crm-text-3)', bg: '' },
  in_progress: { label: 'In Progress', color: 'var(--crm-accent)', bg: 'blue' },
  completed: { label: 'Completed', color: 'var(--crm-green)', bg: 'green' },
  skipped: { label: 'Skipped', color: 'var(--crm-text-4)', bg: '' },
  blocked: { label: 'Blocked', color: 'var(--crm-pink, #e11d48)', bg: 'pink' },
};

const CATEGORY_LABELS: Record<string, string> = {
  logistics: 'Logistics',
  preparation: 'Preparation',
  operations: 'Operations',
  post_trip: 'Post Trip',
  general: 'General',
};

const CATEGORY_ORDER = ['logistics', 'preparation', 'operations', 'post_trip', 'general'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

function isDueSoon(dueDate?: string): boolean {
  if (!dueDate) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 3 * 86400000;
}

function dueDateColor(dueDate?: string): string {
  if (!dueDate) return 'var(--crm-text-3)';
  if (isOverdue(dueDate)) return 'var(--crm-pink, #e11d48)';
  if (isDueSoon(dueDate)) return 'var(--crm-amber, #f59e0b)';
  return 'var(--crm-text-3)';
}

/* ─── Main Component ───────────────────────────── */

export function OperationsChecklist({ departureId }: { departureId: string }) {
  const queryClient = useQueryClient();
  // Base path for all departure checklist endpoints
  const clBase = `/departures/${departureId}/checklist`;

  const [scopeFilter, setScopeFilter] = useState<'departure' | 'traveller'>('departure');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [travellerFilter, setTravellerFilter] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskCategory, setAddTaskCategory] = useState('general');

  /* ─── Queries ────────────────────────────────── */

  const summaryQuery = useQuery({
    queryKey: ['departure-checklist-summary', departureId],
    queryFn: () => api.get<APIResponse<ChecklistSummary>>(`${clBase}/summary`),
    enabled: !!departureId,
  });

  const travellerSummaryQuery = useQuery({
    queryKey: ['departure-checklist-traveller-summary', departureId],
    queryFn: () =>
      api.get<APIResponse<TravellerChecklistSummary[]>>(`${clBase}/traveller-summary`),
    enabled: !!departureId && scopeFilter === 'traveller',
  });

  const itemsParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('scope', scopeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (travellerFilter) params.set('traveller_id', travellerFilter);
    return params.toString();
  }, [scopeFilter, statusFilter, travellerFilter]);

  const itemsQuery = useQuery({
    queryKey: ['departure-checklist-items', departureId, itemsParams],
    queryFn: () =>
      api.get<APIResponse<DepartureChecklistItem[]>>(`${clBase}?${itemsParams}`),
    enabled: !!departureId,
  });

  const summary = summaryQuery.data?.data;
  const travellerSummaries = travellerSummaryQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  const isEmpty = !summaryQuery.isLoading && summary && summary.total === 0;

  /* ─── Mutations ──────────────────────────────── */

  const initializeMutation = useMutation({
    mutationFn: () =>
      api.post<APIResponse<{ items_created: number }>>(`${clBase}/initialize`),
    onSuccess: (res) => {
      toast.success(`Checklists initialized: ${res.data.items_created} items created`);
      invalidateAll();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to initialize checklists');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) => {
      return api.patch<APIResponse<null>>(`${clBase}/items/${itemId}/status`, { status });
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update status');
      invalidateAll();
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: Record<string, unknown> }) => {
      return api.put<APIResponse<null>>(`${clBase}/items/${itemId}`, body);
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => {
      return api.delete<APIResponse<null>>(`${clBase}/items/${itemId}`);
    },
    onSuccess: () => {
      toast.success('Item deleted');
      invalidateAll();
      setExpandedItemId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete item');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      return api.post<APIResponse<DepartureChecklistItem>>(`${clBase}/items`, body);
    },
    onSuccess: () => {
      toast.success('Task added');
      invalidateAll();
      setAddTaskOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add task');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ item_ids, status }: { item_ids: string[]; status: string }) =>
      api.patch(`${clBase}/bulk-status`, { item_ids, status }),
    onSuccess: () => {
      toast.success('Items updated');
      invalidateAll();
      setSelectedItems(new Set());
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update items');
    },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['departure-checklist-summary', departureId] });
    queryClient.invalidateQueries({ queryKey: ['departure-checklist-traveller-summary', departureId] });
    queryClient.invalidateQueries({ queryKey: ['departure-checklist-items', departureId] });
  }

  /* ─── Optimistic checkbox toggle ──────────────── */

  const toggleStatus = useCallback(
    (item: DepartureChecklistItem) => {
      const newStatus = item.status === 'completed' ? 'pending' : 'completed';

      // Optimistic update
      queryClient.setQueryData(
        ['departure-checklist-items', departureId, itemsParams],
        (old: APIResponse<DepartureChecklistItem[]> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((i) =>
              i.id === item.id ? { ...i, status: newStatus as DepartureChecklistItem['status'] } : i
            ),
          };
        }
      );

      statusMutation.mutate({ itemId: item.id, status: newStatus });
    },
    [departureId, itemsParams, queryClient, statusMutation]
  );

  /* ─── Selection helpers ──────────────────────── */

  function toggleSelect(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(categoryItems: DepartureChecklistItem[]) {
    const allSelected = categoryItems.every((i) => selectedItems.has(i.id));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      categoryItems.forEach((i) => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  }

  /* ─── Group items by category ────────────────── */

  const groupedItems = useMemo(() => {
    const groups: Record<string, DepartureChecklistItem[]> = {};
    items.forEach((item) => {
      const cat = item.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    // Sort by category order
    const sorted: [string, DepartureChecklistItem[]][] = [];
    CATEGORY_ORDER.forEach((cat) => {
      if (groups[cat]) sorted.push([cat, groups[cat]]);
    });
    // Add any categories not in CATEGORY_ORDER
    Object.keys(groups).forEach((cat) => {
      if (!CATEGORY_ORDER.includes(cat)) sorted.push([cat, groups[cat]]);
    });
    return sorted;
  }, [items]);

  /* ─── Category toggle ────────────────────────── */

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  /* ─── Computed summary stats ─────────────────── */

  const localSummary = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === 'completed').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const inProgress = items.filter((i) => i.status === 'in_progress').length;
    const blocked = items.filter((i) => i.status === 'blocked').length;
    return { total, completed, pending, inProgress, blocked };
  }, [items]);

  /* ─── Render ─────────────────────────────────── */

  return (
    <div>
      {/* Empty state / Initialize */}
      {isEmpty && (
        <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
          <ListChecks
            size={36}
            style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }}
          />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            No checklists initialized
          </div>
          <div className="crm-caption" style={{ marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Click &quot;Initialize Checklists&quot; to set up operational tasks from your templates.
          </div>
          <button
            className="crm-btn primary"
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            <ListChecks size={14} />
            {initializeMutation.isPending ? 'Initializing...' : 'Initialize Checklists'}
          </button>
          <div style={{ marginTop: 16 }}>
            <Link
              href="/settings/checklists"
              className="crm-caption"
              style={{ color: 'var(--crm-accent)', textDecoration: 'none', fontSize: 12 }}
            >
              <Settings2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Manage Templates
            </Link>
          </div>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Summary bar + actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {summary && (
                <>
                  <span
                    className="crm-pill green"
                    style={{ fontSize: 12 }}
                  >
                    {summary.completed}/{summary.total} completed
                  </span>
                  {summary.pending > 0 && (
                    <span className="crm-pill" style={{ fontSize: 12 }}>
                      {summary.pending} pending
                    </span>
                  )}
                  {summary.in_progress > 0 && (
                    <span className="crm-pill blue" style={{ fontSize: 12 }}>
                      {summary.in_progress} in progress
                    </span>
                  )}
                  {summary.blocked > 0 && (
                    <span className="crm-pill pink" style={{ fontSize: 12 }}>
                      {summary.blocked} blocked
                    </span>
                  )}
                  {summary.required > 0 && summary.required_completed < summary.required && (
                    <span style={{ fontSize: 12, color: 'var(--crm-amber, #f59e0b)' }}>
                      {summary.required - summary.required_completed} required remaining
                    </span>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="crm-btn ghost sm"
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                title="Re-initialize from templates"
              >
                <ListChecks size={13} />
                {initializeMutation.isPending ? 'Initializing...' : 'Re-initialize'}
              </button>
              <Link
                href="/settings/checklists"
                className="crm-btn ghost sm"
                style={{ textDecoration: 'none' }}
              >
                <Settings2 size={13} /> Templates
              </Link>
            </div>
          </div>

          {/* Progress bar */}
          {summary && summary.total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--crm-bg-active)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((summary.completed / summary.total) * 100)}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: 'var(--crm-green)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div className="crm-caption" style={{ marginTop: 4 }}>
                {Math.round((summary.completed / summary.total) * 100)}% complete
              </div>
            </div>
          )}

          {/* View controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            {/* Scope toggle */}
            <div className="crm-seg">
              <button
                className={scopeFilter === 'departure' ? 'on' : ''}
                onClick={() => {
                  setScopeFilter('departure');
                  setTravellerFilter(null);
                }}
              >
                Departure Tasks
              </button>
              <button
                className={scopeFilter === 'traveller' ? 'on' : ''}
                onClick={() => setScopeFilter('traveller')}
              >
                Traveller Tasks
              </button>
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v || 'all')}
            >
              <SelectTrigger style={{ width: 150 }}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>

            {/* Traveller filter for traveller scope */}
            {scopeFilter === 'traveller' && travellerFilter && (
              <button
                className="crm-btn ghost sm"
                onClick={() => setTravellerFilter(null)}
              >
                <ArrowLeft size={13} /> All Travellers
              </button>
            )}
          </div>

          {/* Bulk actions */}
          {selectedItems.size > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'var(--crm-accent-bg)',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 600 }}>{selectedItems.size} selected</span>
              <button
                className="crm-btn primary sm"
                onClick={() =>
                  bulkStatusMutation.mutate({
                    item_ids: Array.from(selectedItems),
                    status: 'completed',
                  })
                }
                disabled={bulkStatusMutation.isPending}
              >
                <CheckCircle2 size={13} /> Mark Complete
              </button>
              <button
                className="crm-btn sm"
                onClick={() =>
                  bulkStatusMutation.mutate({
                    item_ids: Array.from(selectedItems),
                    status: 'in_progress',
                  })
                }
                disabled={bulkStatusMutation.isPending}
              >
                <Clock size={13} /> Mark In Progress
              </button>
              <button
                className="crm-btn ghost sm"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear
              </button>
            </div>
          )}

          {/* Traveller summary grid (when scope=traveller and no specific traveller selected) */}
          {scopeFilter === 'traveller' && !travellerFilter && travellerSummaries.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {travellerSummaries.map((ts) => {
                const pct = ts.total > 0 ? Math.round((ts.completed / ts.total) * 100) : 0;
                const reqRemaining = ts.required - ts.required_completed;
                return (
                  <div
                    key={ts.traveller_id}
                    className="crm-card crm-card-pad"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setTravellerFilter(ts.traveller_id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        className="crm-avatar"
                        style={{ width: 28, height: 28, fontSize: 11 }}
                      >
                        {ts.traveller_name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ts.traveller_name}
                        </div>
                      </div>
                    </div>
                    <div
                      className="crm-progress green"
                      style={{ marginBottom: 6 }}
                    >
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <span className="crm-caption">
                        {ts.completed}/{ts.total} completed
                      </span>
                      {reqRemaining > 0 && (
                        <span style={{ color: 'var(--crm-amber, #f59e0b)', fontWeight: 500 }}>
                          {reqRemaining} required
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items grouped by category */}
          {(scopeFilter === 'departure' || travellerFilter) && (
            <div className="crm-card" style={{ overflow: 'hidden' }}>
              {groupedItems.length === 0 && (
                <div
                  style={{ padding: 40, textAlign: 'center' }}
                  className="crm-caption"
                >
                  No items found for the current filters.
                </div>
              )}
              {groupedItems.map(([category, catItems]) => {
                const isCollapsed = collapsedCategories.has(category);
                const catCompleted = catItems.filter((i) => i.status === 'completed').length;
                const allSelected = catItems.every((i) => selectedItems.has(i.id));
                const someSelected =
                  !allSelected && catItems.some((i) => selectedItems.has(i.id));

                return (
                  <div key={category}>
                    {/* Category header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        background: 'var(--crm-bg-2)',
                        borderBottom: '1px solid var(--crm-hairline)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleCategory(category)}
                    >
                      <button
                        className="crm-btn ghost sm"
                        style={{ padding: 0, width: 20, height: 20, flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectAll(catItems);
                        }}
                      >
                        {allSelected ? (
                          <CheckSquare size={15} style={{ color: 'var(--crm-accent)' }} />
                        ) : someSelected ? (
                          <MinusSquare size={15} style={{ color: 'var(--crm-accent)' }} />
                        ) : (
                          <Square size={15} />
                        )}
                      </button>
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="crm-caption" style={{ fontSize: 12 }}>
                        {catCompleted}/{catItems.length} completed
                      </span>
                    </div>

                    {/* Items */}
                    {!isCollapsed &&
                      catItems.map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.has(item.id)}
                          isExpanded={expandedItemId === item.id}
                          onToggleSelect={() => toggleSelect(item.id)}
                          onToggleStatus={() => toggleStatus(item)}
                          onExpand={() =>
                            setExpandedItemId(expandedItemId === item.id ? null : item.id)
                          }
                          onUpdateItem={(body) =>
                            updateItemMutation.mutate({ itemId: item.id, body })
                          }
                          onDeleteItem={() => {
                            if (confirm('Delete this checklist item?')) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          onStatusChange={(status) =>
                            statusMutation.mutate({ itemId: item.id, status })
                          }
                          updating={updateItemMutation.isPending}
                        />
                      ))}

                    {/* Add task for this category */}
                    {!isCollapsed && (
                      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--crm-hairline)' }}>
                        <button
                          className="crm-btn ghost sm"
                          style={{ fontSize: 12 }}
                          onClick={() => {
                            setAddTaskCategory(category);
                            setAddTaskOpen(true);
                          }}
                        >
                          <Plus size={12} /> Add Task
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Traveller scope but viewing all travellers — show items below summaries */}
          {scopeFilter === 'traveller' && !travellerFilter && items.length > 0 && travellerSummaries.length === 0 && (
            <div className="crm-card" style={{ overflow: 'hidden' }}>
              {groupedItems.map(([category, catItems]) => {
                const isCollapsed = collapsedCategories.has(category);
                const catCompleted = catItems.filter((i) => i.status === 'completed').length;

                return (
                  <div key={category}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        background: 'var(--crm-bg-2)',
                        borderBottom: '1px solid var(--crm-hairline)',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCategory(category)}
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <span className="crm-caption" style={{ fontSize: 12 }}>
                        {catCompleted}/{catItems.length}
                      </span>
                    </div>
                    {!isCollapsed &&
                      catItems.map((item) => (
                        <ChecklistItemRow
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.has(item.id)}
                          isExpanded={expandedItemId === item.id}
                          onToggleSelect={() => toggleSelect(item.id)}
                          onToggleStatus={() => toggleStatus(item)}
                          onExpand={() =>
                            setExpandedItemId(expandedItemId === item.id ? null : item.id)
                          }
                          onUpdateItem={(body) =>
                            updateItemMutation.mutate({ itemId: item.id, body })
                          }
                          onDeleteItem={() => {
                            if (confirm('Delete this checklist item?')) {
                              deleteItemMutation.mutate(item.id);
                            }
                          }}
                          onStatusChange={(status) =>
                            statusMutation.mutate({ itemId: item.id, status })
                          }
                          updating={updateItemMutation.isPending}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Add Task Dialog ─────────────────────── */}
      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        category={addTaskCategory}
        scope={scopeFilter}
        travellerId={travellerFilter}
        onSubmit={(body) => addItemMutation.mutate(body)}
        submitting={addItemMutation.isPending}
      />
    </div>
  );
}

/* ─── ChecklistItemRow ─────────────────────────── */

function ChecklistItemRow({
  item,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleStatus,
  onExpand,
  onUpdateItem,
  onDeleteItem,
  onStatusChange,
  updating,
}: {
  item: DepartureChecklistItem;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleStatus: () => void;
  onExpand: () => void;
  onUpdateItem: (body: Record<string, unknown>) => void;
  onDeleteItem: () => void;
  onStatusChange: (status: string) => void;
  updating: boolean;
}) {
  const [editNotes, setEditNotes] = useState(item.notes ?? '');
  const [editDueDate, setEditDueDate] = useState(item.due_date ?? '');
  const [editAssignedTo, setEditAssignedTo] = useState(item.assigned_to ?? '');

  const isCompleted = item.status === 'completed';
  const isSkipped = item.status === 'skipped';
  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

  return (
    <div
      style={{
        borderBottom: '1px solid var(--crm-hairline)',
        background: isOverdue(item.due_date) && item.status !== 'completed' && item.status !== 'skipped'
          ? 'rgba(225,29,72,0.03)'
          : undefined,
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 22px 1fr auto auto auto auto',
          gap: 10,
          padding: '10px 16px',
          alignItems: 'center',
          fontSize: 13,
          cursor: 'pointer',
        }}
        onClick={onExpand}
      >
        {/* Select checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          style={{ cursor: 'pointer' }}
        >
          {isSelected ? (
            <CheckSquare size={15} style={{ color: 'var(--crm-accent)' }} />
          ) : (
            <Square size={15} style={{ color: 'var(--crm-text-4)' }} />
          )}
        </div>

        {/* Status checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus();
          }}
          style={{ cursor: 'pointer' }}
        >
          {isCompleted ? (
            <CheckCircle2 size={18} style={{ color: 'var(--crm-green)' }} />
          ) : item.status === 'blocked' ? (
            <Ban size={18} style={{ color: 'var(--crm-pink, #e11d48)' }} />
          ) : item.status === 'in_progress' ? (
            <Clock size={18} style={{ color: 'var(--crm-accent)' }} />
          ) : (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid var(--crm-text-4)',
              }}
            />
          )}
        </div>

        {/* Title */}
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              fontWeight: item.is_required ? 600 : 400,
              textDecoration: isSkipped ? 'line-through' : undefined,
              color: isCompleted || isSkipped ? 'var(--crm-text-3)' : 'var(--crm-text)',
            }}
          >
            {item.title}
            {item.is_required && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--crm-pink, #e11d48)',
                  marginLeft: 4,
                  fontWeight: 400,
                }}
              >
                *
              </span>
            )}
          </span>
          {item.traveller_name && (
            <span className="crm-caption" style={{ marginLeft: 8, fontSize: 11 }}>
              <User size={10} style={{ verticalAlign: 'middle', marginRight: 2 }} />
              {item.traveller_name}
            </span>
          )}
        </div>

        {/* Status pill */}
        <span
          className={`crm-pill ${statusConf.bg}`}
          style={{ fontSize: 10, flexShrink: 0 }}
        >
          <span className="dot" />
          {statusConf.label}
        </span>

        {/* Due date */}
        <span
          style={{
            fontSize: 11,
            color: item.status === 'completed' ? 'var(--crm-text-4)' : dueDateColor(item.due_date),
            flexShrink: 0,
            fontWeight: isOverdue(item.due_date) && item.status !== 'completed' ? 600 : 400,
          }}
        >
          {item.due_date ? formatDate(item.due_date) : ''}
        </span>

        {/* Assigned to */}
        <span style={{ flexShrink: 0 }}>
          {item.assigned_to_name ? (
            <span
              className="crm-avatar"
              style={{ width: 22, height: 22, fontSize: 9 }}
              title={item.assigned_to_name}
            >
              {item.assigned_to_name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          ) : (
            <span className="crm-caption" style={{ fontSize: 11 }}>
              --
            </span>
          )}
        </span>

        {/* Expand indicator */}
        <div>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 16px 16px 68px',
            borderTop: '1px solid var(--crm-hairline)',
            background: 'var(--crm-bg-2)',
          }}
        >
          {item.description && (
            <div style={{ fontSize: 13, color: 'var(--crm-text-2)', marginBottom: 12 }}>
              {item.description}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}
          >
            {/* Status dropdown */}
            <div>
              <Label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                Status
              </Label>
              <Select
                value={item.status}
                onValueChange={(v) => {
                  if (v) onStatusChange(v);
                }}
              >
                <SelectTrigger style={{ height: 32, fontSize: 12 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div>
              <Label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                Due Date
              </Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                onBlur={() => {
                  if (editDueDate !== (item.due_date ?? '')) {
                    onUpdateItem({ due_date: editDueDate || null });
                  }
                }}
                style={{ height: 32, fontSize: 12 }}
              />
            </div>

            {/* Assigned to */}
            <div>
              <Label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                Assigned To
              </Label>
              <Input
                type="text"
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                onBlur={() => {
                  if (editAssignedTo !== (item.assigned_to ?? '')) {
                    onUpdateItem({ assigned_to: editAssignedTo || null });
                  }
                }}
                placeholder="Staff ID or name"
                style={{ height: 32, fontSize: 12 }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <Label style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
              Notes
            </Label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={() => {
                if (editNotes !== (item.notes ?? '')) {
                  onUpdateItem({ notes: editNotes || null });
                }
              }}
              rows={2}
              placeholder="Add notes..."
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--crm-hairline)',
                background: 'var(--crm-bg)',
                color: 'var(--crm-text)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Meta info + Delete */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="crm-caption" style={{ fontSize: 11 }}>
              {item.completed_at && (
                <span>
                  Completed {formatDate(item.completed_at)}
                  {item.completed_by && ` by ${item.completed_by}`}
                </span>
              )}
            </div>
            <button
              className="crm-btn ghost sm"
              style={{ color: 'var(--crm-pink, #e11d48)', fontSize: 11 }}
              onClick={onDeleteItem}
              disabled={updating}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AddTaskDialog ────────────────────────────── */

function AddTaskDialog({
  open,
  onOpenChange,
  category,
  scope,
  travellerId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: string;
  scope: 'departure' | 'traveller';
  travellerId: string | null;
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [dueDate, setDueDate] = useState('');

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      scope,
      is_required: isRequired,
      due_date: dueDate || undefined,
      traveller_id: travellerId || undefined,
    });
    setTitle('');
    setDescription('');
    setIsRequired(false);
    setDueDate('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Add a custom task to {CATEGORY_LABELS[category] || category}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--crm-hairline)',
                background: 'var(--crm-bg)',
                color: 'var(--crm-text)',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Required</Label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  height: 40,
                }}
              >
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
                Required task
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            className="crm-btn primary"
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
