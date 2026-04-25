'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  changed_at: string;
}

const ENTITY_TYPES = ['traveller', 'group', 'trip', 'departure', 'itinerary', 'staff'] as const;

function actionPillColor(action: string) {
  switch (action) {
    case 'create': return 'green';
    case 'update': return 'blue';
    case 'delete': return 'red';
    default: return '';
  }
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const queryParams = new URLSearchParams();
  if (entityType) queryParams.set('entity_type', entityType);
  if (startDate) queryParams.set('start_date', startDate);
  if (endDate) queryParams.set('end_date', endDate);
  queryParams.set('page', String(page));
  queryParams.set('per_page', String(perPage));

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, startDate, endDate, page],
    queryFn: () =>
      api.get<APIResponse<AuditEntry[]>>(`/audit?${queryParams.toString()}`),
  });

  const entries = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 1;

  function formatTimestamp(dt: string) {
    return new Date(dt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="crm-title-1">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="crm-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>Entity Type</Label>
            <Select
              value={entityType || '_all'}
              onValueChange={(val) => {
                setEntityType(val === '_all' || val === null ? '' : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All types</SelectItem>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label htmlFor="start-date" style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-[160px]"
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label htmlFor="end-date" style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-[160px]"
            />
          </div>
          {(entityType || startDate || endDate) && (
            <button
              className="crm-btn sm"
              onClick={() => { setEntityType(''); setStartDate(''); setEndDate(''); setPage(1); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="crm-card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-caption">Loading...</span>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <FileText size={32} style={{ color: 'var(--crm-text-4)', margin: '0 auto 8px' }} />
            <div className="crm-caption">No audit entries found</div>
          </div>
        ) : (
          <>
            <div className="crm-row hd" style={{ gridTemplateColumns: '140px 90px 100px 70px 1fr 1fr 1fr 100px' }}>
              <span>Timestamp</span>
              <span>Entity</span>
              <span>Entity ID</span>
              <span>Action</span>
              <span>Field</span>
              <span>Old Value</span>
              <span>New Value</span>
              <span>Changed By</span>
            </div>
            {entries.map((entry) => (
              <div key={entry.id} className="crm-row" style={{ gridTemplateColumns: '140px 90px 100px 70px 1fr 1fr 1fr 100px' }}>
                <span className="crm-caption">{formatTimestamp(entry.changed_at)}</span>
                <span>
                  <span className="crm-pill">{entry.entity_type}</span>
                </span>
                <span className="crm-mono" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.entity_id}
                </span>
                <span>
                  <span className={`crm-pill ${actionPillColor(entry.action)}`}>{entry.action}</span>
                </span>
                <span style={{ fontSize: 13 }}>{entry.field_name || '—'}</span>
                <span style={{ fontSize: 13, color: 'var(--crm-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.old_value || '—'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--crm-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.new_value || '—'}
                </span>
                <span style={{ fontSize: 13 }}>{entry.changed_by || '—'}</span>
              </div>
            ))}

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--crm-hairline)' }}>
              <span className="crm-caption">
                Page {page} of {totalPages}
                {meta && ` (${meta.total} total)`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="crm-btn sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <button
                  className="crm-btn sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
