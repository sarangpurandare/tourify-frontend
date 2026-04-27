'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
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
          <Link
            href="/forgot-password"
            style={{
              alignSelf: 'flex-end',
              fontSize: 12,
              color: 'var(--crm-accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Forgot password?
          </Link>
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

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--crm-text-3)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--crm-accent)', textDecoration: 'none', fontWeight: 500 }}>
          Create an account
        </Link>
      </div>
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
          <ProdLoginForm org={org} />
        ) : null}
      </div>
    </div>
  );
}
