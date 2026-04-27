'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Booking, Payment, BookingDocument } from '@/types/booking';
import type { DepartureChecklistItem } from '@/types/checklist';
import type { Group } from '@/types/group';
import { Departure } from '@/types/departure';
import { Traveller } from '@/types/traveller';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EntitySearch } from '@/components/entity-search';
import { CalendarCheck, CreditCard, FileCheck, X, Plus, IndianRupee, AlertCircle, CheckCircle2, Clock, Ban, Link2, DollarSign, FileText, Eye, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

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

function formatPrice(cents?: number | null, currency = 'INR') {
  if (cents == null) return '--';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString('en-IN')}`;
  }
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

  const [newBooking, setNewBooking] = useState({ departure_id: '', traveller_id: '', final_price_rupees: '', room_type_preference: '', special_requests: '' });
  const [priceError, setPriceError] = useState('');
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

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<APIResponse<Booking>>('/bookings', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setAddOpen(false);
      setSelectedId(res.data.id);
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to create booking');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.post<APIResponse<unknown>>(`/bookings/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to cancel booking');
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
    onError: (err: Error) => {
      alert(err.message || 'Failed to record payment');
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
    onError: (err: Error) => {
      alert(err.message || 'Failed to add document requirement');
    },
  });


  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 24 }}>
      {/* Main content */}
      <div>
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
                    style={{ borderBottom: '1px solid var(--crm-border)', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--crm-bg-2)')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {b.traveller_name || '--'}
                        {b.group_id && <Users size={12} style={{ color: 'var(--crm-accent)' }} />}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{b.trip_name || '--'}</div>
                      <div className="crm-dim" style={{ fontSize: 11 }}>{formatDate(b.departure_date)}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bs.color + '18', color: bs.color }}>{bs.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      <div>{formatPrice(b.final_price_cents, b.currency)}</div>
                      {b.total_paid > 0 && <div style={{ fontSize: 11, color: 'var(--crm-green)' }}>Paid: {formatPrice(b.total_paid, b.currency)}</div>}
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

      {/* Booking Detail Dialog */}
      <BookingDetailDialog
        booking={selected}
        open={!!selectedId}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
        onRecordPayment={() => setPaymentOpen(true)}
        onRequestDoc={() => setDocOpen(true)}
        onCancel={(reason) => { if (selectedId) cancelMutation.mutate({ id: selectedId, reason }); }}
        cancelling={cancelMutation.isPending}
      />

      {/* Add Booking dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Booking</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="crm-caption">Departure</label>
              <EntitySearch
                options={departures.map(dep => ({
                  id: dep.id,
                  label: `${dep.trip_name || 'Unnamed trip'} — ${formatDate(dep.start_date)}`,
                  sublabel: `${dep.spots_remaining} spots left · ${dep.status}`,
                  initials: (dep.trip_name || 'U')[0],
                }))}
                value={newBooking.departure_id}
                onChange={(id) => setNewBooking(s => ({ ...s, departure_id: id }))}
                placeholder="Search departures…"
                emptyMessage="No departures found"
              />
            </div>
            <div>
              <label className="crm-caption">Traveller</label>
              <EntitySearch
                options={travellers.map(t => ({
                  id: t.id,
                  label: t.full_legal_name,
                  sublabel: [t.city, t.phone, t.email].filter(Boolean).join(' · '),
                  initials: t.full_legal_name.split(' ').map(w => w[0]).join('').slice(0, 2),
                }))}
                value={newBooking.traveller_id}
                onChange={(id) => setNewBooking(s => ({ ...s, traveller_id: id }))}
                placeholder="Search travellers…"
                emptyMessage="No travellers found"
              />
            </div>
            <div>
              <label className="crm-caption">Final Price (₹)</label>
              <Input type="number" value={newBooking.final_price_rupees} onChange={e => { setNewBooking(s => ({ ...s, final_price_rupees: e.target.value })); setPriceError(''); }} placeholder="Amount in rupees" />
              {priceError && <div style={{ color: 'var(--crm-red)', fontSize: 12, marginTop: 4 }}>{priceError}</div>}
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
              if (newBooking.final_price_rupees) {
                const parsed = Number(newBooking.final_price_rupees);
                if (isNaN(parsed) || parsed <= 0 || !Number.isFinite(parsed)) {
                  setPriceError('Please enter a valid positive number');
                  return;
                }
              }
              setPriceError('');
              const priceCents = newBooking.final_price_rupees ? parseInt(newBooking.final_price_rupees) * 100 : undefined;
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

/* ─── BookingDetailDialog ──────────────────────── */

const TRAVELLER_DOC_TYPES = ['passport', 'id_card', 'photo', 'aadhaar', 'pan', 'driving_license', 'oci_card'];

const DOC_STATUS_COLOR: Record<string, string> = {
  pending: 'var(--crm-amber)', uploaded: 'var(--crm-blue)', verified: 'var(--crm-green)', rejected: 'var(--crm-red)',
};

function BookingDetailDialog({ booking, open, onOpenChange, onRecordPayment, onRequestDoc, onCancel, cancelling }: {
  booking: Booking | null; open: boolean; onOpenChange: (v: boolean) => void;
  onRecordPayment: () => void; onRequestDoc: () => void;
  onCancel: (reason: string) => void; cancelling: boolean;
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
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setReassigning(false);
      toast.success('Booking updated');
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', booking?.id],
    queryFn: () => api.get<APIResponse<Payment[]>>(`/bookings/${booking!.id}/payments`),
    enabled: !!booking && open,
  });

  const { data: docsData } = useQuery({
    queryKey: ['documents', booking?.id],
    queryFn: () => api.get<APIResponse<BookingDocument[]>>(`/bookings/${booking!.id}/documents`),
    enabled: !!booking && open,
  });

  const { data: checklistData } = useQuery({
    queryKey: ['booking-checklist', booking?.departure_id, booking?.traveller_id],
    queryFn: () => api.get<APIResponse<DepartureChecklistItem[]>>(`/departures/${booking!.departure_id}/checklist?traveller_id=${booking!.traveller_id}`),
    enabled: !!booking && open,
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      api.patch(`/departures/${booking!.departure_id}/checklist/items/${itemId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-checklist', booking?.departure_id, booking?.traveller_id] });
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: Record<string, unknown> }) =>
      api.patch<APIResponse<unknown>>(`/bookings/${booking!.id}/documents/${docId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', booking?.id] });
    },
  });

  if (!booking) return null;

  const payments = paymentsData?.data ?? [];
  const documents = docsData?.data ?? [];
  const checklistItems = checklistData?.data ?? [];
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount_cents, 0);
  const balance = (booking.final_price_cents || 0) - totalPaid;
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
            {booking.group_id && <Users size={14} style={{ color: 'var(--crm-accent)' }} />}
            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: (BOOKING_STATUSES[booking.status]?.color ?? 'gray') + '18', color: BOOKING_STATUSES[booking.status]?.color ?? 'gray' }}>
              {BOOKING_STATUSES[booking.status]?.label ?? booking.status}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: (PAYMENT_STATUSES[booking.payment_status]?.color ?? 'gray') + '18', color: PAYMENT_STATUSES[booking.payment_status]?.color ?? 'gray' }}>
              {PAYMENT_STATUSES[booking.payment_status]?.label ?? booking.payment_status}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Trip context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{booking.trip_name || 'Unknown Trip'}</div>
          <div className="crm-dim">{formatDate(booking.departure_date)}</div>
        </div>

        {/* Share link bar */}
        {booking.portal_token && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
            <Link2 size={14} style={{ color: 'var(--crm-accent)', flexShrink: 0 }} />
            <code style={{ flex: 1, fontSize: 11, color: 'var(--crm-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/b/{booking.portal_token}
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
            <div style={{ display: 'flex', gap: 16, padding: '10px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 12, flexWrap: 'wrap' }}>
              <div><span className="crm-caption">Total</span> <strong style={{ marginLeft: 4 }}>{formatPrice(booking.final_price_cents, booking.currency)}</strong></div>
              <div><span className="crm-caption">Paid</span> <strong style={{ marginLeft: 4, color: 'var(--crm-green)' }}>{formatPrice(totalPaid, booking.currency)}</strong></div>
              <div><span className="crm-caption">Due</span> <strong style={{ marginLeft: 4, color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatPrice(Math.max(0, balance), booking.currency)}</strong></div>
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
              <div style={{ padding: '12px 14px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <ReassignSection
                  currentTravellerId={booking.traveller_id}
                  currentGroupId={booking.group_id}
                  travellers={allTravellersData?.data ?? []}
                  groups={allGroupsData?.data ?? []}
                  saving={reassignMutation.isPending}
                  onSave={(t, g) => reassignMutation.mutate({ traveller_id: t || undefined, group_id: g || null })}
                  onCancel={() => setReassigning(false)}
                />
              </div>
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
                <div><span className="crm-caption">Total</span> <strong style={{ marginLeft: 4 }}>{formatPrice(booking.final_price_cents, booking.currency)}</strong></div>
                <div><span className="crm-caption">Paid</span> <strong style={{ marginLeft: 4, color: 'var(--crm-green)' }}>{formatPrice(totalPaid, booking.currency)}</strong></div>
                <div><span className="crm-caption">Due</span> <strong style={{ marginLeft: 4, color: balance > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatPrice(Math.max(0, balance), booking.currency)}</strong></div>
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
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(p.amount_cents, p.currency)}</div>
                        <div className="crm-caption">{p.type} &middot; {p.payment_method || 'N/A'}{p.reference_number ? ` &middot; ${p.reference_number}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 600, background: p.status === 'completed' ? 'var(--crm-green)18' : 'var(--crm-amber)18', color: p.status === 'completed' ? 'var(--crm-green)' : 'var(--crm-amber)' }}>{p.status}</span>
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
                  {travellerDocs.map(doc => <DocRow key={doc.id} doc={doc} onUpdate={(body) => updateDocMutation.mutate({ docId: doc.id, body })} />)}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Trip Documents</div>
                  <div className="crm-caption">Specific to this trip — insurance, visa, consent forms</div>
                </div>
                <button className="crm-btn sm" onClick={onRequestDoc}>
                  <Plus size={12} /> Request Doc
                </button>
              </div>
              {tripDocs.length === 0 ? (
                <div className="crm-caption" style={{ padding: '16px 0', textAlign: 'center' }}>No trip documents requested</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tripDocs.map(doc => <DocRow key={doc.id} doc={doc} onUpdate={(body) => updateDocMutation.mutate({ docId: doc.id, body })} />)}
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
                        {item.is_required && <span style={{ padding: '1px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--crm-red)18', color: 'var(--crm-red)' }}>Required</span>}
                        {item.due_date && <span className="crm-caption">{formatDate(item.due_date)}</span>}
                        {item.category && <span style={{ padding: '1px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--crm-bg-active)', color: 'var(--crm-text-3)' }}>{item.category}</span>}
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

/* ─── ReassignSection ────────────────────────── */

function ReassignSection({ currentTravellerId, currentGroupId, travellers, groups, saving, onSave, onCancel }: {
  currentTravellerId: string; currentGroupId?: string;
  travellers: Traveller[]; groups: Group[];
  saving: boolean; onSave: (travellerId: string, groupId: string) => void; onCancel: () => void;
}) {
  const [travellerId, setTravellerId] = useState(currentTravellerId);
  const [groupId, setGroupId] = useState(currentGroupId || '');

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <label className="crm-caption">Traveller</label>
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
        <label className="crm-caption">Group (optional)</label>
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
  );
}

/* ─── DocRow ─────────────────────────────────── */

function DocRow({ doc, onUpdate }: { doc: BookingDocument; onUpdate: (body: Record<string, unknown>) => void }) {
  const statusColor = DOC_STATUS_COLOR[doc.status] || 'var(--crm-text-3)';
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
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, fontWeight: 600, background: statusColor + '18', color: statusColor }}>
        {doc.status}
      </span>
      {doc.file_url && (
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="crm-btn ghost sm" style={{ padding: '4px 6px' }}>
          <Eye size={13} />
        </a>
      )}
      {doc.status === 'uploaded' && (
        <>
          <button className="crm-btn ghost sm" style={{ padding: '4px 6px', color: 'var(--crm-green)' }}
            onClick={() => onUpdate({ status: 'verified' })}>
            <CheckCircle2 size={13} />
          </button>
          <button className="crm-btn ghost sm" style={{ padding: '4px 6px', color: 'var(--crm-red)' }}
            onClick={() => {
              const reason = prompt('Rejection reason:');
              if (reason) onUpdate({ status: 'rejected', rejection_reason: reason });
            }}>
            <XCircle size={13} />
          </button>
        </>
      )}
    </div>
  );
}
