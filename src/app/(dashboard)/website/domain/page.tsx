'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@/lib/templates';
import type { SiteConfig } from '@/types/website-template';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Info,
  ArrowRight,
  Save,
} from 'lucide-react';

interface WebsiteConfigResponse {
  data: {
    template_id: string;
    config: SiteConfig;
    custom_domain?: string | null;
  };
}

const defaultTemplate = getTemplate(DEFAULT_TEMPLATE_ID)!;

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: 'pending' | 'verified' | 'error';
}

interface DomainState {
  customDomain: string;
  sslEnabled: boolean;
  verified: boolean;
  verificationToken: string;
  dnsRecords: DnsRecord[];
  step: 'idle' | 'configuring' | 'verifying' | 'verified';
}

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { color: 'var(--crm-amber)', bg: 'rgba(245,166,35,0.1)', icon: Clock },
  verified: { color: 'var(--crm-green)', bg: 'rgba(52,199,89,0.1)', icon: CheckCircle2 },
  error: { color: 'var(--crm-red)', bg: 'rgba(255,59,48,0.1)', icon: AlertCircle },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--crm-green)' : 'var(--crm-text-3)', padding: 4, display: 'grid', placeItems: 'center' }}
      title="Copy"
    >
      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function DomainPage() {
  const [domain, setDomain] = useState<DomainState>({
    customDomain: '',
    sslEnabled: true,
    verified: false,
    verificationToken: 'bp-verify-' + Math.random().toString(36).slice(2, 10),
    dnsRecords: [],
    step: 'idle',
  });
  const [fullConfig, setFullConfig] = useState<SiteConfig>(
    JSON.parse(JSON.stringify(defaultTemplate.defaults))
  );
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get<WebsiteConfigResponse>('/website/config');
        if (cancelled) return;
        if (resp?.data) {
          if (resp.data.config && Object.keys(resp.data.config).length > 0) {
            const merged: SiteConfig = {
              ...JSON.parse(JSON.stringify(defaultTemplate.defaults)),
              ...resp.data.config,
            };
            setFullConfig(merged);
          }
          if (resp.data.template_id) setTemplateId(resp.data.template_id);
          if (resp.data.custom_domain) {
            setDomain((d) => ({
              ...d,
              customDomain: resp.data.custom_domain || '',
              verified: !!resp.data.config?.domain?.verified,
              step: 'configuring',
            }));
          }
        }
      } catch (err) {
        if (!(err instanceof Error && /not found|no website config/i.test(err.message))) {
          console.warn('Failed to load website config:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const nextConfig: SiteConfig = {
        ...fullConfig,
        domain: {
          customDomain: domain.customDomain || undefined,
          sslEnabled: domain.sslEnabled,
          verified: domain.verified,
          verificationToken: domain.verificationToken,
          dnsRecords: domain.dnsRecords,
        },
      };
      await api.put('/website/config', {
        template_id: templateId,
        config: nextConfig,
        custom_domain: domain.customDomain || null,
      });
      setFullConfig(nextConfig);
      toast.success('Domain settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [fullConfig, templateId, domain]);

  const platformHost = 'app.tourify.in'; // the platform CNAME target

  const generateDnsRecords = (): DnsRecord[] => {
    const d = domain.customDomain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    return [
      {
        type: 'CNAME',
        name: d.startsWith('www.') ? 'www' : d.split('.')[0] === d ? '@' : d.split('.')[0],
        value: platformHost,
        status: 'pending',
      },
      {
        type: 'TXT',
        name: '_tourify',
        value: domain.verificationToken,
        status: 'pending',
      },
    ];
  };

  const startConfig = () => {
    if (!domain.customDomain.trim()) return;
    const records = generateDnsRecords();
    setDomain({ ...domain, dnsRecords: records, step: 'configuring' });
  };

  const [verifyMessage, setVerifyMessage] = useState('');

  const handleVerifyClick = () => {
    setVerifyMessage('Domain verification is coming soon. Backend API endpoints are not yet available.');
  };

  return (
    <div className="crm-stack" style={{ gap: 0 }}>
      <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="crm-eyebrow">Website</div>
          <h1 className="crm-title-1" style={{ marginTop: 4 }}>Custom Domain</h1>
          <p style={{ color: 'var(--crm-text-3)', marginTop: 6, maxWidth: 600, lineHeight: 1.55 }}>
            Connect your own domain so your landing page is accessible at your custom URL instead of the default platform URL.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="crm-btn crm-btn-sm crm-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, opacity: saving || loading ? 0.6 : 1, cursor: saving || loading ? 'not-allowed' : 'pointer' }}
        >
          <Save size={14} /> {saving ? 'Saving…' : loading ? 'Loading…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 820 }}>
        {/* Current status */}
        <div style={{ background: domain.verified ? 'rgba(52,199,89,0.08)' : 'var(--crm-bg-2)', border: `1px solid ${domain.verified ? 'rgba(52,199,89,0.3)' : 'var(--crm-hairline)'}`, borderRadius: 'var(--crm-radius-sm)', padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          {domain.verified ? <CheckCircle2 size={20} style={{ color: 'var(--crm-green)', flexShrink: 0 }} /> : <Globe size={20} style={{ color: 'var(--crm-text-3)', flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {domain.verified ? `Connected: ${domain.customDomain}` : 'No custom domain connected'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-3)', marginTop: 2 }}>
              {domain.verified
                ? 'SSL certificate active · DNS verified'
                : 'Your landing page is accessible at the default platform URL'}
            </div>
          </div>
          {domain.verified && (
            <a href={`https://${domain.customDomain}`} target="_blank" rel="noopener noreferrer" className="crm-btn crm-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={13} /> Visit
            </a>
          )}
        </div>

        {/* Step 1: Enter domain */}
        <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--crm-accent)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>1</span>
            Enter Your Domain
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={domain.customDomain}
              onChange={(e) => setDomain({ ...domain, customDomain: e.target.value, step: 'idle', verified: false, dnsRecords: [] })}
              placeholder="www.yourdomain.com"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', fontSize: 14, fontFamily: 'monospace', background: 'var(--crm-bg-canvas)', color: 'var(--crm-text)' }}
            />
            <button
              onClick={startConfig}
              className="crm-btn crm-btn-sm crm-btn-primary"
              disabled={!domain.customDomain.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: domain.customDomain.trim() ? 1 : 0.5 }}
            >
              Configure <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--crm-text-4)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info size={11} /> Enter the full domain you want to use (e.g. www.mybusiness.com or tours.mybusiness.com)
          </div>
        </div>

        {/* Step 2: DNS Configuration */}
        {domain.step !== 'idle' && (
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--crm-accent)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>2</span>
              Configure DNS Records
            </div>
            <p style={{ fontSize: 13, color: 'var(--crm-text-2)', lineHeight: 1.55, marginBottom: 16 }}>
              Add the following DNS records in your domain registrar&apos;s DNS settings (GoDaddy, Namecheap, Cloudflare, etc.):
            </p>

            {/* DNS records table */}
            <div style={{ border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 140px 1fr 90px', padding: '8px 14px', background: 'var(--crm-bg-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)' }}>
                <div>Type</div>
                <div>Name</div>
                <div>Value</div>
                <div>Status</div>
              </div>
              {domain.dnsRecords.map((r, i) => {
                const s = STATUS_STYLES[r.status];
                const Icon = s.icon;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 140px 1fr 90px', padding: '10px 14px', borderTop: '1px solid var(--crm-hairline)', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{r.type}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {r.name} <CopyButton text={r.name} />
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</span>
                      <CopyButton text={r.value} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: s.color }}>
                      <Icon size={14} /> {r.status}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)', borderRadius: 'var(--crm-radius-sm)', padding: '12px 16px', fontSize: 12, lineHeight: 1.6, color: 'var(--crm-text-2)' }}>
              <strong>How to add these records:</strong>
              <ol style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                <li>Navigate to DNS settings for <strong>{domain.customDomain}</strong></li>
                <li>Add a <strong>CNAME</strong> record pointing to <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: 3 }}>{platformHost}</code></li>
                <li>Add a <strong>TXT</strong> record for domain verification</li>
                <li>Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)</li>
                <li>Click &ldquo;Verify DNS&rdquo; below once records are added</li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {domain.step !== 'idle' && (
          <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--crm-accent)', color: '#fff', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>3</span>
              Verify & Activate
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleVerifyClick}
                  className="crm-btn crm-btn-sm crm-btn-primary"
                  disabled={false}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw size={14} /> Verify DNS (Coming soon)
                </button>
              </div>
              {verifyMessage && (
                <div style={{ fontSize: 13, color: 'var(--crm-amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} /> {verifyMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* What you'll need */}
        <div style={{ background: 'var(--crm-bg-2)', border: '1px solid var(--crm-hairline)', borderRadius: 'var(--crm-radius-sm)', padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--crm-text-3)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--crm-hairline)' }}>
            What You&apos;ll Need
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--crm-text-2)' }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--crm-accent)', minWidth: 20 }}>1.</span>
                <div><strong>A registered domain</strong> — Purchase from any registrar (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.)</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--crm-accent)', minWidth: 20 }}>2.</span>
                <div><strong>DNS management access</strong> — You need to be able to add CNAME and TXT records in your registrar&apos;s DNS panel</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--crm-accent)', minWidth: 20 }}>3.</span>
                <div><strong>CNAME record</strong> — Points your domain (or subdomain) to our platform servers: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontSize: 12 }}>{platformHost}</code></div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--crm-accent)', minWidth: 20 }}>4.</span>
                <div><strong>TXT record</strong> — A verification token we generate to prove you own the domain</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--crm-accent)', minWidth: 20 }}>5.</span>
                <div><strong>SSL is automatic</strong> — We provision a free SSL certificate via Let&apos;s Encrypt once DNS is verified. No action needed from you.</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--crm-bg-3)', borderRadius: 'var(--crm-radius-sm)', fontSize: 12, color: 'var(--crm-text-3)', lineHeight: 1.6 }}>
            <strong>Backend requirements for full implementation:</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>Wildcard DNS or dynamic CNAME resolution on the hosting platform</li>
              <li>SSL certificate auto-provisioning (Let&apos;s Encrypt / Caddy / Vercel-style)</li>
              <li>Domain-to-orgId mapping in the database</li>
              <li>Middleware to resolve incoming host headers to the correct org config</li>
              <li>TXT record verification endpoint in the API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
