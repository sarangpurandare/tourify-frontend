'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

interface DevStaff {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

function DevStaffPicker({ org }: { org: OrgInfo }) {
  const [staff, setStaff] = useState<DevStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const { loginAsDev } = useAuth();
  const router = useRouter();

  useEffect(() => {
    supabase
      .from('staff_users')
      .select('id, name, email, role')
      .eq('organisation_id', org.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setStaff(data as DevStaff[]);
        setLoading(false);
      });
  }, [org.id]);

  async function handlePick(s: DevStaff) {
    setLoggingIn(s.id);
    await loginAsDev(s.id);
    router.push('/dashboard');
  }

  const roleColor: Record<string, string> = {
    owner: 'var(--crm-purple, #8b5cf6)',
    admin: 'var(--crm-blue, #3b82f6)',
    ops: 'var(--crm-green, #22c55e)',
    sales: 'var(--crm-amber, #f59e0b)',
    viewer: 'var(--crm-text-3)',
  };

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--crm-bg-active)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--crm-text-2)',
            margin: '0 auto 12px',
          }}
        >
          {org.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <h1 className="crm-title-1" style={{ marginBottom: 4 }}>{org.name}</h1>
        <p className="crm-caption" style={{ fontSize: 14 }}>Pick a staff user to sign in as</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13, padding: 40 }}>
          Loading staff...
        </div>
      ) : staff.length === 0 ? (
        <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
          <Users size={24} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 14 }}>No staff users found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Seed staff for this organisation first</div>
        </div>
      ) : (
        <div className="crm-card" style={{ overflow: 'hidden' }}>
          {staff.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handlePick(s)}
              disabled={loggingIn !== null}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: loggingIn === s.id ? 'var(--crm-bg-active)' : 'transparent',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--crm-line)' : 'none',
                cursor: loggingIn ? 'wait' : 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!loggingIn) e.currentTarget.style.background = 'var(--crm-bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (loggingIn !== s.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--crm-bg-active)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--crm-text-2)',
                  flexShrink: 0,
                }}
              >
                {s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>{s.email}</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: roleColor[s.role] || 'var(--crm-text-3)',
                }}
              >
                {s.role}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ProdLoginForm({ org }: { org: OrgInfo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--crm-bg-active)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--crm-text-2)',
            margin: '0 auto 12px',
          }}
        >
          {org.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <h1 className="crm-title-1" style={{ marginBottom: 4 }}>{org.name}</h1>
        <p className="crm-caption" style={{ fontSize: 14 }}>Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--crm-red)',
              background: 'var(--crm-red-bg)',
              borderRadius: 'var(--crm-radius-sm)',
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              height: 40,
              padding: '0 12px',
              border: '1px solid var(--crm-line)',
              borderRadius: 'var(--crm-radius-sm)',
              background: 'var(--crm-bg-elev)',
              color: 'var(--crm-text)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              height: 40,
              padding: '0 12px',
              border: '1px solid var(--crm-line)',
              borderRadius: 'var(--crm-radius-sm)',
              background: 'var(--crm-bg-elev)',
              color: 'var(--crm-text)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          className="crm-btn primary"
          disabled={loading}
          style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 4 }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </>
  );
}

export default function OrgLoginPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('organisations')
      .select('id, name, slug, logo_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setOrg(data as OrgInfo); }
        setLoading(false);
      });
  }, [slug]);

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
      <div style={{ width: '100%', maxWidth: 440 }}>
        <Link
          href="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--crm-text-3)',
            textDecoration: 'none',
            marginBottom: 24,
          }}
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13, padding: 40 }}>
            Loading...
          </div>
        ) : notFound ? (
          <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>Organisation not found</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              No organisation with slug &ldquo;{slug}&rdquo; was found.
            </div>
          </div>
        ) : org ? (
          DEV_BYPASS ? <DevStaffPicker org={org} /> : <ProdLoginForm org={org} />
        ) : null}
      </div>
    </div>
  );
}
