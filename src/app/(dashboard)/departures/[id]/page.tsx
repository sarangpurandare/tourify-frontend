'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Departure } from '@/types/departure';
import type { Booking, Payment } from '@/types/booking';
import type { Traveller } from '@/types/traveller';
import type { ItineraryDay } from '@/types/itinerary';
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
import { FileUpload } from '@/components/ui/file-upload';
import {
  ArrowLeft, Clock, Users, MapPin, Pencil, Plus, Mountain, FileText,
  CreditCard, ChevronDown, ChevronRight, UserPlus, DollarSign,
  AlertCircle, CheckCircle2, XCircle, Wallet, Eye,
} from 'lucide-react';

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

const TABS = ['Overview', 'Travellers', 'Itinerary'] as const;

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
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

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

  const dep = data?.data;
  const itinerary = itineraryData?.data ?? [];
  const bookings = bookingsData?.data ?? [];
  const allTravellers = travellersData?.data ?? [];

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
    mutationFn: (is_published: boolean) => api.patch<APIResponse<Departure>>(`/departures/${id}/publish`, { is_published }),
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

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Loading departure...</span></div>;
  if (!dep) return <div style={{ padding: 40, textAlign: 'center' }}><span className="crm-caption">Departure not found.</span></div>;

  const spotsLeft = dep.spots_remaining;
  const pct = dep.capacity > 0 ? Math.round((dep.confirmed_count / dep.capacity) * 100) : 0;
  const days = daysUntil(dep.start_date);

  return (
    <div>
      {/* ─── Hero ────────────────────────────── */}
      <div className="crm-img-plc" style={{ height: 100, borderRadius: 0 }}>
        [ departure hero ]
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
          <button
            onClick={() => publishMutation.mutate(!dep.is_published)}
            disabled={publishMutation.isPending}
            className={`crm-pill ${dep.is_published ? 'green' : ''}`}
            style={{ cursor: 'pointer', border: 'none', fontWeight: 500 }}
          >
            <span className="dot" />{dep.is_published ? 'Published' : 'Unpublished'}
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
        {TABS.map(t => (
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
            {/* Status control */}
            <div style={{ marginBottom: 24 }}>
              <div className="crm-caption" style={{ marginBottom: 8 }}>Change status</div>
              <div className="crm-seg">
                {STATUSES.map((s) => (
                  <button key={s} className={dep.status === s ? 'on' : ''} disabled={statusMutation.isPending}
                    onClick={() => { if (dep.status !== s) statusMutation.mutate(s); }}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <div className="crm-card crm-card-pad" style={{ textAlign: 'center' }}>
                <div className="crm-caption" style={{ marginBottom: 4 }}>Capacity</div>
                <div className="crm-tabular" style={{ fontSize: 22, fontWeight: 700 }}>{dep.confirmed_count}<span className="crm-dim" style={{ fontSize: 14 }}>/{dep.capacity}</span></div>
                <div className={`crm-progress ${pct >= 90 ? 'amber' : 'green'}`} style={{ marginTop: 8 }}><span style={{ width: `${pct}%` }} /></div>
              </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Capacity card */}
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
                  const isExpanded = expandedBooking === booking.id;
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
                        onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                      >
                        <div>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{booking.traveller_name || 'Unknown'}</div>
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
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <BookingDetail
                          booking={booking}
                          currency={dep.pricing_currency}
                          onRecordPayment={() => setPaymentOpen(booking.id)}
                          onCancel={(reason) => cancelBookingMutation.mutate({ bookingId: booking.id, reason })}
                          cancelling={cancelBookingMutation.isPending}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
    </div>
  );
}

/* ─── BookingDetail (expanded row) ───────────── */

function BookingDetail({ booking, currency, onRecordPayment, onCancel, cancelling }: {
  booking: Booking; currency: string;
  onRecordPayment: () => void; onCancel: (reason: string) => void; cancelling: boolean;
}) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const queryClient = useQueryClient();

  const { data: paymentsData } = useQuery({
    queryKey: ['booking-payments', booking.id],
    queryFn: () => api.get<APIResponse<Payment[]>>(`/bookings/${booking.id}/payments`),
  });

  const payments = paymentsData?.data ?? [];
  const balance = (booking.final_price_cents || 0) - (booking.total_paid || 0);
  const isCancelled = booking.status === 'cancelled';

  return (
    <div style={{ padding: '0 16px 16px 56px', fontSize: 13 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Info */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 16 }}>
            <div><div className="crm-caption" style={{ marginBottom: 2 }}>Room</div><div style={{ fontWeight: 500 }}>{booking.room_type_preference?.replace('_', ' ') || 'Not specified'}</div></div>
            <div><div className="crm-caption" style={{ marginBottom: 2 }}>Booked</div><div style={{ fontWeight: 500 }}>{formatDate(booking.booking_date)}</div></div>
            {booking.special_requests && (
              <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Special Requests</div><div style={{ fontWeight: 500 }}>{booking.special_requests}</div></div>
            )}
            {booking.emergency_contact_name && (
              <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Emergency Contact</div><div style={{ fontWeight: 500 }}>{booking.emergency_contact_name} ({booking.emergency_contact_relation}) &middot; {booking.emergency_contact_phone}</div></div>
            )}
            {booking.internal_notes && (
              <div style={{ gridColumn: '1 / -1' }}><div className="crm-caption" style={{ marginBottom: 2 }}>Internal Notes</div><div style={{ fontWeight: 500, fontStyle: 'italic' }}>{booking.internal_notes}</div></div>
            )}
          </div>

          {/* Cancel section */}
          {!isCancelled && (
            <div>
              {!showCancel ? (
                <button className="crm-btn ghost sm" style={{ color: 'var(--crm-pink)' }} onClick={() => setShowCancel(true)}>
                  <XCircle size={13} /> Cancel Booking
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancellation reason..."
                    style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)' }}
                  />
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

        {/* Right: Payments */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Payments</div>
            {!isCancelled && (
              <button className="crm-btn primary sm" onClick={onRecordPayment}><DollarSign size={12} /> Record</button>
            )}
          </div>

          {/* Payment summary */}
          <div style={{ display: 'flex', gap: 16, padding: '8px 12px', background: 'var(--crm-bg-2)', borderRadius: 6, marginBottom: 10, fontSize: 12 }}>
            <div><span className="crm-caption">Total</span> <strong style={{ marginLeft: 4 }}>{booking.final_price_cents ? formatCurrency(booking.final_price_cents, currency) : '--'}</strong></div>
            <div><span className="crm-caption">Paid</span> <strong style={{ marginLeft: 4, color: 'var(--crm-green)' }}>{formatCurrency(booking.total_paid || 0, currency)}</strong></div>
            <div><span className="crm-caption">Due</span> <strong style={{ marginLeft: 4, color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatCurrency(Math.max(0, balance), currency)}</strong></div>
          </div>

          {/* Payment list */}
          {payments.length === 0 ? (
            <div className="crm-caption" style={{ padding: '12px 0', textAlign: 'center' }}>No payments recorded</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {payments.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--crm-bg-2)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.status === 'completed' ? <CheckCircle2 size={13} style={{ color: 'var(--crm-green)' }} /> : <AlertCircle size={13} style={{ color: 'var(--crm-amber)' }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(p.amount_cents, p.currency)}</div>
                      <div className="crm-caption">{p.type} &middot; {p.payment_method || 'N/A'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`crm-pill ${p.status === 'completed' ? 'green' : p.status === 'failed' ? 'pink' : ''}`} style={{ fontSize: 10 }}>
                      {p.status}
                    </span>
                    {p.paid_date && <div className="crm-caption">{formatDate(p.paid_date)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── AddBookingDialog ───────────────────────── */

function AddBookingDialog({ open, onOpenChange, departureId, travellers, existingTravellerIds, currency, defaultPrice, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  departureId: string; travellers: Traveller[];
  existingTravellerIds: string[]; currency: string;
  defaultPrice?: number; onSubmit: (body: Record<string, unknown>) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    traveller_id: '', status: 'confirmed', final_price_cents: defaultPrice?.toString() || '',
    room_type_preference: 'twin_share', special_requests: '',
  });
  const [search, setSearch] = useState('');

  const available = travellers.filter(t =>
    !existingTravellerIds.includes(t.id) &&
    (search === '' || t.full_legal_name.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit() {
    if (!form.traveller_id) return;
    onSubmit({
      departure_id: departureId,
      traveller_id: form.traveller_id,
      status: form.status,
      final_price_cents: form.final_price_cents ? Number(form.final_price_cents) : undefined,
      currency,
      room_type_preference: form.room_type_preference,
      special_requests: form.special_requests || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Booking</DialogTitle><DialogDescription>Book a traveller on this departure.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Traveller search & select */}
          <div className="grid gap-2">
            <Label>Traveller *</Label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)' }}
            />
            {(search || form.traveller_id) && (
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--crm-hairline)', borderRadius: 8, background: 'var(--crm-bg-2)' }}>
                {available.slice(0, 20).map(t => (
                  <div key={t.id} onClick={() => { setForm(p => ({ ...p, traveller_id: t.id })); setSearch(t.full_legal_name); }}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      background: form.traveller_id === t.id ? 'var(--crm-accent-light, rgba(59,130,246,0.1))' : 'transparent',
                    }}>
                    <div style={{ fontWeight: 500 }}>{t.full_legal_name}</div>
                    <div className="crm-caption">{[t.email, t.city].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
                {available.length === 0 && <div style={{ padding: '12px', textAlign: 'center' }} className="crm-caption">No matching travellers</div>}
              </div>
            )}
          </div>

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
            <Label>Price (paise)</Label>
            <Input type="number" value={form.final_price_cents} onChange={(e) => setForm(p => ({ ...p, final_price_cents: e.target.value }))} placeholder={defaultPrice ? `Default: ${defaultPrice}` : 'Enter price'} />
          </div>

          <div className="grid gap-2">
            <Label>Special Requests</Label>
            <textarea value={form.special_requests} onChange={(e) => setForm(p => ({ ...p, special_requests: e.target.value }))} rows={2}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)', color: 'var(--crm-text)', fontFamily: 'var(--font-sans)', resize: 'vertical' }}
              placeholder="Dietary, accessibility, etc." />
          </div>
        </div>
        <DialogFooter>
          <button className="crm-btn primary" onClick={handleSubmit} disabled={submitting || !form.traveller_id}>
            {submitting ? 'Creating...' : 'Create Booking'}
          </button>
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
