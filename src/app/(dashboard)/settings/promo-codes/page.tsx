'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { APIResponse } from '@/types/api';
import type { PromoCode, PromoCodeRedemption } from '@/types/promo';
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
  Tag,
  Percent,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Users,
  ArrowLeft,
  Copy,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Helpers ─────────────────────────────────── */

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusInfo(promo: PromoCode): { label: string; className: string } {
  if (!promo.is_active) return { label: 'Inactive', className: 'crm-pill' };
  const now = new Date();
  if (promo.valid_until && new Date(promo.valid_until) < now)
    return { label: 'Expired', className: 'crm-pill pink' };
  if (promo.valid_from && new Date(promo.valid_from) > now)
    return { label: 'Scheduled', className: 'crm-pill blue' };
  if (promo.max_uses && promo.current_uses >= promo.max_uses)
    return { label: 'Exhausted', className: 'crm-pill' };
  return { label: 'Active', className: 'crm-pill green' };
}

/* ─── Page ─────────────────────────────────────── */

export default function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [redemptionsOpen, setRedemptionsOpen] = useState(false);
  const [viewingPromoId, setViewingPromoId] = useState<string | null>(null);

  /* ─── Queries ─────────────────────────────────── */

  const promosQuery = useQuery({
    queryKey: ['promo-codes', search, filterActive],
    queryFn: () => {
      let path = '/promo-codes?per_page=100';
      if (search) path += `&search=${encodeURIComponent(search)}`;
      if (filterActive !== 'all') path += `&is_active=${filterActive}`;
      return api.get<APIResponse<PromoCode[]>>(path);
    },
  });

  const promos = promosQuery.data?.data ?? [];

  const redemptionsQuery = useQuery({
    queryKey: ['promo-redemptions', viewingPromoId],
    queryFn: () =>
      api.get<APIResponse<PromoCodeRedemption[]>>(
        `/promo-codes/${viewingPromoId}/redemptions`
      ),
    enabled: !!viewingPromoId,
  });

  /* ─── Mutations ───────────────────────────────── */

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<PromoCode>>('/promo-codes', body),
    onSuccess: () => {
      toast.success('Promo code created');
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create promo code');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put<APIResponse<PromoCode>>(`/promo-codes/${id}`, body),
    onSuccess: () => {
      toast.success('Promo code updated');
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setEditOpen(false);
      setEditingPromo(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update promo code');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/promo-codes/${id}`),
    onSuccess: () => {
      toast.success('Promo code deactivated');
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deactivate promo code');
    },
  });

  /* ─── Handlers ──────────────────────────────── */

  function openEdit(promo: PromoCode) {
    setEditingPromo(promo);
    setEditOpen(true);
  }

  function openRedemptions(promoId: string) {
    setViewingPromoId(promoId);
    setRedemptionsOpen(true);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  }

  /* ─── Render ────────────────────────────────── */

  return (
    <div>
      <div style={{ padding: '24px 24px 0' }}>
        <Link
          href="/settings"
          className="crm-btn ghost sm"
          style={{ marginBottom: 12, textDecoration: 'none', display: 'inline-flex' }}
        >
          <ArrowLeft size={14} /> Back to Settings
        </Link>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <h1 className="crm-display" style={{ marginBottom: 4 }}>
              Promo Codes
            </h1>
            <p className="crm-dim" style={{ fontSize: 14, marginBottom: 0 }}>
              Create and manage discount codes for bookings
            </p>
          </div>
          <button
            className="crm-btn primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={14} /> Create Code
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderBottom: '1px solid var(--crm-hairline)',
        }}
      >
        <Input
          placeholder="Search codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <Select value={filterActive} onValueChange={(v) => { if (v) setFilterActive(v); }}>
          <SelectTrigger style={{ width: 140 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Codes</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div style={{ padding: 24 }}>
        {promosQuery.isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Loading promo codes...</span>
          </div>
        ) : promos.length === 0 ? (
          <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
            <Tag
              size={36}
              style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }}
            />
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              No promo codes yet
            </div>
            <div
              className="crm-caption"
              style={{ marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}
            >
              Create promo codes for early bird discounts, referrals, or group bookings.
            </div>
            <button
              className="crm-btn primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} /> Create First Code
            </button>
          </div>
        ) : (
          <div className="crm-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--crm-hairline)',
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Code</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Discount</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Usage</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Valid Period</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => {
                  const status = getStatusInfo(promo);
                  return (
                    <tr
                      key={promo.id}
                      style={{ borderBottom: '1px solid var(--crm-hairline)' }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code
                            style={{
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: 13,
                              fontWeight: 600,
                              background: 'var(--crm-surface)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              letterSpacing: '0.5px',
                            }}
                          >
                            {promo.code}
                          </code>
                          <button
                            className="crm-btn ghost sm"
                            onClick={() => copyCode(promo.code)}
                            title="Copy code"
                            style={{ padding: '2px 4px' }}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>
                      <td
                        style={{ padding: '12px 14px', color: 'var(--crm-text-3)' }}
                      >
                        {promo.description || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {promo.discount_type === 'percentage' ? (
                            <>
                              <Percent size={12} style={{ color: 'var(--crm-text-4)' }} />
                              {promo.discount_value}%
                            </>
                          ) : (
                            <>
                              <Zap size={12} style={{ color: 'var(--crm-text-4)' }} />
                              {formatCurrency(promo.discount_value * 100)}
                            </>
                          )}
                          {promo.max_discount_cents && promo.discount_type === 'percentage' && (
                            <span
                              className="crm-caption"
                              style={{ fontSize: 11, marginLeft: 4 }}
                            >
                              (max {formatCurrency(promo.max_discount_cents)})
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          className="crm-btn ghost sm"
                          onClick={() => openRedemptions(promo.id)}
                          style={{ padding: '2px 6px', gap: 4 }}
                        >
                          <Users size={12} />
                          {promo.current_uses}
                          {promo.max_uses != null && `/${promo.max_uses}`}
                        </button>
                      </td>
                      <td
                        style={{ padding: '12px 14px', fontSize: 12 }}
                        className="crm-caption"
                      >
                        {promo.valid_from || promo.valid_until ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} />
                            {promo.valid_from ? formatDate(promo.valid_from) : '...'}
                            {' - '}
                            {promo.valid_until ? formatDate(promo.valid_until) : '...'}
                          </span>
                        ) : (
                          'No limit'
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="crm-btn ghost sm"
                            onClick={() => openEdit(promo)}
                            title="Edit"
                            style={{ padding: '4px 6px' }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="crm-btn ghost sm"
                            onClick={() => {
                              if (
                                confirm(
                                  `Deactivate promo code "${promo.code}"?`
                                )
                              ) {
                                deleteMutation.mutate(promo.id);
                              }
                            }}
                            title="Deactivate"
                            style={{
                              padding: '4px 6px',
                              color: 'var(--crm-pink, #e11d48)',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create Dialog ─────────────────────────── */}
      <PromoFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Promo Code"
        onSubmit={(body) => createMutation.mutate(body)}
        submitting={createMutation.isPending}
      />

      {/* ─── Edit Dialog ──────────────────────────── */}
      {editingPromo && (
        <PromoFormDialog
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditingPromo(null);
          }}
          title="Edit Promo Code"
          initial={editingPromo}
          onSubmit={(body) =>
            updateMutation.mutate({ id: editingPromo.id, body })
          }
          submitting={updateMutation.isPending}
        />
      )}

      {/* ─── Redemptions Dialog ───────────────────── */}
      <Dialog
        open={redemptionsOpen}
        onOpenChange={(v) => {
          setRedemptionsOpen(v);
          if (!v) setViewingPromoId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Redemptions</DialogTitle>
            <DialogDescription>
              Bookings that used this promo code.
            </DialogDescription>
          </DialogHeader>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {redemptionsQuery.isLoading ? (
              <div style={{ padding: 20, textAlign: 'center' }} className="crm-caption">
                Loading...
              </div>
            ) : (redemptionsQuery.data?.data ?? []).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center' }} className="crm-caption">
                No redemptions yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
                      Traveller
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
                      Trip
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
                      Discount
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(redemptionsQuery.data?.data ?? []).map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid var(--crm-hairline)' }}
                    >
                      <td style={{ padding: '8px 10px' }}>{r.traveller_name || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{r.trip_name || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {formatCurrency(r.discount_applied_cents)}
                      </td>
                      <td style={{ padding: '8px 10px' }} className="crm-caption">
                        {formatDate(r.redeemed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── PromoFormDialog ─────────────────────────── */

function PromoFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial?: PromoCode;
  onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [discountType, setDiscountType] = useState<string>(
    initial?.discount_type ?? 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initial?.discount_value?.toString() ?? ''
  );
  const [maxUses, setMaxUses] = useState<string>(initial?.max_uses?.toString() ?? '');
  const [minBookingAmount, setMinBookingAmount] = useState<string>(
    initial?.min_booking_amount_cents
      ? (initial.min_booking_amount_cents / 100).toString()
      : ''
  );
  const [maxDiscount, setMaxDiscount] = useState<string>(
    initial?.max_discount_cents ? (initial.max_discount_cents / 100).toString() : ''
  );
  const [validFrom, setValidFrom] = useState<string>(
    initial?.valid_from ? initial.valid_from.slice(0, 16) : ''
  );
  const [validUntil, setValidUntil] = useState<string>(
    initial?.valid_until ? initial.valid_until.slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function resetOnOpen() {
    setCode(initial?.code ?? '');
    setDescription(initial?.description ?? '');
    setDiscountType(initial?.discount_type ?? 'percentage');
    setDiscountValue(initial?.discount_value?.toString() ?? '');
    setMaxUses(initial?.max_uses?.toString() ?? '');
    setMinBookingAmount(
      initial?.min_booking_amount_cents
        ? (initial.min_booking_amount_cents / 100).toString()
        : ''
    );
    setMaxDiscount(
      initial?.max_discount_cents ? (initial.max_discount_cents / 100).toString() : ''
    );
    setValidFrom(initial?.valid_from ? initial.valid_from.slice(0, 16) : '');
    setValidUntil(initial?.valid_until ? initial.valid_until.slice(0, 16) : '');
    setIsActive(initial?.is_active ?? true);
  }

  function handleSubmit() {
    const body: Record<string, unknown> = {
      code: code.toUpperCase().trim(),
      description: description.trim() || undefined,
      discount_type: discountType,
      discount_value: parseInt(discountValue) || 0,
      is_active: isActive,
    };
    if (maxUses) body.max_uses = parseInt(maxUses);
    if (minBookingAmount)
      body.min_booking_amount_cents = Math.round(parseFloat(minBookingAmount) * 100);
    if (maxDiscount)
      body.max_discount_cents = Math.round(parseFloat(maxDiscount) * 100);
    if (validFrom) body.valid_from = new Date(validFrom).toISOString();
    if (validUntil) body.valid_until = new Date(validUntil).toISOString();
    onSubmit(body);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetOnOpen();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initial
              ? 'Update promo code details.'
              : 'Create a new promo code for discounts.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Code */}
          <div className="grid gap-2">
            <Label>Code *</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. EARLYBIRD20"
                style={{ fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1px' }}
              />
              {!initial && (
                <button
                  className="crm-btn ghost sm"
                  onClick={() => setCode(generateCode())}
                  title="Auto-generate"
                  type="button"
                  style={{ flexShrink: 0 }}
                >
                  <Zap size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Early bird 20% off"
            />
          </div>

          {/* Discount type + value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(v) => { if (v) setDiscountType(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                Value {discountType === 'percentage' ? '(%)' : '(amount)'}
              </Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '500'}
                min={1}
                max={discountType === 'percentage' ? 100 : undefined}
              />
            </div>
          </div>

          {/* Max uses + min booking */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Max Uses</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min={1}
              />
            </div>
            <div className="grid gap-2">
              <Label>Min Booking Amount</Label>
              <Input
                type="number"
                value={minBookingAmount}
                onChange={(e) => setMinBookingAmount(e.target.value)}
                placeholder="No minimum"
                min={0}
              />
            </div>
          </div>

          {/* Max discount cap (only for percentage) */}
          {discountType === 'percentage' && (
            <div className="grid gap-2">
              <Label>Max Discount Cap (amount)</Label>
              <Input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="No cap"
                min={0}
              />
            </div>
          )}

          {/* Validity dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Valid From</Label>
              <Input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valid Until</Label>
              <Input
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="grid gap-2">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (code can be used)
            </label>
          </div>
        </div>
        <DialogFooter>
          <button
            className="crm-btn primary"
            onClick={handleSubmit}
            disabled={submitting || !code.trim() || !discountValue}
          >
            {submitting
              ? 'Saving...'
              : initial
                ? 'Save Changes'
                : 'Create Code'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
