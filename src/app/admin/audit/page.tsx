'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { APIResponse } from '@/types/api';
import { ScrollText, Filter, ChevronDown, ChevronRight } from 'lucide-react';

interface PlatformAuditEntry {
  id: string;
  organisation_id: string;
  org_name: string;
  entity_type: string;
  entity_id: string;
  action: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  changed_by?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  changed_at: string;
}

const COMMON_ACTIONS = [
  'create',
  'update',
  'delete',
  'auth_login',
  'platform_admin_update',
  'impersonation_issued',
  'impersonation_used',
  'staff_created',
  'org_plan_changed',
  'upgrade_request_approved',
  'upgrade_request_denied',
];

const COMMON_ENTITY_TYPES = [
  'staff',
  'staff_user',
  'organisation',
  'traveller',
  'trip',
  'departure',
  'booking',
  'lead',
  'document',
  'review',
];

type DateRange = '24h' | '7d' | '30d' | 'all';

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isWithin(iso: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const ms = Date.now() - new Date(iso).getTime();
  if (range === '24h') return ms < 24 * 60 * 60 * 1000;
  if (range === '7d') return ms < 7 * 24 * 60 * 60 * 1000;
  if (range === '30d') return ms < 30 * 24 * 60 * 60 * 1000;
  return true;
}

export default function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-audit', actionFilter, entityTypeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200' });
      if (actionFilter) params.set('action', actionFilter);
      if (entityTypeFilter) params.set('entity_type', entityTypeFilter);
      return api.get<APIResponse<PlatformAuditEntry[]>>(`/admin/audit?${params.toString()}`);
    },
  });

  const entries = data?.data ?? [];

  const filtered = useMemo(() => {
    return entries.filter((e) => isWithin(e.changed_at, dateRange));
  }, [entries, dateRange]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
      <div>
        <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScrollText size={20} style={{ color: 'var(--crm-text-3)' }} />
          Audit log
        </h1>
        <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
          Cross-tenant log of every recorded change. {isLoading ? 'Loading…' : `${filtered.length} entries shown`}
        </div>
      </div>

      <div className="crm-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--crm-text-3)' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</span>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            padding: '6px 8px',
            border: '1px solid var(--crm-hairline)',
            borderRadius: 6,
            background: 'var(--crm-bg)',
            color: 'var(--crm-text)',
            fontSize: 12.5,
            font: 'inherit',
          }}
        >
          <option value="">All actions</option>
          {COMMON_ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          style={{
            padding: '6px 8px',
            border: '1px solid var(--crm-hairline)',
            borderRadius: 6,
            background: 'var(--crm-bg)',
            color: 'var(--crm-text)',
            fontSize: 12.5,
            font: 'inherit',
          }}
        >
          <option value="">All entities</option>
          {COMMON_ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto', background: 'var(--crm-bg-active)', padding: 2, borderRadius: 6 }}>
          {(['24h', '7d', '30d', 'all'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                background: dateRange === r ? 'var(--crm-bg-elev)' : 'transparent',
                color: dateRange === r ? 'var(--crm-text)' : 'var(--crm-text-3)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              {r === 'all' ? 'All' : `Last ${r}`}
            </button>
          ))}
        </div>
      </div>

      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--crm-red, #d70015)' }}>
            Failed to load audit log: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>No audit entries match the current filters.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-2, var(--crm-bg-subtle))' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', width: 30 }}></th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actor</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entity</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Changes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isOpen = expanded.has(e.id);
                const summary = e.field_name
                  ? `${e.field_name}: ${e.old_value ?? '—'} → ${e.new_value ?? '—'}`
                  : (e.new_value ?? '—');
                return (
                  <tr
                    key={e.id}
                    style={{
                      borderBottom: '1px solid var(--crm-hairline)',
                      cursor: 'pointer',
                      verticalAlign: 'top',
                    }}
                    onClick={() => toggleExpanded(e.id)}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--crm-text-3)', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(e.changed_at)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <code style={{ fontSize: 11.5, color: 'var(--crm-text)', background: 'var(--crm-bg-active)', padding: '2px 6px', borderRadius: 4 }}>
                        {e.action}
                      </code>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500 }}>{e.actor_name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>{e.org_name}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div>{e.entity_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-text-4)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>
                        {e.entity_id.slice(0, 8)}…
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 360 }}>
                      <div
                        style={{
                          color: 'var(--crm-text-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: isOpen ? 'normal' : 'nowrap',
                          wordBreak: 'break-word',
                          fontFamily: e.field_name ? 'var(--font-mono, ui-monospace, monospace)' : undefined,
                          fontSize: 11.5,
                        }}
                      >
                        {summary}
                      </div>
                      {isOpen && (
                        <pre
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: 'var(--crm-bg-active)',
                            borderRadius: 6,
                            fontSize: 11,
                            overflow: 'auto',
                            color: 'var(--crm-text-2)',
                          }}
                        >
{JSON.stringify({ field: e.field_name, old: e.old_value, new: e.new_value, entity_id: e.entity_id, actor_email: e.actor_email }, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
