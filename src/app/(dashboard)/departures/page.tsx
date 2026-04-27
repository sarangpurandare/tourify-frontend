'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Departure } from '@/types/departure';
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
import { Plus, Clock, Calendar, LayoutGrid, GanttChart, User, Archive, ChevronDown } from 'lucide-react';
import { EntitySearch } from '@/components/entity-search';

/* ─── Helpers ─────────────────────────────────── */

const STATUS_FILTERS = ['all', 'open', 'filling_fast', 'sold_out', 'draft', 'closed'] as const;
const ARCHIVED_STATUSES = ['completed', 'cancelled'];

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  open: 'Open',
  filling_fast: 'Filling Fast',
  sold_out: 'Sold Out',
  draft: 'Draft',
  closed: 'Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  waitlisted: 'Waitlisted',
};

function statusPillClass(status: string) {
  switch (status) {
    case 'open': return 'blue';
    case 'filling_fast': return 'amber';
    case 'sold_out': return 'green';
    case 'waitlisted': return 'purple';
    case 'draft': return '';
    case 'closed': return '';
    case 'in_progress': return 'teal';
    case 'completed': return 'green';
    case 'cancelled': return 'pink';
    default: return '';
  }
}

function statusBarColor(status: string) {
  switch (status) {
    case 'open': return 'var(--crm-blue, #0071e3)';
    case 'filling_fast': return 'var(--crm-amber, #ff9f0a)';
    case 'sold_out': return 'var(--crm-green, #248a3d)';
    case 'waitlisted': return '#5856d6';
    case 'in_progress': return 'var(--crm-teal, #007d8a)';
    case 'completed': return 'var(--crm-green, #248a3d)';
    case 'cancelled': return 'var(--crm-red, #d70015)';
    default: return 'var(--crm-text-3)';
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(startDate: string) {
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86400000);
}

function formatCurrency(cents: number, currency?: string) {
  const amount = cents / 100;
  const curr = currency || 'INR';
  try {
    if (amount >= 100000) return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0, notation: 'compact' }).format(amount);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${curr} ${amount.toLocaleString()}`;
  }
}

function quoteStatusPillClass(status?: string) {
  switch (status) {
    case 'sent': return 'blue';
    case 'accepted': return 'green';
    case 'rejected': return 'red';
    case 'expired': return '';
    case 'draft':
    default: return 'amber';
  }
}

const DAY_MS = 86400000;
const DAY_WIDTH = 4;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 48;
const LABEL_WIDTH = 180;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── Timeline component ─────────────────────── */

function Timeline({ departures, onSelect, tripPrices }: { departures: Departure[]; onSelect: (id: string) => void; tripPrices: Map<string, number> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { tripRows, timelineStart, totalDays, months, todayOffset } = useMemo(() => {
    if (departures.length === 0) return { tripRows: [], timelineStart: 0, totalDays: 0, months: [], todayOffset: -1 };

    const starts = departures.map(d => new Date(d.start_date).getTime());
    const ends = departures.map(d => new Date(d.end_date).getTime());
    const minDate = Math.min(...starts);
    const maxDate = Math.max(...ends);

    const padBefore = 14 * DAY_MS;
    const padAfter = 14 * DAY_MS;
    const rangeStart = minDate - padBefore;
    const rangeEnd = maxDate + padAfter;
    const days = Math.ceil((rangeEnd - rangeStart) / DAY_MS);

    const byTrip = new Map<string, { name: string; deps: Departure[] }>();
    departures.forEach(dep => {
      const name = dep.trip_name || 'Untitled Trip';
      if (!byTrip.has(name)) byTrip.set(name, { name, deps: [] });
      byTrip.get(name)!.deps.push(dep);
    });
    const rows = Array.from(byTrip.values()).sort((a, b) => {
      const aMin = Math.min(...a.deps.map(d => new Date(d.start_date).getTime()));
      const bMin = Math.min(...b.deps.map(d => new Date(d.start_date).getTime()));
      return aMin - bMin;
    });

    const ms: { label: string; offset: number; width: number }[] = [];
    const startD = new Date(rangeStart);
    let cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (cursor.getTime() < rangeEnd) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const mStart = Math.max(cursor.getTime(), rangeStart);
      const mEnd = Math.min(nextMonth.getTime(), rangeEnd);
      const offset = Math.floor((mStart - rangeStart) / DAY_MS) * DAY_WIDTH;
      const width = Math.floor((mEnd - mStart) / DAY_MS) * DAY_WIDTH;
      ms.push({ label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`, offset, width });
      cursor = nextMonth;
    }

    const today = (Date.now() - rangeStart) / DAY_MS * DAY_WIDTH;

    return { tripRows: rows, timelineStart: rangeStart, totalDays: days, months: ms, todayOffset: today };
  }, [departures]);

  if (departures.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Calendar size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
        <div className="crm-caption">No departures found</div>
      </div>
    );
  }

  const timelineWidth = totalDays * DAY_WIDTH;
  const contentHeight = tripRows.length * ROW_HEIGHT;

  return (
    <div className="crm-card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {/* Fixed trip name column */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1px solid var(--crm-hairline)' }}>
          <div style={{
            height: HEADER_HEIGHT,
            padding: '0 16px',
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--crm-hairline)',
            background: 'var(--crm-bg-2)',
          }}>
            <span className="crm-eyebrow">Trip</span>
          </div>
          {tripRows.map((row, i) => (
            <div
              key={row.name}
              style={{
                height: ROW_HEIGHT,
                padding: '0 16px',
                display: 'flex', alignItems: 'center',
                borderBottom: i < tripRows.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={row.name}
            >
              {row.name}
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Month headers */}
            <div style={{
              height: HEADER_HEIGHT,
              position: 'relative',
              borderBottom: '1px solid var(--crm-hairline)',
              background: 'var(--crm-bg-2)',
            }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: m.offset,
                    width: m.width,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    borderLeft: '1px solid var(--crm-hairline)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--crm-text-2)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Rows with bars */}
            <div style={{ position: 'relative', height: contentHeight }}>
              {/* Month vertical gridlines */}
              {months.map((m, i) => (
                <div
                  key={`grid-${i}`}
                  style={{
                    position: 'absolute',
                    left: m.offset,
                    top: 0,
                    bottom: 0,
                    width: 1,
                    background: 'var(--crm-hairline)',
                  }}
                />
              ))}

              {/* Row backgrounds */}
              {tripRows.map((_, i) => (
                <div
                  key={`row-bg-${i}`}
                  style={{
                    position: 'absolute',
                    top: i * ROW_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    borderBottom: i < tripRows.length - 1 ? '1px solid var(--crm-hairline)' : undefined,
                  }}
                />
              ))}

              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= timelineWidth && (
                <div style={{
                  position: 'absolute',
                  left: todayOffset,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: 'var(--crm-red, #d70015)',
                  zIndex: 5,
                  opacity: 0.7,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    left: -10,
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--crm-red, #d70015)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                  }}>
                    TODAY
                  </div>
                </div>
              )}

              {/* Departure bars */}
              {tripRows.map((row, rowIdx) =>
                row.deps.map((dep) => {
                  const startPx = Math.floor((new Date(dep.start_date).getTime() - timelineStart) / DAY_MS) * DAY_WIDTH;
                  const durationDays = Math.max(1, Math.ceil((new Date(dep.end_date).getTime() - new Date(dep.start_date).getTime()) / DAY_MS));
                  const widthPx = durationDays * DAY_WIDTH;
                  const fillPct = dep.capacity > 0 ? Math.min(100, Math.round((dep.confirmed_count / dep.capacity) * 100)) : 0;
                  const isHovered = hoveredId === dep.id;
                  const barColor = statusBarColor(dep.status);
                  const days = daysUntil(dep.start_date);
                  const priceCents = dep.pricing_override_cents || tripPrices.get(dep.trip_master_id) || 0;
                  const revenueCents = priceCents * dep.confirmed_count;
                  const revenueStr = revenueCents > 0 ? formatCurrency(revenueCents, dep.pricing_currency) : '';
                  const barHeight = ROW_HEIGHT - 16;

                  return (
                    <div
                      key={dep.id}
                      style={{ position: 'absolute', left: startPx, top: rowIdx * ROW_HEIGHT + 8, width: Math.max(widthPx, 8), height: barHeight }}
                    >
                      {/* The bar itself */}
                      <div
                        onClick={() => onSelect(dep.id)}
                        onMouseEnter={() => setHoveredId(dep.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 6,
                          background: barColor,
                          opacity: isHovered ? 1 : 0.85,
                          cursor: 'pointer',
                          transition: 'opacity 0.15s, box-shadow 0.15s',
                          boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                          zIndex: isHovered ? 10 : 1,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                        title={`${dep.trip_name || 'Trip'}\n${formatDate(dep.start_date)} – ${formatDate(dep.end_date)}\n${dep.confirmed_count}/${dep.capacity} booked${revenueStr ? `\nRevenue: ${revenueStr}` : ''}${days > 0 ? `\n${days}d out` : ''}`}
                      >
                        {/* Fill overlay */}
                        <div style={{
                          position: 'absolute',
                          left: 0, top: 0, bottom: 0,
                          width: `${fillPct}%`,
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: 6,
                        }} />
                        {/* Labels inside bar */}
                        {widthPx > 40 && (
                          <div style={{
                            position: 'relative', zIndex: 2,
                            padding: '3px 6px',
                            display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            height: '100%',
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: '#fff',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              lineHeight: 1.2,
                            }}>
                              {dep.confirmed_count}/{dep.capacity} pax
                            </span>
                            {revenueStr && widthPx > 60 && (
                              <span style={{
                                fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                lineHeight: 1.2,
                              }}>
                                {revenueStr}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Floating label for narrow bars */}
                      {widthPx <= 40 && isHovered && (
                        <div style={{
                          position: 'absolute',
                          left: widthPx + 4,
                          top: 0,
                          background: 'var(--crm-bg)',
                          border: '1px solid var(--crm-border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          zIndex: 20,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{dep.confirmed_count}/{dep.capacity} pax</div>
                          {revenueStr && <div style={{ fontSize: 10, color: 'var(--crm-text-2)' }}>{revenueStr}</div>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--crm-hairline)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span className="crm-caption" style={{ marginRight: 4 }}>Status:</span>
        {['open', 'filling_fast', 'sold_out', 'in_progress', 'completed', 'draft'].map(s => (
          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: statusBarColor(s), display: 'inline-block' }} />
            {STATUS_LABELS[s]}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, marginLeft: 8 }}>
          <span style={{ width: 10, height: 2, background: 'var(--crm-red, #d70015)', display: 'inline-block' }} />
          Today
        </span>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────── */

export default function DeparturesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'timeline'>('timeline');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDeparture, setNewDeparture] = useState({
    trip_master_id: '',
    start_date: '',
    end_date: '',
    capacity: 20,
    pickup_city: '',
    drop_city: '',
    pricing_override_cents: undefined as number | undefined,
    client_name: '',
    client_email: '',
    client_phone: '',
  });

  /* ─── Queries ─────────────────────────────── */

  const { data, isLoading } = useQuery({
    queryKey: ['departures', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return api.get<APIResponse<Departure[]>>(`/departures${params}`);
    },
  });

  const { data: tripsData } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.get<APIResponse<TripMaster[]>>('/trips'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newDeparture) => {
      const payload: Record<string, unknown> = {
        ...body,
        pricing_override_cents: body.pricing_override_cents ? body.pricing_override_cents * 100 : undefined,
      };
      // Only send client fields if they have values
      if (!body.client_name) delete payload.client_name;
      if (!body.client_email) delete payload.client_email;
      if (!body.client_phone) delete payload.client_phone;
      return api.post<APIResponse<Departure>>('/departures', payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['departures'] });
      setDialogOpen(false);
      setNewDeparture({
        trip_master_id: '',
        start_date: '',
        end_date: '',
        capacity: 20,
        pickup_city: '',
        drop_city: '',
        pricing_override_cents: undefined,
        client_name: '',
        client_email: '',
        client_phone: '',
      });
      if (result?.data?.id) {
        router.push(`/departures/${result.data.id}`);
      }
    },
  });

  const rawDepartures = data?.data ?? [];
  const allDepartures = rawDepartures.filter(d => !ARCHIVED_STATUSES.includes(d.status));
  const archivedDepartures = rawDepartures.filter(d => ARCHIVED_STATUSES.includes(d.status));
  const [showArchive, setShowArchive] = useState(false);
  const trips = tripsData?.data ?? [];

  const tripMap = useMemo(() => {
    const m = new Map<string, TripMaster>();
    trips.forEach(t => m.set(t.id, t));
    return m;
  }, [trips]);

  const tripPrices = useMemo(() => {
    const m = new Map<string, number>();
    trips.forEach(t => { if (t.base_price_cents) m.set(t.id, t.base_price_cents); });
    return m;
  }, [trips]);

  // Filter by trip type
  const departures = useMemo(() => {
    if (typeFilter === 'all') return allDepartures;
    return allDepartures.filter(dep => {
      const depType = dep.trip_type || tripMap.get(dep.trip_master_id)?.trip_type || 'group';
      return depType === typeFilter;
    });
  }, [allDepartures, typeFilter, tripMap]);

  // Helper to determine if a departure is private
  const isPrivateDeparture = (dep: Departure) => {
    return (dep.trip_type || tripMap.get(dep.trip_master_id)?.trip_type || 'group') === 'private';
  };

  // Check if the selected trip in the form is private
  const selectedTripIsPrivate = newDeparture.trip_master_id
    ? (tripMap.get(newDeparture.trip_master_id)?.trip_type || 'group') === 'private'
    : false;

  function handleCreate() {
    if (!newDeparture.trip_master_id || !newDeparture.start_date || !newDeparture.end_date) return;
    createMutation.mutate(newDeparture);
  }

  /* ─── Render ──────────────────────────────── */

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="crm-title-1">All Departures</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div className="crm-seg">
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grid view">
              <LayoutGrid size={14} />
            </button>
            <button className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')} title="Timeline view">
              <GanttChart size={14} />
            </button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <button className="crm-btn primary">
                  <Plus size={14} />
                  New Departure
                </button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Departure</DialogTitle>
                <DialogDescription>Create a new departure for a trip.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Trip *</Label>
                  <EntitySearch
                    options={trips.map(trip => ({
                      id: trip.id,
                      label: trip.name,
                      sublabel: [
                        trip.destinations?.join(', '),
                        trip.duration_days ? `${trip.duration_days}D` : null,
                      ].filter(Boolean).join(' · '),
                      imageUrl: trip.hero_image_urls?.[0],
                      initials: trip.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                    }))}
                    value={newDeparture.trip_master_id}
                    onChange={(id) => {
                      const selectedTrip = trips.find(t => t.id === id);
                      const isPriv = (selectedTrip?.trip_type || 'group') === 'private';
                      setNewDeparture(prev => ({
                        ...prev,
                        trip_master_id: id,
                        capacity: isPriv ? 10 : 20,
                      }));
                    }}
                    placeholder="Search trips…"
                    emptyMessage="No trips found"
                  />
                </div>
                {selectedTripIsPrivate && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="client-name">Client Name</Label>
                      <Input
                        id="client-name"
                        value={newDeparture.client_name}
                        onChange={(e) => setNewDeparture((prev) => ({ ...prev, client_name: e.target.value }))}
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="grid gap-2">
                        <Label htmlFor="client-email">Client Email</Label>
                        <Input
                          id="client-email"
                          type="email"
                          value={newDeparture.client_email}
                          onChange={(e) => setNewDeparture((prev) => ({ ...prev, client_email: e.target.value }))}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="client-phone">Client Phone</Label>
                        <Input
                          id="client-phone"
                          type="tel"
                          value={newDeparture.client_phone}
                          onChange={(e) => setNewDeparture((prev) => ({ ...prev, client_phone: e.target.value }))}
                          placeholder="+91 ..."
                        />
                      </div>
                    </div>
                  </>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newDeparture.start_date}
                      onChange={(e) => setNewDeparture((prev) => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End date *</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newDeparture.end_date}
                      onChange={(e) => setNewDeparture((prev) => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                {!selectedTripIsPrivate && (
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={newDeparture.capacity}
                      onChange={(e) => setNewDeparture((prev) => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="grid gap-2">
                    <Label htmlFor="pickup-city">Pickup city</Label>
                    <Input
                      id="pickup-city"
                      value={newDeparture.pickup_city}
                      onChange={(e) => setNewDeparture((prev) => ({ ...prev, pickup_city: e.target.value }))}
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="drop-city">Drop city</Label>
                    <Input
                      id="drop-city"
                      value={newDeparture.drop_city}
                      onChange={(e) => setNewDeparture((prev) => ({ ...prev, drop_city: e.target.value }))}
                      placeholder="e.g. Delhi"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricing">Pricing override (₹)</Label>
                  <Input
                    id="pricing"
                    type="number"
                    value={newDeparture.pricing_override_cents ?? ''}
                    onChange={(e) =>
                      setNewDeparture((prev) => ({
                        ...prev,
                        pricing_override_cents: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Leave blank to use trip default"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  className="crm-btn primary"
                  onClick={handleCreate}
                  disabled={
                    createMutation.isPending ||
                    !newDeparture.trip_master_id ||
                    !newDeparture.start_date ||
                    !newDeparture.end_date
                  }
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Departure'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="crm-seg">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              className={statusFilter === s ? 'on' : ''}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'group', 'private'].map(t => (
            <button key={t} className={`crm-btn sm ${typeFilter === t ? 'primary' : ''}`}
              onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All' : t === 'group' ? 'Group Tours' : 'Private Trips'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <span className="crm-caption">Loading departures...</span>
        </div>
      ) : view === 'timeline' ? (
        <Timeline departures={departures} onSelect={(id) => router.push(`/departures/${id}`)} tripPrices={tripPrices} />
      ) : departures.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Calendar size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
          <div className="crm-caption">No departures found</div>
        </div>
      ) : (
        /* Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {departures.map((dep, i) => {
            const isPrivate = isPrivateDeparture(dep);
            const pct = dep.capacity > 0 ? Math.round((dep.confirmed_count / dep.capacity) * 100) : 0;
            const isHero = i === 0;
            const isAmber = pct >= 90;
            const days = daysUntil(dep.start_date);

            return (
              <div
                key={dep.id}
                className="crm-card crm-card-pad"
                style={{
                  cursor: 'pointer',
                  ...(isHero
                    ? { borderColor: 'var(--crm-accent)', background: 'var(--crm-accent-bg)' }
                    : {}),
                }}
                onClick={() => router.push(`/departures/${dep.id}`)}
              >
                {/* Status pill + days out */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`crm-pill ${statusPillClass(dep.status)}`}>
                      <span className="dot" />
                      {STATUS_LABELS[dep.status] ?? dep.status}
                    </span>
                    {isPrivate && dep.quote_status && (
                      <span className={`crm-pill ${quoteStatusPillClass(dep.quote_status)}`}>
                        {dep.quote_status}
                      </span>
                    )}
                  </div>
                  <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {days > 0 ? `${days}d out` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`}
                  </span>
                </div>

                {isPrivate ? (
                  <>
                    {/* Client name (prominent) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <User size={14} style={{ color: 'var(--crm-text-3)' }} />
                      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.008em' }}>
                        {dep.client_name || 'No client assigned'}
                      </span>
                    </div>

                    {/* Trip name + dates (smaller) */}
                    <div className="crm-caption" style={{ marginBottom: 4 }}>
                      {dep.trip_name || 'Untitled Trip'}
                    </div>
                    <div className="crm-caption" style={{ marginBottom: 0 }}>
                      {formatDate(dep.start_date)} &ndash; {formatDate(dep.end_date)}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Trip name */}
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.008em', marginBottom: 2 }}>
                      {dep.trip_name || 'Untitled Trip'}
                    </div>

                    {/* Dates */}
                    <div className="crm-caption" style={{ marginBottom: 14 }}>
                      {formatDate(dep.start_date)} &ndash; {formatDate(dep.end_date)}
                    </div>

                    {/* Capacity */}
                    <div className="crm-caption" style={{ marginBottom: 4 }}>Capacity</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                      <span className="crm-tabular" style={{ fontSize: 15, fontWeight: 600 }}>
                        {dep.confirmed_count}
                      </span>
                      <span className="crm-dim" style={{ fontSize: 13 }}>/ {dep.capacity}</span>
                      {dep.spots_remaining > 0 && (
                        <span className="crm-dim" style={{ fontSize: 11, marginLeft: 'auto' }}>
                          {dep.spots_remaining} spots left
                        </span>
                      )}
                    </div>
                    <div className={`crm-progress ${isAmber ? 'amber' : 'green'}`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Archive section */}
      {archivedDepartures.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <button
            className="crm-btn sm ghost"
            onClick={() => setShowArchive(!showArchive)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--crm-text-3)' }}
          >
            <Archive size={14} />
            Archive ({archivedDepartures.length})
            <ChevronDown size={12} style={{ transform: showArchive ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
          </button>
          {showArchive && (
            <div style={{ marginTop: 12, padding: 16, background: 'var(--crm-bg-2)', borderRadius: 10, border: '1px dashed var(--crm-hairline)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {archivedDepartures.map((dep) => (
                  <div
                    key={dep.id}
                    className="crm-card crm-card-pad"
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => router.push(`/departures/${dep.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{dep.trip_name ?? 'Unnamed'}</span>
                      <span className={`crm-pill ${dep.status === 'completed' ? 'green' : 'pink'}`}>{dep.status}</span>
                    </div>
                    <span className="crm-caption" style={{ marginTop: 4 }}>
                      {formatDate(dep.start_date)} – {formatDate(dep.end_date)}
                      {dep.client_name ? ` · ${dep.client_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
