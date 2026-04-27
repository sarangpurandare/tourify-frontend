'use client';

// === wave-4 template gating (Agent H) ===
// Platform-admin page for granting / revoking per-org access to gated
// website templates. Templates marked `requires_grant: true` in
// frontend/src/lib/templates/ are visible only to orgs that appear in
// org_template_access for that template_id. This page is the only UI for
// managing those grants.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { listTemplates } from '@/lib/templates';
import { formatDate } from '@/lib/utils';
import type { APIResponse } from '@/types/api';
import type { AdminOrg } from '@/types/admin';
import type { TemplateInfo } from '@/types/website-template';
import {
  Palette,
  Lock,
  Globe2,
  X,
  Plus,
  Building2,
  Trash2,
  Search,
} from 'lucide-react';

interface OrgWithGrant {
  org_id: string;
  org_name: string;
  org_slug: string;
  granted_at: string;
  granted_by_email: string;
  granted_by_staff_id: string;
}

function GateBadge({ requiresGrant }: { requiresGrant: boolean }) {
  if (requiresGrant) {
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
          background: 'color-mix(in oklab, var(--crm-amber, #ff9f0a) 15%, transparent)',
          color: 'var(--crm-amber, #ff9f0a)',
        }}
      >
        <Lock size={11} />
        Gated
      </span>
    );
  }
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
      <Globe2 size={11} />
      Default
    </span>
  );
}

function ManageAccessPanel({
  template,
  onClose,
}: {
  template: TemplateInfo;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [orgSearch, setOrgSearch] = useState('');

  const grantsQuery = useQuery({
    queryKey: ['admin-template-grants', template.id],
    queryFn: () =>
      api.get<APIResponse<OrgWithGrant[]>>(
        `/admin/templates/grants?template_id=${encodeURIComponent(template.id)}`,
      ),
  });

  const orgsQuery = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => api.get<APIResponse<AdminOrg[]>>('/admin/orgs'),
  });

  const grantMutation = useMutation({
    mutationFn: (organisationId: string) =>
      api.post<APIResponse<unknown>>('/admin/templates/grants', {
        template_id: template.id,
        organisation_id: organisationId,
      }),
    onSuccess: () => {
      toast.success('Access granted');
      queryClient.invalidateQueries({ queryKey: ['admin-template-grants', template.id] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Failed to grant access'),
  });

  const revokeMutation = useMutation({
    mutationFn: (organisationId: string) =>
      api.delete<APIResponse<unknown>>('/admin/templates/grants', {
        template_id: template.id,
        organisation_id: organisationId,
      }),
    onSuccess: () => {
      toast.success('Access revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-template-grants', template.id] });
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Failed to revoke access'),
  });

  const grants = grantsQuery.data?.data ?? [];
  const grantedIds = useMemo(() => new Set(grants.map((g) => g.org_id)), [grants]);
  const orgs = orgsQuery.data?.data ?? [];

  const candidates = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    return orgs
      .filter((o) => !grantedIds.has(o.id))
      .filter((o) => {
        if (!q) return true;
        return o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q);
      })
      .slice(0, 30);
  }, [orgs, grantedIds, orgSearch]);

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 40,
        }}
      />
      {/* panel */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(520px, 100vw)',
          background: 'var(--crm-bg-canvas)',
          borderLeft: '1px solid var(--crm-hairline)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.12)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--crm-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Manage access
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} style={{ color: 'var(--crm-text-3)' }} />
              {template.name}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--crm-text-3)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', marginTop: 2 }}>
              {template.id}
            </div>
          </div>
          <button
            onClick={onClose}
            className="crm-btn sm"
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, padding: 0 }}
          >
            <X size={14} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Add organisation
            </h3>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'var(--crm-bg-elev)',
                border: '1px solid var(--crm-hairline)',
                borderRadius: 8,
                padding: '0 10px',
                marginBottom: 8,
              }}
            >
              <Search size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search orgs by name or slug…"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
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
            <div
              style={{
                border: '1px solid var(--crm-hairline)',
                borderRadius: 8,
                maxHeight: 220,
                overflowY: 'auto',
                background: 'var(--crm-bg-elev)',
              }}
            >
              {orgsQuery.isLoading ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--crm-text-3)' }}>Loading…</div>
              ) : candidates.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--crm-text-3)' }}>
                  {orgs.length === 0 ? 'No organisations.' : 'No matches.'}
                </div>
              ) : (
                candidates.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => grantMutation.mutate(o.id)}
                    disabled={grantMutation.isPending}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--crm-text)',
                      borderBottom: '1px solid var(--crm-hairline)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--crm-bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Building2 size={14} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                      <span style={{ color: 'var(--crm-text-3)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11 }}>
                        {o.slug}
                      </span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--crm-accent)' }}>
                      <Plus size={12} /> Grant
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Granted to ({grants.length})
            </h3>
            {grantsQuery.isLoading ? (
              <div className="crm-card" style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--crm-text-3)' }}>
                Loading grants…
              </div>
            ) : grants.length === 0 ? (
              <div className="crm-card" style={{ padding: 24, textAlign: 'center' }}>
                <Lock size={20} style={{ color: 'var(--crm-text-4)', marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>No organisations have access yet.</div>
              </div>
            ) : (
              <ul className="crm-card" style={{ padding: 0, listStyle: 'none', margin: 0 }}>
                {grants.map((g, idx) => (
                  <li
                    key={g.org_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '12px 16px',
                      borderBottom: idx === grants.length - 1 ? 'none' : '1px solid var(--crm-hairline)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{g.org_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 2 }}>
                        Granted {formatDate(g.granted_at)} · by {g.granted_by_email || 'unknown'}
                      </div>
                    </div>
                    <button
                      onClick={() => revokeMutation.mutate(g.org_id)}
                      disabled={revokeMutation.isPending}
                      className="crm-btn sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-red, #d70015)' }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

export default function AdminTemplatesPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateInfo | null>(null);
  const templates = useMemo(() => listTemplates(), []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="crm-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={20} style={{ color: 'var(--crm-text-3)' }} />
          Templates
        </h1>
        <div className="crm-dim" style={{ fontSize: 13, marginTop: 2 }}>
          {templates.length} template{templates.length === 1 ? '' : 's'} ·{' '}
          {templates.filter((t) => t.requires_grant).length} gated
        </div>
      </div>

      <div
        className="crm-card"
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--crm-hairline)', background: 'var(--crm-bg-2, var(--crm-bg-subtle))' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', width: 90 }}>
                Preview
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Template
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Access
              </th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: 'var(--crm-text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }} />
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const gated = !!t.requires_grant;
              return (
                <tr
                  key={t.id}
                  style={{ borderBottom: '1px solid var(--crm-hairline)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        width: 64,
                        height: 44,
                        borderRadius: 6,
                        background: 'linear-gradient(135deg, #f5f0e8 0%, #e8ddd0 50%, #d4c5b0 100%)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#1F1A14',
                        fontSize: 18,
                        fontFamily: 'serif',
                        fontWeight: 300,
                      }}
                    >
                      {t.name.charAt(0).toLowerCase()}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--crm-text-3)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', marginTop: 2 }}>
                      {t.id}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginTop: 4, maxWidth: 480 }}>
                      {t.description}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <GateBadge requiresGrant={gated} />
                    {!gated && (
                      <div style={{ fontSize: 11, color: 'var(--crm-text-3)', marginTop: 6 }}>
                        Available to all
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {gated ? (
                      <button
                        onClick={() => setActiveTemplate(t)}
                        className="crm-btn sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Lock size={12} /> Manage access
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--crm-text-4)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeTemplate && (
        <ManageAccessPanel
          template={activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}
    </div>
  );
}
