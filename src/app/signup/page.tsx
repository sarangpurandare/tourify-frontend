'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function SignupPage() {
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signup({ org_name: orgName, name, email, password });
      router.push('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
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

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--crm-text-2)',
  };

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
          <h1 className="crm-title-1" style={{ marginBottom: 6 }}>Create your account</h1>
          <p className="crm-caption" style={{ fontSize: 14 }}>Set up your organisation on Boarding Pass</p>
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
            <label style={labelStyle}>Organisation name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Wanderlust Travels"
              required
              minLength={2}
              maxLength={100}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            className="crm-btn primary"
            disabled={loading}
            style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 4 }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--crm-text-3)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--crm-accent)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
