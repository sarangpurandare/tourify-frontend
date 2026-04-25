'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Booking, Payment, BookingDocument } from '@/types/booking';
import { Departure } from '@/types/departure';
import { Traveller } from '@/types/traveller';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';
import { CalendarCheck, CreditCard, FileCheck, X, Plus, IndianRupee, AlertCircle, CheckCircle2, Clock, Ban } from 'lucide-react';

interface APIResponse<T> { data: T }
interface APIList<T> { data: T[]; meta: { page: number; per_page: number; total: number } }

const BOOKING_STATUSES: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: 'var(--crm-green)' },
  waitlisted: { label: 'Waitlisted', color: 'var(--crm-amber)' },
  cancelled: { label: 'Cancelled', color: 'var(--crm-red)' },
  no_show: { label: 'No Show', color: 'var(--crm-text-3)' },
  completed: { label: 'Completed', color: 'var(--crm-blue)' },
};

const PAYMENT_STATUSES: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', color: 'var(--crm-amber)', icon: Clock },
  partial: { label: 'Partial', color: 'var(--crm-blue)', icon: IndianRupee },
  paid: { label: 'Paid', color: 'var(--crm-green)', icon: CheckCircle2 },
  refunded: { label: 'Refunded', color: 'var(--crm-red)', icon: AlertCircle },
  waived: { label: 'Waived', color: 'var(--crm-text-3)', icon: Ban },
};

function formatPrice(cents?: number | null) {
  if (cents == null) return '--';
  return '₹' + (cents / 100).toLocaleString('en-IN');
}

function formatDate(d?: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const [newBooking, setNewBooking] = useState({ departure_id: '', traveller_id: '', final_price_cents: '', room_type_preference: '', special_requests: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', type: 'installment', status: 'completed', payment_method: 'bank_transfer', reference_number: '', notes: '' });
  const [newDoc, setNewDoc] = useState({ document_type: 'passport_copy', label: '', is_required: true });

  const { data: departuresData } = useQuery({
    queryKey: ['departures-for-booking'],
    queryFn: () => api.get<APIList<Departure>>('/departures?per_page=200'),
    enabled: addOpen,
  });
  const departures = departuresData?.data ?? [];

  const { data: travellersData } = useQuery({
    queryKey: ['travellers-for-booking'],
    queryFn: () => api.get<APIList<Traveller>>('/travellers?per_page=200'),
    enabled: addOpen,
  });
  const travellers = travellersData?.data ?? [];

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', statusFilter, paymentFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (paymentFilter) params.set('payment_status', paymentFilter);
      params.set('per_page', '100');
      return api.get<APIList<Booking>>(`/bookings?${params}`);
    },
  });
  const bookings = bookingsData?.data ?? [];
  const total = bookingsData?.meta?.total ?? 0;

  const selected = bookings.find(b => b.id === selectedId) ?? null;

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', selectedId],
    queryFn: () => api.get<APIResponse<Payment[]>>(`/bookings/${selectedId}/payments`),
    enabled: !!selectedId,
  });
  const payments = paymentsData?.data ?? [];

  const { data: docsData } = useQuery({
    queryKey: ['documents', selectedId],
    queryFn: () => api.get<APIResponse<BookingDocument[]>>(`/bookings/${selectedId}/documents`),
    enabled: !!selectedId,
  });
  const docs = docsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<APIResponse<Booking>>('/bookings', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setAddOpen(false);
      setSelectedId(res.data.id);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.post<APIResponse<unknown>>(`/bookings/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<Payment>>(`/bookings/${bookingId}/payments`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setPaymentOpen(false);
      setNewPayment({ amount: '', type: 'installment', status: 'completed', payment_method: 'bank_transfer', reference_number: '', notes: '' });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: ({ bookingId, body }: { bookingId: string; body: Record<string, unknown> }) =>
      api.post<APIResponse<BookingDocument>>(`/bookings/${bookingId}/documents`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', selectedId] });
      setDocOpen(false);
      setNewDoc({ document_type: 'passport_copy', label: '', is_required: true });
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ bookingId, docId, body }: { bookingId: string; docId: string; body: Record<string, unknown> }) =>
      api.patch<APIResponse<unknown>>(`/bookings/${bookingId}/documents/${docId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', selectedId] });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ bookingId, paymentId, body }: { bookingId: string; paymentId: string; body: Record<string, unknown> }) =>
      api.patch<APIResponse<unknown>>(`/bookings/${bookingId}/payments/${paymentId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedId] });
    },
  });

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount_cents, 0);
  const balance = selected?.final_price_cents ? selected.final_price_cents - totalPaid : 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="crm-page-title">Bookings</h1>
            <div className="crm-dim" style={{ fontSize: 13 }}>{total} total</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={statusFilter || undefined} onValueChange={(val) => setStatusFilter(!val || val === 'all' ? '' : val)}>
              <SelectTrigger style={{ width: 140 }}><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(BOOKING_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={paymentFilter || undefined} onValueChange={(val) => setPaymentFilter(!val || val === 'all' ? '' : val)}>
              <SelectTrigger style={{ width: 140 }}><SelectValue placeholder="All payments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {Object.entries(PAYMENT_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setAddOpen(true)} style={{ gap: 6 }}>
              <Plus size={14} /> Add Booking
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {Object.entries(BOOKING_STATUSES).map(([key, val]) => {
            const count = bookings.filter(b => b.status === key).length;
            return (
              <div key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                style={{ flex: 1, padding: '12px 16px', background: 'var(--crm-bg-2)', borderRadius: 8, cursor: 'pointer', border: statusFilter === key ? `2px solid ${val.color}` : '2px solid transparent' }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: val.color }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase' }}>{val.label}</div>
              </div>
            );
          })}
        </div>

        {/* Bookings table */}
        <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-border)', background: 'var(--crm-bg-2)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Traveller</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Trip / Departure</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Amount</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Payment</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase' }}>Booked</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const bs = BOOKING_STATUSES[b.status] ?? { label: b.status, color: 'var(--crm-text-3)' };
                const ps = PAYMENT_STATUSES[b.payment_status] ?? { label: b.payment_status, color: 'var(--crm-text-3)', icon: Clock };
                return (
                  <tr key={b.id} onClick={() => setSelectedId(b.id)}
                    style={{ borderBottom: '1px solid var(--crm-border)', cursor: 'pointer', background: b.id === selectedId ? 'var(--crm-bg-2)' : undefined }}
                    onMouseOver={e => { if (b.id !== selectedId) (e.currentTarget.style.background = 'var(--crm-bg-2)'); }}
                    onMouseOut={e => { if (b.id !== selectedId) (e.currentTarget.style.background = ''); }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{b.traveller_name || '--'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{b.trip_name || '--'}</div>
                      <div className="crm-dim" style={{ fontSize: 11 }}>{formatDate(b.departure_date)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bs.color + '18', color: bs.color }}>{bs.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <div>{formatPrice(b.final_price_cents)}</div>
                      {b.total_paid > 0 && <div style={{ fontSize: 11, color: 'var(--crm-green)' }}>Paid: {formatPrice(b.total_paid)}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: ps.color + '18', color: ps.color }}>
                        <ps.icon size={11} />{ps.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)' }}>{timeAgo(b.booking_date)}</td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)' }}>No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail sidebar */}
      {selected && (
        <div style={{ width: 380, borderLeft: '1px solid var(--crm-border)', overflow: 'auto', background: 'var(--crm-bg)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>{selected.traveller_name}</h2>
            <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-text-3)' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: (BOOKING_STATUSES[selected.status]?.color ?? 'gray') + '18', color: BOOKING_STATUSES[selected.status]?.color ?? 'gray' }}>
              {BOOKING_STATUSES[selected.status]?.label ?? selected.status}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: (PAYMENT_STATUSES[selected.payment_status]?.color ?? 'gray') + '18', color: PAYMENT_STATUSES[selected.payment_status]?.color ?? 'gray' }}>
              {PAYMENT_STATUSES[selected.payment_status]?.label ?? selected.payment_status}
            </span>
          </div>

          <div className="crm-card" style={{ padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Trip Details</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{selected.trip_name || '--'}</div>
            <div className="crm-dim" style={{ fontSize: 12 }}>Departure: {formatDate(selected.departure_date)}</div>
            {selected.room_type_preference && <div className="crm-dim" style={{ fontSize: 12, marginTop: 4 }}>Room: {selected.room_type_preference.replace('_', ' ')}</div>}
            {selected.special_requests && <div style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic', color: 'var(--crm-text-3)' }}>{selected.special_requests}</div>}
          </div>

          {/* Financial summary */}
          <div className="crm-card" style={{ padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Financials</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-3)' }}>Total</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{formatPrice(selected.final_price_cents)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-3)' }}>Paid</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-green)' }}>{formatPrice(totalPaid)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-3)' }}>Balance</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: balance > 0 ? 'var(--crm-red)' : 'var(--crm-green)' }}>{formatPrice(balance)}</div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <Button size="sm" onClick={() => setPaymentOpen(true)} style={{ gap: 4, flex: 1 }}>
              <CreditCard size={13} /> Record Payment
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDocOpen(true)} style={{ gap: 4, flex: 1 }}>
              <FileCheck size={13} /> Add Doc
            </Button>
            {selected.status !== 'cancelled' && (
              <Button size="sm" variant="outline" onClick={() => {
                if (confirm('Cancel this booking?')) cancelMutation.mutate({ id: selected.id });
              }} style={{ gap: 4, color: 'var(--crm-red)' }}>
                <Ban size={13} />
              </Button>
            )}
          </div>

          {/* Payments list */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Payments ({payments.length})</div>
            {payments.map(p => (
              <div key={p.id} className="crm-card" style={{ padding: '8px 12px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{formatPrice(p.amount_cents)}</span>
                    <span className="crm-dim" style={{ fontSize: 11, marginLeft: 6 }}>{p.type}</span>
                  </div>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 600,
                    background: p.status === 'completed' ? 'var(--crm-green)18' : 'var(--crm-amber)18',
                    color: p.status === 'completed' ? 'var(--crm-green)' : 'var(--crm-amber)' }}>
                    {p.status}
                  </span>
                </div>
                <div className="crm-dim" style={{ fontSize: 11 }}>
                  {p.payment_method?.replace('_', ' ')} {p.reference_number ? `• ${p.reference_number}` : ''}
                  {p.paid_date ? ` • ${formatDate(p.paid_date)}` : p.scheduled_date ? ` • Due: ${formatDate(p.scheduled_date)}` : ''}
                </div>
                {p.receipt_url ? (
                  <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--crm-accent)', display: 'inline-block', marginTop: 4 }}>
                    View receipt
                  </a>
                ) : p.status === 'completed' && (
                  <div style={{ marginTop: 4 }}>
                    <FileUpload
                      value={p.receipt_url}
                      onChange={async (url) => {
                        if (url) {
                          await updatePaymentMutation.mutateAsync({
                            bookingId: selected.id,
                            paymentId: p.id,
                            body: { receipt_url: url },
                          });
                        }
                      }}
                      accept="image/*,.pdf"
                      label="Upload receipt"
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
            {payments.length === 0 && <div className="crm-dim" style={{ fontSize: 12 }}>No payments recorded</div>}
          </div>

          {/* Documents list */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', marginBottom: 8 }}>Documents ({docs.length})</div>
            {docs.map(d => {
              const statusColor = d.status === 'verified' ? 'var(--crm-green)' : d.status === 'rejected' ? 'var(--crm-red)' : d.status === 'uploaded' ? 'var(--crm-blue)' : 'var(--crm-amber)';
              return (
                <div key={d.id} className="crm-card" style={{ padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{d.label}</span>
                      {d.is_required && <span style={{ fontSize: 10, color: 'var(--crm-red)', marginLeft: 4 }}>*</span>}
                    </div>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 600, background: statusColor + '18', color: statusColor }}>{d.status}</span>
                  </div>
                  <div className="crm-dim" style={{ fontSize: 11 }}>{d.document_type.replace(/_/g, ' ')}</div>
                  {d.status === 'pending' && (
                    <div style={{ marginTop: 6 }}>
                      <FileUpload
                        value={d.file_url}
                        onChange={async (url) => {
                          if (url) {
                            await updateDocMutation.mutateAsync({
                              bookingId: selected.id,
                              docId: d.id,
                              body: { status: 'uploaded', file_url: url },
                            });
                          }
                        }}
                        accept="image/*,.pdf"
                        label="Upload document"
                        compact
                      />
                    </div>
                  )}
                  {d.file_url && d.status !== 'pending' && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--crm-accent)', display: 'inline-block', marginTop: 4 }}>
                      View document
                    </a>
                  )}
                  {d.status === 'uploaded' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <button onClick={() => updateDocMutation.mutate({ bookingId: selected.id, docId: d.id, body: { status: 'verified' } })}
                        style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--crm-green)', background: 'none', color: 'var(--crm-green)', cursor: 'pointer' }}>Verify</button>
                      <button onClick={() => updateDocMutation.mutate({ bookingId: selected.id, docId: d.id, body: { status: 'rejected', rejection_reason: 'Document unclear' } })}
                        style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--crm-red)', background: 'none', color: 'var(--crm-red)', cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
            {docs.length === 0 && <div className="crm-dim" style={{ fontSize: 12 }}>No document requirements set</div>}
          </div>

          {/* Emergency contact */}
          {selected.emergency_contact_name && (
            <div className="crm-card" style={{ padding: 12, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Emergency Contact</div>
              <div style={{ fontSize: 13 }}>{selected.emergency_contact_name} ({selected.emergency_contact_relation || '--'})</div>
              <div className="crm-dim" style={{ fontSize: 12 }}>{selected.emergency_contact_phone}</div>
            </div>
          )}
        </div>
      )}

      {/* Add Booking dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Booking</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Departure</label>
              <Select value={newBooking.departure_id || undefined} onValueChange={(val) => setNewBooking(s => ({ ...s, departure_id: val ?? '' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select departure...">
                    {(() => { const dep = departures.find(d => d.id === newBooking.departure_id); return dep ? `${dep.trip_name || 'Unnamed trip'} — ${formatDate(dep.start_date)}` : 'Select departure...'; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent style={{ minWidth: 400 }}>
                  {departures.map(dep => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.trip_name || 'Unnamed trip'} — {formatDate(dep.start_date)} ({dep.spots_remaining} spots left)
                    </SelectItem>
                  ))}
                  {departures.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--crm-text-3)' }}>No departures found</div>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="crm-caption">Traveller</label>
              <Select value={newBooking.traveller_id || undefined} onValueChange={(val) => setNewBooking(s => ({ ...s, traveller_id: val ?? '' }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select traveller...">
                    {(() => { const t = travellers.find(tr => tr.id === newBooking.traveller_id); return t ? `${t.full_legal_name}${t.city ? ` — ${t.city}` : ''}` : 'Select traveller...'; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent style={{ minWidth: 400 }}>
                  {travellers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_legal_name}{t.city ? ` — ${t.city}` : ''}{t.phone ? ` (${t.phone})` : ''}
                    </SelectItem>
                  ))}
                  {travellers.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--crm-text-3)' }}>No travellers found</div>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="crm-caption">Final Price (₹)</label>
              <Input type="number" value={newBooking.final_price_cents} onChange={e => setNewBooking(s => ({ ...s, final_price_cents: e.target.value }))} placeholder="Amount in rupees" />
            </div>
            <div>
              <label className="crm-caption">Room Preference</label>
              <Select value={newBooking.room_type_preference || undefined} onValueChange={(val) => setNewBooking(s => ({ ...s, room_type_preference: val ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="twin_share">Twin Share</SelectItem>
                  <SelectItem value="triple_share">Triple Share</SelectItem>
                  <SelectItem value="dormitory">Dormitory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="crm-caption">Special Requests</label>
              <Input value={newBooking.special_requests} onChange={e => setNewBooking(s => ({ ...s, special_requests: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              const priceCents = newBooking.final_price_cents ? parseInt(newBooking.final_price_cents) * 100 : undefined;
              createMutation.mutate({
                departure_id: newBooking.departure_id,
                traveller_id: newBooking.traveller_id,
                final_price_cents: priceCents,
                room_type_preference: newBooking.room_type_preference || undefined,
                special_requests: newBooking.special_requests || undefined,
              });
            }} disabled={!newBooking.departure_id || !newBooking.traveller_id}>
              <CalendarCheck size={14} /> Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Amount (₹)</label>
              <Input type="number" value={newPayment.amount} onChange={e => setNewPayment(s => ({ ...s, amount: e.target.value }))} placeholder="Amount in rupees" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="crm-caption">Type</label>
                <Select value={newPayment.type} onValueChange={(val) => setNewPayment(s => ({ ...s, type: val ?? 'installment' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="installment">Installment</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="crm-caption">Status</label>
                <Select value={newPayment.status} onValueChange={(val) => setNewPayment(s => ({ ...s, status: val ?? 'completed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="crm-caption">Payment Method</label>
              <Select value={newPayment.payment_method} onValueChange={(val) => setNewPayment(s => ({ ...s, payment_method: val ?? 'bank_transfer' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="razorpay">Razorpay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="crm-caption">Reference Number</label>
              <Input value={newPayment.reference_number} onChange={e => setNewPayment(s => ({ ...s, reference_number: e.target.value }))} placeholder="Transaction ref" />
            </div>
            <div>
              <label className="crm-caption">Notes</label>
              <Input value={newPayment.notes} onChange={e => setNewPayment(s => ({ ...s, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!selectedId || !newPayment.amount) return;
              createPaymentMutation.mutate({
                bookingId: selectedId,
                body: {
                  amount_cents: parseInt(newPayment.amount) * 100,
                  type: newPayment.type,
                  status: newPayment.status,
                  payment_method: newPayment.payment_method,
                  reference_number: newPayment.reference_number || undefined,
                  notes: newPayment.notes || undefined,
                  paid_date: newPayment.status === 'completed' ? new Date().toISOString() : undefined,
                },
              });
            }} disabled={!newPayment.amount}>
              <CreditCard size={14} /> Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Requirement dialog */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document Requirement</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Document Type</label>
              <Select value={newDoc.document_type} onValueChange={(val) => setNewDoc(s => ({ ...s, document_type: val ?? 'passport_copy' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport_copy">Passport Copy</SelectItem>
                  <SelectItem value="visa_copy">Visa Copy</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="medical_certificate">Medical Certificate</SelectItem>
                  <SelectItem value="insurance_copy">Insurance Copy</SelectItem>
                  <SelectItem value="waiver_signed">Waiver (Signed)</SelectItem>
                  <SelectItem value="flight_ticket">Flight Ticket</SelectItem>
                  <SelectItem value="vaccination_certificate">Vaccination Certificate</SelectItem>
                  <SelectItem value="id_proof">ID Proof</SelectItem>
                  <SelectItem value="consent_form">Consent Form</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="crm-caption">Label</label>
              <Input value={newDoc.label} onChange={e => setNewDoc(s => ({ ...s, label: e.target.value }))} placeholder="e.g. Passport front page" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!selectedId || !newDoc.label) return;
              createDocMutation.mutate({
                bookingId: selectedId,
                body: { document_type: newDoc.document_type, label: newDoc.label, is_required: newDoc.is_required },
              });
            }} disabled={!newDoc.label}>
              <FileCheck size={14} /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
