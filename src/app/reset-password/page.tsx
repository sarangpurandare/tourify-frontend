'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (token) {
      setRecoveryToken(token);
      setHasSession(true);
    } else {
      setHasSession(false);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: recoveryToken, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Failed to update password' } }));
        throw new Error(err.error?.message || 'Failed to update password');
      }
      toast.success('Password updated. Redirecting...');
      router.push('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
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
              background:
                'linear-gradient(135deg, var(--crm-accent) 0%, color-mix(in oklab, var(--crm-accent) 70%, #000) 100%)',
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
          <p className="crm-caption" style={{ fontSize: 14 }}>Set a new password</p>
        </div>

        {hasSession === false ? (
          <div
            style={{
              padding: 16,
              fontSize: 13,
              color: 'var(--crm-text-2)',
              background: 'var(--crm-red-bg)',
              border: '1px solid var(--crm-line)',
              borderRadius: 'var(--crm-radius-sm)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: 'var(--crm-red)', fontWeight: 500, marginBottom: 4 }}>
              Reset link invalid or expired
            </div>
            <div>Request a new reset link to continue.</div>
            <Link
              href="/forgot-password"
              style={{
                display: 'inline-block',
                marginTop: 12,
                color: 'var(--crm-accent)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Get a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>New password</label>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={8}
                style={{
                  ...inputStyle,
                  ...(confirmPassword && confirmPassword !== password
                    ? { borderColor: 'var(--crm-red)' }
                    : {}),
                }}
              />
              {confirmPassword && confirmPassword !== password && (
                <span style={{ fontSize: 12, color: 'var(--crm-red)' }}>
                  Passwords do not match
                </span>
              )}
            </div>
            <button
              type="submit"
              className="crm-btn primary"
              disabled={loading || hasSession === null}
              style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 4 }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
