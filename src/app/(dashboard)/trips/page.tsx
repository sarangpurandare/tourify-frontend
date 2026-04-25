'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { TripMaster } from '@/types/trip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MapPin, Clock, Tag, Search, ImageIcon } from 'lucide-react';
import { thumbUrl } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────── */

function statusPillColor(status: string) {
  switch (status.toLowerCase()) {
    case 'published': return 'green';
    case 'draft': return 'amber';
    case 'archived': return 'red';
    default: return '';
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatPrice(cents?: number, currency?: string) {
  if (!cents) return '--';
  const amount = cents / 100;
  const curr = currency || 'INR';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${curr} ${amount.toLocaleString()}`;
  }
}

/* ─── New Trip form state ─────────────────────── */

const INITIAL_FORM = {
  name: '',
  slug: '',
  short_description: '',
  duration_days: '',
  duration_nights: '',
  base_price_cents: '',
  difficulty_level: '',
  destinations: '',
  tags: '',
};

const STATUS_OPTIONS = ['all', 'published', 'draft', 'archived'] as const;

/* ─── Page ────────────────────────────────────── */

export default function TripsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const queryParams = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
  const { data, isLoading } = useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => api.get<APIResponse<TripMaster[]>>(`/trips${queryParams}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<APIResponse<TripMaster>>('/trips', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      router.push(`/trips/${res.data.id}`);
    },
  });

  const trips = data?.data ?? [];

  // Client-side search filter
  const filtered = search
    ? trips.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.destinations ?? []).some(d => d.toLowerCase().includes(search.toLowerCase())) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      )
    : trips;

  function handleCreate() {
    if (!form.name.trim() || !form.slug.trim()) return;
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim(),
    };
    if (form.short_description) body.short_description = form.short_description;
    if (form.duration_days) body.duration_days = Number(form.duration_days);
    if (form.duration_nights) body.duration_nights = Number(form.duration_nights);
    if (form.base_price_cents) body.base_price_cents = Number(form.base_price_cents);
    if (form.difficulty_level) body.difficulty_level = Number(form.difficulty_level);
    if (form.destinations) body.destinations = form.destinations.split(',').map(s => s.trim()).filter(Boolean);
    if (form.tags) body.tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
    createMutation.mutate(body);
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="crm-title-1">Trips</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <button className="crm-btn primary">
                <Plus size={14} />
                New Trip
              </button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Trip</DialogTitle>
              <DialogDescription>Define a new trip template.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="trip-name">Name *</Label>
                <Input
                  id="trip-name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm(prev => ({ ...prev, name, slug: slugify(name) }));
                  }}
                  placeholder="e.g. Tuscany Slow"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip-slug">Slug *</Label>
                <Input
                  id="trip-slug"
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g. tuscany-slow"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip-desc">Short Description</Label>
                <Input
                  id="trip-desc"
                  value={form.short_description}
                  onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="One-line summary"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="grid gap-2">
                  <Label htmlFor="trip-days">Duration (days)</Label>
                  <Input
                    id="trip-days"
                    type="number"
                    value={form.duration_days}
                    onChange={(e) => setForm(prev => ({ ...prev, duration_days: e.target.value }))}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trip-nights">Duration (nights)</Label>
                  <Input
                    id="trip-nights"
                    type="number"
                    value={form.duration_nights}
                    onChange={(e) => setForm(prev => ({ ...prev, duration_nights: e.target.value }))}
                    placeholder="e.g. 9"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="grid gap-2">
                  <Label htmlFor="trip-price">Base Price (cents)</Label>
                  <Input
                    id="trip-price"
                    type="number"
                    value={form.base_price_cents}
                    onChange={(e) => setForm(prev => ({ ...prev, base_price_cents: e.target.value }))}
                    placeholder="e.g. 250000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trip-diff">Difficulty (1-5)</Label>
                  <Input
                    id="trip-diff"
                    type="number"
                    min="1"
                    max="5"
                    value={form.difficulty_level}
                    onChange={(e) => setForm(prev => ({ ...prev, difficulty_level: e.target.value }))}
                    placeholder="e.g. 3"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip-dest">Destinations (comma-separated)</Label>
                <Input
                  id="trip-dest"
                  value={form.destinations}
                  onChange={(e) => setForm(prev => ({ ...prev, destinations: e.target.value }))}
                  placeholder="Florence, Siena, Val d'Orcia"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trip-tags">Tags (comma-separated)</Label>
                <Input
                  id="trip-tags"
                  value={form.tags}
                  onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="slow-travel, food, culture"
                />
              </div>
            </div>
            <DialogFooter>
              <button
                className="crm-btn primary"
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.name.trim() || !form.slug.trim()}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Trip'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="crm-seg">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={statusFilter === s ? 'on' : ''}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="crm-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
          <Search size={14} style={{ color: 'var(--crm-text-3)' }} />
          <input
            type="text"
            placeholder="Search trips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--crm-text)',
              width: 200,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <span className="crm-caption">Loading trips...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <MapPin size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
          <div className="crm-caption">No trips found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filtered.map((trip) => (
            <div
              key={trip.id}
              className="crm-card"
              style={{ cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => router.push(`/trips/${trip.id}`)}
            >
              {/* Hero image */}
              {trip.hero_image_urls?.[0] ? (
                <div style={{ height: 140, overflow: 'hidden' }}>
                  <img src={thumbUrl(trip.hero_image_urls[0], 400, 200)} alt={trip.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{
                  height: 60,
                  background: 'linear-gradient(135deg, var(--crm-bg-2) 0%, var(--crm-bg-3, #e5e7eb) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ImageIcon size={20} style={{ color: 'var(--crm-text-4)' }} />
                </div>
              )}
              <div style={{ padding: 20 }}>
              {/* Status pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className={`crm-pill ${statusPillColor(trip.status)}`}>
                  <span className="dot" />
                  {trip.status}
                </span>
                {trip.difficulty_level && (
                  <span className="crm-caption">
                    Difficulty {trip.difficulty_level}/5
                  </span>
                )}
              </div>

              {/* Trip name */}
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.008em', marginBottom: 2 }}>
                {trip.name}
              </div>

              {/* Slug */}
              <div className="crm-caption" style={{ marginBottom: 8 }}>
                /{trip.slug}
              </div>

              {/* Short description */}
              {trip.short_description && (
                <div style={{ fontSize: 13, color: 'var(--crm-text-2)', marginBottom: 12, lineHeight: 1.4 }}>
                  {trip.short_description.length > 100
                    ? trip.short_description.slice(0, 100) + '...'
                    : trip.short_description}
                </div>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
                {(trip.duration_days || trip.duration_nights) && (
                  <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {trip.duration_days ? `${trip.duration_days}D` : ''}
                    {trip.duration_days && trip.duration_nights ? '/' : ''}
                    {trip.duration_nights ? `${trip.duration_nights}N` : ''}
                  </span>
                )}
                {trip.destinations && trip.destinations.length > 0 && (
                  <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} />
                    {trip.destinations.slice(0, 3).join(', ')}
                    {trip.destinations.length > 3 ? ` +${trip.destinations.length - 3}` : ''}
                  </span>
                )}
              </div>

              {/* Price & tags */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {formatPrice(trip.base_price_cents, trip.base_price_currency)}
                </span>
                {trip.tags && trip.tags.length > 0 && (
                  <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={11} />
                    {trip.tags.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
