'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Check your email for a reset link');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email');
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
          <p className="crm-caption" style={{ fontSize: 14 }}>
            {sent ? 'Reset link sent' : 'Reset your password'}
          </p>
        </div>

        {sent ? (
          <div
            style={{
              padding: 16,
              fontSize: 13,
              color: 'var(--crm-text-2)',
              background: 'var(--crm-bg-elev)',
              border: '1px solid var(--crm-line)',
              borderRadius: 'var(--crm-radius-sm)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            If an account exists for <strong>{email}</strong>, a password reset email is on its way.
            Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <button
              type="submit"
              className="crm-btn primary"
              disabled={loading}
              style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 4 }}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--crm-text-3)' }}>
          Remembered your password?{' '}
          <Link
            href="/login"
            style={{ color: 'var(--crm-accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
