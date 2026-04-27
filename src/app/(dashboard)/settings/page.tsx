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
  Upload, X, Copy, Check, AlertTriangle, Key, Users, Sparkles,
  Globe,
} from 'lucide-react';

/* ─── Types ────────────────────────────────────── */

interface WebsiteSettings {
  ga4_id: string;
  meta_pixel_id: string;
  gtm_id: string;
  custom_head_scripts: string;
  custom_body_scripts: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  privacy_policy_url: string;
  terms_url: string;
  cookie_consent_enabled: boolean;
  business_name: string;
  gst_number: string;
  business_address: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  social_instagram: string;
  social_facebook: string;
  social_youtube: string;
  social_twitter: string;
  social_linkedin: string;
  custom_domain: string;
}

const EMPTY_WEBSITE_SETTINGS: WebsiteSettings = {
  ga4_id: '', meta_pixel_id: '', gtm_id: '',
  custom_head_scripts: '', custom_body_scripts: '',
  seo_title: '', seo_description: '', og_image_url: '',
  privacy_policy_url: '', terms_url: '', cookie_consent_enabled: false,
  business_name: '', gst_number: '', business_address: '',
  support_email: '', support_phone: '', whatsapp_number: '',
  social_instagram: '', social_facebook: '', social_youtube: '',
  social_twitter: '', social_linkedin: '', custom_domain: '',
};

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  default_currency: string;
  plan: string;
  website_settings?: WebsiteSettings;
}

interface OrgSettings {
  org: OrgData;
  usage?: OrgUsage;
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

interface CategoryUsage {
  request_count: number;
  tokens_used: number;
  credits: number;
}

interface AIUsageSummary {
  month: string;
  total_credits: number;
  monthly_limit: number;
  usage_percent: number;
  by_category: Record<string, CategoryUsage>;
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

const TABS = ['General', 'Website', 'Team', 'Billing', 'API Keys'] as const;

const AI_CATEGORIES = [
  { key: 'blog', label: 'Blog creation' },
  { key: 'bulk_upload', label: 'Bulk upload' },
  { key: 'summarisation', label: 'Summarisation' },
  { key: 'image_processing', label: 'Image processing' },
  { key: 'image_generation', label: 'Image generation' },
];

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
  const { user, features, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('General');

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isPlanWithAPI = features?.api_access ?? false;

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

  // ─── Website tab state ──────────────────────
  const [ws, setWs] = useState<WebsiteSettings>(EMPTY_WEBSITE_SETTINGS);
  const [wsSaving, setWsSaving] = useState(false);
  const [wsSuccess, setWsSuccess] = useState(false);
  const [wsError, setWsError] = useState('');

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

  // ─── Billing tab state ──────────────────────
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTargetPlan, setUpgradeTargetPlan] = useState<string>('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

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

  const { data: aiUsageData } = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => api.get<APIResponse<AIUsageSummary>>('/ai/usage'),
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
    if (settingsData?.data?.org) {
      const s = settingsData.data.org;
      setOrgName(s.name);
      setSlug(s.slug);
      setTimezone(s.timezone || 'Asia/Kolkata');
      setCurrency(s.default_currency || 'INR');
      setLogoUrl(s.logo_url);
      if (s.website_settings) {
        setWs({ ...EMPTY_WEBSITE_SETTINGS, ...s.website_settings });
      }
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
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const deactivateStaffMutation = useMutation({
    mutationFn: (id: string) => api.put(`/staff/${id}`, { is_active: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: (body: { name: string }) => api.post<APIResponse<ApiKeyCreateResponse>>('/api-keys', body),
    onSuccess: (res) => {
      setCreatedKey(res.data.key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeConfirm(null);
    },
    onError: (err: Error) => {
      alert(err.message || 'Something went wrong');
    },
  });

  const requestUpgradeMutation = useMutation({
    mutationFn: (body: { target_plan: string; message: string }) =>
      api.post('/billing/request-upgrade', body),
    onSuccess: () => {
      setUpgradeSuccess(true);
      setUpgradeMessage('');
      setUpgradeTargetPlan('');
      setTimeout(() => {
        setUpgradeOpen(false);
        setUpgradeSuccess(false);
      }, 1800);
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to send upgrade request');
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
        const uploadRes = await api.upload<{ data: { public_url: string } }>('/upload', formData);
        newLogoUrl = uploadRes.data.public_url;
      }
      await api.put('/org/settings', {
        name: orgName,
        timezone,
        default_currency: currency,
        ...(newLogoUrl !== undefined ? { logo_url: newLogoUrl } : {}),
      });
      setLogoFile(null);
      setLogoPreview(null);
      setLogoUrl(newLogoUrl);
      setGeneralSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      await refreshUser();
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setGeneralSaving(false);
    }
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  }

  async function saveWebsiteSettings() {
    setWsSaving(true);
    setWsError('');
    setWsSuccess(false);
    try {
      await api.put('/org/settings', { website_settings: ws });
      setWsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setTimeout(() => setWsSuccess(false), 3000);
    } catch (err: unknown) {
      setWsError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setWsSaving(false);
    }
  }

  function updateWs<K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) {
    setWs(prev => ({ ...prev, [key]: value }));
  }

  if (!isOwnerOrAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <span className="crm-caption">You don&apos;t have permission to view settings.</span>
      </div>
    );
  }

  const settings = settingsData?.data?.org;
  const billing = billingData?.data;
  const aiUsage = aiUsageData?.data;
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

        {/* ═══ WEBSITE TAB ═══ */}
        {activeTab === 'Website' && (
          <div style={{ maxWidth: 640 }}>
            {wsError && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--crm-red)', background: 'var(--crm-red-bg)', borderRadius: 'var(--crm-radius-sm)', marginBottom: 20 }}>
                {wsError}
              </div>
            )}
            {wsSuccess && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--crm-green)', background: 'var(--crm-green-bg, rgba(34,197,94,0.1))', borderRadius: 'var(--crm-radius-sm)', marginBottom: 20 }}>
                Website settings saved
              </div>
            )}

            {/* ─── Tracking & Analytics ─── */}
            <WsSection title="Tracking & Analytics" icon={<Globe size={16} />}>
              <WsField label="Google Analytics (GA4)" placeholder="G-XXXXXXXXXX" value={ws.ga4_id} onChange={v => updateWs('ga4_id', v)} />
              <WsField label="Meta / Facebook Pixel ID" placeholder="1234567890" value={ws.meta_pixel_id} onChange={v => updateWs('meta_pixel_id', v)} />
              <WsField label="Google Tag Manager" placeholder="GTM-XXXXXXX" value={ws.gtm_id} onChange={v => updateWs('gtm_id', v)} />
            </WsSection>

            {/* ─── Custom Scripts ─── */}
            <WsSection title="Custom Scripts" subtitle="For chat widgets (Tawk.to, Intercom), CRM pixels, etc.">
              <WsTextarea label="Head scripts" placeholder="<script>...</script>" value={ws.custom_head_scripts} onChange={v => updateWs('custom_head_scripts', v)} rows={4} />
              <WsTextarea label="Body scripts (before </body>)" placeholder="<script>...</script>" value={ws.custom_body_scripts} onChange={v => updateWs('custom_body_scripts', v)} rows={4} />
            </WsSection>

            {/* ─── SEO Defaults ─── */}
            <WsSection title="SEO Defaults">
              <WsField label="Default page title" placeholder="My Tour Company — Adventures Await" value={ws.seo_title} onChange={v => updateWs('seo_title', v)} />
              <WsTextarea label="Meta description" placeholder="We organise unforgettable tours..." value={ws.seo_description} onChange={v => updateWs('seo_description', v)} rows={3} />
              <WsField label="OG image URL" placeholder="https://..." value={ws.og_image_url} onChange={v => updateWs('og_image_url', v)} />
            </WsSection>

            {/* ─── Legal & Compliance ─── */}
            <WsSection title="Legal & Compliance">
              <WsField label="Privacy policy URL" placeholder="https://..." value={ws.privacy_policy_url} onChange={v => updateWs('privacy_policy_url', v)} />
              <WsField label="Terms & conditions URL" placeholder="https://..." value={ws.terms_url} onChange={v => updateWs('terms_url', v)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={ws.cookie_consent_enabled}
                  onChange={e => updateWs('cookie_consent_enabled', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--crm-accent)' }}
                />
                <label style={{ ...labelStyle, marginBottom: 0 }}>Show cookie consent banner</label>
              </div>
            </WsSection>

            {/* ─── Business Info ─── */}
            <WsSection title="Business Information">
              <WsField label="Registered business name" placeholder="My Tours Pvt. Ltd." value={ws.business_name} onChange={v => updateWs('business_name', v)} />
              <WsField label="GST / Tax number" placeholder="29XXXXX1234X1Z5" value={ws.gst_number} onChange={v => updateWs('gst_number', v)} />
              <WsTextarea label="Business address" placeholder="123 MG Road, Bangalore..." value={ws.business_address} onChange={v => updateWs('business_address', v)} rows={3} />
              <WsField label="Support email" placeholder="support@company.com" value={ws.support_email} onChange={v => updateWs('support_email', v)} />
              <WsField label="Support phone" placeholder="+91 98765 43210" value={ws.support_phone} onChange={v => updateWs('support_phone', v)} />
              <WsField label="WhatsApp business number" placeholder="+91 98765 43210" value={ws.whatsapp_number} onChange={v => updateWs('whatsapp_number', v)} />
            </WsSection>

            {/* ─── Social Media ─── */}
            <WsSection title="Social Media">
              <WsField label="Instagram" placeholder="https://instagram.com/yourpage" value={ws.social_instagram} onChange={v => updateWs('social_instagram', v)} />
              <WsField label="Facebook" placeholder="https://facebook.com/yourpage" value={ws.social_facebook} onChange={v => updateWs('social_facebook', v)} />
              <WsField label="YouTube" placeholder="https://youtube.com/@yourchannel" value={ws.social_youtube} onChange={v => updateWs('social_youtube', v)} />
              <WsField label="Twitter / X" placeholder="https://x.com/yourhandle" value={ws.social_twitter} onChange={v => updateWs('social_twitter', v)} />
              <WsField label="LinkedIn" placeholder="https://linkedin.com/company/yours" value={ws.social_linkedin} onChange={v => updateWs('social_linkedin', v)} />
            </WsSection>

            {/* ─── Custom Domain ─── */}
            <WsSection title="Custom Domain">
              <WsField label="Custom domain" placeholder="tours.yourdomain.com" value={ws.custom_domain} onChange={v => updateWs('custom_domain', v)} />
              <p style={{ fontSize: 12, color: 'var(--crm-text-3)', margin: 0 }}>
                Point a CNAME record to your Boarding Pass domain. Contact support for SSL setup.
              </p>
            </WsSection>

            <button
              onClick={saveWebsiteSettings}
              className="crm-btn primary"
              disabled={wsSaving}
              style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 8, marginBottom: 40 }}
            >
              {wsSaving ? 'Saving...' : 'Save website settings'}
            </button>
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
                            onClick={() => {
                              if (!window.confirm(`Deactivate ${s.name}? They will lose access to the system.`)) return;
                              deactivateStaffMutation.mutate(s.id);
                            }}
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
            {/* Current plan card */}
            <div className="crm-card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--crm-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Current plan
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--crm-text)' }}>
                    {PLAN_LABELS[billing?.plan || settings?.plan || 'free'] || 'Free'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--crm-text-3)', marginTop: 4 }}>
                    Need more capacity or features? Request an upgrade and our team will get back to you.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUpgradeOpen(true);
                    setUpgradeSuccess(false);
                    setUpgradeTargetPlan('');
                    setUpgradeMessage('');
                  }}
                  className="crm-btn primary"
                  style={{ height: 36, fontSize: 13 }}
                >
                  Request upgrade
                </button>
              </div>
            </div>

            {/* Request upgrade dialog */}
            <Dialog open={upgradeOpen} onOpenChange={(open) => { if (!open) setUpgradeOpen(false); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{upgradeSuccess ? 'Request received' : 'Request upgrade'}</DialogTitle>
                </DialogHeader>
                {upgradeSuccess ? (
                  <div style={{ padding: '16px 0', fontSize: 14, color: 'var(--crm-text-2)' }}>
                    Thanks — we&apos;ve logged your request. Our team will reach out shortly to apply the change.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!upgradeTargetPlan) return;
                      requestUpgradeMutation.mutate({
                        target_plan: upgradeTargetPlan,
                        message: upgradeMessage,
                      });
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Target plan</label>
                      <select
                        value={upgradeTargetPlan}
                        onChange={(e) => setUpgradeTargetPlan(e.target.value)}
                        required
                        style={selectStyle}
                      >
                        <option value="" disabled>Select a plan</option>
                        {(['starter', 'pro', 'business'] as const)
                          .filter((p) => p !== (billing?.plan || settings?.plan))
                          .map((p) => (
                            <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                          ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Anything we should know? (optional)</label>
                      <textarea
                        value={upgradeMessage}
                        onChange={(e) => setUpgradeMessage(e.target.value)}
                        placeholder="e.g. Need more travellers, planning to onboard 5 new ops staff…"
                        rows={4}
                        style={{
                          ...inputStyle,
                          height: 'auto',
                          padding: 12,
                          resize: 'vertical',
                          fontFamily: 'var(--font-sans)',
                        }}
                      />
                    </div>
                    <DialogFooter>
                      <button
                        type="button"
                        onClick={() => setUpgradeOpen(false)}
                        className="crm-btn"
                        style={{ height: 36, fontSize: 13 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="crm-btn primary"
                        disabled={!upgradeTargetPlan || requestUpgradeMutation.isPending}
                        style={{ height: 36, fontSize: 13 }}
                      >
                        {requestUpgradeMutation.isPending ? 'Sending…' : 'Send request'}
                      </button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

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

            {/* AI Usage */}
            {aiUsage && aiUsage.monthly_limit > 0 && (
              <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} /> AI Usage
                </h3>

                {/* Overall usage bar */}
                <div className="crm-card" style={{ padding: 20, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>
                      Monthly credits
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 700, color: aiUsage.usage_percent >= 90 ? 'var(--crm-red)' : aiUsage.usage_percent >= 70 ? 'var(--crm-amber, #f59e0b)' : 'var(--crm-accent)' }}>
                      {Math.round(aiUsage.usage_percent)}%
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--crm-line)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      width: `${Math.min(aiUsage.usage_percent, 100)}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: aiUsage.usage_percent >= 90 ? 'var(--crm-red)' : aiUsage.usage_percent >= 70 ? 'var(--crm-amber, #f59e0b)' : 'var(--crm-accent)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--crm-text-3)' }}>
                    {aiUsage.total_credits.toLocaleString()} / {aiUsage.monthly_limit.toLocaleString()} credits used this month
                  </div>
                </div>

                {/* Per-category breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {AI_CATEGORIES.map(({ key, label }) => {
                    const cat = aiUsage.by_category[key];
                    return (
                      <div key={key} className="crm-card" style={{ padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--crm-text)' }}>
                          {cat ? cat.request_count.toLocaleString() : '0'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                          {cat ? cat.credits.toLocaleString() : '0'} credits
                        </div>
                      </div>
                    );
                  })}
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

/* ─── Website Settings Sub-components ─────────── */

function WsSection({ title, subtitle, icon, children }: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: subtitle ? 4 : 16 }}>
        {icon}
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-text)', margin: 0 }}>{title}</h3>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: 'var(--crm-text-3)', margin: '0 0 16px' }}>{subtitle}</p>
      )}
      <div className="crm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function WsField({ label, placeholder, value, onChange }: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 40, padding: '0 12px',
          border: '1px solid var(--crm-line)', borderRadius: 'var(--crm-radius-sm)',
          background: 'var(--crm-bg-elev)', color: 'var(--crm-text)',
          fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none', width: '100%',
        }}
      />
    </div>
  );
}

function WsTextarea({ label, placeholder, value, onChange, rows = 3 }: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          padding: 12,
          border: '1px solid var(--crm-line)', borderRadius: 'var(--crm-radius-sm)',
          background: 'var(--crm-bg-elev)', color: 'var(--crm-text)',
          fontSize: 14, fontFamily: 'monospace', outline: 'none', width: '100%',
          resize: 'vertical',
        }}
      />
    </div>
  );
}
