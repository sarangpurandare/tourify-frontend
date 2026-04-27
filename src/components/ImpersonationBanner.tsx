'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export function ImpersonationBanner() {
  const { impersonating, user, exitImpersonation } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !impersonating?.active) return null;

  const subjectName = user?.name ?? 'unknown user';
  const subjectEmail = user?.email ?? '';
  const orgName = user?.organisation_name ?? '';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        background: 'var(--crm-amber-bg)',
        color: 'var(--crm-amber)',
        borderBottom: '1px solid var(--crm-amber)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '-0.003em',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span aria-hidden="true">🟡</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Impersonating <strong style={{ fontWeight: 600 }}>{subjectName}</strong>
          {subjectEmail ? <> (<span className="crm-mono">{subjectEmail}</span>)</> : null}
          {orgName ? <> at <strong style={{ fontWeight: 600 }}>{orgName}</strong></> : null}
        </span>
      </span>
      <button
        type="button"
        onClick={exitImpersonation}
        className="crm-btn sm"
        style={{
          background: 'var(--crm-bg-elev)',
          color: 'var(--crm-amber)',
          borderColor: 'var(--crm-amber)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Exit Impersonation
      </button>
    </div>
  );
}
