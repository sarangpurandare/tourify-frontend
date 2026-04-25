'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { APIResponse } from '@/types/api';
import type { StaffUser, Role } from '@/types/staff';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload, X, Copy, Check, AlertTriangle, Key, Users, CreditCard,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────── */

interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  default_currency: string;
  plan: string;
  payment_failed_at: string | null;
}

interface OrgUsage {
  staff_count: number;
  traveller_count: number;
  trip_count: number;
  departure_month_count: number;
  storage_bytes: number;
}

interface BillingStatus {
  plan: string;
  usage: OrgUsage;
  limits: {
    staff: number;
    travellers: number;
    trips: number;
    departures_per_month: number;
    storage_bytes: number;
    api_access: boolean;
  };
  plan_period_end: string | null;
  payment_failed_at: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
}

/* ─── Constants ────────────────────────────────── */

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Bangkok', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Australia/Sydney', 'Pacific/Auckland',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'THB', 'JPY', 'CAD'];

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

const PLAN_PRICES: Record<string, string> = {
  free: '$0/mo',
  starter: '$29/mo',
  pro: '$79/mo',
  business: '$199/mo',
};

const TABS = ['General', 'Team', 'Billing', 'API Keys'] as const;

/* ─── Styles ───────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: '0 12px',
  border: '1px solid var(--crm-line)',
  borderRadius: 'var(--crm-radius-sm)',
  background: 'var(--crm-bg-elev)',
  color: 'var(--crm-text)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--crm-text-2)',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
};

/* ─── Helpers ──────────────────────────────────── */

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

/* ─── Component ────────────────────────────────── */

export default function SettingsPage() {
  const { user, plan } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('General');

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isPlanWithAPI = plan === 'pro' || plan === 'business';

  // ─── General tab state ──────────────────────
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // ─── Team tab state ─────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('viewer');

  // ─── API Keys tab state ─────────────────────
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  // ─── Queries ────────────────────────────────
  const { data: settingsData } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => api.get<APIResponse<OrgSettings>>('/org/settings'),
    enabled: isOwnerOrAdmin,
  });

  const { data: billingData } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => api.get<APIResponse<BillingStatus>>('/billing/status'),
    enabled: isOwnerOrAdmin && activeTab === 'Billing',
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<APIResponse<StaffUser[]>>('/staff'),
    enabled: isOwnerOrAdmin && activeTab === 'Team',
  });

  const { data: invitationsData } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get<APIResponse<Invitation[]>>('/invitations'),
    enabled: isOwnerOrAdmin && activeTab === 'Team',
  });

  const { data: apiKeysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<APIResponse<ApiKeyInfo[]>>('/api-keys'),
    enabled: isOwnerOrAdmin && isPlanWithAPI && activeTab === 'API Keys',
  });

  // Load settings into form
  useEffect(() => {
    if (settingsData?.data) {
      const s = settingsData.data;
      setOrgName(s.name);
      setSlug(s.slug);
      setTimezone(s.timezone || 'Asia/Kolkata');
      setCurrency(s.default_currency || 'INR');
      setLogoUrl(s.logo_url);
    }
  }, [settingsData]);

  // ─── Mutations ──────────────────────────────

  const inviteMutation = useMutation({
    mutationFn: (body: { email: string; role: string }) => api.post('/invitations', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  });

  const deactivateStaffMutation = useMutation({
    mutationFn: (id: string) => api.put(`/staff/${id}`, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  const createKeyMutation = useMutation({
    mutationFn: (body: { name: string }) => api.post<APIResponse<ApiKeyCreateResponse>>('/api-keys', body),
    onSuccess: (res) => {
      setCreatedKey(res.data.key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeConfirm(null);
    },
  });

  // ─── Handlers ───────────────────────────────

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function saveGeneral() {
    setGeneralSaving(true);
    setGeneralError('');
    setGeneralSuccess(false);
    try {
      let newLogoUrl = logoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('category', 'org-logo');
        const uploadRes = await api.upload<{ data: { url: string } }>('/upload', formData);
        newLogoUrl = uploadRes.data.url;
      }
      await api.put('/org/settings', {
        name: orgName,
        timezone,
        default_currency: currency,
        ...(newLogoUrl !== undefined ? { logo_url: newLogoUrl } : {}),
      });
      setLogoFile(null);
      setLogoPreview(null);
      setGeneralSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setGeneralSaving(false);
    }
  }

  async function handleCheckout(plan: string) {
    try {
      const res = await api.post<{ data: { url: string } }>('/billing/checkout', { plan });
      window.location.href = res.data.url;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  }

  async function handleBillingPortal() {
    try {
      const res = await api.post<{ data: { url: string } }>('/billing/portal');
      window.location.href = res.data.url;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  if (!isOwnerOrAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">You don&apos;t have permission to view settings.</span>
      </div>
    );
  }

  const settings = settingsData?.data;
  const billing = billingData?.data;
  const staffList = staffData?.data ?? [];
  const pendingInvites = (invitationsData?.data ?? []).filter((inv) => !inv.accepted_at);
  const apiKeys = apiKeysData?.data ?? [];

  return (
    <div>
      <div style={{ padding: '24px 24px 0' }}>
        <h1 className="crm-display" style={{ marginBottom: 4 }}>Settings</h1>
        <p className="crm-dim" style={{ fontSize: 14, marginBottom: 0 }}>
          Manage your organisation, team, billing, and integrations
        </p>
      </div>

      {/* ─── Tabs ────────────────────────────── */}
      <div className="crm-tabs">
        {TABS.map((t) => {
          // Hide API Keys tab if plan doesn't support it
          if (t === 'API Keys' && !isPlanWithAPI) return null;
          return (
            <div
              key={t}
              className={`crm-tab${activeTab === t ? ' active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 24 }}>

        {/* ═══ GENERAL TAB ═══ */}
        {activeTab === 'General' && (
          <div style={{ maxWidth: 560 }}>
            {generalError && (
              <div
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--crm-red)',
                  background: 'var(--crm-red-bg)',
                  borderRadius: 'var(--crm-radius-sm)',
                  marginBottom: 20,
                }}
              >
                {generalError}
              </div>
            )}
            {generalSuccess && (
              <div
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--crm-green)',
                  background: 'var(--crm-green-bg, rgba(34,197,94,0.1))',
                  borderRadius: 'var(--crm-radius-sm)',
                  marginBottom: 20,
                }}
              >
                Settings saved successfully
              </div>
            )}

            <div style={sectionStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Logo</label>
                  {(logoPreview || logoUrl) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={logoPreview || logoUrl || ''}
                        alt="Logo"
                        style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--crm-line)' }}
                      />
                      <button
                        type="button"
                        onClick={() => { setLogoUrl(null); setLogoFile(null); setLogoPreview(null); }}
                        className="crm-btn ghost sm"
                        style={{ gap: 4 }}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        height: 72,
                        border: '1px dashed var(--crm-line)',
                        borderRadius: 'var(--crm-radius-sm)',
                        cursor: 'pointer',
                        color: 'var(--crm-text-3)',
                        fontSize: 13,
                        background: 'var(--crm-bg-elev)',
                      }}
                    >
                      <Upload size={16} />
                      Upload logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                {/* Org name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Organisation name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Slug (read-only) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Slug</label>
                  <input
                    type="text"
                    value={slug}
                    readOnly
                    style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>

                {/* Timezone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={selectStyle}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={selectStyle}>
                    {CURRENCIES.map((cur) => (
                      <option key={cur} value={cur}>{cur}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={saveGeneral}
                className="crm-btn primary"
                disabled={generalSaving}
                style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 24 }}
              >
                {generalSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ TEAM TAB ═══ */}
        {activeTab === 'Team' && (
          <div>
            {/* Current staff */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)' }}>Team members</h3>
              <button
                onClick={() => setInviteOpen(true)}
                className="crm-btn primary sm"
                style={{ gap: 4 }}
              >
                <Users size={14} /> Invite member
              </button>
            </div>

            <div className="crm-card" style={{ overflow: 'hidden', marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--crm-line)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--crm-line)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--crm-text)', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--crm-text-2)' }}>{s.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: s.role === 'owner' ? 'var(--crm-amber, #f59e0b)' : 'var(--crm-text-2)' }}>
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`crm-pill ${s.is_active ? 'green' : ''}`} style={{ fontSize: 12 }}>
                          <span className="dot" />{s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {s.is_active && s.role !== 'owner' && s.id !== user?.id && (
                          <button
                            onClick={() => deactivateStaffMutation.mutate(s.id)}
                            className="crm-btn ghost sm"
                            disabled={deactivateStaffMutation.isPending}
                            style={{ fontSize: 12, color: 'var(--crm-red)' }}
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pending invitations */}
            {pendingInvites.length > 0 && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 12 }}>Pending invitations</h3>
                <div className="crm-card" style={{ overflow: 'hidden' }}>
                  {pendingInvites.map((inv, i) => (
                    <div
                      key={inv.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: i > 0 ? '1px solid var(--crm-line)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, color: 'var(--crm-text)', fontWeight: 500 }}>{inv.email}</div>
                        <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                          {inv.role} &middot; expires {formatDate(inv.expires_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => revokeInviteMutation.mutate(inv.id)}
                        className="crm-btn ghost sm"
                        disabled={revokeInviteMutation.isPending}
                        style={{ fontSize: 12, color: 'var(--crm-red)' }}
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Invite dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite team member</DialogTitle>
                </DialogHeader>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="team@company.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      style={selectStyle}
                    >
                      {(['admin', 'ops', 'sales', 'viewer'] as Role[]).map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setInviteOpen(false)} className="crm-btn" style={{ height: 36 }}>Cancel</button>
                  <button
                    onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                    className="crm-btn primary"
                    disabled={!inviteEmail || inviteMutation.isPending}
                    style={{ height: 36 }}
                  >
                    {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ═══ BILLING TAB ═══ */}
        {activeTab === 'Billing' && (
          <div>
            {billing?.payment_failed_at && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  fontSize: 13,
                  color: 'var(--crm-red)',
                  background: 'var(--crm-red-bg)',
                  borderRadius: 'var(--crm-radius-sm)',
                  marginBottom: 20,
                }}
              >
                <AlertTriangle size={16} />
                Your last payment failed. Please update your billing information to avoid service interruption.
              </div>
            )}

            {/* Current plan card */}
            <div className="crm-card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Current plan
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--crm-text)' }}>
                    {PLAN_LABELS[billing?.plan || settings?.plan || 'free'] || 'Free'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--crm-text-2)', marginTop: 2 }}>
                    {PLAN_PRICES[billing?.plan || settings?.plan || 'free'] || '$0/mo'}
                    {billing?.plan_period_end && (
                      <span style={{ color: 'var(--crm-text-3)', marginLeft: 8 }}>
                        &middot; renews {formatDate(billing.plan_period_end)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(billing?.plan || settings?.plan || 'free') !== 'business' && (
                    <button
                      onClick={() => handleCheckout((billing?.plan || settings?.plan) === 'free' ? 'starter' : (billing?.plan || settings?.plan) === 'starter' ? 'pro' : 'business')}
                      className="crm-btn primary"
                      style={{ height: 36 }}
                    >
                      <CreditCard size={14} /> Upgrade plan
                    </button>
                  )}
                  {(billing?.plan || settings?.plan || 'free') !== 'free' && (
                    <button
                      onClick={handleBillingPortal}
                      className="crm-btn"
                      style={{ height: 36 }}
                    >
                      Manage billing
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Usage bars */}
            {billing && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 16 }}>Usage</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  <UsageBar label="Staff" current={billing.usage.staff_count} limit={billing.limits.staff} />
                  <UsageBar label="Travellers" current={billing.usage.traveller_count} limit={billing.limits.travellers} />
                  <UsageBar label="Trips" current={billing.usage.trip_count} limit={billing.limits.trips} />
                  <UsageBar label="Departures (this month)" current={billing.usage.departure_month_count} limit={billing.limits.departures_per_month} />
                  <UsageBar
                    label="Storage"
                    current={billing.usage.storage_bytes}
                    limit={billing.limits.storage_bytes}
                    formatValue={formatBytes}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ API KEYS TAB ═══ */}
        {activeTab === 'API Keys' && isPlanWithAPI && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)' }}>API Keys</h3>
              <button
                onClick={() => { setCreateKeyOpen(true); setCreatedKey(null); setNewKeyName(''); }}
                className="crm-btn primary sm"
                style={{ gap: 4 }}
              >
                <Key size={14} /> Create API key
              </button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="crm-card" style={{ padding: 40, textAlign: 'center', color: 'var(--crm-text-3)' }}>
                <Key size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text-2)' }}>No API keys yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Create a key to access the public API</div>
              </div>
            ) : (
              <div className="crm-card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--crm-line)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Key</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last used</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((k) => (
                      <tr key={k.id} style={{ borderBottom: '1px solid var(--crm-line)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--crm-text)', fontWeight: 500 }}>{k.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontFamily: 'monospace', fontSize: 13 }}>
                          {k.key_prefix}...
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 13 }}>
                          {k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--crm-text-3)', fontSize: 13 }}>
                          {formatDate(k.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => setRevokeConfirm(k.id)}
                            className="crm-btn ghost sm"
                            style={{ fontSize: 12, color: 'var(--crm-red)' }}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Create key dialog */}
            <Dialog open={createKeyOpen} onOpenChange={(open) => { if (!open) setCreateKeyOpen(false); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{createdKey ? 'API key created' : 'Create API key'}</DialogTitle>
                </DialogHeader>
                {createdKey ? (
                  <div style={{ padding: '16px 0' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--crm-amber, #f59e0b)',
                        background: 'var(--crm-amber-bg, rgba(245,158,11,0.1))',
                        borderRadius: 'var(--crm-radius-sm)',
                        marginBottom: 16,
                      }}
                    >
                      <AlertTriangle size={14} />
                      Save this key now. You won&apos;t be able to see it again.
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        background: 'var(--crm-bg-elev)',
                        border: '1px solid var(--crm-line)',
                        borderRadius: 'var(--crm-radius-sm)',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: 'var(--crm-text)',
                        wordBreak: 'break-all',
                      }}
                    >
                      <span style={{ flex: 1 }}>{createdKey}</span>
                      <button
                        onClick={copyKey}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: keyCopied ? 'var(--crm-green)' : 'var(--crm-text-3)',
                          flexShrink: 0,
                        }}
                        title="Copy to clipboard"
                      >
                        {keyCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 0' }}>
                      <label style={labelStyle}>Key name</label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Website integration"
                        style={inputStyle}
                      />
                    </div>
                    <DialogFooter>
                      <button onClick={() => setCreateKeyOpen(false)} className="crm-btn" style={{ height: 36 }}>Cancel</button>
                      <button
                        onClick={() => createKeyMutation.mutate({ name: newKeyName })}
                        className="crm-btn primary"
                        disabled={!newKeyName.trim() || createKeyMutation.isPending}
                        style={{ height: 36 }}
                      >
                        {createKeyMutation.isPending ? 'Creating...' : 'Create key'}
                      </button>
                    </DialogFooter>
                  </>
                )}
                {createdKey && (
                  <DialogFooter>
                    <button onClick={() => setCreateKeyOpen(false)} className="crm-btn primary" style={{ height: 36 }}>Done</button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>

            {/* Revoke confirmation dialog */}
            <Dialog open={!!revokeConfirm} onOpenChange={(open) => { if (!open) setRevokeConfirm(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke API key</DialogTitle>
                </DialogHeader>
                <p style={{ fontSize: 14, color: 'var(--crm-text-2)', padding: '8px 0' }}>
                  This action cannot be undone. Any integrations using this key will stop working.
                </p>
                <DialogFooter>
                  <button onClick={() => setRevokeConfirm(null)} className="crm-btn" style={{ height: 36 }}>Cancel</button>
                  <button
                    onClick={() => revokeConfirm && revokeKeyMutation.mutate(revokeConfirm)}
                    className="crm-btn primary"
                    disabled={revokeKeyMutation.isPending}
                    style={{ height: 36, background: 'var(--crm-red)', borderColor: 'var(--crm-red)' }}
                  >
                    {revokeKeyMutation.isPending ? 'Revoking...' : 'Revoke key'}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Usage Bar Sub-component ──────────────────── */

function UsageBar({
  label,
  current,
  limit,
  formatValue,
}: {
  label: string;
  current: number;
  limit: number;
  formatValue?: (v: number) => string;
}) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : limit > 0 ? Math.min(Math.round((current / limit) * 100), 100) : 0;
  const isWarning = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 100;
  const fmt = formatValue || ((v: number) => v.toLocaleString());

  return (
    <div className="crm-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
          {fmt(current)} / {isUnlimited ? 'Unlimited' : fmt(limit)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--crm-line)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: isUnlimited ? '0%' : `${pct}%`,
            height: '100%',
            borderRadius: 3,
            background: isDanger
              ? 'var(--crm-red)'
              : isWarning
              ? 'var(--crm-amber, #f59e0b)'
              : 'var(--crm-accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
