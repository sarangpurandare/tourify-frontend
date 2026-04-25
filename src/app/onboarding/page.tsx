'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Upload, X, Plus } from 'lucide-react';

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'THB', 'JPY', 'CAD'];

const ROLES = ['admin', 'ops', 'sales', 'viewer'] as const;

interface InviteRow {
  email: string;
  role: string;
}

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

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 2 state
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'viewer' }]);

  // Step 3 state
  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState('');
  const [durationDays, setDurationDays] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Generate slug from org name on mount
  useEffect(() => {
    if (user?.organisation_name) {
      setSlug(
        user.organisation_name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [user?.organisation_name]);

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
  }

  function addInviteRow() {
    if (invites.length < 5) {
      setInvites([...invites, { email: '', role: 'viewer' }]);
    }
  }

  function updateInvite(idx: number, field: keyof InviteRow, value: string) {
    setInvites(invites.map((inv, i) => i === idx ? { ...inv, [field]: value } : inv));
  }

  function removeInvite(idx: number) {
    setInvites(invites.filter((_, i) => i !== idx));
  }

  async function saveStep1() {
    setSaving(true);
    setError('');
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('category', 'org-logo');
        const uploadRes = await api.upload<{ data: { url: string } }>('/upload', formData);
        logoUrl = uploadRes.data.url;
      }
      await api.put('/org/settings', {
        slug,
        timezone,
        default_currency: currency,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      });
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function saveStep2() {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      setStep(3);
      return;
    }
    setSaving(true);
    setError('');
    try {
      for (const inv of validInvites) {
        await api.post('/invitations', { email: inv.email.trim(), role: inv.role });
      }
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations');
    } finally {
      setSaving(false);
    }
  }

  async function saveStep3() {
    if (!tripName.trim()) {
      router.push('/dashboard');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/trips', {
        name: tripName.trim(),
        destinations: destinations.trim(),
        duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--crm-bg-canvas)' }}>
        <div style={{ textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--crm-bg-canvas)',
        fontFamily: 'var(--font-sans)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--crm-accent) 0%, color-mix(in oklab, var(--crm-accent) 70%, #000) 100%)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              margin: '0 auto 16px',
            }}
          >
            BP
          </div>
          <div style={{ fontSize: 13, color: 'var(--crm-text-3)', marginBottom: 8 }}>
            Step {step} of 3
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: s <= step ? 'var(--crm-accent)' : 'var(--crm-line)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        <div className="crm-card" style={{ padding: '32px 28px' }}>
          {error && (
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
              {error}
            </div>
          )}

          {/* ═══ STEP 1: Org Profile ═══ */}
          {step === 1 && (
            <div>
              <h2 className="crm-title-1" style={{ marginBottom: 4 }}>Organisation profile</h2>
              <p className="crm-caption" style={{ fontSize: 14, marginBottom: 24 }}>
                Customise how your organisation appears
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Logo upload */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Logo</label>
                  {logoPreview ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--crm-line)' }}
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
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

                {/* Slug */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Organisation slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="your-org-slug"
                    style={inputStyle}
                  />
                  <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>
                    Your team will sign in at this URL
                  </div>
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

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button
                  onClick={() => setStep(2)}
                  className="crm-btn"
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  Skip
                </button>
                <button
                  onClick={saveStep1}
                  className="crm-btn primary"
                  disabled={saving}
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  {saving ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Invite Team ═══ */}
          {step === 2 && (
            <div>
              <h2 className="crm-title-1" style={{ marginBottom: 4 }}>Invite your team</h2>
              <p className="crm-caption" style={{ fontSize: 14, marginBottom: 24 }}>
                Add up to 5 team members to get started
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {invites.map((inv, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="email"
                      value={inv.email}
                      onChange={(e) => updateInvite(idx, 'email', e.target.value)}
                      placeholder="email@example.com"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <select
                      value={inv.role}
                      onChange={(e) => updateInvite(idx, 'role', e.target.value)}
                      style={{ ...selectStyle, width: 120, flex: 'none' }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                    {invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInvite(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: 'var(--crm-text-3)',
                          flexShrink: 0,
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {invites.length < 5 && (
                <button
                  type="button"
                  onClick={addInviteRow}
                  className="crm-btn ghost sm"
                  style={{ marginTop: 12, gap: 4 }}
                >
                  <Plus size={14} /> Add another
                </button>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button
                  onClick={() => setStep(3)}
                  className="crm-btn"
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  Skip
                </button>
                <button
                  onClick={saveStep2}
                  className="crm-btn primary"
                  disabled={saving}
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  {saving ? 'Sending...' : 'Send invites'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Create First Trip ═══ */}
          {step === 3 && (
            <div>
              <h2 className="crm-title-1" style={{ marginBottom: 4 }}>Create your first trip</h2>
              <p className="crm-caption" style={{ fontSize: 14, marginBottom: 24 }}>
                Set up a trip template to get started quickly
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Trip name</label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="e.g. Everest Base Camp Trek"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Destinations</label>
                  <input
                    type="text"
                    value={destinations}
                    onChange={(e) => setDestinations(e.target.value)}
                    placeholder="e.g. Kathmandu, Lukla, Namche Bazaar"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Duration (days)</label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="e.g. 14"
                    min={1}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="crm-btn"
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  Skip to Dashboard
                </button>
                <button
                  onClick={saveStep3}
                  className="crm-btn primary"
                  disabled={saving}
                  style={{ flex: 1, height: 40, justifyContent: 'center', fontSize: 14 }}
                >
                  {saving ? 'Creating...' : 'Create trip'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
