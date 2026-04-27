'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import type { Booking } from '@/types/booking';
import type { Traveller } from '@/types/traveller';
import {
  Download, Printer, Search, Filter, ArrowUpDown,
  ChevronUp, ChevronDown, Users,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Types ──────────────────────────────────── */

interface RosterRow {
  booking: Booking;
  traveller?: Traveller;
  name: string;
  phone: string;
  email: string;
  age: string;
  gender: string;
  bookingStatus: string;
  paymentStatus: string;
  amountPaid: number;
  amountTotal: number;
  roomPref: string;
  diet: string;
  medical: string;
  emergencyContact: string;
  documentsLabel: string;
  specialRequests: string;
}

type SortField = 'name' | 'bookingStatus' | 'paymentStatus';
type SortDir = 'asc' | 'desc';

/* ─── Helpers ────────────────────────────────── */

function computeAge(dob?: string): string {
  if (!dob) return '--';
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

function formatCurrency(cents: number, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toLocaleString()}`;
  }
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', waitlisted: 'Waitlisted', cancelled: 'Cancelled',
  no_show: 'No Show', completed: 'Completed',
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  confirmed: 'green', waitlisted: 'amber', cancelled: 'pink', no_show: 'pink', completed: 'green',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: 'green', partial: 'amber', pending: '', refunded: 'pink', waived: '',
};

function sanitizeCSVCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;  // prepend single quote — Excel treats as text prefix
  }
  return value;
}

function exportCSV(data: RosterRow[], filename: string) {
  const headers = ['#', 'Name', 'Email', 'Phone', 'Age', 'Gender', 'Booking Status', 'Payment Status', 'Amount Paid', 'Amount Total', 'Room Preference', 'Diet', 'Medical', 'Emergency Contact', 'Special Requests'];
  const rows = data.map((r, i) => [
    i + 1,
    sanitizeCSVCell(r.name),
    sanitizeCSVCell(r.email),
    sanitizeCSVCell(r.phone),
    r.age,
    r.gender,
    r.bookingStatus,
    r.paymentStatus,
    r.amountPaid / 100,
    r.amountTotal / 100,
    sanitizeCSVCell(r.roomPref),
    sanitizeCSVCell(r.diet),
    sanitizeCSVCell(r.medical),
    sanitizeCSVCell(r.emergencyContact),
    sanitizeCSVCell(r.specialRequests),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Component ──────────────────────────────── */

export function RosterView({ departureId }: { departureId: string }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  /* ─── Queries ─────────────────────────────── */

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['departure-bookings', departureId],
    queryFn: () => api.get<APIResponse<Booking[]>>(`/bookings?departure_id=${departureId}&per_page=200`),
    enabled: !!departureId,
  });

  const { data: travellersData, isLoading: travellersLoading } = useQuery({
    queryKey: ['travellers-list-roster'],
    queryFn: () => api.get<APIResponse<Traveller[]>>('/travellers?per_page=500'),
    enabled: !!departureId,
  });

  const bookings = bookingsData?.data ?? [];
  const travellers = travellersData?.data ?? [];
  const isLoading = bookingsLoading || travellersLoading;

  /* ─── Build rows ──────────────────────────── */

  const travellerMap = useMemo(() => {
    const map = new Map<string, Traveller>();
    travellers.forEach(t => map.set(t.id, t));
    return map;
  }, [travellers]);

  const allRows: RosterRow[] = useMemo(() => {
    return bookings.map(b => {
      const t = travellerMap.get(b.traveller_id);
      const emergencyParts: string[] = [];
      if (b.emergency_contact_name) {
        emergencyParts.push(b.emergency_contact_name);
        if (b.emergency_contact_phone) emergencyParts.push(b.emergency_contact_phone);
      } else if (t?.emergency_contacts && t.emergency_contacts.length > 0) {
        const ec = t.emergency_contacts[0];
        emergencyParts.push(ec.name, ec.phone);
      }

      return {
        booking: b,
        traveller: t,
        name: b.traveller_name || t?.full_legal_name || 'Unknown',
        phone: t?.phone || '',
        email: t?.email || '',
        age: computeAge(t?.dob),
        gender: t?.gender || '--',
        bookingStatus: b.status,
        paymentStatus: b.payment_status,
        amountPaid: b.total_paid || 0,
        amountTotal: b.final_price_cents || 0,
        roomPref: b.room_type_preference?.replace(/_/g, ' ') || '--',
        diet: t?.dietary || '--',
        medical: t?.medical_conditions?.join(', ') || '--',
        emergencyContact: emergencyParts.join(' - ') || '--',
        documentsLabel: '--',
        specialRequests: b.special_requests || '--',
      };
    });
  }, [bookings, travellerMap]);

  /* ─── Filter + Sort ───────────────────────── */

  const filteredRows = useMemo(() => {
    let rows = allRows;

    // Filter by booking status
    if (filterStatus !== 'all') {
      rows = rows.filter(r => r.bookingStatus === filterStatus);
    }

    // Filter by payment status
    if (filterPayment !== 'all') {
      rows = rows.filter(r => r.paymentStatus === filterPayment);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)
      );
    }

    // Sort
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'bookingStatus') cmp = a.bookingStatus.localeCompare(b.bookingStatus);
      else if (sortField === 'paymentStatus') cmp = a.paymentStatus.localeCompare(b.paymentStatus);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [allRows, filterStatus, filterPayment, search, sortField, sortDir]);

  /* ─── Summary ─────────────────────────────── */

  const summary = useMemo(() => {
    const active = allRows.filter(r => r.bookingStatus !== 'cancelled');
    const confirmed = active.filter(r => r.bookingStatus === 'confirmed').length;
    const totalRevenue = active.reduce((s, r) => s + r.amountTotal, 0);
    const totalPaid = active.reduce((s, r) => s + r.amountPaid, 0);
    return { confirmed, total: active.length, totalRevenue, totalPaid, pending: totalRevenue - totalPaid };
  }, [allRows]);

  /* ─── Sort toggle ─────────────────────────── */

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={11} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  /* ─── Render ──────────────────────────────── */

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">Loading roster...</span>
      </div>
    );
  }

  return (
    <div>
      {/* ─── Summary strip ─────────────────── */}
      <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'var(--crm-bg-2)', borderRadius: 8, marginBottom: 16, fontSize: 13, flexWrap: 'wrap' }}>
        <div><span className="crm-caption">Confirmed</span> <strong style={{ marginLeft: 6 }}>{summary.confirmed}/{summary.total}</strong></div>
        <div><span className="crm-caption">Revenue</span> <strong style={{ marginLeft: 6 }}>{formatCurrency(summary.totalRevenue)}</strong></div>
        <div><span className="crm-caption">Collected</span> <strong style={{ marginLeft: 6, color: 'var(--crm-green)' }}>{formatCurrency(summary.totalPaid)}</strong></div>
        <div><span className="crm-caption">Pending</span> <strong style={{ marginLeft: 6, color: summary.pending > 0 ? 'var(--crm-amber)' : 'var(--crm-green)' }}>{formatCurrency(Math.max(0, summary.pending))}</strong></div>
      </div>

      {/* ─── Toolbar ───────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-3)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            style={{
              width: '100%', padding: '7px 10px 7px 30px', fontSize: 13, borderRadius: 6,
              border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
              color: 'var(--crm-text)', fontFamily: 'var(--font-sans)',
            }}
          />
        </div>

        {/* Filter: Booking status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Filter size={12} style={{ color: 'var(--crm-text-3)' }} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 8px', fontSize: 12, borderRadius: 6,
              border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
              color: 'var(--crm-text)', fontFamily: 'var(--font-sans)',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Filter: Payment status */}
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          style={{
            padding: '6px 8px', fontSize: 12, borderRadius: 6,
            border: '1px solid var(--crm-hairline)', background: 'var(--crm-bg)',
            color: 'var(--crm-text)', fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
        </select>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Actions */}
        <button
          className="crm-btn ghost sm"
          onClick={() => {
            exportCSV(filteredRows, `roster-${departureId}.csv`);
            toast.success('CSV exported');
          }}
        >
          <Download size={13} /> CSV
        </button>
        <button
          className="crm-btn ghost sm"
          onClick={() => window.print()}
        >
          <Printer size={13} /> Print
        </button>
      </div>

      {/* ─── Table ─────────────────────────── */}
      {filteredRows.length === 0 ? (
        <div className="crm-card" style={{ padding: 60, textAlign: 'center' }}>
          <Users size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No travellers found</div>
          <div className="crm-caption">
            {allRows.length === 0 ? 'No bookings on this departure yet.' : 'No results match your filters.'}
          </div>
        </div>
      ) : (
        <div className="crm-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', textAlign: 'left' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Name <SortIcon field="name" /></span>
                </th>
                <th style={thStyle}>Phone / Email</th>
                <th style={thStyle}>Age/Gender</th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort('bookingStatus')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Status <SortIcon field="bookingStatus" /></span>
                </th>
                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort('paymentStatus')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Payment <SortIcon field="paymentStatus" /></span>
                </th>
                <th style={thStyle}>Room</th>
                <th style={thStyle}>Diet</th>
                <th style={thStyle}>Medical</th>
                <th style={thStyle}>Emergency</th>
                <th style={thStyle}>Requests</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr
                  key={row.booking.id}
                  style={{
                    borderBottom: '1px solid var(--crm-hairline)',
                    opacity: row.bookingStatus === 'cancelled' ? 0.5 : 1,
                  }}
                >
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{row.name}</td>
                  <td style={tdStyle}>
                    <div style={{ lineHeight: 1.4 }}>
                      {row.phone && <div>{row.phone}</div>}
                      {row.email && <div className="crm-caption" style={{ fontSize: 11 }}>{row.email}</div>}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {row.age !== '--' ? `${row.age}` : '--'}{row.gender !== '--' ? `/${row.gender.charAt(0).toUpperCase()}` : ''}
                  </td>
                  <td style={tdStyle}>
                    <span className={`crm-pill ${BOOKING_STATUS_COLOR[row.bookingStatus] || ''}`} style={{ fontSize: 10 }}>
                      <span className="dot" />{STATUS_LABELS[row.bookingStatus] ?? row.bookingStatus}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span className={`crm-pill ${PAYMENT_STATUS_COLOR[row.paymentStatus] || ''}`} style={{ fontSize: 10 }}>
                      <span className="dot" />{row.paymentStatus}
                    </span>
                    {row.amountTotal > 0 && (
                      <div className="crm-caption" style={{ marginTop: 2, fontSize: 10 }}>
                        {formatCurrency(row.amountPaid)}/{formatCurrency(row.amountTotal)}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{row.roomPref}</td>
                  <td style={{ ...tdStyle, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.diet}>{row.diet}</td>
                  <td style={{ ...tdStyle, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.medical}>{row.medical}</td>
                  <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.emergencyContact}>{row.emergencyContact}</td>
                  <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.specialRequests}>{row.specialRequests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Print styles ──────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .crm-card, .crm-card * { visibility: visible; }
          .crm-card { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
          table { font-size: 10px !important; }
          button, input, select { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Style constants ────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--crm-text-3)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  verticalAlign: 'top',
};
