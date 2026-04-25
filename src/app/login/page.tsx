'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

interface DevOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

function DevOrgPicker() {
  const [orgs, setOrgs] = useState<DevOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase
      .from('organisations')
      .select('id, name, slug, logo_url')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) setOrgs(data as DevOrg[]);
        setLoading(false);
      });
  }, []);

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
          <h1 className="crm-title-1" style={{ marginBottom: 6 }}>Dev Mode</h1>
          <p className="crm-caption" style={{ fontSize: 14 }}>Select an organisation</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13, padding: 40 }}>
            Loading organisations...
          </div>
        ) : orgs.length === 0 ? (
          <div className="crm-card" style={{ padding: 32, textAlign: 'center', color: 'var(--crm-text-3)' }}>
            <Building2 size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 14 }}>No organisations found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Check your database connection</div>
          </div>
        ) : (
          <div className="crm-card" style={{ overflow: 'hidden' }}>
            {orgs.map((org, i) => (
              <button
                key={org.id}
                onClick={() => router.push(`/login/${org.slug}`)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: i > 0 ? '1px solid var(--crm-line)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--crm-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--crm-bg-active)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--crm-text-2)',
                    flexShrink: 0,
                  }}
                >
                  {org.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--crm-text)' }}>{org.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--crm-text-3)' }}>{org.slug}</div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--crm-text-3)' }} />
              </button>
            ))}
          </div>
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
            BP
          </div>
          <h1 className="crm-title-1" style={{ marginBottom: 6 }}>Boarding Pass</h1>
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

export default function LoginPage() {
  return DEV_BYPASS ? <DevOrgPicker /> : <ProdOrgEntry />;
}
