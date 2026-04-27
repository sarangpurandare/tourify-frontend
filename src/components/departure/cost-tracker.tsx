'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { DepartureCost, CostSummary } from '@/types/cost';
import type { Vendor } from '@/types/vendor';
import { COST_CATEGORIES, COST_CATEGORY_LABELS, COST_STATUSES, COST_STATUS_LABELS } from '@/types/cost';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Helpers ─────────────────────────────────── */

function formatCurrency(cents: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString()}`;
  }
}

function costStatusColor(status: string) {
  switch (status) {
    case 'estimated': return '';
    case 'confirmed': return 'blue';
    case 'paid': return 'green';
    case 'cancelled': return 'pink';
    default: return '';
  }
}

/* ─── Component ───────────────────────────────── */

export function CostTracker({ departureId }: { departureId: string }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editCost, setEditCost] = useState<DepartureCost | null>(null);

  /* ─── Queries ─────────────────────────────── */

  const { data: costsData, isLoading: costsLoading } = useQuery({
    queryKey: ['departure-costs', departureId],
    queryFn: () => api.get<APIResponse<DepartureCost[]>>(`/departures/${departureId}/costs`),
    enabled: !!departureId,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['departure-costs-summary', departureId],
    queryFn: () => api.get<APIResponse<CostSummary>>(`/departures/${departureId}/costs/summary`),
    enabled: !!departureId,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => api.get<APIResponse<Vendor[]>>('/vendors?per_page=200'),
  });

  const costs = costsData?.data ?? [];
  const summary = summaryData?.data;
  const vendors = (vendorsData as unknown as { data: Vendor[]; meta?: unknown })?.data ?? [];

  /* ─── Mutations ───────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post(`/departures/${departureId}/costs`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-costs', departureId] });
      queryClient.invalidateQueries({ queryKey: ['departure-costs-summary', departureId] });
      setAddOpen(false);
      toast.success('Cost added');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to add cost'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/departures/${departureId}/costs/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-costs', departureId] });
      queryClient.invalidateQueries({ queryKey: ['departure-costs-summary', departureId] });
      setEditCost(null);
      toast.success('Cost updated');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to update cost'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/departures/${departureId}/costs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-costs', departureId] });
      queryClient.invalidateQueries({ queryKey: ['departure-costs-summary', departureId] });
      toast.success('Cost deleted');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to delete cost'); },
  });

  /* ─── Group costs by category ─────────────── */

  const grouped = costs.reduce<Record<string, DepartureCost[]>>((acc, cost) => {
    if (!acc[cost.category]) acc[cost.category] = [];
    acc[cost.category].push(cost);
    return acc;
  }, {});

  /* ─── Render ──────────────────────────────── */

  if (costsLoading || summaryLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading costs...</span></div>;
  }

  const currency = summary?.currency || 'INR';
  const profit = summary?.profit_cents ?? 0;
  const isProfit = profit >= 0;

  return (
    <div>
      {/* ─── Summary Cards ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
          <div className="crm-caption" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingUp size={12} /> Revenue
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {summary ? formatCurrency(summary.total_revenue_cents, currency) : '--'}
          </div>
          <div className="crm-caption" style={{ marginTop: 4 }}>from bookings</div>
        </div>
        <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
          <div className="crm-caption" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingDown size={12} /> Total Costs
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--crm-amber)' }}>
            {summary ? formatCurrency(summary.total_costs_cents, currency) : '--'}
          </div>
          <div className="crm-caption" style={{ marginTop: 4 }}>{costs.length} items</div>
        </div>
        <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
          <div className="crm-caption" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <DollarSign size={12} /> Profit
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isProfit ? 'var(--crm-green)' : 'var(--crm-pink)' }}>
            {summary ? formatCurrency(Math.abs(profit), currency) : '--'}
          </div>
          <div className="crm-caption" style={{ marginTop: 4 }}>{isProfit ? 'profit' : 'loss'}</div>
        </div>
        <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
          <div className="crm-caption" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <PieChart size={12} /> Margin
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isProfit ? 'var(--crm-green)' : 'var(--crm-pink)' }}>
            {summary ? `${summary.margin_percent.toFixed(1)}%` : '--'}
          </div>
          <div className="crm-caption" style={{ marginTop: 4 }}>profit margin</div>
        </div>
      </div>

      {/* ─── Actions ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cost Breakdown</h3>
        <button className="crm-btn primary sm" onClick={() => setAddOpen(true)}>
          <Plus size={13} /> Add Cost
        </button>
      </div>

      {/* ─── Cost List (grouped by category) ── */}
      {costs.length === 0 ? (
        <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
          <DollarSign size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No costs tracked yet</div>
          <div className="crm-caption" style={{ marginBottom: 16 }}>Add costs to track profitability for this departure.</div>
          <button className="crm-btn primary" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add First Cost
          </button>
        </div>
      ) : (
        <div className="crm-card">
          {Object.entries(grouped).map(([category, items]) => {
            const categoryTotal = items.reduce((sum, c) => sum + c.amount_cents * c.quantity, 0);
            return (
              <div key={category} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--crm-bg-2)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {COST_CATEGORY_LABELS[category] || category}
                    <span className="crm-caption" style={{ marginLeft: 8 }}>({items.length})</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {formatCurrency(categoryTotal, currency)}
                  </div>
                </div>

                {/* Items */}
                {items.map((cost) => (
                  <div key={cost.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto auto auto',
                    gap: 12, padding: '10px 16px', alignItems: 'center',
                    borderBottom: '1px solid var(--crm-hairline)',
                    fontSize: 13,
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{cost.description}</div>
                      <div className="crm-caption" style={{ marginTop: 2 }}>
                        {cost.vendor_name && <span>{cost.vendor_name} &middot; </span>}
                        {cost.is_per_person && <span>per person &middot; </span>}
                        {cost.quantity > 1 && <span>qty {cost.quantity} &middot; </span>}
                        {cost.paid_date && <span>paid {new Date(cost.paid_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                    <div>
                      <span className={`crm-pill ${costStatusColor(cost.status)}`}>
                        <span className="dot" />{COST_STATUS_LABELS[cost.status] || cost.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, textAlign: 'right', minWidth: 100 }}>
                      {formatCurrency(cost.amount_cents * cost.quantity, cost.currency)}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="crm-btn ghost sm"
                        style={{ padding: '4px 6px' }}
                        title="Edit"
                        onClick={() => setEditCost(cost)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="crm-btn ghost sm"
                        style={{ padding: '4px 6px', color: 'var(--crm-pink)' }}
                        title="Delete"
                        onClick={() => {
                          if (confirm('Delete this cost?')) {
                            deleteMutation.mutate(cost.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Category breakdown (from summary) ── */}
      {summary && summary.costs_by_category && summary.costs_by_category.length > 0 && (
        <div className="crm-card crm-card-pad" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Cost Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.costs_by_category.map((cat) => {
              const pct = summary.total_costs_cents > 0
                ? Math.round((cat.total_cents / summary.total_costs_cents) * 100)
                : 0;
              return (
                <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 120, fontSize: 12, fontWeight: 500 }}>
                    {COST_CATEGORY_LABELS[cat.category] || cat.category}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="crm-progress" style={{ height: 6 }}>
                      <span style={{ width: `${pct}%`, background: 'var(--crm-accent)' }} />
                    </div>
                  </div>
                  <div style={{ width: 50, fontSize: 11, textAlign: 'right', color: 'var(--crm-text-3)' }}>
                    {pct}%
                  </div>
                  <div style={{ width: 90, fontSize: 12, textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(cat.total_cents, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Add/Edit Dialog ────────────────── */}
      <CostDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        vendors={vendors}
        onSubmit={(body) => createMutation.mutate(body)}
        submitting={createMutation.isPending}
        title="Add Cost"
      />

      <CostDialog
        open={!!editCost}
        onOpenChange={(v) => { if (!v) setEditCost(null); }}
        vendors={vendors}
        cost={editCost ?? undefined}
        onSubmit={(body) => {
          if (editCost) updateMutation.mutate({ id: editCost.id, body });
        }}
        submitting={updateMutation.isPending}
        title="Edit Cost"
      />
    </div>
  );
}

/* ─── CostDialog ──────────────────────────────── */

function CostDialog({ open, onOpenChange, vendors, cost, onSubmit, submitting, title }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendors: Vendor[];
  cost?: DepartureCost;
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
  title: string;
}) {
  const [form, setForm] = useState<{
    category: string;
    description: string;
    amount_cents: string;
    currency: string;
    vendor_id: string;
    is_per_person: boolean;
    quantity: string;
    status: string;
    paid_date: string;
    invoice_reference: string;
    notes: string;
  }>({
    category: cost?.category || 'miscellaneous',
    description: cost?.description || '',
    amount_cents: cost ? String(cost.amount_cents) : '',
    currency: cost?.currency || 'INR',
    vendor_id: cost?.vendor_id || '',
    is_per_person: cost?.is_per_person || false,
    quantity: cost ? String(cost.quantity) : '1',
    status: cost?.status || 'estimated',
    paid_date: cost?.paid_date ? cost.paid_date.split('T')[0] : '',
    invoice_reference: cost?.invoice_reference || '',
    notes: cost?.notes || '',
  });

  // Sync form when cost prop changes (edit mode)
  useEffect(() => {
    if (open) {
      setForm({
        category: cost?.category || 'miscellaneous',
        description: cost?.description || '',
        amount_cents: cost ? String(cost.amount_cents) : '',
        currency: cost?.currency || 'INR',
        vendor_id: cost?.vendor_id || '',
        is_per_person: cost?.is_per_person || false,
        quantity: cost ? String(cost.quantity) : '1',
        status: cost?.status || 'estimated',
        paid_date: cost?.paid_date ? cost.paid_date.split('T')[0] : '',
        invoice_reference: cost?.invoice_reference || '',
        notes: cost?.notes || '',
      });
    }
  }, [open, cost?.id]);

  function handleSubmit() {
    if (!form.category || !form.description || !form.amount_cents) return;
    onSubmit({
      category: form.category,
      description: form.description,
      amount_cents: Number(form.amount_cents),
      currency: form.currency || 'INR',
      vendor_id: form.vendor_id || undefined,
      is_per_person: form.is_per_person,
      quantity: Number(form.quantity) || 1,
      status: form.status,
      paid_date: form.paid_date || undefined,
      invoice_reference: form.invoice_reference || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        setForm({
          category: 'miscellaneous', description: '', amount_cents: '', currency: 'INR',
          vendor_id: '', is_per_person: false, quantity: '1', status: 'estimated',
          paid_date: '', invoice_reference: '', notes: '',
        });
      }
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Track a cost for this departure.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => { if (v) setForm(p => ({ ...p, category: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{COST_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => { if (v) setForm(p => ({ ...p, status: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{COST_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Hotel booking for 3 nights" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Amount (paise) *</Label>
              <Input type="number" value={form.amount_cents} onChange={(e) => setForm(p => ({ ...p, amount_cents: e.target.value }))} placeholder="e.g. 500000" />
            </div>
            <div className="grid gap-2">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))} min="1" />
            </div>
            <div className="grid gap-2">
              <Label>Per person?</Label>
              <div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_per_person}
                    onChange={(e) => setForm(p => ({ ...p, is_per_person: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  Per person
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Vendor (optional)</Label>
              <Select value={form.vendor_id || '_none'} onValueChange={(v) => { setForm(p => ({ ...p, vendor_id: v === '_none' ? '' : (v ?? '') })); }}>
                <SelectTrigger><SelectValue placeholder="No vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No vendor</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Paid date</Label>
              <Input type="date" value={form.paid_date} onChange={(e) => setForm(p => ({ ...p, paid_date: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Invoice reference</Label>
            <Input value={form.invoice_reference} onChange={(e) => setForm(p => ({ ...p, invoice_reference: e.target.value }))} placeholder="Invoice # or reference" />
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8,
                border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
                color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical',
              }}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            className="crm-btn primary"
            onClick={handleSubmit}
            disabled={submitting || !form.category || !form.description || !form.amount_cents}
          >
            {submitting ? 'Saving...' : cost ? 'Update Cost' : 'Add Cost'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
