'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Document } from '@/types/document';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/types/document';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface APIList<T> { data: T[]; meta: { page: number; per_page: number; total: number } }

function statusPill(status: string) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    verified: { color: 'green', icon: <ShieldCheck size={11} /> },
    uploaded: { color: 'blue', icon: <Shield size={11} /> },
    pending: { color: 'amber', icon: <Clock size={11} /> },
    rejected: { color: 'pink', icon: <ShieldX size={11} /> },
    expired: { color: '', icon: <AlertTriangle size={11} /> },
  };
  return map[status] || { color: '', icon: null };
}

function docTypeEmoji(type: string) {
  const map: Record<string, string> = {
    passport: '🛂', visa: '📋', travel_insurance: '🏥', vaccination: '💉',
    id_card: '🪪', flight_ticket: '✈️', hotel_voucher: '🏨',
    booking_confirmation: '📄', medical_certificate: '⚕️',
  };
  return map[type] || '📎';
}

function formatDate(d?: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(expiry?: string) {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

function isExpiringSoon(expiry?: string) {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return exp <= threeMonths && exp > new Date();
}

export default function DocumentsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', '50');
  if (typeFilter) params.set('document_type', typeFilter);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', typeFilter, statusFilter, page],
    queryFn: () => api.get<APIList<Document>>(`/documents?${params.toString()}`),
  });

  const documents = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const filtered = search
    ? documents.filter(d =>
        d.label.toLowerCase().includes(search.toLowerCase()) ||
        d.document_number?.toLowerCase().includes(search.toLowerCase()) ||
        d.traveller_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.country?.toLowerCase().includes(search.toLowerCase())
      )
    : documents;

  const verifiedCount = documents.filter(d => d.status === 'verified').length;
  const pendingCount = documents.filter(d => d.status === 'pending' || d.status === 'uploaded').length;
  const expiredCount = documents.filter(d => isExpired(d.expiry_date)).length;

  return (
    <div>
      <div className="crm-page-hd">
        <div>
          <h1>Documents</h1>
          <p className="crm-caption" style={{ marginTop: 2 }}>
            All traveller documents across your organisation
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {verifiedCount > 0 && <span className="crm-pill green">{verifiedCount} verified</span>}
          {pendingCount > 0 && <span className="crm-pill amber">{pendingCount} pending</span>}
          {expiredCount > 0 && <span className="crm-pill pink">{expiredCount} expired</span>}
        </div>
      </div>

      <div className="crm-card">
        <div className="crm-card-hd" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-text-3)' }} />
              <input
                className="crm-input"
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger style={{ width: 160, height: 32, fontSize: 12.5 }}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(!v || v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger style={{ width: 140, height: 32, fontSize: 12.5 }}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="crm-card-pad" style={{ textAlign: 'center', padding: 40 }}>
            <span className="crm-caption">Loading documents...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="crm-card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FileText size={32} style={{ color: 'var(--crm-text-3)', marginBottom: 8 }} />
            <div className="crm-dim" style={{ fontSize: 13 }}>
              {documents.length === 0 ? 'No documents found' : 'No documents match your search'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Document</th>
                  <th>Traveller</th>
                  <th>Number</th>
                  <th>Country</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const pill = statusPill(doc.status);
                  const expired = isExpired(doc.expiry_date);
                  const expiring = isExpiringSoon(doc.expiry_date);
                  return (
                    <tr key={doc.id}>
                      <td style={{ textAlign: 'center', fontSize: 16 }}>{docTypeEmoji(doc.document_type)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.label}</div>
                        <div className="crm-caption">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</div>
                      </td>
                      <td>
                        {doc.traveller_name ? (
                          <a href={`/travellers/${doc.traveller_id}`} style={{ color: 'var(--crm-accent)', fontSize: 13, textDecoration: 'none' }}>
                            {doc.traveller_name}
                          </a>
                        ) : (
                          <span className="crm-dim">--</span>
                        )}
                      </td>
                      <td>
                        {doc.document_number ? (
                          <span className="crm-mono" style={{ fontSize: 12 }}>{doc.document_number}</span>
                        ) : (
                          <span className="crm-dim">--</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13 }}>{doc.country || '--'}</td>
                      <td>
                        <span style={{
                          fontSize: 12.5,
                          color: expired ? 'var(--crm-red)' : expiring ? 'var(--crm-amber)' : undefined,
                          fontWeight: expired || expiring ? 600 : undefined,
                        }}>
                          {formatDate(doc.expiry_date)}
                          {expired && <AlertTriangle size={11} style={{ marginLeft: 4, verticalAlign: '-1px' }} />}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-pill ${pill.color}`} style={{ fontSize: 11 }}>
                          {pill.icon}
                          <span style={{ marginLeft: 3 }}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</span>
                        </span>
                      </td>
                      <td>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="View file">
                            <ExternalLink size={13} style={{ color: 'var(--crm-text-3)' }} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="crm-card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--crm-hairline)' }}>
            <span className="crm-caption">{total} documents total</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="crm-btn ghost sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span className="crm-caption" style={{ padding: '4px 8px' }}>Page {page} of {totalPages}</span>
              <button className="crm-btn ghost sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
