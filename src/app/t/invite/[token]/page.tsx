'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTravellerAuth } from '@/lib/traveller-auth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PortalInvite } from '@/types/portal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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

export default function TravellerInviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { loginWithTokens } = useTravellerAuth();
  const router = useRouter();

  const [invite, setInvite] = useState<PortalInvite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`${API_URL}/portal/invite/${token}`);
        if (!res.ok) {
          setInvalidToken(true);
          return;
        }
        const json = await res.json();
        setInvite(json.data);
      } catch {
        setInvalidToken(true);
      } finally {
        setLoadingInvite(false);
      }
    }
    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/portal/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Failed to accept invitation' } }));
        throw new Error(err.error?.message || 'Failed to accept invitation');
      }
      const result = await res.json();
      setAccepted(true);
      if (result.data?.access_token && result.data?.refresh_token) {
        await loginWithTokens(result.data.access_token, result.data.refresh_token);
      }
      setTimeout(() => router.push('/t'), 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
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
              fontSize: 16,
              margin: '0 auto 16px',
            }}
          >
            T
          </div>
        </div>

        {loadingInvite && (
          <div style={{ textAlign: 'center', color: 'var(--crm-text-3)', fontSize: 13, padding: 40 }}>
            Validating invitation...
          </div>
        )}

        {invalidToken && !loadingInvite && (
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: 'var(--crm-red)', margin: '0 auto 12px' }} />
            <h2 className="crm-title-1" style={{ marginBottom: 8 }}>Invalid or expired invitation</h2>
            <p className="crm-caption" style={{ fontSize: 14 }}>
              This invitation link is no longer valid. Please ask your tour operator to send a new invite.
            </p>
          </div>
        )}

        {accepted && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--crm-green)', margin: '0 auto 12px' }} />
            <h2 className="crm-title-1" style={{ marginBottom: 8 }}>Welcome to Tourify!</h2>
            <p className="crm-caption" style={{ fontSize: 14 }}>
              Redirecting you to your portal...
            </p>
          </div>
        )}

        {invite && !accepted && !loadingInvite && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 className="crm-title-1" style={{ marginBottom: 8 }}>{invite.org_name}</h2>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--crm-text)', marginBottom: 4 }}>
                Hi {invite.traveller_name}!
              </p>
              <p className="crm-caption" style={{ fontSize: 14 }}>
                Set up your password to access your traveller portal
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--crm-red)',
                    background: 'var(--crm-red-bg)',
                    borderRadius: 'var(--crm-radius-sm)',
                  }}
                >
                  {errorMsg}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={invite.email}
                  readOnly
                  style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                className="crm-btn primary"
                disabled={submitting}
                style={{ height: 40, justifyContent: 'center', fontSize: 14, marginTop: 4 }}
              >
                {submitting ? 'Setting up...' : 'Set password & continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
