'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { AdminOrg, Plan } from '@/types/admin';
import { Search, ArrowUp, ArrowDown, Building2 } from 'lucide-react';

type SortKey = 'name' | 'slug' | 'plan' | 'user_count' | 'traveller_count' | 'is_active' | 'created_at';
type SortDir = 'asc' | 'desc';

const PLAN_COLOR: Record<Plan, string> = {
  free: 'var(--crm-text-3)',
  starter: 'var(--crm-blue, #0071e3)',
  pro: 'var(--crm-purple, #5856d6)',
  business: 'var(--crm-amber, #ff9f0a)',
};

function PlanBadge({ plan }: { plan: Plan }) {
  const color = PLAN_COLOR[plan] ?? 'var(--crm-text-3)';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        color,
        textTransform: 'capitalize',
      }}
    >
      {plan}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          background: 'color-mix(in oklab, var(--crm-green, #248a3d) 15%, transparent)',
          color: 'var(--crm-green, #248a3d)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--crm-green, #248a3d)' }} />
        Active
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        background: 'color-mix(in oklab, var(--crm-red, #d70015) 15%, transparent)',
        color: 'var(--crm-red, #d70015)',
      }}
    >
      Paused
    </span>
  );
}

export default function AdminOrgsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get<APIResponse<AdminOrg[]>>('/admin/orgs'),
  });

  const orgs = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      o => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
    );
  }, [orgs, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else if (typeof av === 'boolean' && typeof bv === 'boolean') cmp = (av === bv) ? 0 : av ? 1 : -1;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' || key === 'user_count' || key === 'traveller_count' ? 'desc' : 'asc');
    }
  }

  function SortHeader({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => toggleSort(k)}
        style={{
          padding: '10px 16px',
          textAlign: align,
          fontWeight: 500,
          color: active ? 'var(--crm-text)' : 'var(--crm-text-3)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
          {label}
          {active && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        </span>
      </th>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} style={{ color: 'var(--crm-text-3)' }} />
            Organisations
          </h1>
          <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${orgs.length} total`}
            {search && ` · ${filtered.length} match "${search}"`}
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--crm-bg-elev)',
            border: '1px solid var(--crm-hairline)',
            borderRadius: 8,
            padding: '0 10px',
            width: 280,
          }}
        >
          <Search size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name or slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--crm-text)',
              width: '100%',
              font: 'inherit',
            }}
          />
        </div>
      </div>

      <div className="crm-card" style={{ padding: 0, overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--crm-red, #d70015)' }}>
              Failed to load orgs: {(error as Error).message}
            </span>
          </div>
        ) : isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span className="crm-dim" style={{ fontSize: 13 }}>
              {search ? 'No orgs match your search.' : 'No organisations yet.'}
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--crm-border, var(--crm-hairline))', background: 'var(--crm-bg-2, var(--crm-bg-subtle))' }}>
                <SortHeader label="Name" k="name" />
                <SortHeader label="Slug" k="slug" />
                <SortHeader label="Plan" k="plan" />
                <SortHeader label="Users" k="user_count" align="right" />
                <SortHeader label="Travellers" k="traveller_count" align="right" />
                <SortHeader label="Status" k="is_active" />
                <SortHeader label="Created" k="created_at" />
                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(org => (
                <tr
                  key={org.id}
                  onClick={() => router.push(`/admin/orgs/${org.id}`)}
                  style={{
                    borderBottom: '1px solid var(--crm-border, var(--crm-hairline))',
                    cursor: 'pointer',
                    transition: 'background 0.08s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--crm-bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{org.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12 }}>
                    {org.slug}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <PlanBadge plan={org.plan} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {org.user_count}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {org.traveller_count}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusPill active={org.is_active} />
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 12 }}>
                    {formatDate(org.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/admin/orgs/${org.id}`}
                      className="crm-btn sm"
                      style={{ display: 'inline-flex' }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
