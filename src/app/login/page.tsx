'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

function ImpersonationConsumer({ token }: { token: string }) {
  const { loginAsImpersonator } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Single-use tokens get marked consumed on the backend on first call.
  // React Strict Mode double-invokes effects in dev — without this ref the
  // second invocation hits 410 TOKEN_CONSUMED and surfaces the error to the
  // user even though the first call succeeded.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        await loginAsImpersonator(token);
        // replace() so the JWT param doesn't linger in browser history.
        router.replace('/dashboard');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impersonation token invalid or expired.');
      }
    })();
  }, [token, loginAsImpersonator, router]);

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
      <div className="crm-card" style={{ width: '100%', maxWidth: 400, padding: '40px 32px', textAlign: 'center' }}>
        {error ? (
          <>
            <div
              style={{
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--crm-red)',
                background: 'var(--crm-red-bg)',
                borderRadius: 'var(--crm-radius-sm)',
                marginBottom: 16,
              }}
            >
              Impersonation token invalid or expired.
            </div>
            <div className="crm-caption" style={{ marginBottom: 16, fontSize: 12 }}>{error}</div>
            <Link
              href="/login"
              className="crm-btn"
              style={{
                display: 'inline-flex',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Back to login
            </Link>
          </>
        ) : (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                border: '2px solid var(--crm-line)',
                borderTopColor: 'var(--crm-accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }}
            />
            <div className="crm-caption" style={{ fontSize: 13 }}>
              Authorizing impersonation session…
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProdOrgEntry() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const normalised = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalised) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('organisations')
        .select('slug')
        .eq('slug', normalised)
        .eq('is_active', true)
        .single();
      if (!data) {
        setError('Organisation not found');
        return;
      }
      router.push(`/login/${normalised}`);
    } catch {
      setError('Organisation not found');
    } finally {
      setLoading(false);
    }
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
      }}
    >
      <div className="crm-card" style={{ width: '100%', maxWidth: 400, padding: '40px 32px' }}>
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
              letterSpacing: '0.02em',
            }}
          >
            T
          </div>
          <h1 className="crm-title-1" style={{ marginBottom: 6 }}>Tourify</h1>
          <p className="crm-caption" style={{ fontSize: 14 }}>Enter your organisation</p>
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
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--crm-text-2)' }}>
              Organisation slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. boarding-pass-tours"
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
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--crm-text-3)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--crm-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const impersonateToken = searchParams.get('impersonate');

  if (impersonateToken) {
    return <ImpersonationConsumer token={impersonateToken} />;
  }

  return <ProdOrgEntry />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--crm-bg-canvas)',
            color: 'var(--crm-text-3)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
