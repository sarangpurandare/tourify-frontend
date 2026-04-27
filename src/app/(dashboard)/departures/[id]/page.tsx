'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Departure } from '@/types/departure';
import type { Booking, Payment, BookingDocument } from '@/types/booking';
import { BOOKING_SOURCES } from '@/types/booking';
import type { DepartureChecklistItem } from '@/types/checklist';
import type { Traveller } from '@/types/traveller';
import type { Group } from '@/types/group';
import type { ItineraryDay } from '@/types/itinerary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EntitySearch } from '@/components/entity-search';
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
import { FileUpload } from '@/components/ui/file-upload';
import {
  ArrowLeft, Clock, Users, MapPin, Pencil, Plus, Mountain, FileText,
  CreditCard, ChevronRight, UserPlus, DollarSign,
  AlertCircle, CheckCircle2, XCircle, Wallet, Eye, ImageOff,
  ListChecks, Activity, Save, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { OperationsChecklist } from '@/components/departure/operations-checklist';
import { CostTracker } from '@/components/departure/cost-tracker';
import { RosterView } from '@/components/departure/roster-view';
import { RoomAssignments } from '@/components/departure/room-assignments';

/* ─── Staff type ─────────────────────────────── */

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

const LIVE_STATUSES = ['not_started', 'in_progress', 'completed', 'cancelled'] as const;
const LIVE_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

/* ─── Helpers ─────────────────────────────────── */

const STATUSES = ['draft', 'open', 'filling_fast', 'sold_out', 'closed', 'in_progress', 'completed', 'cancelled'] as const;

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', filling_fast: 'Filling Fast', sold_out: 'Sold Out', draft: 'Draft',
  closed: 'Closed', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
  waitlisted: 'Waitlisted', confirmed: 'Confirmed', no_show: 'No Show',
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  confirmed: 'green', waitlisted: 'amber', cancelled: 'pink', no_show: 'pink', completed: 'green',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: 'green', partial: 'amber', pending: '', refunded: 'pink', waived: '',
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(startDate: string) {
  return Math.ceil((new Date(startDate).getTime() - Date.now()) / 86400000);
}

function formatCurrency(cents: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString()}`;
  }
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return formatDate(d);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

function quoteStatusColor(status: string) {
  switch (status) {
    case 'sent': return 'blue';
    case 'accepted': return 'green';
    case 'rejected': return 'pink';
    case 'expired': return '';
    case 'draft': return 'amber';
    default: return '';
  }
}

const TABS = ['Overview', 'Travellers', 'Roster', 'Itinerary', 'Rooms', 'Operations', 'Costs'] as const;

/* ─── Page ────────────────────────────────────── */

export default function DepartureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    capacity: 20, pickup_city: '', drop_city: '',
    pricing_override_cents: undefined as number | undefined, notes: '',
  });
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [newDay, setNewDay] = useState({
    day_number: 1, title: '',
    altitude_meters: undefined as number | undefined,
    internal_notes: '', traveller_notes: '',
  });
  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  /* ─── Queries ─────────────────────────────── */

  const { data, isLoading } = useQuery({
    queryKey: ['departures', id],
    queryFn: () => api.get<APIResponse<Departure>>(`/departures/${id}`),
    enabled: !!id,
  });

  const { data: itineraryData } = useQuery({
    queryKey: ['departures', id, 'itinerary'],
    queryFn: () => api.get<APIResponse<ItineraryDay[]>>(`/departures/${id}/itinerary`),
    enabled: !!id,
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['departure-bookings', id],
    queryFn: () => api.get<APIResponse<Booking[]>>(`/bookings?departure_id=${id}&per_page=200`),
    enabled: !!id,
  });

  const { data: travellersData } = useQuery({
    queryKey: ['travellers-list'],
    queryFn: () => api.get<APIResponse<Traveller[]>>('/travellers?per_page=500'),
    enabled: addBookingOpen,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get<APIResponse<StaffMember[]>>('/staff'),
  });

  const dep = data?.data;
  const itinerary = itineraryData?.data ?? [];
  const bookings = bookingsData?.data ?? [];
  const allTravellers = travellersData?.data ?? [];
  const staffList = staffData?.data ?? [];

  /* ─── Financial summary ──────────────────── */

  const financials = useMemo(() => {
    const active = bookings.filter(b => b.status !== 'cancelled');
    const totalRevenue = active.reduce((s, b) => s + (b.final_price_cents || 0), 0);
    const totalPaid = active.reduce((s, b) => s + (b.total_paid || 0), 0);
    return { totalRevenue, totalPaid, balance: totalRevenue - totalPaid, count: active.length };
  }, [bookings]);

  /* ─── Mutations ───────────────────────────── */

  const updateMutation = useMutation({
    mutationFn: (body: typeof editForm) =>
      api.put<APIResponse<Departure>>(`/departures/${id}`, {
        ...body, pricing_override_cents: body.pricing_override_cents || undefined,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['departures', id] }); setEditOpen(false); },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.post<APIResponse<Departure>>(`/departures/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
      queryClient.invalidateQueries({ queryKey: ['departures'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (is_published: boolean) => {
      const res = await api.patch<APIResponse<Departure>>(`/departures/${id}/publish`, { is_published });
      if (is_published && dep?.status === 'draft') {
        await api.post(`/departures/${id}/status`, { status: 'open' });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
      queryClient.invalidateQueries({ queryKey: ['departures'] });
    },
  });

  const addDayMutation = useMutation({
    mutationFn: (body: typeof newDay) =>
      api.post<APIResponse<ItineraryDay>>(`/departures/${id}/itinerary`, {
        ...body, altitude_meters: body.altitude_meters || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures', id, 'itinerary'] });
      setAddDayOpen(false);
      setNewDay({ day_number: (itinerary.length || 0) + 2, title: '', altitude_meters: undefined, internal_notes: '', traveller_notes: '' });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<APIResponse<Booking>>('/bookings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
      setAddBookingOpen(false);
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      api.post(`/bookings/${bookingId}/cancel`, { cancellation_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: Record<string, unknown> }) =>
      api.post(`/bookings/${bookingId}/payments`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-bookings', id] });
      setPaymentOpen(null);
    },
  });

  const logisticsMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.put<APIResponse<Departure>>(`/departures/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
      toast.success('Logistics updated');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to update logistics'); },
  });

  /* ─── Handlers ────────────────────────────── */

  function openEditDialog() {
    if (!dep) return;
    setEditForm({
      capacity: dep.capacity, pickup_city: dep.pickup_city ?? '',
      drop_city: dep.drop_city ?? '', pricing_override_cents: dep.pricing_override_cents,
      notes: dep.notes ?? '',
    });
    setEditOpen(true);
  }

  /* ─── Loading / Error ─────────────────────── */

  /* ─── Quote status mutation (private trips) ─ */

  const quoteStatusMutation = useMutation({
    mutationFn: (body: { quote_status?: string; quote_valid_until?: string }) =>
      api.put<APIResponse<Departure>>(`/departures/${id}`, {
        capacity: dep?.capacity, pickup_city: dep?.pickup_city ?? '',
        drop_city: dep?.drop_city ?? '', pricing_override_cents: dep?.pricing_override_cents,
        notes: dep?.notes ?? '', ...body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departures', id] });
      toast.success('Quote updated');
    },
    onError: (err: Error) => { toast.error(err.message || 'Failed to update quote'); },
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading departure...</span></div>;
  if (!dep) return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Departure not found.</span></div>;

  const isPrivate = dep.trip_type === 'private';
  const visibleTabs = isPrivate
    ? TABS.filter(t => !['Roster', 'Rooms'].includes(t))
    : TABS;

  const spotsLeft = dep.spots_remaining;
  const pct = dep.capacity > 0 ? Math.round((dep.confirmed_count / dep.capacity) * 100) : 0;
  const days = daysUntil(dep.start_date);

  return (
    <div>
      {/* ─── Hero ────────────────────────────── */}
      <div
        style={{
          height: 100,
          borderRadius: 0,
          background: 'var(--crm-bg-2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          color: 'var(--crm-text-3)',
        }}
      >
        <ImageOff size={18} />
        <span className="crm-caption">No hero image</span>
      </div>

      <div style={{ padding: '16px 24px 0' }}>
        <button className="crm-btn ghost sm" style={{ marginBottom: 12 }} onClick={() => router.push('/departures')}>
          <ArrowLeft size={14} /> Back to departures
        </button>

        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className={`crm-pill ${statusPillClass(dep.status)}`}>
            <span className="dot" />{STATUS_LABELS[dep.status] ?? dep.status}
          </span>
          <span className="crm-sep-v" style={{ height: 18, margin: '0 4px' }} />
          <span className="crm-caption" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            {days > 0 ? `${days} days to departure` : days === 0 ? 'Departing today' : `Departed ${Math.abs(days)} days ago`}
          </span>
          <span className="crm-sep-v" style={{ height: 18, margin: '0 4px' }} />
          {dep.is_published && (
            <span className="crm-pill green" style={{ marginRight: 4 }}>
              <span className="dot" />Live
            </span>
          )}
          <button
            onClick={() => publishMutation.mutate(!dep.is_published)}
            disabled={publishMutation.isPending}
            className={`crm-btn sm ${dep.is_published ? 'ghost' : 'primary'}`}
            style={dep.is_published ? { color: 'var(--crm-text-3)', fontSize: 12 } : undefined}
          >
            {publishMutation.isPending
              ? 'Updating...'
              : dep.is_published
                ? 'Take offline'
                : 'Publish'}
          </button>
        </div>

        {/* Title + Edit */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="crm-eyebrow" style={{ marginBottom: 4 }}>Departure</div>
            <h1 className="crm-display" style={{ marginBottom: 4 }}>{dep.trip_name || 'Untitled Trip'}</h1>
            <div className="crm-dim" style={{ fontSize: 15 }}>
              {formatDate(dep.start_date)} &ndash; {formatDate(dep.end_date)}
              {dep.pickup_city && dep.drop_city && (<> &middot; {dep.pickup_city} &rarr; {dep.drop_city}</>)}
            </div>
          </div>
          <button className="crm-btn ghost sm" onClick={openEditDialog}><Pencil size={14} /> Edit</button>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────── */}
      <div className="crm-tabs">
        {visibleTabs.map(t => (
          <div key={t} className={`crm-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
            {t === 'Travellers' && bookings.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({bookings.filter(b => b.status !== 'cancelled').length})</span>
            )}
            {t === 'Itinerary' && itinerary.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({itinerary.length})</span>
            )}
          </div>
        ))}
      </div>

      {/* ─── Tab content ─────────────────────── */}
      <div style={{ padding: 24 }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'Overview' && (
          <div>
            {/* Private trip header */}
            {isPrivate && (
              <div className="crm-card crm-card-pad" style={{ borderLeft: '3px solid var(--crm-accent)', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="crm-pill purple">Private Trip</span>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
                      {dep.client_name || 'Unnamed Client'}
                    </h3>
                    {dep.client_email && <span className="crm-caption">{dep.client_email}</span>}
                    {dep.client_phone && <span className="crm-caption" style={{ marginLeft: 12 }}>{dep.client_phone}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`crm-pill ${quoteStatusColor(dep.quote_status)}`}>
                      Quote: {dep.quote_status}
                    </span>
                    {dep.share_token && (
                      <button className="crm-btn sm" onClick={() => {
                        const url = `${window.location.origin}/s/${dep.share_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Share link copied!');
                      }}>
                        <Link2 size={14} /> Copy Share Link
                      </button>
                    )}
                  </div>
                </div>
                {dep.quote_valid_until && (
                  <span className="crm-caption" style={{ marginTop: 8, display: 'block' }}>
                    Quote valid until {new Date(dep.quote_valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            )}

            {/* Status control */}
            <div style={{ marginBottom: 24 }}>
              <div className="crm-caption" style={{ marginBottom: 8 }}>Change status</div>
              <div className="crm-seg">
                {STATUSES.map((s) => (
                  <button key={s} className={dep.status === s ? 'on' : ''} disabled={statusMutation.isPending}
                    onClick={() => {
                      if (dep.status === s) return;
                      const destructive = s === 'cancelled' || s === 'completed' || s === 'closed';
                      if (destructive && !confirm(`Change status to "${STATUS_LABELS[s] ?? s}"? This may affect bookings.`)) {
                        return;
                      }
                      statusMutation.mutate(s);
                    }}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: isPrivate ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {!isPrivate && (
                <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Capacity</div>
                  <div className="crm-tabular" style={{ fontSize: 22, fontWeight: 700 }}>{dep.confirmed_count}<span className="crm-dim" style={{ fontSize: 14 }}>/{dep.capacity}</span></div>
                  <div className={`crm-progress ${pct >= 90 ? 'amber' : 'green'}`} style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
                </div>
              )}
              <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Revenue</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(financials.totalRevenue, dep.pricing_currency)}</div>
                <div className="crm-caption" style={{ marginTop: 4 }}>{financials.count} bookings</div>
              </div>
              <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--crm-green)' }}>{formatCurrency(financials.totalPaid, dep.pricing_currency)}</div>
                <div className="crm-caption" style={{ marginTop: 4 }}>
                  {financials.totalRevenue > 0 ? `${Math.round((financials.totalPaid / financials.totalRevenue) * 100)}%` : '0%'} collected
                </div>
              </div>
              <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Balance Due</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: financials.balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>
                  {formatCurrency(Math.max(0, financials.balance), dep.pricing_currency)}
                </div>
                <div className="crm-caption" style={{ marginTop: 4 }}>
                  {bookings.filter(b => b.status !== 'cancelled' && b.payment_status !== 'paid').length} pending
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isPrivate ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Capacity card — hidden for private trips */}
              {!isPrivate && (
                <div className="crm-card crm-card-pad">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Users size={16} style={{ color: 'var(--crm-text-3)' }} />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Capacity</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                    {Array.from({ length: dep.capacity }).map((_, i) => {
                      let bg = 'var(--crm-bg-active)'; let border = 'none';
                      if (i < dep.confirmed_count) { bg = 'var(--crm-accent)'; }
                      else if (i < dep.confirmed_count + dep.waitlist_count) { bg = 'transparent'; border = '2px dashed var(--crm-amber)'; }
                      return <div key={i} style={{ flex: 1, height: 28, borderRadius: 4, background: bg, border }} />;
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--crm-accent)' }} />Confirmed ({dep.confirmed_count})
                    </span>
                    {dep.waitlist_count > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, border: '2px dashed var(--crm-amber)', background: 'transparent' }} />Waitlist ({dep.waitlist_count})
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--crm-bg-active)' }} />Open ({spotsLeft > 0 ? spotsLeft : 0})
                    </span>
                  </div>
                </div>
              )}

              {/* Details card */}
              <div className="crm-card crm-card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <MapPin size={16} style={{ color: 'var(--crm-text-3)' }} />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Departure info</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', fontSize: 13 }}>
                  <div><div className="crm-caption" style={{ marginBottom: 2 }}>Pickup</div><div style={{ fontWeight: 500 }}>{dep.pickup_city || '--'}</div></div>
                  <div><div className="crm-caption" style={{ marginBottom: 2 }}>Drop</div><div style={{ fontWeight: 500 }}>{dep.drop_city || '--'}</div></div>
                  {dep.pricing_override_cents != null && (
                    <div><div className="crm-caption" style={{ marginBottom: 2 }}>Price</div><div style={{ fontWeight: 500 }}>{formatCurrency(dep.pricing_override_cents, dep.pricing_currency)}</div></div>
                  )}
                  {dep.early_bird_price_cents != null && (
                    <div><div className="crm-caption" style={{ marginBottom: 2 }}>Early bird</div><div style={{ fontWeight: 500 }}>{formatCurrency(dep.early_bird_price_cents, dep.pricing_currency)}{dep.early_bird_deadline && <span className="crm-dim"> (until {formatDate(dep.early_bird_deadline)})</span>}</div></div>
                  )}
                  {dep.notes && (
                    <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Notes</div><div style={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{dep.notes}</div></div>
                  )}
                </div>
              </div>
            </div>

            {/* Briefing Document */}
            <div className="crm-card crm-card-pad" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <FileText size={16} style={{ color: 'var(--crm-text-3)' }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Briefing Document</h3>
              </div>
              <FileUpload
                value={dep.briefing_doc_url}
                onChange={async (url) => {
                  await api.put(`/departures/${id}`, {
                    capacity: dep.capacity, pickup_city: dep.pickup_city ?? '',
                    drop_city: dep.drop_city ?? '', pricing_override_cents: dep.pricing_override_cents,
                    notes: dep.notes ?? '', briefing_doc_url: url,
                  });
                  queryClient.invalidateQueries({ queryKey: ['departures', id] });
                }}
                accept=".pdf,.doc,.docx,image/*"
                label="Briefing Document"
              />
            </div>

            {/* ─── Quote Management (private trips) ─ */}
            {isPrivate && (
              <div className="crm-card crm-card-pad" style={{ marginBottom: 24 }}>
                <h4 className="crm-section-title" style={{ marginBottom: 14 }}>Quote Management</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <Label>Quote Status</Label>
                    <Select value={dep.quote_status || 'none'} onValueChange={(v) => quoteStatusMutation.mutate({ quote_status: v ?? undefined })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent to Client</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={dep.quote_valid_until ?? ''}
                      onChange={(e) => quoteStatusMutation.mutate({ quote_valid_until: e.target.value || undefined })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Logistics & Operations ───────── */}
            <LogisticsSection
              departure={dep}
              staffList={staffList}
              onSave={(fields) => logisticsMutation.mutate({
                capacity: dep.capacity,
                pickup_city: dep.pickup_city ?? '',
                drop_city: dep.drop_city ?? '',
                pricing_override_cents: dep.pricing_override_cents,
                notes: dep.notes ?? '',
                ...fields,
              })}
              saving={logisticsMutation.isPending}
            />
          </div>
        )}

        {/* ═══ TRAVELLERS TAB ═══ */}
        {activeTab === 'Travellers' && (
          <div>
            {/* Actions bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Bookings &amp; Travellers</h3>
                <span className="crm-caption">{bookings.filter(b => b.status !== 'cancelled').length} active</span>
              </div>
              <button className="crm-btn primary sm" onClick={() => setAddBookingOpen(true)}>
                <UserPlus size={13} /> Add Booking
              </button>
            </div>

            {/* Financial summary strip */}
            {financials.count > 0 && (
              <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
                <div><span className="crm-caption">Revenue</span> <strong style={{ marginLeft: 6 }}>{formatCurrency(financials.totalRevenue, dep.pricing_currency)}</strong></div>
                <div><span className="crm-caption">Collected</span> <strong style={{ marginLeft: 6, color: 'var(--crm-green)' }}>{formatCurrency(financials.totalPaid, dep.pricing_currency)}</strong></div>
                <div><span className="crm-caption">Balance</span> <strong style={{ marginLeft: 6, color: financials.balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatCurrency(Math.max(0, financials.balance), dep.pricing_currency)}</strong></div>
              </div>
            )}

            {/* Bookings list */}
            {bookings.length === 0 ? (
              <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
                <Users size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No bookings yet</div>
                <div className="crm-caption" style={{ marginBottom: 16 }}>Add travellers to this departure by creating a booking.</div>
                <button className="crm-btn primary" onClick={() => setAddBookingOpen(true)}>
                  <UserPlus size={14} /> Add First Booking
                </button>
              </div>
            ) : (
              <div className="crm-card">
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '28px 1.5fr 0.8fr 0.8fr 1fr 0.6fr 80px',
                  gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--crm-hairline)',
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--crm-text-3)',
                }}>
                  <div />
                  <div>Traveller</div>
                  <div>Status</div>
                  <div>Payment</div>
                  <div>Amount</div>
                  <div>Room</div>
                  <div />
                </div>

                {/* Booking rows */}
                {bookings.map((booking) => {
                  const balance = (booking.final_price_cents || 0) - (booking.total_paid || 0);
                  const isCancelled = booking.status === 'cancelled';

                  return (
                    <div key={booking.id} style={{ borderBottom: '1px solid var(--crm-hairline)' }}>
                      {/* Main row */}
                      <div
                        style={{
                          display: 'grid', gridTemplateColumns: '28px 1.5fr 0.8fr 0.8fr 1fr 0.6fr 80px',
                          gap: 12, padding: '12px 16px', alignItems: 'center', fontSize: 13,
                          opacity: isCancelled ? 0.5 : 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <div><ChevronRight size={14} /></div>
                        <div>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {booking.traveller_name || 'Unknown'}
                            {booking.group_id && <Users size={12} style={{ color: 'var(--crm-accent)', flexShrink: 0 }} />}
                          </div>
                          <div className="crm-caption">{timeAgo(booking.booking_date)}</div>
                        </div>
                        <div>
                          <span className={`crm-pill ${BOOKING_STATUS_COLOR[booking.status] || ''}`}>
                            <span className="dot" />{STATUS_LABELS[booking.status] ?? booking.status}
                          </span>
                        </div>
                        <div>
                          <span className={`crm-pill ${PAYMENT_STATUS_COLOR[booking.payment_status] || ''}`}>
                            <span className="dot" />{booking.payment_status}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{booking.final_price_cents ? formatCurrency(booking.final_price_cents, booking.currency) : '--'}</div>
                          {booking.total_paid > 0 && (
                            <div className="crm-caption" style={{ color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>
                              {balance > 0 ? `${formatCurrency(balance, booking.currency)} due` : 'Paid in full'}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 12 }}>{booking.room_type_preference?.replace('_', ' ') || '--'}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!isCancelled && (
                            <>
                              <button className="crm-btn ghost sm" title="Record payment"
                                onClick={(e) => { e.stopPropagation(); setPaymentOpen(booking.id); }}
                                style={{ padding: '4px 6px' }}>
                                <DollarSign size={13} />
                              </button>
                              <button className="crm-btn ghost sm" title="View traveller"
                                onClick={(e) => { e.stopPropagation(); router.push(`/travellers?id=${booking.traveller_id}`); }}
                                style={{ padding: '4px 6px' }}>
                                <Eye size={13} />
                              </button>
                              <button className="crm-btn ghost sm" title="Copy trip link for traveller"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const url = `${window.location.origin}/b/${booking.portal_token}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Trip link copied');
                                }}
                                style={{ padding: '4px 6px' }}>
                                <Link2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ ROSTER TAB ═══ */}
        {activeTab === 'Roster' && (
          <RosterView departureId={id} />
        )}

        {/* ═══ ITINERARY TAB ═══ */}
        {activeTab === 'Itinerary' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Itinerary</h3>
              <button className="crm-btn primary sm" onClick={() => {
                setNewDay({ day_number: (itinerary.length || 0) + 1, title: '', altitude_meters: undefined, internal_notes: '', traveller_notes: '' });
                setAddDayOpen(true);
              }}>
                <Plus size={13} /> Add Day
              </button>
            </div>

            {itinerary.length === 0 ? (
              <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
                <Mountain size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
                <div className="crm-caption">No itinerary days yet</div>
              </div>
            ) : (
              <div className="crm-card">
                {itinerary.sort((a, b) => a.day_number - b.day_number).map((day) => (
                  <div key={day.id} style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--crm-hairline)',
                    display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16, alignItems: 'start',
                  }}>
                    <div>
                      <div className="crm-eyebrow" style={{ marginBottom: 2 }}>Day</div>
                      <div className="crm-tabular" style={{ fontSize: 20, fontWeight: 700 }}>{day.day_number}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{day.title || `Day ${day.day_number}`}</div>
                      {day.altitude_meters != null && (
                        <div className="crm-caption" style={{ marginBottom: 4 }}>
                          <Mountain size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />{day.altitude_meters.toLocaleString()}m
                        </div>
                      )}
                      {day.traveller_notes && <div style={{ fontSize: 13, color: 'var(--crm-text-2)', marginBottom: 4 }}>{day.traveller_notes}</div>}
                      {day.internal_notes && <div className="crm-caption" style={{ fontStyle: 'italic' }}>Internal: {day.internal_notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ROOMS TAB ═══ */}
        {activeTab === 'Rooms' && (
          <RoomAssignments departureId={id} />
        )}

        {/* ═══ OPERATIONS TAB ═══ */}
        {activeTab === 'Operations' && (
          <OperationsChecklist departureId={id} />
        )}

        {/* ═══ COSTS TAB ═══ */}
        {activeTab === 'Costs' && (
          <CostTracker departureId={id} />
        )}
      </div>

      {/* ─── Edit Dialog ─────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Departure</DialogTitle><DialogDescription>Update departure details.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Capacity</Label>
              <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm(p => ({ ...p, capacity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="grid gap-2"><Label>Pickup city</Label><Input value={editForm.pickup_city} onChange={(e) => setEditForm(p => ({ ...p, pickup_city: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Drop city</Label><Input value={editForm.drop_city} onChange={(e) => setEditForm(p => ({ ...p, drop_city: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Pricing override (paise)</Label>
              <Input type="number" value={editForm.pricing_override_cents ?? ''} onChange={(e) => setEditForm(p => ({ ...p, pricing_override_cents: e.target.value ? parseInt(e.target.value) : undefined }))} />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
            </div>
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Day Dialog ──────────────────── */}
      <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Itinerary Day</DialogTitle><DialogDescription>Add a new day to the departure itinerary.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="grid gap-2"><Label>Day number *</Label><Input type="number" value={newDay.day_number} onChange={(e) => setNewDay(p => ({ ...p, day_number: parseInt(e.target.value) || 1 }))} /></div>
              <div className="grid gap-2"><Label>Altitude (m)</Label><Input type="number" value={newDay.altitude_meters ?? ''} onChange={(e) => setNewDay(p => ({ ...p, altitude_meters: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="Optional" /></div>
            </div>
            <div className="grid gap-2"><Label>Title</Label><Input value={newDay.title} onChange={(e) => setNewDay(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Acclimatization day" /></div>
            <div className="grid gap-2"><Label>Traveller notes</Label><textarea value={newDay.traveller_notes} onChange={(e) => setNewDay(p => ({ ...p, traveller_notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical' }} placeholder="Visible to travellers" /></div>
            <div className="grid gap-2"><Label>Internal notes</Label><textarea value={newDay.internal_notes} onChange={(e) => setNewDay(p => ({ ...p, internal_notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical' }} placeholder="Internal team notes" /></div>
          </div>
          <DialogFooter>
            <button className="crm-btn primary" onClick={() => addDayMutation.mutate(newDay)} disabled={addDayMutation.isPending || !newDay.day_number}>
              {addDayMutation.isPending ? 'Adding...' : 'Add Day'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Booking Dialog ──────────────── */}
      <AddBookingDialog
        open={addBookingOpen}
        onOpenChange={setAddBookingOpen}
        departureId={id}
        travellers={allTravellers}
        existingTravellerIds={bookings.map(b => b.traveller_id)}
        existingBookings={bookings}
        currency={dep.pricing_currency}
        defaultPrice={dep.pricing_override_cents}
        onSubmit={(body) => createBookingMutation.mutate(body)}
        submitting={createBookingMutation.isPending}
      />

      {/* ─── Record Payment Dialog ───────────── */}
      <RecordPaymentDialog
        open={!!paymentOpen}
        onOpenChange={(v) => { if (!v) setPaymentOpen(null); }}
        booking={bookings.find(b => b.id === paymentOpen)}
        onSubmit={(body) => {
          if (paymentOpen) createPaymentMutation.mutate({ bookingId: paymentOpen, body });
        }}
        submitting={createPaymentMutation.isPending}
      />

      {/* ─── Booking Detail Dialog ─────────────── */}
      <BookingDetailDialog
        booking={bookings.find(b => b.id === selectedBookingId) ?? null}
        currency={dep?.pricing_currency || 'INR'}
        open={!!selectedBookingId}
        onOpenChange={(v) => { if (!v) setSelectedBookingId(null); }}
        onRecordPayment={() => { if (selectedBookingId) setPaymentOpen(selectedBookingId); }}
        onCancel={(reason) => { if (selectedBookingId) cancelBookingMutation.mutate({ bookingId: selectedBookingId, reason }); }}
        cancelling={cancelBookingMutation.isPending}
        departureId={id}
      />
    </div>
  );
}

/* ─── BookingDetailDialog (wide dialog) ──────── */

const TRAVELLER_DOC_TYPES = ['passport', 'id_card', 'photo', 'aadhaar', 'pan', 'driving_license', 'oci_card'];

function BookingDetailDialog({ booking, currency, open, onOpenChange, onRecordPayment, onCancel, cancelling, departureId }: {
  booking: Booking | null; currency: string; open: boolean; onOpenChange: (v: boolean) => void;
  onRecordPayment: () => void; onCancel: (reason: string) => void; cancelling: boolean; departureId: string;
}) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'payments' | 'documents' | 'checklist'>('info');
  const [reassigning, setReassigning] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTravellersData } = useQuery({
    queryKey: ['travellers-for-reassign'],
    queryFn: () => api.get<{ data: Traveller[] }>('/travellers?per_page=200'),
    enabled: reassigning && open,
  });

  const { data: allGroupsData } = useQuery({
    queryKey: ['groups-for-reassign'],
    queryFn: () => api.get<{ data: Group[] }>('/groups'),
    enabled: reassigning && open,
  });

  const reassignMutation = useMutation({
    mutationFn: (body: { traveller_id?: string; group_id?: string | null }) =>
      api.put(`/bookings/${booking!.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departure-bookings', departureId] });
      setReassigning(false);
      toast.success('Booking updated');
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['booking-payments', booking?.id],
    queryFn: () => api.get<APIResponse<Payment[]>>(`/bookings/${booking!.id}/payments`),
    enabled: !!booking && open,
  });

  const { data: docsData } = useQuery({
    queryKey: ['booking-documents', booking?.id],
    queryFn: () => api.get<APIResponse<BookingDocument[]>>(`/bookings/${booking!.id}/documents`),
    enabled: !!booking && open,
  });

  const { data: checklistData } = useQuery({
    queryKey: ['booking-checklist', departureId, booking?.traveller_id],
    queryFn: () => api.get<APIResponse<DepartureChecklistItem[]>>(`/departures/${departureId}/checklist?traveller_id=${booking!.traveller_id}`),
    enabled: !!booking && open,
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.patch(`/departures/${departureId}/checklist/items/${itemId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-checklist', departureId, booking?.traveller_id] });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (body: { document_type: string; label: string; is_required?: boolean }) =>
      api.post(`/bookings/${booking!.id}/documents`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-documents', booking?.id] });
      toast.success('Document request added');
    },
  });

  if (!booking) return null;

  const payments = paymentsData?.data ?? [];
  const documents = docsData?.data ?? [];
  const checklistItems = checklistData?.data ?? [];
  const balance = (booking.final_price_cents || 0) - (booking.total_paid || 0);
  const isCancelled = booking.status === 'cancelled';

  const travellerDocs = documents.filter(d => TRAVELLER_DOC_TYPES.includes(d.document_type));
  const tripDocs = documents.filter(d => !TRAVELLER_DOC_TYPES.includes(d.document_type));

  const DETAIL_TABS = [
    { key: 'info' as const, label: 'Info' },
    { key: 'payments' as const, label: `Payments (${payments.length})` },
    { key: 'documents' as const, label: `Documents (${documents.length})` },
    { key: 'checklist' as const, label: `Checklist (${checklistItems.length})` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 780, width: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{booking.traveller_name || 'Booking'}</span>
            <span className={`crm-pill ${BOOKING_STATUS_COLOR[booking.status] || ''}`} style={{ fontSize: 11 }}>
              <span className="dot" />{STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <span className={`crm-pill ${PAYMENT_STATUS_COLOR[booking.payment_status] || ''}`} style={{ fontSize: 11 }}>
              <span className="dot" />{booking.payment_status}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Share link bar */}
        {booking.portal_token && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
            <Link2 size={14} style={{ color: 'var(--crm-accent)', flexShrink: 0 }} />
            <code style={{ flex: 1, fontSize: 11, color: 'var(--crm-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.location.origin}/b/{booking.portal_token}
            </code>
            <button
              className="crm-btn primary sm"
              style={{ fontSize: 11, height: 28, flexShrink: 0 }}
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/b/${booking.portal_token}`);
                toast.success('Trip link copied');
              }}
            >
              Copy link
            </button>
          </div>
        )}

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--crm-line)', marginBottom: 16 }}>
          {DETAIL_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setDetailTab(t.key)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: detailTab === t.key ? 600 : 400,
                color: detailTab === t.key ? 'var(--crm-accent)' : 'var(--crm-text-3)',
                borderBottom: detailTab === t.key ? '2px solid var(--crm-accent)' : '2px solid transparent',
                background: 'none', border: 'none', cursor: 'pointer', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* === INFO TAB === */}
        {detailTab === 'info' && (
          <div style={{ fontSize: 13 }}>
            {/* Summary row */}
            <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 12, flexWrap: 'wrap' }}>
              <div><span className="crm-caption">Total</span> <strong style={{ marginLeft: 4 }}>{booking.final_price_cents ? formatCurrency(booking.final_price_cents, currency) : '--'}</strong></div>
              <div><span className="crm-caption">Paid</span> <strong style={{ marginLeft: 4, color: 'var(--crm-green)' }}>{formatCurrency(booking.total_paid || 0, currency)}</strong></div>
              <div><span className="crm-caption">Due</span> <strong style={{ marginLeft: 4, color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatCurrency(Math.max(0, balance), currency)}</strong></div>
            </div>

            {/* Mapped to */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
              <div style={{ flex: 1 }}>
                <span className="crm-caption">Traveller</span> <strong style={{ marginLeft: 4 }}>{booking.traveller_name || 'Unknown'}</strong>
                {booking.group_id && <span style={{ marginLeft: 10 }}><span className="crm-caption">Group</span> <Users size={12} style={{ color: 'var(--crm-accent)', verticalAlign: '-2px', marginLeft: 4 }} /></span>}
              </div>
              {!isCancelled && !reassigning && (
                <button className="crm-btn ghost sm" style={{ fontSize: 11 }} onClick={() => setReassigning(true)}>Change</button>
              )}
            </div>

            {reassigning && (
              <ReassignSection
                currentTravellerId={booking.traveller_id}
                currentGroupId={booking.group_id}
                travellers={allTravellersData?.data ?? []}
                groups={allGroupsData?.data ?? []}
                saving={reassignMutation.isPending}
                onSave={(t, g) => reassignMutation.mutate({ traveller_id: t || undefined, group_id: g || null })}
                onCancel={() => setReassigning(false)}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
              <div><div className="crm-caption" style={{ marginBottom: 2 }}>Room</div><div style={{ fontWeight: 500 }}>{booking.room_type_preference?.replace('_', ' ') || 'Not specified'}</div></div>
              <div><div className="crm-caption" style={{ marginBottom: 2 }}>Booked</div><div style={{ fontWeight: 500 }}>{formatDate(booking.booking_date)}</div></div>
              <div><div className="crm-caption" style={{ marginBottom: 2 }}>Source</div><div style={{ fontWeight: 500 }}>{booking.source || 'Direct'}</div></div>
              {booking.emergency_contact_name && (
                <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Emergency Contact</div><div style={{ fontWeight: 500 }}>{booking.emergency_contact_name} ({booking.emergency_contact_relation}) &middot; {booking.emergency_contact_phone}</div></div>
              )}
              {booking.special_requests && (
                <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Special Requests</div><div style={{ fontWeight: 500 }}>{booking.special_requests}</div></div>
              )}
              {booking.internal_notes && (
                <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Internal Notes</div><div style={{ fontWeight: 500, fontStyle: 'italic', color: 'var(--crm-text-3)' }}>{booking.internal_notes}</div></div>
              )}
            </div>

            {/* Cancel */}
            {!isCancelled && (
              <div style={{ borderTop: '1px solid var(--crm-line)', paddingTop: 12, marginTop: 8 }}>
                {!showCancel ? (
                  <button className="crm-btn ghost sm" style={{ color: 'var(--crm-pink)' }} onClick={() => setShowCancel(true)}>
                    <XCircle size={13} /> Cancel Booking
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Cancellation reason..."
                      style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)' }} />
                    <button className="crm-btn primary sm" style={{ background: 'var(--crm-pink)' }} onClick={() => onCancel(cancelReason)} disabled={cancelling}>
                      {cancelling ? 'Cancelling...' : 'Confirm'}
                    </button>
                    <button className="crm-btn ghost sm" onClick={() => setShowCancel(false)}>Nevermind</button>
                  </div>
                )}
              </div>
            )}
            {isCancelled && booking.cancellation_reason && (
              <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', borderRadius: 6, fontSize: 12 }}>
                <strong>Cancelled:</strong> {booking.cancellation_reason}
              </div>
            )}
          </div>
        )}

        {/* === PAYMENTS TAB === */}
        {detailTab === 'payments' && (
          <div style={{ fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <div><span className="crm-caption">Total</span> <strong style={{ marginLeft: 4 }}>{booking.final_price_cents ? formatCurrency(booking.final_price_cents, currency) : '--'}</strong></div>
                <div><span className="crm-caption">Paid</span> <strong style={{ marginLeft: 4, color: 'var(--crm-green)' }}>{formatCurrency(booking.total_paid || 0, currency)}</strong></div>
                <div><span className="crm-caption">Due</span> <strong style={{ marginLeft: 4, color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatCurrency(Math.max(0, balance), currency)}</strong></div>
              </div>
              {!isCancelled && (
                <button className="crm-btn primary sm" onClick={onRecordPayment}><DollarSign size={12} /> Record Payment</button>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="crm-caption" style={{ padding: '24px 0', textAlign: 'center' }}>No payments recorded yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payments.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.status === 'completed' ? <CheckCircle2 size={15} style={{ color: 'var(--crm-green)' }} /> : <AlertCircle size={15} style={{ color: 'var(--crm-amber)' }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatCurrency(p.amount_cents, p.currency)}</div>
                        <div className="crm-caption">{p.type} &middot; {p.payment_method || 'N/A'}{p.reference_number ? ` &middot; ${p.reference_number}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`crm-pill ${p.status === 'completed' ? 'green' : p.status === 'failed' ? 'pink' : ''}`} style={{ fontSize: 10 }}>{p.status}</span>
                      {p.paid_date && <div className="crm-caption" style={{ marginTop: 2 }}>{formatDate(p.paid_date)}</div>}
                      {!p.paid_date && p.scheduled_date && <div className="crm-caption" style={{ marginTop: 2 }}>Due {formatDate(p.scheduled_date)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === DOCUMENTS TAB === */}
        {detailTab === 'documents' && (
          <div style={{ fontSize: 13 }}>
            {/* Traveller documents (permanent — passport, ID, etc.) */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Traveller Documents</div>
                  <div className="crm-caption">Permanent docs (passport, ID, etc.) — carried across trips</div>
                </div>
              </div>
              {travellerDocs.length === 0 ? (
                <div className="crm-caption" style={{ padding: '16px 0', textAlign: 'center' }}>No traveller documents</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {travellerDocs.map(doc => (
                    <DocRow key={doc.id} doc={doc} bookingId={booking.id} />
                  ))}
                </div>
              )}
            </div>

            {/* Trip-specific documents (insurance, visa, consent forms, etc.) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Trip Documents</div>
                  <div className="crm-caption">Specific to this trip — insurance, visa, consent forms</div>
                </div>
                <button className="crm-btn sm" onClick={() => {
                  const label = prompt('Document name (e.g. Travel Insurance, Visa Copy):');
                  if (label) createDocMutation.mutate({ document_type: 'trip_document', label, is_required: true });
                }}>
                  <Plus size={12} /> Request Doc
                </button>
              </div>
              {tripDocs.length === 0 ? (
                <div className="crm-caption" style={{ padding: '16px 0', textAlign: 'center' }}>No trip documents requested</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tripDocs.map(doc => (
                    <DocRow key={doc.id} doc={doc} bookingId={booking.id} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === CHECKLIST TAB === */}
        {detailTab === 'checklist' && (
          <div style={{ fontSize: 13 }}>
            {checklistItems.length === 0 ? (
              <div className="crm-caption" style={{ padding: '24px 0', textAlign: 'center' }}>No checklist items for this traveller</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {checklistItems.map(item => {
                  const isDone = item.status === 'completed' || item.status === 'skipped';
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      background: 'var(--crm-bg-2)', borderRadius: 8,
                      opacity: isDone ? 0.6 : 1,
                    }}>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                        onClick={() => toggleChecklistMutation.mutate({
                          itemId: item.id,
                          status: isDone ? 'pending' : 'completed',
                        })}
                      >
                        {isDone
                          ? <CheckCircle2 size={18} style={{ color: 'var(--crm-green)' }} />
                          : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--crm-line)' }} />
                        }
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, textDecoration: isDone ? 'line-through' : 'none' }}>{item.title}</div>
                        {item.description && <div className="crm-caption">{item.description}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.is_required && <span className="crm-pill pink" style={{ fontSize: 10 }}>Required</span>}
                        {item.due_date && <span className="crm-caption">{formatDate(item.due_date)}</span>}
                        {item.category && <span className="crm-pill" style={{ fontSize: 10 }}>{item.category}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── DocRow sub-component ───────────────────── */

const DOC_STATUS_COLOR: Record<string, string> = {
  pending: '', uploaded: 'amber', verified: 'green', rejected: 'pink',
};

function DocRow({ doc, bookingId }: { doc: BookingDocument; bookingId: string }) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (body: { status: string; rejection_reason?: string }) =>
      api.patch(`/bookings/${bookingId}/documents/${doc.id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking-documents', bookingId] }),
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: 'var(--crm-bg-2)', borderRadius: 8, fontSize: 12,
    }}>
      <FileText size={16} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.label}</div>
        <div className="crm-caption">{doc.document_type.replace(/_/g, ' ')}{doc.is_required ? ' · Required' : ''}</div>
      </div>
      <span className={`crm-pill ${DOC_STATUS_COLOR[doc.status] || ''}`} style={{ fontSize: 10 }}>
        {doc.status}
      </span>
      {doc.file_url && (
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="crm-btn ghost sm" style={{ padding: '4px 6px' }} title="View file">
          <Eye size={13} />
        </a>
      )}
      {doc.status === 'uploaded' && (
        <>
          <button className="crm-btn ghost sm" style={{ padding: '4px 6px', color: 'var(--crm-green)' }} title="Verify"
            onClick={() => updateMutation.mutate({ status: 'verified' })} disabled={updateMutation.isPending}>
            <CheckCircle2 size={13} />
          </button>
          <button className="crm-btn ghost sm" style={{ padding: '4px 6px', color: 'var(--crm-pink)' }} title="Reject"
            onClick={() => {
              const reason = prompt('Rejection reason:');
              if (reason) updateMutation.mutate({ status: 'rejected', rejection_reason: reason });
            }} disabled={updateMutation.isPending}>
            <XCircle size={13} />
          </button>
        </>
      )}
    </div>
  );
}

/* ─── ReassignSection ───────────────────────── */

function ReassignSection({ currentTravellerId, currentGroupId, travellers, groups, saving, onSave, onCancel }: {
  currentTravellerId: string; currentGroupId?: string;
  travellers: Traveller[]; groups: Group[];
  saving: boolean; onSave: (travellerId: string, groupId: string) => void; onCancel: () => void;
}) {
  const [travellerId, setTravellerId] = useState(currentTravellerId);
  const [groupId, setGroupId] = useState(currentGroupId || '');

  return (
    <div style={{ padding: '12px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
      <div className="grid gap-3">
        <div className="grid gap-1">
          <Label style={{ fontSize: 12 }}>Traveller</Label>
          <EntitySearch
            options={travellers.map(t => ({
              id: t.id,
              label: t.full_legal_name,
              sublabel: [t.email, t.city].filter(Boolean).join(' · '),
              initials: t.full_legal_name.split(' ').map(w => w[0]).join('').slice(0, 2),
            }))}
            value={travellerId}
            onChange={setTravellerId}
            placeholder="Search travellers…"
            emptyMessage="No travellers"
          />
        </div>
        <div className="grid gap-1">
          <Label style={{ fontSize: 12 }}>Group (optional)</Label>
          <EntitySearch
            options={[
              { id: '__none__', label: 'No group', sublabel: 'Solo booking', initials: '–' },
              ...groups.map(g => ({
                id: g.id,
                label: g.name,
                sublabel: g.type,
                initials: g.name.charAt(0),
              })),
            ]}
            value={groupId || '__none__'}
            onChange={(v) => setGroupId(v === '__none__' ? '' : v)}
            placeholder="Search groups…"
            emptyMessage="No groups"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="crm-btn ghost sm" onClick={onCancel}>Cancel</button>
          <button className="crm-btn primary sm" onClick={() => onSave(travellerId, groupId)} disabled={saving || !travellerId}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── AddBookingDialog ───────────────────────── */

function AddBookingDialog({ open, onOpenChange, departureId, travellers, existingTravellerIds, existingBookings, currency, defaultPrice, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  departureId: string; travellers: Traveller[];
  existingTravellerIds: string[]; existingBookings: Booking[];
  currency: string;
  defaultPrice?: number; onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [mode, setMode] = useState<'individual' | 'group'>('individual');
  const [form, setForm] = useState({
    traveller_id: '', status: 'confirmed', final_price_cents: defaultPrice?.toString() || '',
    room_type_preference: 'twin_share', special_requests: '',
    source: 'direct', source_details: '', agent_name: '',
    group_id: '',
  });
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const available = travellers.filter(t => !existingTravellerIds.includes(t.id));

  const { data: groupsData } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => api.get<{ data: Group[] }>('/groups'),
    enabled: open && mode === 'group',
  });
  const groups = groupsData?.data ?? [];

  const { data: selectedGroupData } = useQuery({
    queryKey: ['group-detail', form.group_id],
    queryFn: () => api.get<{ data: Group }>(`/groups/${form.group_id}`),
    enabled: !!form.group_id && mode === 'group',
  });
  const selectedGroup = selectedGroupData?.data;
  const groupMembers = selectedGroup?.members ?? [];
  const bookableMembers = groupMembers.filter(m => !existingTravellerIds.includes(m.traveller_id));

  async function handleGroupSubmit() {
    if (!form.group_id || bookableMembers.length === 0) return;
    setBatchSubmitting(true);
    try {
      for (const member of bookableMembers) {
        await api.post('/bookings', {
          departure_id: departureId,
          traveller_id: member.traveller_id,
          group_id: form.group_id,
          status: form.status,
          final_price_cents: form.final_price_cents ? Number(form.final_price_cents) : undefined,
          currency,
          room_type_preference: form.room_type_preference,
          source: form.source,
          source_details: form.source_details || undefined,
          agent_name: form.agent_name || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['departure-bookings', departureId] });
      queryClient.invalidateQueries({ queryKey: ['departures', departureId] });
      onOpenChange(false);
      toast.success(`${bookableMembers.length} booking${bookableMembers.length > 1 ? 's' : ''} created`);
    } catch {
      toast.error('Failed to create some bookings');
    } finally {
      setBatchSubmitting(false);
    }
  }

  function handleIndividualSubmit() {
    if (!form.traveller_id) return;
    onSubmit({
      departure_id: departureId,
      traveller_id: form.traveller_id,
      group_id: form.group_id || undefined,
      status: form.status,
      final_price_cents: form.final_price_cents ? Number(form.final_price_cents) : undefined,
      currency,
      room_type_preference: form.room_type_preference,
      special_requests: form.special_requests || undefined,
      source: form.source,
      source_details: form.source_details || undefined,
      agent_name: form.agent_name || undefined,
    });
  }

  const isSubmitting = submitting || batchSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Booking</DialogTitle><DialogDescription>Book a traveller or group on this departure.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 0, background: 'var(--crm-bg-2)', borderRadius: 8, padding: 3 }}>
            {(['individual', 'group'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setForm(p => ({ ...p, traveller_id: '', group_id: '' })); }}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 13, fontWeight: mode === m ? 600 : 400, borderRadius: 6,
                  background: mode === m ? 'var(--crm-bg)' : 'transparent',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  color: mode === m ? 'var(--crm-text)' : 'var(--crm-text-3)',
                  border: 'none', cursor: 'pointer',
                }}>
                {m === 'individual' ? 'Individual' : 'Group'}
              </button>
            ))}
          </div>

          {/* Individual: pick traveller */}
          {mode === 'individual' && (
            <div className="grid gap-2">
              <Label>Traveller *</Label>
              <EntitySearch
                options={available.map(t => ({
                  id: t.id,
                  label: t.full_legal_name,
                  sublabel: [t.email, t.city].filter(Boolean).join(' · '),
                  initials: t.full_legal_name.split(' ').map(w => w[0]).join('').slice(0, 2),
                }))}
                value={form.traveller_id}
                onChange={(id) => setForm(p => ({ ...p, traveller_id: id }))}
                placeholder="Search travellers…"
                emptyMessage="No matching travellers"
              />
            </div>
          )}

          {/* Group: pick group, show members */}
          {mode === 'group' && (
            <div className="grid gap-2">
              <Label>Group *</Label>
              <EntitySearch
                options={groups.map(g => ({
                  id: g.id,
                  label: g.name,
                  sublabel: `${g.type} · ${g.members?.length ?? '?'} members`,
                  initials: g.name.charAt(0),
                }))}
                value={form.group_id}
                onChange={(id) => setForm(p => ({ ...p, group_id: id }))}
                placeholder="Search groups…"
                emptyMessage="No groups found"
              />
              {selectedGroup && (
                <div style={{ padding: '8px 12px', background: 'var(--crm-bg-2)', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedGroup.name} ({selectedGroup.type})</div>
                  {groupMembers.map(m => {
                    const alreadyBooked = existingTravellerIds.includes(m.traveller_id);
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', opacity: alreadyBooked ? 0.4 : 1 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: alreadyBooked ? 'var(--crm-text-4)' : 'var(--crm-green)', flexShrink: 0 }} />
                        <span>{m.traveller_name || m.traveller_id}</span>
                        {m.is_primary_coordinator && <span style={{ fontSize: 10, color: 'var(--crm-accent)' }}>Primary</span>}
                        {alreadyBooked && <span style={{ fontSize: 10, color: 'var(--crm-text-4)' }}>Already booked</span>}
                      </div>
                    );
                  })}
                  {bookableMembers.length === 0 && groupMembers.length > 0 && (
                    <div style={{ color: 'var(--crm-amber)', marginTop: 4 }}>All members already booked on this departure</div>
                  )}
                  {bookableMembers.length > 0 && (
                    <div style={{ color: 'var(--crm-green)', marginTop: 4 }}>{bookableMembers.length} member{bookableMembers.length > 1 ? 's' : ''} will be booked</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => { if (v) setForm(p => ({ ...p, status: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room Preference</Label>
              <Select value={form.room_type_preference} onValueChange={(v) => { if (v) setForm(p => ({ ...p, room_type_preference: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="twin_share">Twin Share</SelectItem>
                  <SelectItem value="triple_share">Triple Share</SelectItem>
                  <SelectItem value="dormitory">Dormitory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{mode === 'group' ? 'Price per person (paise)' : 'Price (paise)'}</Label>
            <Input type="number" value={form.final_price_cents} onChange={(e) => setForm(p => ({ ...p, final_price_cents: e.target.value }))} placeholder={defaultPrice ? `Default: ${defaultPrice}` : 'Enter price'} />
          </div>

          {/* Source tracking */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => { if (v) setForm(p => ({ ...p, source: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOOKING_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.source === 'agent' && (
              <div className="grid gap-2">
                <Label>Agent Name</Label>
                <Input value={form.agent_name} onChange={(e) => setForm(p => ({ ...p, agent_name: e.target.value }))} placeholder="Agent or agency name" />
              </div>
            )}
            {form.source !== 'agent' && form.source !== 'direct' && (
              <div className="grid gap-2">
                <Label>Source Details</Label>
                <Input value={form.source_details} onChange={(e) => setForm(p => ({ ...p, source_details: e.target.value }))} placeholder="Additional details" />
              </div>
            )}
          </div>

          {mode === 'individual' && (
            <div className="grid gap-2">
              <Label>Special Requests</Label>
              <textarea value={form.special_requests} onChange={(e) => setForm(p => ({ ...p, special_requests: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                placeholder="Dietary, accessibility, etc." />
            </div>
          )}
        </div>
        <DialogFooter>
          {mode === 'individual' ? (
            <button className="crm-btn primary" onClick={handleIndividualSubmit} disabled={isSubmitting || !form.traveller_id}>
              {isSubmitting ? 'Creating...' : 'Create Booking'}
            </button>
          ) : (
            <button className="crm-btn primary" onClick={handleGroupSubmit} disabled={isSubmitting || bookableMembers.length === 0}>
              {batchSubmitting ? 'Creating...' : `Book ${bookableMembers.length} member${bookableMembers.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── RecordPaymentDialog ────────────────────── */

function RecordPaymentDialog({ open, onOpenChange, booking, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  booking?: Booking; onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const balance = booking ? (booking.final_price_cents || 0) - (booking.total_paid || 0) : 0;
  const [form, setForm] = useState({
    amount_cents: '', type: 'installment', status: 'completed',
    payment_method: '', reference_number: '', notes: '',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {booking?.traveller_name}
            {balance > 0 && <> &middot; Balance: <strong>{formatCurrency(balance, booking?.currency || 'INR')}</strong></>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Amount (paise) *</Label>
              <Input type="number" value={form.amount_cents} onChange={(e) => setForm(p => ({ ...p, amount_cents: e.target.value }))} placeholder={balance > 0 ? `Balance: ${balance}` : ''} />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => { if (v) setForm(p => ({ ...p, type: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="installment">Installment</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Input value={form.payment_method} onChange={(e) => setForm(p => ({ ...p, payment_method: e.target.value }))} placeholder="UPI, bank transfer, etc." />
            </div>
            <div className="grid gap-2">
              <Label>Reference</Label>
              <Input value={form.reference_number} onChange={(e) => setForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="Transaction ID" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <button className="crm-btn primary" disabled={submitting || !form.amount_cents}
            onClick={() => onSubmit({
              amount_cents: Number(form.amount_cents), currency: booking?.currency || 'INR',
              type: form.type, status: form.status,
              payment_method: form.payment_method || undefined, reference_number: form.reference_number || undefined,
              notes: form.notes || undefined,
            })}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── LogisticsSection ──────────────────────────── */

function LogisticsSection({ departure, staffList, onSave, saving }: {
  departure: Departure; staffList: StaffMember[];
  onSave: (fields: Record<string, unknown>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    trip_leader_id: departure.trip_leader_id ?? '',
    co_leader_id: departure.co_leader_id ?? '',
    ops_owner_id: departure.ops_owner_id ?? '',
    meeting_point: departure.meeting_point ?? '',
    meeting_time: departure.meeting_time ?? '',
    whatsapp_link: departure.whatsapp_link ?? '',
    live_status: departure.live_status ?? 'not_started',
    current_day: departure.current_day ?? 1,
    actual_start_date: departure.actual_start_date ?? '',
    actual_end_date: departure.actual_end_date ?? '',
    emergency_contact_name: departure.emergency_contact_name ?? '',
    emergency_contact_phone: departure.emergency_contact_phone ?? '',
  });

  const [dirty, setDirty] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    onSave({
      trip_leader_id: form.trip_leader_id || null,
      co_leader_id: form.co_leader_id || null,
      ops_owner_id: form.ops_owner_id || null,
      meeting_point: form.meeting_point || null,
      meeting_time: form.meeting_time || null,
      whatsapp_link: form.whatsapp_link || null,
      live_status: form.live_status,
      current_day: form.live_status === 'in_progress' ? (form.current_day || 1) : undefined,
      actual_start_date: form.actual_start_date || null,
      actual_end_date: form.actual_end_date || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
    });
    setDirty(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6,
    border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
    color: 'var(--crm-text)', fontFamily: 'var(--font-sans)',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: 'auto' as React.CSSProperties['appearance'],
  };

  function staffName(staffId: string) {
    const s = staffList.find(x => x.id === staffId);
    return s ? s.name : '';
  }

  return (
    <div className="crm-card crm-card-pad" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} style={{ color: 'var(--crm-text-3)' }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Logistics &amp; Operations</h3>
        </div>
        {dirty && (
          <button className="crm-btn primary sm" onClick={handleSave} disabled={saving}>
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Team */}
          <div>
            <div className="crm-caption" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Trip Leader</div>
                <select style={selectStyle} value={form.trip_leader_id} onChange={(e) => update('trip_leader_id', e.target.value)}>
                  <option value="">-- None --</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Co-Leader</div>
                <select style={selectStyle} value={form.co_leader_id} onChange={(e) => update('co_leader_id', e.target.value)}>
                  <option value="">-- None --</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Ops Owner</div>
                <select style={selectStyle} value={form.ops_owner_id} onChange={(e) => update('ops_owner_id', e.target.value)}>
                  <option value="">-- None --</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Meeting */}
          <div>
            <div className="crm-caption" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meeting</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Meeting Point</div>
                <input style={inputStyle} value={form.meeting_point} onChange={(e) => update('meeting_point', e.target.value)} placeholder="e.g. Kashmere Gate ISBT" />
              </div>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Meeting Time</div>
                <input type="time" style={inputStyle} value={form.meeting_time} onChange={(e) => update('meeting_time', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Communication */}
          <div>
            <div className="crm-caption" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Communication</div>
            <div>
              <div className="crm-caption" style={{ marginBottom: 4 }}>WhatsApp Group Link</div>
              <input style={inputStyle} value={form.whatsapp_link} onChange={(e) => update('whatsapp_link', e.target.value)} placeholder="https://chat.whatsapp.com/..." />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live Tracking */}
          <div>
            <div className="crm-caption" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Tracking</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Live Status</div>
                <select style={selectStyle} value={form.live_status} onChange={(e) => update('live_status', e.target.value)}>
                  {LIVE_STATUSES.map(s => <option key={s} value={s}>{LIVE_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              {form.live_status === 'in_progress' && (
                <div>
                  <div className="crm-caption" style={{ marginBottom: 4 }}>Current Day</div>
                  <input type="number" min={1} style={inputStyle} value={form.current_day} onChange={(e) => update('current_day', parseInt(e.target.value) || 1)} />
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Actual Start</div>
                <input type="date" style={inputStyle} value={form.actual_start_date} onChange={(e) => update('actual_start_date', e.target.value)} />
              </div>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Actual End</div>
                <input type="date" style={inputStyle} value={form.actual_end_date} onChange={(e) => update('actual_end_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Emergency */}
          <div>
            <div className="crm-caption" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Emergency Contact</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Name</div>
                <input style={inputStyle} value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} placeholder="Contact name" />
              </div>
              <div>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Phone</div>
                <input style={inputStyle} value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} placeholder="+91..." />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
